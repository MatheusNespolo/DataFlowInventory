// Testes do coletor de sinais (spec §4.6). Socket e fetch são falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarColetor } from '../../frontend/js/arquitetura-sinais.js';

function socketFalso(conectado = true) {
  const handlers = {};
  return {
    connected: conectado,
    on(evt, fn) { (handlers[evt] ||= []).push(fn); },
    emitir(evt, dado) { (handlers[evt] || []).forEach((fn) => fn(dado)); },
  };
}
const resposta = (status, corpo) => async () => ({ status, json: async () => corpo });

function montar(extra = {}) {
  const socket = extra.socket === undefined ? socketFalso() : extra.socket;
  let agora = 1000;
  const agendados = [];
  const cancelados = [];
  const coletor = criarColetor({
    socket,
    fetchFn: extra.fetchFn || resposta(200, { mqtt: true, brokerUrl: 'mqtt://127.0.0.1' }),
    relogio: () => agora,
    agendar: (fn, ms) => { agendados.push(ms); return agendados.length; },
    cancelar: (id) => cancelados.push(id),
  });
  return { socket, coletor, agendados, cancelados, avancar: (ms) => { agora += ms; } };
}

test('estado inicial reflete o socket e começa com api pendente', () => {
  const { coletor } = montar();
  const s = coletor.obter();
  assert.equal(s.socketConectado, true);
  assert.deepEqual(s.api, { tipo: 'pendente' });
  assert.equal(s.gateway, null);
  assert.equal(s.ultimoDadoCampoEm, null);
});

test('sem socket: desconectado e sem exceção', () => {
  const { coletor } = montar({ socket: null });
  assert.equal(coletor.obter().socketConectado, false);
});

test('connect/disconnect atualizam e notificam', () => {
  const { socket, coletor } = montar();
  let chamadas = 0;
  coletor.aoMudar(() => { chamadas++; });
  socket.emitir('disconnect');
  assert.equal(coletor.obter().socketConectado, false);
  socket.emitir('connect');
  assert.equal(coletor.obter().socketConectado, true);
  assert.equal(chamadas, 2);
});

test('aoMudar devolve função que cancela a assinatura', () => {
  const { socket, coletor } = montar();
  let chamadas = 0;
  const sair = coletor.aoMudar(() => { chamadas++; });
  sair();
  socket.emitir('disconnect');
  assert.equal(chamadas, 0);
});

test('gateway via evento e via estado_inicial', () => {
  const { socket, coletor } = montar();
  socket.emitir('estado_inicial', { gateway: { status: 'offline' } });
  assert.equal(coletor.obter().gateway, 'offline');
  socket.emitir('gateway', { status: 'online', type: 'gateway' });
  assert.equal(coletor.obter().gateway, 'online');
});

test('status/sensores/esteiras ao vivo marcam o último dado de campo; estado_inicial não', () => {
  const { socket, coletor, avancar } = montar();
  socket.emitir('estado_inicial', { status: { estado: 'AGUARDANDO_PEDIDO' } });
  assert.equal(coletor.obter().ultimoDadoCampoEm, null);
  for (const evt of ['status', 'sensores', 'esteiras']) {
    avancar(10);
    socket.emitir(evt, {});
    assert.equal(coletor.obter().ultimoDadoCampoEm, 1000 + (evt === 'status' ? 10 : evt === 'sensores' ? 20 : 30));
  }
});

test('consultarApi: 200, 503, 404, 500 e exceção', async () => {
  const casos = [
    [resposta(200, { mqtt: true, brokerUrl: 'mqtts://x.hivemq.cloud' }), { tipo: 'ok', mqtt: true, brokerUrl: 'mqtts://x.hivemq.cloud' }],
    [resposta(503, { mqtt: false, brokerUrl: 'mqtt://127.0.0.1' }), { tipo: 'ok', mqtt: false, brokerUrl: 'mqtt://127.0.0.1' }],
    [resposta(404, null), { tipo: 'ausente' }],
    [resposta(500, null), { tipo: 'erro' }],
    [async () => { throw new Error('rede'); }, { tipo: 'erro' }],
  ];
  for (const [fetchFn, esperado] of casos) {
    const { coletor } = montar({ fetchFn });
    await coletor.consultarApi();
    assert.deepEqual(coletor.obter().api, esperado);
    assert.equal(coletor.obter().apiEm, 1000);
  }
});

test('definirRitmo: ativo 5 s, fundo 30 s, parado cancela; repetir o mesmo ritmo não reagenda', () => {
  const { coletor, agendados, cancelados } = montar();
  coletor.definirRitmo('ativo');
  coletor.definirRitmo('ativo');
  assert.deepEqual(agendados, [5000]);
  coletor.definirRitmo('fundo');
  assert.deepEqual(agendados, [5000, 30000]);
  assert.deepEqual(cancelados, [1]);
  coletor.definirRitmo('parado');
  assert.deepEqual(cancelados, [1, 2]);
});

test('gatewayInicial semeia o gateway (estado_inicial chegou antes do coletor)', () => {
  const socket = socketFalso();
  const coletor = criarColetor({ socket, fetchFn: resposta(404, null), gatewayInicial: 'online' });
  assert.equal(coletor.obter().gateway, 'online');
  socket.emitir('gateway', { status: 'offline' });
  assert.equal(coletor.obter().gateway, 'offline');
  assert.equal(criarColetor({ socket: null, fetchFn: resposta(404, null) }).obter().gateway, null);
});

test('consultarApi: depois de um 404 (simulador) não consulta de novo', async () => {
  let chamadas = 0;
  const fetchFn = async () => { chamadas++; return { status: 404, json: async () => null }; };
  const { coletor, avancar } = montar({ fetchFn });
  await coletor.consultarApi();
  avancar(5000);
  await coletor.consultarApi();
  assert.equal(chamadas, 1);
  assert.deepEqual(coletor.obter().api, { tipo: 'ausente' });
  assert.equal(coletor.obter().apiEm, 6000); // a reavaliação segue "atualizada"
});
