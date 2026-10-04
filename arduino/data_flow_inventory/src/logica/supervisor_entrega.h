// ============================================================
// DATA FLOW INVENTORY — Supervisor de entrega por marcos (lógica pura)
// ------------------------------------------------------------
// M1 Partida : o sensor de topo fica livre em até prazoPartidaMs.
// M2 Trânsito: a junção registra uma passagem válida (pulso ≥
//              pulsoMinJuncaoMs) em até timeoutMs desde a partida.
// M3 Saída   : depois da confirmação, o motor segue saidaMs; no fim a
//              junção precisa estar livre.
// Todos os prazos contam com aritmética sem sinal (estouro de millis).
// C++ puro (testado no PC).
// ============================================================
#pragma once
#include <stdint.h>

struct ParamEsteira {
  uint8_t pwmRegime;           // PWM de regime (0-255)
  uint16_t kickMs;             // duração do kick-start em PWM 255
  uint16_t prazoPartidaMs;     // M1
  uint16_t timeoutMs;          // M2 (desde a partida)
  uint16_t saidaMs;            // M3
  uint16_t pulsoMinJuncaoMs;   // largura mínima de uma passagem válida
};

// Leitura de um sensor de junção, montada pela camada de hardware a
// partir das bordas capturadas por interrupção.
struct LeituraJuncao {
  bool ocupada;                 // nível atual (true = peça sobre o sensor)
  uint32_t ocupouEm;            // instante em que ficou ocupada (vale se ocupada)
  uint16_t maiorPulsoMs;        // maior pulso COMPLETO desde o último zerar
  uint8_t bordas;               // mudanças de nível desde o último zerar
};

enum FaseEntrega : uint8_t { FASE_PARTIDA, FASE_TRANSITO, FASE_SAIDA, FASE_FIM };

enum ResultadoSupervisor : uint8_t {
  SUP_SEGUE = 0,
  SUP_CONFIRMOU,          // passagem válida na junção (debitar agora)
  SUP_SAIDA_OK,           // fim da saída com a junção livre
  SUP_FALHA_SEM_AVANCO,   // M1
  SUP_FALHA_TIMEOUT,      // M2
  SUP_FALHA_PRESA_SAIDA   // M3
};

struct Supervisor {
  ParamEsteira p;
  FaseEntrega fase;
  uint32_t inicioMs;
  uint32_t confirmouEm;
};

void supervisorIniciar(Supervisor& s, const ParamEsteira& p, uint32_t agora);
ResultadoSupervisor supervisorAtualizar(Supervisor& s, uint32_t agora,
                                        bool topoOcupado, const LeituraJuncao& j);
// Passagem válida: pulso completo largo o bastante ou ocupada há tempo suficiente.
bool passagemValida(const LeituraJuncao& j, uint32_t agora, uint16_t pulsoMinMs);
