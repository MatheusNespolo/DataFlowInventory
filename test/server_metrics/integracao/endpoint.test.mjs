import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarBroker } from '../helpers/broker.mjs';
import { iniciarServidor } from '../helpers/servidor.mjs';
import { esperar } from '../helpers/esperar.mjs';
import { valor, familias } from '../helpers/prom.mjs';

let broker;
let servidor;

before(async () => {
  broker = await iniciarBroker();
  servidor = await iniciarServidor({ brokerPorta: broker.porta });
});

after(async () => {
  await servidor?.parar();
  await broker?.parar();
});

test('GET /metrics responde no formato Prometheus, com as métricas dfi_ e as padrão do processo', async () => {
  const { status, tipo, texto } = await servidor.metricas();
  assert.equal(status, 200);
  assert.match(tipo, /^text\/plain/);
  assert.ok(familias(texto).has('dfi_mqtt_connected'));
  assert.ok(texto.includes('process_cpu_user_seconds_total'));
});

test('ao conectar no broker: mqtt_connected = 1, uptime > 0 e nenhuma reconexão', async () => {
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_connected') === 1, {
    descricao: 'dfi_mqtt_connected = 1',
  });
  await esperar(async () => valor(await servidor.texto(), 'dfi_mqtt_uptime_seconds') > 0, {
    descricao: 'dfi_mqtt_uptime_seconds > 0',
  });
  assert.equal(valor(await servidor.texto(), 'dfi_mqtt_reconnects_total'), 0);
});

test('a API é medida por rota e o próprio /metrics não entra na medição', async () => {
  await fetch(`${servidor.url}/api/status`);
  await fetch(`${servidor.url}/nao-existe-mesmo`);
  await fetch(`${servidor.url}/css/style.css`);
  await servidor.texto(); // um scrape antes da leitura, para provar que ele não é medido
  const texto = await servidor.texto();
  const HIST = 'dfi_http_request_duration_seconds_count';
  assert.ok(valor(texto, HIST, { rota: '/api/status', metodo: 'GET', codigo: '200' }) >= 1);
  assert.equal(valor(texto, HIST, { rota: 'nao_encontrada', codigo: '404' }), 1);
  assert.ok(valor(texto, HIST, { rota: 'estatico' }) >= 1);
  assert.equal(valor(texto, HIST, { rota: '/metrics' }), null);
});
