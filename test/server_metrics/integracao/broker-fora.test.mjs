import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor } from '../helpers/prom.mjs';

let servidor;

before(async () => {
  // Porta 1: nada escuta lá → ECONNREFUSED (o mesmo truque do teste de CSP do frontend).
  servidor = await iniciarServidor({ brokerPorta: 1 });
});

after(async () => {
  await servidor?.parar();
});

test('sem broker: /metrics responde 200, mqtt_connected = 0, uptime = 0 e o erro de conexão é contado', async () => {
  const { status, texto } = await servidor.metricas();
  assert.equal(status, 200);
  assert.equal(valor(texto, 'dfi_mqtt_connected'), 0);
  assert.equal(valor(texto, 'dfi_mqtt_uptime_seconds'), 0);
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_errors_total', { tipo: 'conexao' }) >= 1, {
    descricao: 'um erro de conexão contado',
  });
});

test('sem broker: /api/status continua respondendo 503 e a API mede o código 503', async () => {
  const { status } = await servidor.status();
  assert.equal(status, 503);
  const texto = await servidor.texto();
  assert.ok(valor(texto, 'dfi_http_request_duration_seconds_count', { rota: '/api/status', codigo: '503' }) >= 1);
});
