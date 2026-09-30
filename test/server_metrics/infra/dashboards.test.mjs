// Verificações ESTÁTICAS dos dashboards do Grafana (não renderizam nada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarMetricas } from '../../../server/metrics.js';
import { familias } from '../helpers/prom.mjs';

const DASHBOARDS = {
  'visao-geral.json': { uid: 'dfi-visao-geral', titulo: 'Data Flow Inventory — Visão Geral' },
  'performance.json': { uid: 'dfi-performance', titulo: 'Data Flow Inventory — Performance' },
  'confiabilidade.json': { uid: 'dfi-confiabilidade', titulo: 'Data Flow Inventory — Confiabilidade' },
};

const carregar = (arquivo) => JSON.parse(readFileSync(new URL(`../../../docs/grafana/${arquivo}`, import.meta.url), 'utf8'));
const todos = Object.fromEntries(Object.keys(DASHBOARDS).map((a) => [a, carregar(a)]));

// Métricas que o servidor REALMENTE expõe (as linhas "# TYPE" listam até as que ainda não têm amostra).
const expostas = familias(await criarMetricas({ topicos: {} }).texto());
const nomesValidos = new Set();
for (const [nome, tipo] of expostas) {
  nomesValidos.add(nome);
  if (tipo === 'histogram') ['_bucket', '_sum', '_count'].forEach((s) => nomesValidos.add(nome + s));
}

const alvosDe = (dash) => dash.panels.flatMap((p) => p.targets ?? []);
const metricasCitadas = (dash) => {
  const nomes = new Set();
  for (const alvo of alvosDe(dash)) {
    for (const m of alvo.expr.matchAll(/\b((?:dfi|process|nodejs)_[a-z0-9_]+)/g)) nomes.add(m[1]);
  }
  return nomes;
};

test('cada dashboard tem uid, título, atualização de 5 s e janela de 15 min', () => {
  for (const [arquivo, esperado] of Object.entries(DASHBOARDS)) {
    const d = todos[arquivo];
    assert.equal(d.uid, esperado.uid, arquivo);
    assert.equal(d.title, esperado.titulo, arquivo);
    assert.equal(d.refresh, '5s', arquivo);
    assert.equal(d.time.from, 'now-15m', arquivo);
    assert.ok(d.tags.includes('dataflow-inventory'), arquivo);
    assert.ok(d.panels.length >= 5, `${arquivo} tem painéis`);
  }
});

test('painéis: ids únicos, dentro da grade de 24 colunas e todos usando o datasource dfi-prometheus', () => {
  for (const [arquivo, d] of Object.entries(todos)) {
    const ids = d.panels.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${arquivo}: ids repetidos`);
    for (const p of d.panels) {
      const { x, w, h } = p.gridPos;
      assert.ok(x >= 0 && w >= 1 && h >= 1 && x + w <= 24, `${arquivo} / ${p.title}: fora da grade`);
      assert.equal(p.datasource.uid, 'dfi-prometheus', `${arquivo} / ${p.title}`);
      assert.ok(p.targets.length >= 1, `${arquivo} / ${p.title}: sem consulta`);
      for (const t of p.targets) {
        assert.equal(t.datasource.uid, 'dfi-prometheus', `${arquivo} / ${p.title}`);
        assert.equal(typeof t.expr, 'string');
        assert.ok(t.expr.length > 0, `${arquivo} / ${p.title}: consulta vazia`);
      }
    }
  }
});

test('toda métrica citada nas consultas existe no servidor (ou é o "up" do Prometheus)', () => {
  for (const [arquivo, d] of Object.entries(todos)) {
    const citadas = metricasCitadas(d);
    assert.ok(citadas.size > 0, `${arquivo} cita métricas`);
    for (const nome of citadas) assert.ok(nomesValidos.has(nome), `${arquivo} cita "${nome}", que o servidor não expõe`);
  }
});

test('toda métrica dfi_* do servidor aparece em pelo menos um dashboard', () => {
  const usadas = new Set();
  for (const d of Object.values(todos)) for (const nome of metricasCitadas(d)) usadas.add(nome);
  const naoUsadas = [...expostas.keys()].filter((nome) => nome.startsWith('dfi_'))
    .filter((nome) => ![nome, `${nome}_bucket`, `${nome}_sum`, `${nome}_count`].some((v) => usadas.has(v)));
  assert.deepEqual(naoUsadas, [], `métricas sem painel: ${naoUsadas.join(', ')}`);
});

test('Performance mostra p50, p95 e p99 das três latências (confirmação, PUBACK e API)', () => {
  const exprs = alvosDe(todos['performance.json']).map((t) => t.expr);
  for (const base of ['dfi_command_confirmation_seconds', 'dfi_mqtt_publish_ack_seconds', 'dfi_http_request_duration_seconds']) {
    for (const q of ['0.5', '0.95', '0.99']) {
      assert.ok(
        exprs.some((e) => e.includes(`histogram_quantile(${q}`) && e.includes(`${base}_bucket`)),
        `falta o p${Number(q) * 100} de ${base}`,
      );
    }
  }
});

test('Visão Geral: o estoque usa os limiares do frontend (crítico ≤1, alerta 2, aviso 3, normal ≥4)', () => {
  const painel = todos['visao-geral.json'].panels.find((p) => p.title === 'Estoque atual');
  assert.ok(painel, 'painel "Estoque atual" existe');
  const passos = painel.fieldConfig.defaults.thresholds.steps;
  assert.deepEqual(passos.map((s) => s.value), [null, 2, 3, 4]);
  assert.deepEqual(passos.map((s) => s.color), ['red', 'orange', 'yellow', 'green']);
});
