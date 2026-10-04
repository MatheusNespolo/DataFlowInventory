// ============================================================
// DATA FLOW INVENTORY — Filtro de entrada digital (lógica pura)
// ------------------------------------------------------------
// Debounce por tempo: a leitura bruta só vira "estável" depois de
// permanecer igual por janelaMs. Usado nos sensores de topo e para o
// nível atual das junções. C++ puro (testado no PC).
// ============================================================
#pragma once
#include <stdint.h>

struct FiltroEntrada {
  bool estavel;        // valor filtrado (true = sensor ocupado)
  bool bruto;          // última leitura bruta
  uint32_t mudouEm;    // instante da última mudança da leitura bruta
  uint16_t janelaMs;   // tempo mínimo de estabilidade
};

enum Borda : int8_t { BORDA_NENHUMA = 0, BORDA_OCUPOU = 1, BORDA_LIBEROU = -1 };

void filtroIniciar(FiltroEntrada& f, bool valor, uint32_t agora, uint16_t janelaMs);

// Atualiza com a leitura bruta atual e devolve a borda do valor ESTÁVEL
// (se houve). Robusto ao estouro de millis() (aritmética sem sinal).
Borda filtroAtualizar(FiltroEntrada& f, bool bruto, uint32_t agora);
