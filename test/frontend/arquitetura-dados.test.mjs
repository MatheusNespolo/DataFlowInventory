// Integridade do modelo estático da arquitetura e dos addons vendorizados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOS, TOPOLOGIA } from '../../frontend/js/arquitetura-status.js';
import {
  NOS_ARQ, ENLACES_ARQ, HARDWARE, CAMERAS, ROTULO_MODO, ROTULO_ESTADO,
} from '../../frontend/js/arquitetura-dados.js';

test('todo nó da topologia tem modelo completo', () => {
  assert.deepEqual(Object.keys(NOS_ARQ).sort(), [...NOS].sort());
  for (const [id, n] of Object.entries(NOS_ARQ)) {
    assert.match(n.codigo, /^[A-Z]{3}$/, id);
    assert.ok(n.nome && n.camada && n.funcao, id);
    assert.equal(n.posicao.length, 3, id);
    assert.ok(['placa', 'torre', 'monitor', 'rack'].includes(n.forma), id);
    assert.ok(n.secoes.length >= 1, id);
    for (const s of n.secoes) {
      assert.ok(s.titulo && s.fonte, `${id}/${s.titulo}`);
      assert.ok(Array.isArray(s.itens) !== Array.isArray(s.linhas), `${id}/${s.titulo}: lista OU tabela`);
      if (s.linhas) for (const l of s.linhas) assert.equal(l.length, s.colunas.length, `${id}/${s.titulo}`);
    }
  }
});

test('enlaces batem com a topologia de status', () => {
  assert.deepEqual(Object.keys(ENLACES_ARQ).sort(), Object.keys(TOPOLOGIA).sort());
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    assert.deepEqual([e.de, e.para], TOPOLOGIA[id], id);
    assert.ok(e.protocolo && e.rotulo, id);
    assert.ok(Array.isArray(e.topicos), id);
  }
});

test('hardware, câmeras e rótulos', () => {
  assert.equal(HARDWARE.length, 4);
  for (const h of HARDWARE) assert.equal(h.posicao.length, 3);
  assert.deepEqual(Object.keys(CAMERAS).sort(), ['aplicacao', 'campo', 'geral', 'nuvem']);
  assert.deepEqual(Object.keys(ROTULO_MODO).sort(), ['desconhecido', 'local', 'nuvem', 'simulador']);
  for (const e of ['ok', 'atencao', 'falha', 'desconhecido', 'sem-telemetria', 'sem-dados', 'fora-do-modo']) {
    assert.ok(ROTULO_ESTADO[e], e);
  }
});

test('addons vendorizados importam o three.js local (CSP sem importmap)', () => {
  for (const f of ['OrbitControls.js', 'CSS2DRenderer.js']) {
    const src = readFileSync(new URL(`../../frontend/vendor/${f}`, import.meta.url), 'utf8');
    assert.ok(!/from\s+['"]three['"]/.test(src), `${f} ainda importa 'three'`);
    assert.ok(src.includes("from '/vendor/three.module.min.js'"), f);
    assert.ok(src.includes('three@0.169.0'), `${f} sem cabeçalho de versão`);
  }
});
