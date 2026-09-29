import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

// WebGL por software (SwiftShader) é lento: até ~66 s medidos no cenário 5a.
test.describe.configure({ timeout: 180_000 });

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
  const urls = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(urls.filter((u) => /arquitetura3d\.js/.test(u))).toEqual([]);
  await expect(page.locator('#arq-palco canvas')).toHaveCount(0);
});

test('cenário 5b — teclado abre detalhes de nó e de enlace; Esc fecha e devolve o foco', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/#/arquitetura');
  await expect(page.locator('#arq-palco')).toHaveAttribute('data-pronto', '3d');

  const broker = page.locator('button.arq-rotulo[data-no="broker"]');
  await broker.focus();
  await page.keyboard.press('Enter');
  const painel = page.locator('#arq-detalhes');
  await expect(painel).toBeVisible();
  await expect(page.locator('#arq-detalhes-titulo')).toHaveText('Broker MQTT');
  await expect(painel).toContainText('dataflow/status/server');
  await expect(painel).toContainText('ARCHITECTURE.md §2.2');
  await expect(broker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#arq-enquadrar')).toBeEnabled();

  await painel.locator('button.arq-link-enlace[data-enlace="mqtt-beckhoff"]').click();
  await expect(page.locator('#arq-detalhes-titulo')).toHaveText('Broker → Beckhoff');
  await expect(painel.locator('.arq-estado')).toHaveAttribute('data-estado', 'sem-telemetria');
  await expect(painel).toContainText('Não monitorado');

  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await expect(broker).toBeFocused();
  await expect(page.locator('#arq-enquadrar')).toBeDisabled();
  esperarSemErros(erros);
});

test('cenário 5c — detalhe do Arduino mostra FSM e pinagem', async ({ page }) => {
  await page.goto('/#/arquitetura');
  await page.locator('button.arq-rotulo[data-no="arduino"]').click();
  const painel = page.locator('#arq-detalhes');
  await expect(painel).toContainText('AGUARDANDO_PEDIDO');
  await expect(painel.locator('table')).toContainText('PWM 9, 10, 11');
  await page.locator('#arq-fechar').click();
  await expect(painel).toBeHidden();
});
