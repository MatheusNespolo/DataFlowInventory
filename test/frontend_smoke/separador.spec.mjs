// O cilindro do separador no diagrama reage à ativação: a roda se prepara no
// compartimento da peça pedida (mesma regra do firmware) e fica nele depois da
// entrega. Backend: simulador (porta 3100). A posição é estimada em malha aberta
// (js/separador.js); lê-se o estado compartilhado window.EstadoDiagrama.separador,
// que alimenta a cena 3D e o SVG de reserva.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, historicoContendo } from './helpers.mjs';

const lerRoda = (page) => page.evaluate(() => ({ ...window.EstadoDiagrama.separador }));

test('separador — a roda gira até a peça pedida (por A, B e C) e permanece depois da entrega', async ({ page }) => {
  const erros = coletarErros(page);
  await page.goto('/');
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  // Página nova: a roda é SUPOSTA no neutro (o diagrama não sabe onde ela realmente está).
  expect(await lerRoda(page)).toMatchObject({ destino: null, graus: 0, movendo: false });

  // B: 240° = 120° para trás, a 60°/s (~2 s).
  const entreguesB = await historicoContendo(page, 'Peça B entregue').count();
  await page.locator('#btn-solicitar-b').click();
  await expect.poll(async () => (await lerRoda(page)).destino, { timeout: 20_000 }).toBe('B');
  await expect.poll(async () => (await lerRoda(page)).graus, { timeout: 30_000 }).toBe(240);
  expect((await lerRoda(page)).movendo).toBe(false);
  // O SVG de reserva acompanha (gira no sentido oposto do atributo SVG).
  await expect(page.locator('#svg-separador-roda')).toHaveAttribute('transform', /^rotate\(-240\.00 440 150\)$/);

  // Depois da entrega o firmware volta a aguardar e a roda FICA em B.
  await expect(historicoContendo(page, 'Peça B entregue')).toHaveCount(entreguesB + 1);
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  expect(await lerRoda(page)).toMatchObject({ destino: 'B', graus: 240, movendo: false });

  // A: de 240° a 120° (caminho mais curto, 120° para trás).
  await page.waitForTimeout(600); // respeita o intervalo mínimo entre comandos
  const entreguesA = await historicoContendo(page, 'Peça A entregue').count();
  await page.locator('#btn-solicitar-a').click();
  await expect.poll(async () => (await lerRoda(page)).graus, { timeout: 30_000 }).toBe(120);
  expect((await lerRoda(page)).destino).toBe('A');
  await expect(historicoContendo(page, 'Peça A entregue')).toHaveCount(entreguesA + 1);
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');

  // C: o neutro (0°).
  await page.waitForTimeout(600);
  const entreguesC = await historicoContendo(page, 'Peça C entregue').count();
  await page.locator('#btn-solicitar-c').click();
  await expect.poll(async () => (await lerRoda(page)).graus, { timeout: 30_000 }).toBe(0);
  expect((await lerRoda(page)).destino).toBe('C');
  await expect(historicoContendo(page, 'Peça C entregue')).toHaveCount(entreguesC + 1);

  esperarSemErros(erros);
});

test('separador — com prefers-reduced-motion a roda vai direto ao compartimento', async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await contexto.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await page.locator('#btn-solicitar-b').click();
    // Sem animação: assim que o destino é definido, o ângulo já é o do compartimento.
    await expect.poll(async () => lerRoda(page), { timeout: 20_000 })
      .toMatchObject({ destino: 'B', graus: 240, movendo: false });
  } finally {
    await contexto.close();
  }
});
