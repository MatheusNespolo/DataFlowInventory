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

test('cenário 3b — seletor de vistas: teclas, aria-current e contador LOG', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  const teclas = page.locator('nav.seletor a.seletor-tecla');
  await expect(teclas).toHaveCount(3);
  await expect(page.locator('a.seletor-tecla[href="#/"]')).toHaveAttribute('aria-current', 'page');

  // Um comando gera evento no histórico enquanto a vista LOG está fechada.
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  await page.locator('#btn-reset').click();
  await expect(page.locator('#log-contador')).toBeVisible();

  await page.locator('a.seletor-tecla[href="#/status"]').click();
  await soVisivel(page, '#view-status');
  await expect(page.locator('a.seletor-tecla[href="#/status"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#log-contador')).toBeHidden();

  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await soVisivel(page, '#view-arquitetura');
  await expect(page.locator('a.seletor-tecla[href="#/arquitetura"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('a.seletor-tecla[aria-current]')).toHaveCount(1);

  // Atalhos contextuais levam à arquitetura.
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await page.locator('.bay-mimic a.bay-atalho').click();
  await soVisivel(page, '#view-arquitetura');
  await page.goBack();
  await page.locator('#gateway-status a.annun-atalho').click();
  await soVisivel(page, '#view-arquitetura');

  // Links antigos saíram.
  await expect(page.locator('#footer-nav')).toHaveCount(0);
  await expect(page.locator('a.voltar')).toHaveCount(0);
  esperarSemErros(erros);
});

test('teclas do seletor têm ≥ 44 px de altura', async ({ page }) => {
  await page.goto('/');
  for (const t of await page.locator('a.seletor-tecla').all()) {
    expect((await t.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
});
