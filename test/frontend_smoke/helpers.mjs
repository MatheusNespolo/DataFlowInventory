// ============================================================
// Utilitários compartilhados dos testes E2E
// ============================================================
import { expect } from '@playwright/test';

// Recursos externos cuja falha de rede não indica defeito do dashboard,
// e /api/status, cujo 404 (simulador) e 503 (broker fora) são respostas esperadas.
const IGNORAR = /fonts\.(googleapis|gstatic)\.com|favicon\.ico|\/api\/status/;

/**
 * Registra erros de página/console. Retorna um array preenchido ao longo do teste.
 * ignorarExtra: padrão adicional (ex.: um recurso bloqueado de propósito pelo teste).
 */
export function coletarErros(page, ignorarExtra = null) {
  const erros = [];
  const ignora = (s) => IGNORAR.test(s) || (ignorarExtra && ignorarExtra.test(s));
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (ignora(m.text()) || ignora(url)) return;
    erros.push(`console: ${m.text()}`);
  });
  return erros;
}

export function esperarSemErros(erros) {
  expect(erros, erros.join('\n')).toEqual([]);
}

/** Linhas do histórico com exatamente este texto. */
function linhas(page, texto) {
  return page.locator('#historico-lista .historico-msg', { hasText: new RegExp(`^${texto}$`) });
}

/** Linhas do histórico que CONTÊM o trecho (texto literal, sem regex). */
export function historicoContendo(page, trecho) {
  return page.locator('#historico-lista .historico-msg', { hasText: trecho });
}

/**
 * Registra, dentro da página, os `comando_erro` recebidos pelo socket do dashboard
 * (window.__errosComando). Use lerErrosComando para ler.
 */
export async function gravarErrosComando(page) {
  await page.evaluate(() => {
    window.__errosComando = [];
    window.dfiSocket.on('comando_erro', (e) => window.__errosComando.push(e.erro));
  });
}

export async function lerErrosComando(page) {
  return page.evaluate(() => window.__errosComando);
}

/**
 * Roteiro dos botões de controle (cenário 1, spec §7.2).
 * Conta as linhas antes de clicar, porque o simulador reenvia os últimos
 * eventos em "estado_inicial" (execuções anteriores já entregaram peças).
 */
export async function roteiroBotoes(page) {
  const estado = page.locator('#estado-atual');
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');

  for (const peca of ['A', 'B', 'C']) {
    const botao = page.locator(`#btn-solicitar-${peca.toLowerCase()}`);
    await expect(botao).toBeEnabled();
    const antes = await linhas(page, `Peça ${peca} entregue`).count();
    await botao.click();
    await expect(linhas(page, `Peça ${peca} entregue`)).toHaveCount(antes + 1);
    await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
    await expect(botao).toBeEnabled();
  }

  await expect(page.locator('#ajuda-controle')).toBeHidden();

  const antesReset = await linhas(page, 'Comando enviado: reset').count();
  await page.locator('#btn-reset').click();
  await expect(linhas(page, 'Comando enviado: reset')).toHaveCount(antesReset + 1);
  await expect(estado).toHaveText('AGUARDANDO_PEDIDO');
}

// Intervalo mínimo entre comandos do mesmo socket (COMANDO_INTERVALO_MS do simulador, padrão 500).
export const INTERVALO_COMANDO_MS = 500;

// Alvo de toque mínimo (WCAG 2.5.5: 44 × 44 px). O boundingBox do navegador
// devolve frações (ex.: 43.99998 px para min-height: 44px com layout em
// subpixel), então a comparação aceita 0,01 px de arredondamento.
export const ALTURA_MIN_TOQUE = 44 - 0.01;

/** IDs usados por frontend/js/app.js (objeto els) e diagrama3d.js — contrato congelado (§3.3). */
export const IDS_CONTRATO = [
  'mqtt-status', 'gateway-status', 'server-time', 'annun-estado', 'annun-estado-v',
  'annun-estoque', 'annun-estoque-v', 'estado-atual', 'peca-solicitada', 'uptime',
  'estoque-a', 'estoque-b', 'estoque-c', 'estoque-badge-a', 'estoque-badge-b', 'estoque-badge-c',
  'esteira-principal', 'esteira-a', 'esteira-b', 'esteira-c',
  'sensor-topo-a', 'sensor-topo-b', 'sensor-topo-c', 'sensor-j1', 'sensor-j2', 'sensor-j3',
  'svg-esteira-principal', 'svg-esteira-a', 'svg-esteira-b', 'svg-esteira-c',
  'svg-sensor-topo-a', 'svg-sensor-topo-b', 'svg-sensor-topo-c',
  'svg-sensor-j1', 'svg-sensor-j2', 'svg-sensor-j3',
  'driver-info', 'btn-solicitar-a', 'btn-solicitar-b', 'btn-solicitar-c', 'btn-reset',
  'historico-lista', 'view-principal', 'view-status', 'mimic-3d',
];
