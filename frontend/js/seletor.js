// ============================================================
// DATA FLOW INVENTORY — LED da tecla ARC (seletor de vistas)
// ------------------------------------------------------------
// Mostra, de qualquer vista, o pior estado entre os enlaces
// monitorados. É o dono do ritmo de consulta a /api/status:
// 5 s com #/arquitetura aberta, 30 s nas outras vistas,
// parado com a aba oculta.
// ============================================================
import { coletorCompartilhado } from './arquitetura-sinais.js';
import { derivarStatus } from './arquitetura-status.js';
import { ROTULO_ESTADO } from './arquitetura-dados.js';

const led = document.getElementById('arc-led');
const texto = document.getElementById('arc-led-texto');
const coletor = coletorCompartilhado();

function pintar() {
  if (!led) return;
  const { resumo } = derivarStatus(coletor.obter(), Date.now());
  led.dataset.estado = resumo.pior;
  if (texto) {
    texto.textContent = `, conexões: ${resumo.ok} de ${resumo.monitorados} OK, pior estado ${ROTULO_ESTADO[resumo.pior]}`;
  }
}

function ajustarRitmo() {
  if (document.hidden) coletor.definirRitmo('parado');
  else coletor.definirRitmo(location.hash === '#/arquitetura' ? 'ativo' : 'fundo');
}

coletor.aoMudar(pintar);
setInterval(pintar, 5000); // reavalia a idade do último dado de campo (regra de 60 s do UART)
window.addEventListener('hashchange', ajustarRitmo);
document.addEventListener('visibilitychange', ajustarRitmo);
ajustarRitmo();
pintar();
