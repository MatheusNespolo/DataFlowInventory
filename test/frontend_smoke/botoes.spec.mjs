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

test('botões de controle: ícones SVG (sem emoji), ≥ 44 px, ajuda ligada por aria-describedby', async ({ page }) => {
  await page.goto('/');
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset']) {
    const b = page.locator(`#${id}`);
    await expect(b.locator('svg.ico')).toHaveCount(1);
    expect(await b.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  for (const id of ['btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-describedby', 'ajuda-controle');
  }
});

test('--muted atinge contraste 4,5:1 sobre --bay-raised', async ({ page }) => {
  await page.goto('/');
  const razao = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const hex = (v) => css.getPropertyValue(v).trim();
    const lum = (h) => {
      const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const a = lum(hex('--muted'));
    const b = lum(hex('--bay-raised'));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(razao).toBeGreaterThanOrEqual(4.5);
});
