// Cenário 7 (spec §7.2): roda contra server/ (helmet + CSP real) com broker inalcançável.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test('cenário 7 — CSP do helmet não bloqueia nada e broker fora aparece como falha', async ({ page }) => {
  const violacoes = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to (load|execute|apply)/i.test(m.text())) violacoes.push(m.text());
  });
  const erros = coletarErros(page);

  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', '3d');
  await expect(page.locator('#arq-modo')).toHaveText('Modo 1 · Mosquitto local');
  await expect(page.locator('button.arq-rotulo[data-no="servidor"]')).toHaveAttribute('data-estado', 'falha');
  await expect(page.locator('#arc-led')).toHaveAttribute('data-estado', 'falha');

  await page.locator('button.arq-rotulo[data-no="servidor"]').click();
  await page.locator('button.arq-link-enlace[data-enlace="mqtt-servidor"]').click();
  await expect(page.locator('#arq-detalhes .arq-estado').first()).toHaveAttribute('data-estado', 'falha');
  await expect(page.locator('#arq-detalhes')).toContainText('GET /api/status');

  // O painel principal também carrega sem violações sob a CSP.
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await expect(page.locator('#btn-solicitar-a')).toBeVisible();

  expect(violacoes, violacoes.join('\n')).toEqual([]);
  esperarSemErros(erros);
});
