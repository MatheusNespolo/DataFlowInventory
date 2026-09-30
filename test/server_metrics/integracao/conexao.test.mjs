import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

test('LWT: a queda forçada do gateway conta exatamente uma queda (online → offline)', async () => {
  const gateway = await criarGateway(broker.porta); // anuncia online (retido) e registra o LWT
  await esperar(async () => valor(await servidor.texto(), 'dfi_gateway_online') === 1, {
    descricao: 'gateway_online = 1',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_gateway_offline_total'), 0);
  gateway.cair();
  await esperar(async () => valor(await servidor.texto(), 'dfi_gateway_offline_total') === 1, {
    descricao: 'gateway_offline_total = 1',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_gateway_online'), 0);
});

test('reconexão: o broker cai e volta → mqtt_connected 0 → 1 e reconnects_total = 1', async () => {
  await broker.parar();
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 0, {
    timeoutMs: 15000,
    descricao: 'mqtt_connected = 0 depois da queda do broker',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_mqtt_uptime_seconds'), 0);

  await broker.reiniciar(); // o servidor tenta reconectar a cada 5 s
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 1, {
    timeoutMs: 30000,
    descricao: 'mqtt_connected = 1 depois do broker voltar',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_mqtt_reconnects_total'), 1);
  assert.ok(valor(texto, 'dfi_mqtt_uptime_seconds') < 30, 'o uptime recomeça a contar do zero');
});
