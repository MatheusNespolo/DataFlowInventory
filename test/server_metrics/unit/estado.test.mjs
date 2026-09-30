import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { criarMetricas } from '../../../server/metrics.js';
import { valor } from '../helpers/prom.mjs';

const TOPICOS = {
  status: 'dataflow/status',
  estoque: 'dataflow/estoque',
  eventos: 'dataflow/eventos',
  sensores: 'dataflow/sensores',
  esteiras: 'dataflow/esteiras',
  cmdSub: 'dataflow/comandos/sub',
  cmdPub: 'dataflow/comandos/pub',
  statusServer: 'dataflow/status/server',
};

function novo(extra = {}) {
  const relogio = { t: 1000 };
  const m = criarMetricas({ relogio: () => relogio.t, topicos: TOPICOS, ...extra });
  return { m, relogio, ler: async (nome, rotulos) => valor(await m.texto(), nome, rotulos) };
}

test('expõe o formato Prometheus e as métricas padrão do processo', async () => {
  const { m } = novo();
  assert.match(m.contentType, /^text\/plain/);
  const texto = await m.texto();
  assert.match(texto, /# TYPE dfi_mqtt_connected gauge/);
  assert.match(texto, /process_cpu_user_seconds_total/);
});

test('MQTT: conexão, uptime calculado no scrape e reconexões (só após a primeira conexão)', async () => {
  const { m, relogio, ler } = novo();
  assert.equal(await ler('dfi_mqtt_connected'), 0);
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 0);

  m.mqttConectou();
  assert.equal(await ler('dfi_mqtt_connected'), 1);
  assert.equal(await ler('dfi_mqtt_reconnects_total'), 0, 'a primeira conexão não é reconexão');
  relogio.t += 5000;
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 5);

  m.mqttCaiu();
  assert.equal(await ler('dfi_mqtt_connected'), 0);
  assert.equal(await ler('dfi_mqtt_uptime_seconds'), 0);

  m.mqttConectou();
  assert.equal(await ler('dfi_mqtt_reconnects_total'), 1);
  assert.equal(await ler('dfi_mqtt_connected'), 1);
});

test('erros MQTT usam lista permitida (valor desconhecido vira "outro")', async () => {
  const { m, ler } = novo();
  m.mqttErro('conexao');
  m.mqttErro('conexao');
  m.mqttErro('json_invalido');
  m.mqttErro('xpto');
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'conexao' }), 2);
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'json_invalido' }), 1);
  assert.equal(await ler('dfi_mqtt_errors_total', { tipo: 'outro' }), 1);
});

test('mensagens MQTT contam por tópico conhecido; tópico desconhecido vira "outro"', async () => {
  const { m, ler } = novo();
  m.mensagemMqtt('dataflow/estoque');
  m.mensagemMqtt('dataflow/estoque');
  m.mensagemMqtt('dataflow/comandos/pub');
  m.mensagemMqtt('qualquer/coisa');
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'dataflow/estoque' }), 2);
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'dataflow/comandos/pub' }), 1);
  assert.equal(await ler('dfi_mqtt_messages_total', { topic: 'outro' }), 1);
});

test('gateway: a queda só conta na transição online → offline', async () => {
  const { m, ler } = novo();
  m.gateway('offline'); // LWT retido recebido ao (re)conectar: NÃO é uma queda
  assert.equal(await ler('dfi_gateway_offline_total'), 0);
  assert.equal(await ler('dfi_gateway_online'), 0);

  m.gateway('online');
  assert.equal(await ler('dfi_gateway_online'), 1);

  m.gateway('offline');
  m.gateway('offline'); // repetido: não conta de novo
  assert.equal(await ler('dfi_gateway_offline_total'), 1);
  assert.equal(await ler('dfi_gateway_online'), 0);

  m.gateway('online');
  m.gateway('offline');
  assert.equal(await ler('dfi_gateway_offline_total'), 2);

  m.gateway('desconhecido'); // status inválido é ignorado
  assert.equal(await ler('dfi_gateway_offline_total'), 2);
  assert.equal(await ler('dfi_gateway_online'), 0);
});

test('eventos contam por tipo permitido; nome desconhecido vira "outro"', async () => {
  const { m, ler } = novo();
  for (const nome of ['pedido', 'entrega', 'entrega', 'erro', 'inicio', 'inventado', undefined]) m.evento(nome);
  assert.equal(await ler('dfi_events_total', { evento: 'pedido' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'entrega' }), 2);
  assert.equal(await ler('dfi_events_total', { evento: 'erro' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'inicio' }), 1);
  assert.equal(await ler('dfi_events_total', { evento: 'outro' }), 2);
});

test('estoque: só números finitos viram gauge; o resto é ignorado', async () => {
  const { m, ler } = novo();
  m.estoque({ type: 'estoque', pecaA: 4, pecaB: 'x', pecaC: NaN });
  assert.equal(await ler('dfi_stock_pieces', { peca: 'A' }), 4);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'B' }), null);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'C' }), null);
  m.estoque({ pecaA: 3, pecaB: 5, pecaC: 0 });
  assert.equal(await ler('dfi_stock_pieces', { peca: 'A' }), 3);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'B' }), 5);
  assert.equal(await ler('dfi_stock_pieces', { peca: 'C' }), 0);
});

test('esteiras: aceita booleano ou 0/1 e ignora chaves ausentes ou inválidas', async () => {
  const { m, ler } = novo();
  m.esteiras({ principal: true, secA: false, secB: 1, secC: 'ligada' });
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'principal' }), 1);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secA' }), 0);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secB' }), 1);
  assert.equal(await ler('dfi_conveyor_on', { esteira: 'secC' }), null);
});

test('clientes WebSocket: lidos do callback no scrape; falha do callback vira 0', async () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m: bom } = novo({ clientesWs: () => 3 });
  assert.equal(valor(await bom.texto(), 'dfi_websocket_clients'), 3);
  assert.equal(aviso.mock.callCount(), 0);
  const { m: ruim } = novo({ clientesWs: () => { throw new Error('io indisponível'); } });
  assert.equal(valor(await ruim.texto(), 'dfi_websocket_clients'), 0);
  assert.equal(aviso.mock.callCount(), 1, 'a falha do callback é registrada uma vez no log');
  aviso.mock.restore();
});

test('a fachada nunca lança: argumentos absurdos e relógio quebrado são engolidos', () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m } = novo();
  const metodos = Object.entries(m).filter(([nome, fn]) => typeof fn === 'function' && nome !== 'texto');
  assert.ok(metodos.length >= 8, 'a fachada expõe os métodos esperados');
  for (const [nome, fn] of metodos) {
    for (const arg of [undefined, null, 42, 'x', {}, [], { pecaA: 'x' }]) {
      assert.doesNotThrow(() => fn(arg), `${nome}(${JSON.stringify(arg)})`);
    }
  }
  const quebrado = criarMetricas({ relogio: () => { throw new Error('relógio quebrado'); }, topicos: TOPICOS });
  assert.doesNotThrow(() => quebrado.mqttConectou());
  assert.ok(aviso.mock.callCount() >= 1, 'a falha é registrada no log');
  aviso.mock.restore();
});
