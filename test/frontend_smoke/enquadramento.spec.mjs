// Regressão do enquadramento da visão geral (I1): em qualquer proporção de
// palco, todas as placas ficam dentro do palco, fora do painel de controles
// e sem sobreposição. Não clica em Solicitar/Reiniciar (estoque do simulador).
import { test, expect } from '@playwright/test';
import { coletarErros, esperarSemErros } from './helpers.mjs';

// WebGL por software (SwiftShader) é lento: mesma folga do arquitetura.spec.
test.describe.configure({ timeout: 180_000 });

const dentro = (a, b) => a.x >= b.x - 1 && a.y >= b.y - 1
  && a.x + a.width <= b.x + b.width + 1 && a.y + a.height <= b.y + b.height + 1;
const cruzam = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width
  && a.y < b.y + b.height && b.y < a.y + a.height;

async function caixasDosRotulos(page) {
  const caixas = [];
  for (const r of await page.locator('button.arq-rotulo').all()) {
    if (!(await r.isVisible())) continue;
    caixas.push({ no: await r.getAttribute('data-no'), caixa: await r.boundingBox() });
  }
  return caixas;
}

const TAMANHOS = [
  { nome: '1366×768', viewport: { width: 1366, height: 768 }, desktop: true },
  { nome: '1920×1080', viewport: { width: 1920, height: 1080 }, desktop: true },
  { nome: '375×812', viewport: { width: 375, height: 812 }, desktop: false, isMobile: true, hasTouch: true },
];

for (const t of TAMANHOS) {
  test.describe(`visão geral em ${t.nome}`, () => {
    test.use({ viewport: t.viewport, isMobile: !!t.isMobile, hasTouch: !!t.hasTouch });

    test(`placas dentro do palco${t.desktop ? ', fora dos controles e sem sobreposição' : ''}`, async ({ page }) => {
      const erros = coletarErros(page);
      await page.goto('/#/arquitetura');
      const palco = page.locator('#arq-palco');
      await expect(palco).toHaveAttribute('data-pronto', '3d');
      await page.waitForTimeout(1500); // voo inicial / amortecimento

      const caixaPalco = await palco.boundingBox();
      const caixas = await caixasDosRotulos(page);
      expect(caixas.length).toBe(7);
      for (const { no, caixa } of caixas) {
        expect(dentro(caixa, caixaPalco), `placa ${no} fora do palco: ${JSON.stringify(caixa)}`).toBe(true);
      }

      if (t.desktop) {
        const controles = await page.locator('.arq-controles').boundingBox();
        for (const { no, caixa } of caixas) {
          expect(cruzam(caixa, controles), `placa ${no} sob os controles`).toBe(false);
        }
        for (let i = 0; i < caixas.length; i++) {
          for (let j = i + 1; j < caixas.length; j++) {
            expect(cruzam(caixas[i].caixa, caixas[j].caixa),
              `placas ${caixas[i].no} e ${caixas[j].no} sobrepostas`).toBe(false);
          }
        }
      }
      esperarSemErros(erros);
    });
  });
}
