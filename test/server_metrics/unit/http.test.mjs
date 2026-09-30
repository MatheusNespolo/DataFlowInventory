import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { criarMetricas } from '../../../server/metrics.js';
import { valor } from '../helpers/prom.mjs';

function novo() {
  const relogio = { t: 1000 };
  const m = criarMetricas({ relogio: () => relogio.t });
  return { m, relogio, ler: async (nome, rotulos) => valor(await m.texto(), nome, rotulos) };
}

/** Simula uma requisição atravessando o middleware; `duracaoMs` passa no relógio falso. */
function requisicao(m, relogio, { path, method = 'GET', rota, status = 200, duracaoMs = 20 }) {
  const req = { path, method, route: rota ? { path: rota } : undefined };
  const res = new EventEmitter();
  res.statusCode = status;
  let chamadas = 0;
  m.middlewareHttp()(req, res, () => { chamadas++; });
  relogio.t += duracaoMs;
  res.emit('finish');
  return chamadas;
}

test('mede a duração por rota, método e código, e chama next() uma vez', async () => {
  const { m, relogio, ler } = novo();
  const chamadas = requisicao(m, relogio, { path: '/api/status', rota: '/api/status', status: 200, duracaoMs: 20 });
  assert.equal(chamadas, 1);
  const rot = { rota: '/api/status', metodo: 'GET', codigo: '200' };
  assert.equal(await ler('dfi_http_request_duration_seconds_count', rot), 1);
  assert.equal(await ler('dfi_http_request_duration_seconds_sum', rot), 0.02);
  assert.equal(await ler('dfi_http_request_duration_seconds_bucket', { ...rot, le: '0.025' }), 1);
});

test('sem rota: 404 vira "nao_encontrada" e o resto vira "estatico" (a URL nunca vira rótulo)', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/qualquer/coisa/123', status: 404 });
  requisicao(m, relogio, { path: '/css/style.css', status: 200 });
  requisicao(m, relogio, { path: '/js/app.js', status: 304 });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: 'nao_encontrada', codigo: '404' }), 1);
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: 'estatico' }), 2);
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: '/qualquer/coisa/123' }), null);
});

test('o próprio /metrics não entra na medição', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/metrics', rota: '/metrics' });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { rota: '/metrics' }), null);
});

test('método HTTP fora da lista vira "outro"', async () => {
  const { m, relogio, ler } = novo();
  requisicao(m, relogio, { path: '/api/status', rota: '/api/status', method: 'BREW' });
  assert.equal(await ler('dfi_http_request_duration_seconds_count', { metodo: 'outro' }), 1);
});

test('res sem .on() não quebra: o aviso vai ao log e next() ainda é chamado', () => {
  const aviso = mock.method(console, 'warn', () => {});
  const { m } = novo();
  let chamadas = 0;
  assert.doesNotThrow(() => m.middlewareHttp()({ path: '/', method: 'GET' }, {}, () => { chamadas++; }));
  assert.equal(chamadas, 1);
  assert.ok(aviso.mock.callCount() >= 1);
  aviso.mock.restore();
});
