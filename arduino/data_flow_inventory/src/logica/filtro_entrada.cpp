#include "filtro_entrada.h"

void filtroIniciar(FiltroEntrada& f, bool valor, uint32_t agora, uint16_t janelaMs) {
  f.estavel = valor;
  f.bruto = valor;
  f.mudouEm = agora;
  f.janelaMs = janelaMs;
}

Borda filtroAtualizar(FiltroEntrada& f, bool bruto, uint32_t agora) {
  if (bruto != f.bruto) {
    f.bruto = bruto;
    f.mudouEm = agora;
    return BORDA_NENHUMA;
  }
  if (bruto != f.estavel && (uint32_t)(agora - f.mudouEm) >= f.janelaMs) {
    f.estavel = bruto;
    return bruto ? BORDA_OCUPOU : BORDA_LIBEROU;
  }
  return BORDA_NENHUMA;
}
