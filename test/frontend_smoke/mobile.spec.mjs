// Cenário 6 (spec §7.2): 375 px sem rolagem horizontal, barra inferior e alvos ≥ 44 px.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const ROTAS = ['#/', '#/status', '#/arquitetura'];

test('cenário 6 — sem rolagem horizontal, seletor como barra inferior, alvos ≥ 44 px', async ({ page }) => {
  const erros = coletarErros(page);
  for (const rota of ROTAS) {
    await page.goto(`/${rota}`);
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(0);

    const nav = await page.locator('nav.seletor').boundingBox();
    expect(nav.y + nav.height).toBeGreaterThan(812 - 2); // colada na base da tela
    for (const t of await page.locator('a.seletor-tecla').all()) {
      expect((await t.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }

  await page.goto('/#/');
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    const b = page.locator(`#${id}`);
    await b.scrollIntoViewIfNeeded();
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }

  // Controles da cena recolhidos atrás de um botão.
  await page.goto('/#/arquitetura');
  const abrir = page.locator('.arq-controles-abrir');
  await expect(abrir).toBeVisible();
  await expect(page.locator('#arq-controles-corpo')).toBeHidden();
  await abrir.click();
  await expect(page.locator('#arq-controles-corpo')).toBeVisible();
  await expect(abrir).toHaveAttribute('aria-expanded', 'true');
  esperarSemErros(erros);
});
