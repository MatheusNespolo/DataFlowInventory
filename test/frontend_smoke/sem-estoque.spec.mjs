// E2E3 (card #27), caso sem_estoque: roda contra um simulador DEDICADO (porta 3102) que sobe
// com 1 peça de cada tipo (ESTOQUE_INICIAL=1). Assim o estoque zerado não afeta os outros specs.
import { test, expect } from '@playwright/test';
import { historicoContendo } from './helpers.mjs';

test('E2E3 — peça sem estoque: ERRO sem_estoque aparece no histórico, nos botões e some após o reset', async ({ page }) => {
  await page.goto('/');
  const estado = page.locator('#estado-atual');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
  await expect(page.locator('#estoque-a')).toHaveText('1');

  // 1ª entrega esgota a peça A. O histórico pode trazer a mesma entrega no snapshot inicial;
  // guardamos a contagem para afirmar especificamente que esta solicitação produziu uma linha nova.
  const entregasAntes = await historicoContendo(page, 'Peça A entregue').count();
  await page.locator('#btn-solicitar-a').click();
  await expect(historicoContendo(page, 'Peça A entregue')).toHaveCount(entregasAntes + 1);
  await expect(page.locator('#estoque-a')).toHaveText('0');
  await expect(page.locator('#estoque-badge-a')).toContainText('Sem estoque');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');

  // 2ª solicitação de A: o simulador entra em ERRO (sem_estoque) e os botões travam.
  await page.locator('#btn-solicitar-a').click();
  await expect(estado).toHaveText('ERRO');
  await expect(historicoContendo(page, 'Erro: sem_estoque')).toHaveCount(1);
  await expect(page.locator('#btn-solicitar-a')).toBeDisabled();
  await expect(page.locator('#btn-solicitar-b')).toBeDisabled();
  await expect(page.locator('#ajuda-controle')).toBeVisible();

  // O reset recupera o sistema; as outras peças (B, C) seguem disponíveis.
  await page.locator('#btn-reset').click();
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
  await expect(page.locator('#estoque-b')).toHaveText('1');
  await page.locator('#btn-solicitar-b').click();
  await expect(historicoContendo(page, 'Peça B entregue')).toHaveCount(1);
});
