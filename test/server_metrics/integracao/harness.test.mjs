// Caracteriza o servidor ATUAL (sem métricas) para provar que o harness funciona.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  gateway = await criarGateway(broker.porta);
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('o servidor de teste conecta ao broker em processo (/api/status → 200, mqtt=true)', async () => {
  const r = await esperar(async () => {
    const s = await servidor.status();
    return s.corpo.mqtt ? s : null;
  }, { descricao: 'mqtt=true em /api/status' });
  assert.equal(r.status, 200);
});

test('o anúncio online (retido) do gateway falso chega ao servidor', async () => {
  await esperar(async () => (await servidor.status()).corpo.gateway === 'online', {
    descricao: 'gateway = online em /api/status',
  });
});

test('um comando do dashboard chega ao gateway falso e é confirmado', async () => {
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(() => gateway.recebidos.length === 1, { descricao: 'o gateway falso receber o comando' });
  assert.equal(gateway.recebidos[0].acao, 'solicitar_peca');
  assert.equal(gateway.recebidos[0].peca, 'A');
  dashboard.fechar();
});

test('a queda forçada do gateway falso dispara o LWT (gateway = offline)', async () => {
  gateway.cair();
  await esperar(async () => (await servidor.status()).corpo.gateway === 'offline', {
    descricao: 'gateway = offline em /api/status',
  });
});
