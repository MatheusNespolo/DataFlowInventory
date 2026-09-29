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

test('cenário 4d — CDN do Socket.IO inacessível: botões funcionam (cliente servido localmente)', async ({ page }) => {
  await page.route('https://cdn.socket.io/**', (r) => r.abort());
  const erros = coletarErros(page, /cdn\.socket\.io/);
  await page.goto('/');
  await expect(page.locator('script[src="/socket.io/socket.io.js"]')).toHaveCount(1);
  await roteiroBotoes(page);
  esperarSemErros(erros);
});
