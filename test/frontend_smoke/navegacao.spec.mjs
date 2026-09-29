import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

const VISTAS = ['#view-principal', '#view-status', '#view-arquitetura'];

async function soVisivel(page, alvo) {
  for (const v of VISTAS) {
    if (v === alvo) await expect(page.locator(v)).toBeVisible();
    else await expect(page.locator(v)).toBeHidden();
  }
}

test('cenário 3a — deep link, rota desconhecida e botão Voltar', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  await soVisivel(page, '#view-arquitetura');
  await expect(page).toHaveTitle(/Arquitetura/);

  await page.goto('/#/qualquer-coisa');
  await soVisivel(page, '#view-principal');

  await page.goto('/#/status');
  await soVisivel(page, '#view-status');
  await page.evaluate(() => { location.hash = '#/arquitetura'; });
  await soVisivel(page, '#view-arquitetura');
  await page.goBack();
  await soVisivel(page, '#view-status');
  esperarSemErros(erros);
});

test('socket exposto para os módulos', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => !!(window.dfiSocket && window.dfiSocket.connected))).toBe(true);
});
