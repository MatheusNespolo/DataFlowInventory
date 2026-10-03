#include "supervisor_entrega.h"

void supervisorIniciar(Supervisor& s, const ParamEsteira& p, uint32_t agora) {
  s.p = p;
  s.fase = FASE_PARTIDA;
  s.inicioMs = agora;
  s.confirmouEm = agora;
}

bool passagemValida(const LeituraJuncao& j, uint32_t agora, uint16_t pulsoMinMs) {
  if (j.maiorPulsoMs >= pulsoMinMs) return true;
  return j.ocupada && (uint32_t)(agora - j.ocupouEm) >= pulsoMinMs;
}

ResultadoSupervisor supervisorAtualizar(Supervisor& s, uint32_t agora,
                                        bool topoOcupado, const LeituraJuncao& j) {
  const uint32_t decorrido = (uint32_t)(agora - s.inicioMs);

  if (s.fase == FASE_PARTIDA || s.fase == FASE_TRANSITO) {
    // Uma passagem válida prova o avanço mesmo antes de o filtro do topo liberar.
    if (passagemValida(j, agora, s.p.pulsoMinJuncaoMs)) {
      s.fase = FASE_SAIDA;
      s.confirmouEm = agora;
      return SUP_CONFIRMOU;
    }
    if (s.fase == FASE_PARTIDA) {
      if (!topoOcupado) {
        s.fase = FASE_TRANSITO;
      } else if (decorrido >= s.p.prazoPartidaMs) {
        s.fase = FASE_FIM;
        return SUP_FALHA_SEM_AVANCO;
      }
    }
    if (s.fase == FASE_TRANSITO && decorrido >= s.p.timeoutMs) {
      s.fase = FASE_FIM;
      return SUP_FALHA_TIMEOUT;
    }
    return SUP_SEGUE;
  }

  if (s.fase == FASE_SAIDA) {
    if ((uint32_t)(agora - s.confirmouEm) >= s.p.saidaMs) {
      s.fase = FASE_FIM;
      // "Presa" = ainda ocupada e há tempo suficiente para não ser ruído.
      bool presa = j.ocupada && (uint32_t)(agora - j.ocupouEm) >= s.p.pulsoMinJuncaoMs;
      return presa ? SUP_FALHA_PRESA_SAIDA : SUP_SAIDA_OK;
    }
    return SUP_SEGUE;
  }
  return SUP_SEGUE;
}
