// Testes unitários de derivarStatus (spec §4.5). Rodar: node --test "test/frontend/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  derivarStatus, detectarModo, NOS, TOPOLOGIA, LIMITE_CAMPO_MS,
} from '../../frontend/js/arquitetura-status.js';

const AGORA = 1_000_000;
const API_LOCAL = { tipo: 'ok', mqtt: true, brokerUrl: 'mqtt://127.0.0.1' };

function sinais(extra = {}) {
  return {
    socketConectado: true,
    api: API_LOCAL,
    gateway: 'online',
    ultimoDadoCampoEm: AGORA - 1000,
    apiEm: AGORA - 500,
    ...extra,
  };
}
const est = (r, id) => r.enlaces[id].estado;

test('detectarModo: local, nuvem, simulador, desconhecido', () => {
  assert.equal(detectarModo(API_LOCAL), 'local');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://abc.s1.eu.hivemq.cloud' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://broker.exemplo' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ok', mqtt: true, brokerUrl: 'mqtt://10.0.0.5:8883' }), 'nuvem');
  assert.equal(detectarModo({ tipo: 'ausente' }), 'simulador');
  assert.equal(detectarModo({ tipo: 'erro' }), 'desconhecido');
  assert.equal(detectarModo({ tipo: 'pendente' }), 'desconhecido');
});

test('modo local saudável: tudo ok, Beckhoff sem telemetria, ramo do simulador fora do modo', () => {
  const r = derivarStatus(sinais(), AGORA);
  assert.equal(r.modo, 'local');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor', 'socket-servidor']) assert.equal(est(r, id), 'ok', id);
  assert.equal(est(r, 'mqtt-beckhoff'), 'sem-telemetria');
  assert.equal(est(r, 'socket-simulador'), 'fora-do-modo');
  assert.equal(est(r, 'mqtt-simulador'), 'fora-do-modo');
  assert.equal(r.nos.simulador, 'fora-do-modo');
  assert.equal(r.nos.beckhoff, 'sem-telemetria');
  assert.equal(r.nos.dashboard, 'ok');
  assert.deepEqual(r.resumo, { pior: 'ok', monitorados: 4, ok: 4 });
});

test('servidor responde 503 (mqtt=false) → mqtt-servidor em falha e nós vizinhos em falha', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'ok', mqtt: false, brokerUrl: 'mqtt://127.0.0.1' } }), AGORA);
  assert.equal(est(r, 'mqtt-servidor'), 'falha');
  assert.equal(r.nos.servidor, 'falha');
  assert.equal(r.nos.broker, 'falha');
  assert.equal(r.resumo.pior, 'falha');
});

test('api com erro/pendente → mqtt-servidor desconhecido', () => {
  assert.equal(est(derivarStatus(sinais({ api: { tipo: 'erro' } }), AGORA), 'mqtt-servidor'), 'desconhecido');
  assert.equal(est(derivarStatus(sinais({ api: { tipo: 'pendente' } }), AGORA), 'mqtt-servidor'), 'desconhecido');
});

test('gateway offline → mqtt-esp32 falha e UART desconhecido (nunca falha)', () => {
  const r = derivarStatus(sinais({ gateway: 'offline' }), AGORA);
  assert.equal(est(r, 'mqtt-esp32'), 'falha');
  assert.equal(est(r, 'uart'), 'desconhecido');
  assert.equal(r.nos.esp32, 'falha');
});

test('gateway sem informação → mqtt-esp32 desconhecido', () => {
  assert.equal(est(derivarStatus(sinais({ gateway: null }), AGORA), 'mqtt-esp32'), 'desconhecido');
});

test('UART inferido: < 60 s ok, ≥ 60 s atenção, sem dado nenhum atenção — nunca falha', () => {
  const recente = derivarStatus(sinais({ ultimoDadoCampoEm: AGORA - (LIMITE_CAMPO_MS - 1) }), AGORA);
  assert.equal(est(recente, 'uart'), 'ok');
  assert.equal(recente.enlaces.uart.inferido, true);
  assert.equal(est(derivarStatus(sinais({ ultimoDadoCampoEm: AGORA - LIMITE_CAMPO_MS }), AGORA), 'uart'), 'atencao');
  assert.equal(est(derivarStatus(sinais({ ultimoDadoCampoEm: null }), AGORA), 'uart'), 'atencao');
});

test('modo simulador: ramo real fora do modo, simulador ok, publicação MQTT sem telemetria', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'ausente' } }), AGORA);
  assert.equal(r.modo, 'simulador');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor', 'socket-servidor']) assert.equal(est(r, id), 'fora-do-modo', id);
  assert.equal(est(r, 'socket-simulador'), 'ok');
  assert.equal(est(r, 'mqtt-simulador'), 'sem-telemetria');
  assert.equal(r.nos.arduino, 'fora-do-modo');
  assert.equal(r.nos.servidor, 'fora-do-modo');
  assert.equal(r.nos.simulador, 'ok');
  assert.equal(r.nos.dashboard, 'ok');
  assert.deepEqual(r.resumo, { pior: 'ok', monitorados: 1, ok: 1 });
});

test('modo desconhecido: nenhum ramo esmaecido', () => {
  const r = derivarStatus(sinais({ api: { tipo: 'pendente' } }), AGORA);
  assert.equal(r.modo, 'desconhecido');
  assert.equal(est(r, 'socket-servidor'), 'ok');
  assert.equal(est(r, 'socket-simulador'), 'desconhecido');
  assert.equal(est(r, 'mqtt-simulador'), 'sem-telemetria');
});

test('socket caído (modo local): dashboard em falha, demais sem dados, Beckhoff sem telemetria', () => {
  const r = derivarStatus(sinais({ socketConectado: false }), AGORA);
  assert.equal(est(r, 'socket-servidor'), 'falha');
  for (const id of ['uart', 'mqtt-esp32', 'mqtt-servidor']) assert.equal(est(r, id), 'sem-dados', id);
  assert.equal(est(r, 'mqtt-beckhoff'), 'sem-telemetria');
  assert.equal(est(r, 'socket-simulador'), 'fora-do-modo');
  assert.equal(r.nos.dashboard, 'falha');
  assert.equal(r.resumo.pior, 'falha');
});

test('socket caído em modo desconhecido: os dois enlaces do dashboard em falha', () => {
  const r = derivarStatus(sinais({ socketConectado: false, api: { tipo: 'erro' } }), AGORA);
  assert.equal(est(r, 'socket-servidor'), 'falha');
  assert.equal(est(r, 'socket-simulador'), 'falha');
});

test('todo enlace tem fonte textual e todo nó tem estado', () => {
  const r = derivarStatus(sinais(), AGORA);
  for (const id of Object.keys(TOPOLOGIA)) {
    assert.ok(r.enlaces[id], id);
    assert.equal(typeof r.enlaces[id].fonte, 'string');
    assert.ok(r.enlaces[id].fonte.length > 10, id);
  }
  for (const no of NOS) assert.equal(typeof r.nos[no], 'string', no);
});
