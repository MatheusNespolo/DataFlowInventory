// Filtro de entrada (debounce) e causa do reset.
#include "causa_reset.h"
#include "filtro_entrada.h"
#include "teste.h"

// ---- Filtro ------------------------------------------------------------------

TESTE(filtro_ignora_pulso_curto) {
  FiltroEntrada f;
  filtroIniciar(f, false, 0, 20);
  VERIFICA(filtroAtualizar(f, true, 100) == BORDA_NENHUMA);
  VERIFICA(filtroAtualizar(f, true, 110) == BORDA_NENHUMA);   // 10 ms
  VERIFICA(filtroAtualizar(f, false, 115) == BORDA_NENHUMA);  // voltou
  VERIFICA(filtroAtualizar(f, false, 200) == BORDA_NENHUMA);
  VERIFICA(!f.estavel);
}

TESTE(filtro_aceita_nivel_estavel_e_gera_bordas) {
  FiltroEntrada f;
  filtroIniciar(f, false, 0, 20);
  filtroAtualizar(f, true, 100);
  VERIFICA(filtroAtualizar(f, true, 120) == BORDA_OCUPOU);
  VERIFICA(f.estavel);
  filtroAtualizar(f, false, 300);
  VERIFICA(filtroAtualizar(f, false, 330) == BORDA_LIBEROU);
}

TESTE(filtro_funciona_no_estouro_do_millis) {
  FiltroEntrada f;
  const uint32_t quase = 0xFFFFFFF0UL;
  filtroIniciar(f, false, quase, 20);
  filtroAtualizar(f, true, quase + 5);
  VERIFICA(filtroAtualizar(f, true, quase + 30) == BORDA_OCUPOU);  // passou de 0
}

// ---- Causa do reset ------------------------------------------------------------

TESTE(causa_reset) {
  VERIFICA_TEXTO(causaReset(MCUSR_WDRF, false, false), "watchdog");
  VERIFICA_TEXTO(causaReset(0, true, true), "watchdog");
  VERIFICA_TEXTO(causaReset(MCUSR_BORF, true, false), "brownout");
  VERIFICA_TEXTO(causaReset(MCUSR_PORF, true, false), "energia");
  VERIFICA_TEXTO(causaReset(0, false, false), "energia");
  VERIFICA_TEXTO(causaReset(0, true, false), "reinicio");
  VERIFICA_TEXTO(causaReset(MCUSR_EXTRF, true, false), "reinicio");
  VERIFICA_TEXTO(causaReset(0, false, true), "energia");  // marca sem assinatura não vale
}
