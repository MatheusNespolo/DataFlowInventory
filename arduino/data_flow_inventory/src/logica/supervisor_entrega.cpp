#include "supervisor_entrega.h"

void supervisorIniciar(Supervisor& s, const ParamEsteira& p, uint32_t agora) {
  s.p = p;
  s.fase = FASE_PARTIDA;
  s.inicioMs = agora;
  s.confirmouEm = agora;
}

// Tempo que a junção está ocupada, ou 0 se não está ocupada ou se ocupouEm
// foi marcado no futuro (pela interrupção entre a leitura de millis() e a
// cópia da captura da junção).
static uint32_t ocupadaHa(const LeituraJuncao& j, uint32_t agora) {
  if (!j.ocupada) return 0;
  int32_t decorrido = (int32_t)(agora - j.ocupouEm);
  if (decorrido < 0) return 0;  // ocupouEm está no futuro
  return (uint32_t)decorrido;
}

bool passagemValida(const LeituraJuncao& j, uint32_t agora, uint16_t pulsoMinMs) {
  if (j.maiorPulsoMs >= pulsoMinMs) return true;
  return ocupadaHa(j, agora) >= pulsoMinMs;
}

ResultadoSupervisor supervisorAtualizar(Supervisor& s, uint32_t agora,
                                        bool topoOcupado, const LeituraJuncao& j) {
  const uint32_t decorrido = (uint32_t)(agora - s.inicioMs);

  if (s.fase == FASE_PARTIDA || s.fase == FASE_TRANSITO) {
    // Uma passagem válida prova o avanço mesmo antes de o filtro do topo liberar.
    // Por nível, só vale a ocupação que começou DEPOIS da partida: uma junção
    // ocupada na janela entre a checagem prévia e a partida não é passagem.
    LeituraJuncao jv = j;
    if (jv.ocupada && (int32_t)(jv.ocupouEm - s.inicioMs) < 0) jv.ocupada = false;
    if (passagemValida(jv, agora, s.p.pulsoMinJuncaoMs)) {
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
      bool presa = ocupadaHa(j, agora) >= s.p.pulsoMinJuncaoMs;
      return presa ? SUP_FALHA_PRESA_SAIDA : SUP_SAIDA_OK;
    }
    return SUP_SEGUE;
  }
  return SUP_SEGUE;
}
