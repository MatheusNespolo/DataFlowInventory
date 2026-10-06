// Cenário 4 (spec §7.2): falhas dos módulos novos nunca derrubam os botões.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, roteiroBotoes } from './helpers.mjs';

test('cenário 4a — arquitetura-vista.js bloqueado: botões funcionam', async ({ page }) => {
  await page.route('**/js/arquitetura-vista.js', (r) => r.abort());
  const erros = coletarErros(page, /arquitetura-vista\.js/);
  await page.goto('/');
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 4b — arquitetura3d.js bloqueado: fallback 2D completo e botões funcionam', async ({ page }) => {
  await page.route('**/js/arquitetura3d.js', (r) => r.abort());
  const erros = coletarErros(page, /arquitetura3d\.js/);
  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', 'fallback');
  await expect(page.locator('button.arq-rotulo')).toHaveCount(7);
  await expect(page.locator('button.arq-rotulo[data-no="simulador"]')).toHaveAttribute('data-estado', 'ok');
  await expect(page.locator('path.arq-fb-enlace[data-enlace="socket-simulador"]')).toHaveAttribute('data-estado', 'ok');

  await page.locator('button.arq-rotulo[data-no="broker"]').click();
  await expect(page.locator('#arq-detalhes')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#arq-detalhes')).toBeHidden();

  await page.locator('a.seletor-tecla[href="#/"]').click();
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 4c — three.module.min.js bloqueado: mímico SVG, arquitetura 2D e botões funcionam', async ({ page }) => {
  await page.route('**/vendor/three.module.min.js', (r) => r.abort());
  const erros = coletarErros(page, /three\.module\.min\.js|arquitetura3d\.js|diagrama3d\.js/);
  await page.goto('/');
  await roteiroBotoes(page);
  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', 'fallback');
  esperarSemErros(erros);
});

test('E2E4 — queda do WebSocket: "Sem enlace", reconexão e estado restaurado (estoque atualizado enquanto offline)', async ({ browser }) => {
  const contexto = await browser.newContext();
  const painel = await contexto.newPage();
  const outra = await contexto.newPage();
  try {
    await painel.goto('/');
    await outra.goto('/');
    await expect(painel.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(outra.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(painel.locator('#mqtt-status')).toContainText('Conectado');
    const antes = parseInt(await painel.locator('#estoque-a').innerText(), 10);
    expect(antes).toBeGreaterThan(0);

    // Queda do transporte (equivale a perder a rede), sem reconexão automática:
    // assim o servidor muda de estado enquanto este painel está comprovadamente fora.
    await painel.evaluate(() => {
      window.dfiSocket.io.reconnection(false);
      window.dfiSocket.io.engine.close();
    });
    await expect(painel.locator('#mqtt-status')).toContainText('Sem enlace');
    expect(await painel.evaluate(() => window.dfiSocket.connected)).toBe(false);

    await outra.locator('#btn-solicitar-a').click();
    await expect(outra.locator('#estoque-a')).toHaveText(String(antes - 1));
    await expect(outra.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    // O painel offline não recebeu a atualização.
    await expect(painel.locator('#estoque-a')).toHaveText(String(antes));

    // Volta a rede: o estado_inicial devolve o estoque atual e o histórico registra a reconexão.
    await painel.evaluate(() => {
      window.dfiSocket.io.reconnection(true);
      window.dfiSocket.connect();
    });
    await expect(painel.locator('#mqtt-status')).toContainText('Conectado');
    await expect(painel.locator('#estoque-a')).toHaveText(String(antes - 1));
    await expect(painel.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(painel.locator('#historico-lista .historico-msg', { hasText: 'Reconectado ao servidor' })).toHaveCount(1);
    await expect(painel.locator('#btn-solicitar-a')).toBeEnabled();
  } finally {
    await contexto.close();
  }
});

test('cenário 4d — CDN do Socket.IO inacessível: botões funcionam (cliente servido localmente)', async ({ page }) => {
  await page.route('https://cdn.socket.io/**', (r) => r.abort());
  const erros = coletarErros(page, /cdn\.socket\.io/);
  await page.goto('/');
  await expect(page.locator('script[src="/socket.io/socket.io.js"]')).toHaveCount(1);
  await roteiroBotoes(page);
  esperarSemErros(erros);
});
