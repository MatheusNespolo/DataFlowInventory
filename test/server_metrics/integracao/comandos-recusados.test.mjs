import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { criarGateway } from '../helpers/gateway.mjs';
import { conectarDashboard } from '../helpers/dashboard.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

test('rate limit: o 2º comando do mesmo cliente dentro do intervalo é recusado', async () => {
  let broker; let servidor; let gateway; let dashboard;
  try {
    broker = await iniciarBroker();
    servidor = await iniciarServidor({ brokerPorta: broker.porta, env: { COMANDO_INTERVALO_MS: '5000' } });
    await esperar(async () => (await servidor.status()).corpo.mqtt, { descricao: 'o servidor conectar ao broker' });
    gateway = await criarGateway(broker.porta, { modo: 'confirmar' });
    dashboard = await conectarDashboard(servidor.url);
    dashboard.socket.emit('solicitar_peca', { peca: 'A' });
    dashboard.socket.emit('solicitar_peca', { peca: 'B' });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'rate_limit' }) === 1, {
      descricao: 'a recusa rate_limit ser contada',
    });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'publicado' }) === 1, {
      descricao: 'o 1º comando ser publicado',
    });
  } finally {
    dashboard?.fechar();
    gateway?.fechar();
    await servidor?.parar();
    await broker?.parar();
  }
});

test('broker offline: o comando é recusado com "broker_offline" e o dashboard recebe o erro', async () => {
  let servidor; let dashboard;
  try {
    servidor = await iniciarServidor({ brokerPorta: 1 }); // nada escuta na porta 1
    dashboard = await conectarDashboard(servidor.url);
    dashboard.socket.emit('solicitar_peca', { peca: 'A' });
    await esperar(async () => valor(await servidor.texto(), 'dfi_commands_total', { resultado: 'broker_offline' }) === 1, {
      descricao: 'a recusa broker_offline ser contada',
    });
    await esperar(() => dashboard.erros.length === 1, { descricao: 'o dashboard receber comando_erro' });
    assert.equal(dashboard.erros[0].erro, 'Broker MQTT offline');
  } finally {
    dashboard?.fechar();
    await servidor?.parar();
  }
});
