// Falta de energia dos periféricos: o Uno e o ESP32 seguem ligados pela USB, mas os seis
// sensores passam a ler "ocupado". O firmware (e o simulador, com SIMULAR_FALHAS=true) vai
// para ERRO com o erro sem_energia, e o dashboard mostra a faixa de alerta. Backend:
// simulador (porta 3100); a queda é disparada pelo evento de teste simular_falta_energia.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, historicoContendo, INTERVALO_COMANDO_MS } from './helpers.mjs';

const emitir = (page, evento) => page.evaluate((e) => window.dfiSocket.emit(e), evento);

// Devolve o simulador ao estado normal: energia de volta e reset (se estiver em ERRO).
async function restaurar(page) {
  await emitir(page, 'simular_energia_volta');
  if ((await page.locator('#estado-atual').textContent()) === 'ERRO') {
    await page.waitForTimeout(INTERVALO_COMANDO_MS + 100);
    await page.locator('#btn-reset').click();
  }
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
}

test('energia — queda em repouso: ERRO sem_energia, alerta visível e reset com a fonte ainda fora detecta de novo', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  const estado = page.locator('#estado-atual');
  const alerta = page.locator('#alerta-energia');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
  await expect(alerta).toBeHidden();

  try {
    const antes = await historicoContendo(page, 'Erro: sem_energia').count();
    await emitir(page, 'simular_falta_energia');
    await expect(estado).toHaveText('ERRO');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('Falta de energia nos periféricos');
    await expect(historicoContendo(page, 'Erro: sem_energia')).toHaveCount(antes + 1);
    await expect(page.locator('#btn-solicitar-a')).toBeDisabled();

    // Reset sem religar a fonte: volta a aguardar e, 500 ms depois, detecta de novo.
    await page.locator('#btn-reset').click();
    await expect(historicoContendo(page, 'Erro: sem_energia')).toHaveCount(antes + 2);
    await expect(estado).toHaveText('ERRO');
    await expect(alerta).toBeVisible();

    // Fonte religada e reset: o alerta some e o sistema volta a aguardar.
    await emitir(page, 'simular_energia_volta');
    await page.waitForTimeout(INTERVALO_COMANDO_MS + 100);
    await page.locator('#btn-reset').click();
    await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
    await expect(alerta).toBeHidden();
  } finally {
    await restaurar(page);
  }
  esperarSemErros(erros);
});

test('energia — queda no meio da entrega: para sem debitar o estoque', async ({ page }) => {
  await page.goto('/');
  const estado = page.locator('#estado-atual');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
  try {
    const estoqueB = (await page.locator('#estoque-b').textContent()).trim();
    await page.locator('#btn-solicitar-b').click();
    await expect(estado).toHaveText('ENTREGANDO_PECA');
    await emitir(page, 'simular_falta_energia');
    await expect(estado).toHaveText('ERRO');
    await expect(page.locator('#alerta-energia')).toBeVisible();
    await expect(historicoContendo(page, 'Erro: sem_energia')).not.toHaveCount(0);
    await expect(page.locator('#estoque-b')).toHaveText(estoqueB);  // sem débito
  } finally {
    await restaurar(page);
  }
});

test('energia — página aberta com o sistema já em ERRO por falta de energia mostra o alerta', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  try {
    await emitir(page, 'simular_falta_energia');
    await expect(page.locator('#estado-atual')).toHaveText('ERRO');

    const contexto = await browser.newContext();
    const nova = await contexto.newPage();
    try {
      await nova.goto('/');
      await expect(nova.locator('#estado-atual')).toHaveText('ERRO');
      await expect(nova.locator('#alerta-energia')).toBeVisible();  // semeado pelo estado_inicial
    } finally {
      await contexto.close();
    }
  } finally {
    await restaurar(page);
  }
});
