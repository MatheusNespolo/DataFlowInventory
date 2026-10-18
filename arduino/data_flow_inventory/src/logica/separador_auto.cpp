#include "separador_auto.h"

void separadorAutoIniciar(SeparadorAuto& a, uint32_t esperaMs) {
  a.esperaMs = esperaMs;
  a.ultimaEntregaMs = 0;
  a.houveEntrega = false;
}

void separadorAutoEntrega(SeparadorAuto& a, uint32_t agoraMs) {
  a.ultimaEntregaMs = agoraMs;
  a.houveEntrega = true;
}

char separadorAutoDestino(const SeparadorAuto& a, Estado estado, uint8_t peca, uint32_t agoraMs) {
  // Só depois da checagem prévia: pedido recusado (sem estoque, sem peça, junção
  // obstruída) não gira a roda à toa.
  if (estado != ACIONANDO_ESTEIRA && estado != ENTREGANDO_PECA) return 0;
  if (peca < 1 || peca > 3) return 0;
  // A peça do pedido anterior ainda pode estar na esteira principal: não tira a
  // roda do lugar antes do fim da espera. Aritmética sem sinal (estouro do millis).
  if (a.houveEntrega && (uint32_t)(agoraMs - a.ultimaEntregaMs) < a.esperaMs) return 0;
  return letraPeca(peca);
}
