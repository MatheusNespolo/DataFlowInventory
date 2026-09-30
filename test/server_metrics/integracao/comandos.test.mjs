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

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
  await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

const CONF = { acao: 'solicitar_peca', status: 'encaminhado' };

test('comando aceito: PUBACK medido, resultado "publicado" e tempo até a confirmação do gateway', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'A' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', CONF) === 1, {
    descricao: 'a confirmação do gateway ser medida',
  });
  const texto = await servidor.texto();
  assert.equal(valor(texto, 'dfi_commands_total', { resultado: 'publicado' }), 1);
  assert.equal(valor(texto, 'dfi_mqtt_publish_ack_seconds_count', { topic: 'dataflow/comandos/sub' }), 1);
  const soma = valor(texto, 'dfi_command_confirmation_seconds_sum', CONF);
  assert.ok(soma > 0 && soma < 5, `tempo de confirmação plausível (${soma} s)`);
  assert.equal(valor(texto, 'dfi_command_confirmation_orphan_total'), 0);
  assert.equal(valor(texto, 'dfi_command_unconfirmed_total'), 0);
  dashboard.fechar();
  gateway.fechar();
});

test('reset também é medido, com a ação "reset"', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('reset_sistema');
  await esperar(
    async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', { acao: 'reset', status: 'encaminhado' }) === 1,
    { descricao: 'a confirmação do reset ser medida' },
  );
  dashboard.fechar();
  gateway.fechar();
});

test('rejeição do gateway (sem peça no payload) casa com o comando pendente', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'rejeitar' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'B' });
  await esperar(
    async () => valor(await servidor.texto(), 'dfi_command_confirmation_seconds_count', { acao: 'solicitar_peca', status: 'rejeitado' }) === 1,
    { descricao: 'a rejeição do gateway ser medida' },
  );
  dashboard.fechar();
  gateway.fechar();
});

test('confirmação sem comando pendente é contada como órfã', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'mudo' });
  await gateway.publicar('dataflow/comandos/pub', { type: 'comando', acao: 'reset', status: 'encaminhado' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_command_confirmation_orphan_total') === 1, {
    descricao: 'a confirmação órfã ser contada',
  });
  gateway.fechar();
});

test('peça inválida é recusada pelo servidor e nada vai ao broker', async () => {
  const gateway = await criarGateway(broker.porta, { modo: 'mudo' });
  const dashboard = await conectarDashboard(servidor.url);
  dashboard.socket.emit('solicitar_peca', { peca: 'Z' });
  await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'peca_invalida' }) === 1, {
    descricao: 'a recusa peca_invalida ser contada',
  });
  assert.equal(gateway.recebidos.length, 0);
  dashboard.fechar();
  gateway.fechar();
});
