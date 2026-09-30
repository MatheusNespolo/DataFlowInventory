import { test } from 'node:test';
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

const ROT_ENC = { acao: 'solicitar_peca', status: 'encaminhado' };

test('comando aceito e confirmado: mede o tempo até a confirmação do gateway', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A');
  relogio.t += 250;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_sum', ROT_ENC), 0.25);
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 0);
});

test('dois comandos iguais pendentes são confirmados em ordem (FIFO)', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 1100;
  m.comandoAceito('solicitar_peca', 'A'); // t = 1100
  relogio.t = 1300;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' }); // 0,3 s
  relogio.t = 1400;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' }); // 0,3 s
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), 2);
  const soma = await ler('dfi_command_confirmation_seconds_sum', ROT_ENC);
  assert.ok(Math.abs(soma - 0.6) < 1e-9, `soma = ${soma}`);
});

test('confirmação sem comando pendente é contada como órfã e não vira latência', async () => {
  const { m, ler } = novo();
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_count', ROT_ENC), null);
});

test('rejeição do gateway (sem peça) casa com o comando mais antigo da mesma ação', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 1050;
  m.comandoAceito('solicitar_peca', 'B'); // t = 1050
  relogio.t = 1200;
  m.confirmacaoGateway({ acao: 'solicitar_peca', status: 'rejeitado' }); // casa com A: 0,2 s
  const rot = { acao: 'solicitar_peca', status: 'rejeitado' };
  assert.equal(await ler('dfi_command_confirmation_seconds_count', rot), 1);
  assert.equal(await ler('dfi_command_confirmation_seconds_sum', rot), 0.2);
  relogio.t = 1300;
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'B', status: 'encaminhado' }); // B continua pendente
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 0);
});

test('comando sem confirmação expira no timeout e passa a contar como "sem resposta"', async () => {
  const { m, relogio, ler } = novo({ timeoutConfirmacaoMs: 10000 });
  m.comandoAceito('solicitar_peca', 'A'); // t = 1000
  relogio.t = 10999;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 0, 'ainda dentro do prazo');
  relogio.t = 11000;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 1);
  m.confirmacaoGateway({ acao: 'solicitar_peca', peca: 'A', status: 'encaminhado' });
  assert.equal(await ler('dfi_command_confirmation_orphan_total'), 1, 'confirmação tardia é órfã');
});

test('publish que falhou cancela o pendente e conta falha_publicacao', async () => {
  const { m, relogio, ler } = novo();
  const token = m.comandoAceito('solicitar_peca', 'B');
  m.comandoFalhou(token);
  assert.equal(await ler('dfi_commands_total', { resultado: 'falha_publicacao' }), 1);
  relogio.t = 50000;
  m.varrerPendentes();
  assert.equal(await ler('dfi_command_unconfirmed_total'), 0, 'o comando cancelado não expira');
  m.comandoFalhou(undefined); // token ausente não quebra nem deixa de contar a falha
  assert.equal(await ler('dfi_commands_total', { resultado: 'falha_publicacao' }), 2);
});

test('mais de 100 pendentes na mesma fila: o mais antigo é descartado e contado como sem resposta', async () => {
  const { m, ler } = novo();
  for (let i = 0; i < 101; i++) m.comandoAceito('solicitar_peca', 'A');
  assert.equal(await ler('dfi_command_unconfirmed_total'), 1);
});

test('ação e status desconhecidos viram "outro"', async () => {
  const { m, relogio, ler } = novo();
  m.comandoAceito('inventada', 'A');
  relogio.t += 100;
  m.confirmacaoGateway({ acao: 'inventada', status: 'estranho' });
  assert.equal(await ler('dfi_command_confirmation_seconds_count', { acao: 'outro', status: 'outro' }), 1);
});

test('publishAck mede o PUBACK por tópico e só conta "publicado" quando é comando', async () => {
  const { m, ler } = novo();
  m.publishAck(TOPICOS.cmdSub, 0.004, true);
  m.publishAck(TOPICOS.statusServer, 0.01);
  m.publishAck(TOPICOS.cmdSub, Number.NaN, true); // duração inválida não entra no histograma
  const cmd = { topic: 'dataflow/comandos/sub' };
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_count', cmd), 1);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_sum', cmd), 0.004);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_bucket', { ...cmd, le: '0.005' }), 1);
  assert.equal(await ler('dfi_mqtt_publish_ack_seconds_count', { topic: 'dataflow/status/server' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'publicado' }), 2);
});

test('comandoRecusado usa a lista permitida de motivos', async () => {
  const { m, ler } = novo();
  m.comandoRecusado('peca_invalida');
  m.comandoRecusado('rate_limit');
  m.comandoRecusado('rate_limit');
  m.comandoRecusado('broker_offline');
  m.comandoRecusado('qualquer');
  assert.equal(await ler('dfi_commands_total', { resultado: 'peca_invalida' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'rate_limit' }), 2);
  assert.equal(await ler('dfi_commands_total', { resultado: 'broker_offline' }), 1);
  assert.equal(await ler('dfi_commands_total', { resultado: 'outro' }), 1);
});
