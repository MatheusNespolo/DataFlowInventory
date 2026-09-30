// Verificações ESTÁTICAS do job de CI e da documentação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { criarMetricas } from '../../../server/metrics.js';
import { familias } from '../helpers/prom.mjs';

const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

test('CI: o job server-metrics-tests roda os testes de métricas no Node 22, sem Docker', () => {
  const wf = parse(ler('.github/workflows/lint-and-security.yaml'));
  const job = wf.jobs['server-metrics-tests'];
  assert.ok(job, 'o job existe');
  assert.equal(job['runs-on'], 'ubuntu-latest');
  const setup = job.steps.find((p) => p.uses?.startsWith('actions/setup-node'));
  assert.equal(String(setup.with['node-version']), '22');
  assert.match(setup.with['cache-dependency-path'], /server\/package-lock\.json/);
  assert.match(setup.with['cache-dependency-path'], /test\/server_metrics\/package-lock\.json/);
  const comandos = job.steps.map((p) => p.run ?? '').join('\n');
  assert.match(comandos, /cd server && npm ci/);
  assert.match(comandos, /test\/server_metrics && npm ci/);
  assert.match(comandos, /cd test\/server_metrics && npm test/);
  assert.doesNotMatch(comandos, /docker/i, 'o CI não depende de Docker');
  assert.ok(wf.jobs['frontend-tests'], 'o job frontend-tests já existente foi preservado');
});

test('ARCHITECTURE.md: a seção Observabilidade lista TODAS as métricas dfi_* do servidor', async () => {
  const arq = ler('docs/ARCHITECTURE.md');
  assert.match(arq, /^## 7\. Observabilidade\s*$/m);
  assert.match(arq, /^## 8\. Documentação Correlata\s*$/m);
  const secao = arq.split(/^## 7\. Observabilidade\s*$/m)[1].split(/^## 8\. /m)[0];
  const nomes = [...familias(await criarMetricas({ topicos: {} }).texto()).keys()].filter((n) => n.startsWith('dfi_'));
  assert.ok(nomes.length >= 17, 'o servidor expõe as 17 métricas do catálogo');
  const faltando = nomes.filter((n) => !secao.includes(n));
  assert.deepEqual(faltando, [], `métricas sem documentação: ${faltando.join(', ')}`);
  for (const trecho of ['observability/README.md', 'docs/grafana', 'METRICS_CONFIRMACAO_TIMEOUT_MS', 'CX9240']) {
    assert.ok(secao.includes(trecho), `a seção Observabilidade não menciona ${trecho}`);
  }
  assert.ok(arq.includes('observability/README.md'), 'a lista de documentação correlata aponta para o README do stack');
});

test('CHANGELOG registra a telemetria histórica em "Não publicado"', () => {
  const log = ler('docs/CHANGELOG.md');
  const naoPublicado = log.split(/^## \[Não publicado\]\s*$/m)[1].split(/^## \[/m)[0];
  assert.match(naoPublicado, /Telemetria Histórica de Performance/);
  assert.match(naoPublicado, /GET \/metrics/);
  assert.match(naoPublicado, /observability\/README\.md/);
});
