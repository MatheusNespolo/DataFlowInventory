import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let broker;
let servidor;
let gateway;

before(async () => {
  broker = await iniciarBroker();
  // Timeout curto (300 ms) só nesta suíte; o varredor do servidor roda a cada 1 s.
  servidor = await iniciarServidor({ brokerPorta: broker.porta, env: { METRICS_CONFIRMACAO_TIMEOUT_MS: '300' } });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
  gateway = await criarGateway(broker.porta, { modo: 'mudo' });
});

after(async () => {
  gateway?.fechar();
  await servidor?.parar();
  await broker?.parar();
});

test('gateway mudo: o comando expira como "sem resposta" e a confirmação tardia vira órfã', async () => {
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_unconfirmed_total') === 1, {
    timeoutMs: 8000,
    descricao: 'o comando sem resposta ser contado',
  });
  await gateway.publicar('dataflow/comandos/pub', { type: 'comando', acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_orphan_total') === 1, {
    descricao: 'a confirmação tardia ser contada como órfã',
  });
  dashboard.fechar();
});
