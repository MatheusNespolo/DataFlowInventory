// Verificacoes ESTATICAS dos scripts de smoke e do README de observabilidade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

const sh = ler('scripts/observability-smoke.sh');
const ps1 = ler('scripts/observability-smoke.ps1');
const readme = ler('observability/README.md');

// Cada etapa que o spec (§7) exige do smoke, em texto que aparece nos DOIS scripts.
const ETAPAS = [
  ['/metrics', 'o servidor expoe /metrics'],
  ['config', 'docker compose config'],
  ['promtool', 'promtool check config'],
  ['up -d', 'docker compose up -d'],
  ['api/v1/query', 'consulta a API do Prometheus'],
  ['dfi-server', 'alvo dfi-server em "up"'],
  ['api/health', 'saude do Grafana'],
  ['datasources/uid/dfi-prometheus/health', 'saude do datasource'],
  ['api/dashboards/uid', 'consulta de dashboard por uid'],
  ['dfi-visao-geral', 'dashboard Visao Geral'],
  ['dfi-performance', 'dashboard Performance'],
  ['dfi-confiabilidade', 'dashboard Confiabilidade'],
  ['--env-file', 'o compose usa observability/.env'],
];

test('os dois scripts cobrem todas as etapas do smoke', () => {
  for (const [trecho, descricao] of ETAPAS) {
    assert.ok(sh.includes(trecho), `smoke.sh nao cobre: ${descricao}`);
    assert.ok(ps1.includes(trecho), `smoke.ps1 nao cobre: ${descricao}`);
  }
});

test('a imagem do promtool vem do docker-compose.yml (nao fica fixada duas vezes)', () => {
  assert.doesNotMatch(sh, /prom\/prometheus:v\d/);
  assert.doesNotMatch(ps1, /prom\/prometheus:v\d/);
  assert.ok(sh.includes('docker-compose.yml') && ps1.includes('docker-compose.yml'));
});

test('o script PowerShell segue a convencao do projeto: ASCII puro, sem BOM', () => {
  assert.ok([...ps1].every((c) => c.charCodeAt(0) < 128), 'ha caractere fora do ASCII (acento, travessao, BOM)');
});

test('os scripts saem com codigo de erro quando alguma etapa falha', () => {
  assert.match(sh, /exit 1/);
  assert.match(ps1, /exit 1/);
});

test('o README documenta o passo a passo e as armadilhas conhecidas', () => {
  for (const trecho of [
    'docker compose --env-file observability/.env up -d',
    'GRAFANA_ADMIN_PASSWORD',
    'host.docker.internal',
    'observability-smoke',
    'down -v',
    'grafana-data',
    'docs/grafana',
    'docs/ARCHITECTURE.md',
    'DEPLOYMENT.md',
  ]) {
    assert.ok(readme.includes(trecho), `README nao menciona: ${trecho}`);
  }
  assert.match(readme, /PRIMEIRA/, 'documenta que a senha so vale na primeira criacao do volume');
});
