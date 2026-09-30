import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
  gateway = await criarGateway(broker.porta, { modo: 'mudo' });
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('estoque, esteiras, eventos e mensagens por tópico chegam nas métricas', async () => {
  await gateway.publicar('dataflow/estoque', { type: 'estoque', pecaA: 4, pecaB: 5, pecaC: 2 }, { retain: true });
  await gateway.publicar('dataflow/esteiras', { principal: true, secA: false, secB: false, secC: true });
  await gateway.publicar('dataflow/eventos', { type: 'evento', evento: 'entrega', peca: 'A' });
  await gateway.publicar('dataflow/eventos', { type: 'evento', evento: 'inventado', peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_events_total', { evento: 'outro' }) === 1, {
    descricao: 'os eventos serem contados',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'A' }), 4);
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'B' }), 5);
  assert.equal(valor(texto, 'dfi_stock_pieces', { peca: 'C' }), 2);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'principal' }), 1);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'secA' }), 0);
  assert.equal(valor(texto, 'dfi_conveyor_on', { esteira: 'secC' }), 1);
  assert.equal(valor(texto, 'dfi_events_total', { evento: 'entrega' }), 1);
  assert.ok(valor(texto, 'dfi_mqtt_messages_total', { topic: 'dataflow/estoque' }) >= 1);
  assert.ok(valor(texto, 'dfi_mqtt_messages_total', { topic: 'dataflow/eventos' }) >= 2);
});

test('payload que não é JSON é contado como erro e não derruba o servidor', async () => {
  await gateway.publicar('dataflow/eventos', 'isto-nao-e-json');
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_errors_total', { tipo: 'json_invalido' }) === 1, {
    descricao: 'o erro json_invalido ser contado',
  });
  const { status } = await servidor.status();
  assert.equal(status, 200);
});
