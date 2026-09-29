import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, roteiroBotoes, IDS_CONTRATO } from './helpers.mjs';

test('cenário 1 — botões Solicitar A/B/C e Reiniciar funcionam', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  await roteiroBotoes(page);
  esperarSemErros(erros);
});

test('cenário 2 — contrato de IDs preservado', async ({ page }) => {
  await page.goto('/');
  for (const id of IDS_CONTRATO) {
    await expect(page.locator(`#${id}`), `#${id} ausente`).toHaveCount(1);
  }
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    expect(await page.locator(`#${id}`).evaluate((el) => el.tagName)).toBe('BUTTON');
  }
});

test('layout do painel principal intacto (grade do .cluster aplicada)', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('#view-principal').evaluate((el) => getComputedStyle(el).display)).toBe('grid');
});
