import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

test('cenário 5a — cena 3D pronta no modo simulador', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  const palco = page.locator('#arq-palco');
  await expect(palco).toHaveAttribute('data-pronto', '3d');
  await expect(palco.locator('canvas[role="img"]')).toHaveCount(1);
  await expect(page.locator('#arq-modo')).toHaveText('Modo 3 · Simulador');

  const rotulos = page.locator('button.arq-rotulo');
  await expect(rotulos).toHaveCount(7);
  await expect(page.locator('button.arq-rotulo[data-no="simulador"]')).toHaveAttribute('data-estado', 'ok');
  await expect(page.locator('button.arq-rotulo[data-no="arduino"]')).toHaveAttribute('data-estado', 'fora-do-modo');
  await expect(page.locator('button.arq-rotulo[data-no="beckhoff"]')).toHaveAttribute('data-estado', 'sem-telemetria');
  await expect(page.locator('#arq-atualizado')).toContainText('atualizado há');

  // Presets de câmera e alternadores não geram erro.
  for (const cam of ['campo', 'nuvem', 'aplicacao', 'geral']) {
    await page.locator(`[data-camera="${cam}"]`).click();
  }
  await page.locator('#arq-rotulos').uncheck();
  await expect(rotulos.first()).toBeHidden();
  await page.locator('#arq-rotulos').check();
  await expect(rotulos.first()).toBeVisible();
  await page.locator('#arq-particulas').uncheck();

  // Sair e voltar mantém a cena (construída uma única vez).
  await page.locator('a.seletor-tecla[href="#/"]').click();
  await page.locator('a.seletor-tecla[href="#/arquitetura"]').click();
  await expect(page.locator('#arq-palco canvas')).toHaveCount(1);
  esperarSemErros(erros);
});

test('a cena não é construída fora da rota', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#arq-palco canvas')).toHaveCount(0);
});
