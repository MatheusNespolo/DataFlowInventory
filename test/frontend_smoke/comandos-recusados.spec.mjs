// E2E3 e E2E6 (card #27): comandos recusados mostram feedback no histórico do dashboard.
// Backend: simulador (porta 3100, estoque 15). O caso sem_estoque está em sem-estoque.spec.mjs
// (simulador dedicado com 1 peça por tipo), para não esgotar o estoque dos outros specs.
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros, historicoContendo, gravarErrosComando, lerErrosComando } from './helpers.mjs';

test('E2E3 — pedido com o sistema ocupado é recusado e o histórico mostra o motivo', async ({ browser }) => {
  // Rate limit é por socket: um segundo dashboard (outra aba) não é barrado por ele,
  // então a recusa vem do estado do sistema, não da frequência.
  const contexto = await browser.newContext();
  const principal = await contexto.newPage();
  const segunda = await contexto.newPage();
  const erros = coletarErros(principal);
  try {
    await principal.goto('/');
    await segunda.goto('/');
    await expect(principal.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(segunda.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');

    // O simulador é compartilhado com os specs anteriores e reenvia os últimos eventos em
    // "estado_inicial": o histórico já pode trazer pedidos/entregas de A. Conta antes de pedir.
    const solicitadasAntes = await historicoContendo(principal, 'Peça A solicitada').count();
    const entreguesAntes = await historicoContendo(principal, 'Peça A entregue').count();

    await principal.locator('#btn-solicitar-a').click();
    // Aguarda o evento de pedido aceite confirmar que o simulador saiu do estado inicial.
    // A confirmação é lida na aba que pediu: no CI, a segunda aba às vezes perde o WebSocket
    // enquanto termina de carregar a cena 3D e, ao reconectar, o dashboard não repete o
    // histórico (só o estado). O estado ocupado chega a ela de qualquer forma, via
    // "status" ou "estado_inicial" da reconexão.
    await expect(historicoContendo(principal, 'Peça A solicitada')).toHaveCount(solicitadasAntes + 1);
    await expect(segunda.locator('#estado-atual')).not.toHaveText('AGUARDANDO_PEDIDO');

    // Os botões ficam desabilitados fora de AGUARDANDO_PEDIDO; o pedido vai direto pelo socket.
    await segunda.evaluate(() => window.dfiSocket.emit('solicitar_peca', { peca: 'B' }));
    await expect(historicoContendo(segunda, 'Erro: Sistema ocupado')).toHaveCount(1);

    // O pedido original não é afetado: A é entregue e o sistema volta a aguardar.
    await expect(principal.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(historicoContendo(principal, 'Peça A entregue')).toHaveCount(entreguesAntes + 1);
    await expect(principal.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
    await expect(historicoContendo(principal, 'Sistema ocupado')).toHaveCount(0);
    esperarSemErros(erros);
  } finally {
    await contexto.close();
  }
});

test('E2E3 — peça inválida é recusada com feedback e o sistema não muda de estado', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  await gravarErrosComando(page);

  await page.evaluate(() => window.dfiSocket.emit('solicitar_peca', { peca: 'Z' }));
  await expect(historicoContendo(page, 'Erro: Peça inválida: Z')).toHaveCount(1);
  expect(await lerErrosComando(page)).toEqual(['Peça inválida: Z']);
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
});

test('E2E6 — rate limit: segundo comando em < COMANDO_INTERVALO_MS é recusado; depois do intervalo, aceito', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  await gravarErrosComando(page);

  // Dois comandos no mesmo instante (mesmo evento do navegador): o 2º cai dentro do intervalo
  // de 500 ms do simulador, antes mesmo de qualquer verificação de estado.
  await page.evaluate(() => {
    window.dfiSocket.emit('solicitar_peca', { peca: 'A' });
    window.dfiSocket.emit('solicitar_peca', { peca: 'B' });
  });
  await expect(historicoContendo(page, 'Muitos comandos — aguarde 500ms entre envios')).toHaveCount(1);
  expect(await lerErrosComando(page)).toEqual(['Muitos comandos — aguarde 500ms entre envios']);

  // O 1º pedido segue normalmente (A entregue); B nunca foi aceito.
  await expect(page.locator('#estado-atual')).toHaveText('AGUARDANDO_PEDIDO');
  await expect(historicoContendo(page, 'Peça A entregue').count()).resolves.toBeGreaterThanOrEqual(1);
  expect(await lerErrosComando(page)).toEqual(['Muitos comandos — aguarde 500ms entre envios']);

  // Passado o intervalo, o comando volta a ser aceito (o botão usa o mesmo caminho).
  const antes = await historicoContendo(page, 'Peça B entregue').count();
  await page.locator('#btn-solicitar-b').click();
  await expect(historicoContendo(page, 'Peça B entregue')).toHaveCount(antes + 1);
  expect(await lerErrosComando(page)).toHaveLength(1);
});
