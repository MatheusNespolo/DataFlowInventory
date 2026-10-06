// E2E5 (card #27): contrato de GET /api/status.
//  - servidor real sem broker (porta 3101): 503 com o schema completo;
//  - simulador (porta 3100): a rota não existe (404) e o dashboard tolera isso.
// O caso 200 (broker conectado) exige um broker MQTT; é coberto por
// test/server_metrics/integracao/harness.test.mjs (aedes em processo, mqtt=true → 200).
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test.describe('servidor real, broker inalcançável', () => {
  test('E2E5 — GET /api/status responde 503 com o schema esperado', async ({ request }) => {
    const r = await request.get('/api/status');
    expect(r.status()).toBe(503);
    expect(r.headers()['content-type']).toMatch(/application\/json/);
    const c = await r.json();
    expect(c).toMatchObject({
      server: 'online',
      mqtt: false,
      brokerUrl: 'mqtt://127.0.0.1',
      clientesWs: expect.any(Number),
      gateway: 'desconhecido',
      uptime: expect.any(Number),
      timestamp: expect.any(String),
      metricas: {
        iniciadoEm: expect.any(String),
        mensagensPorTopico: expect.any(Object),
        comandosPublicados: expect.any(Number),
        comandosRejeitados: expect.any(Number),
      },
    });
    expect(c.metricas).toHaveProperty('ultimaMensagemEm');
    expect(Number.isNaN(Date.parse(c.timestamp))).toBe(false);
    expect(Number.isNaN(Date.parse(c.metricas.iniciadoEm))).toBe(false);
  });

  test('E2E5 — com o broker fora, comando do dashboard é recusado com "Broker MQTT offline"', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__errosComando = [];
      window.dfiSocket.on('comando_erro', (e) => window.__errosComando.push(e.erro));
      window.dfiSocket.emit('solicitar_peca', { peca: 'A' });
    });
    await expect.poll(() => page.evaluate(() => window.__errosComando)).toEqual(['Broker MQTT offline']);
    await expect(page.locator('#historico-lista .historico-msg', { hasText: 'Erro: Broker MQTT offline' })).toHaveCount(1);
    const c = await (await page.request.get('/api/status')).json();
    expect(c.metricas.comandosRejeitados).toBeGreaterThanOrEqual(1);
  });
});

test.describe('simulador', () => {
  test('E2E5 — o simulador não expõe /api/status (404) e o dashboard segue sem erros', async ({ page, request }) => {
    const resposta = await request.get('/api/status');
    expect(resposta.status()).toBe(404);
    const erros = coletarErros(page);
    await page.goto('/#/arquitetura');
    await expect(page.locator('#arq-modo')).toContainText('Simulador');
    await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', /3d|fallback/);
    esperarSemErros(erros);
  });
});
