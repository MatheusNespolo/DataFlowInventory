// ============================================================
// DATA FLOW INVENTORY — Separador automático (lógica pura)
// ------------------------------------------------------------
// Decide PARA ONDE a roda deve estar, de acordo com a peça pedida. A roda se
// prepara cedo: assim que a checagem prévia aprova o pedido (estado
// ACIONANDO_ESTEIRA) e antes de a peça sair da esteira secundária, então tem de
// 3 s a 12,5 s (a roda leva ~2 s por 120°) para chegar ao compartimento.
//
// É "nível", não "evento": a cada volta do loop() o firmware pergunta o destino e
// repete o pedido à roda, o que é inofensivo (pedir o mesmo alvo não muda nada) e
// dispensa fila e estado intermediário. Depois da entrega a roda FICA onde está
// (a peça ainda percorre a esteira principal até cair no compartimento) e só vai
// para outro lugar no pedido seguinte.
//
// C++ puro, testado no PC (test/firmware_uno).
// ============================================================
#pragma once
#include <stdint.h>

#include "fsm.h"

struct SeparadorAuto {
  uint32_t esperaMs;         // depois de uma entrega, espera isto antes de mudar de compartimento
  uint32_t ultimaEntregaMs;  // instante da última confirmação de entrega
  bool houveEntrega;
};

// esperaMs = 0: vai para o compartimento do novo pedido assim que ele é aprovado.
// Use um valor maior, medido em bancada (tempo da peça entre a junção e o fim da
// esteira principal), se pedidos seguidos puderem tirar a roda do lugar antes de a
// peça anterior cair nela.
void separadorAutoIniciar(SeparadorAuto& a, uint32_t esperaMs);

// Chamar quando a entrega é confirmada (evento EV_ENTREGA).
void separadorAutoEntrega(SeparadorAuto& a, uint32_t agoraMs);

// Compartimento que a roda deve buscar agora: 'A', 'B' ou 'C'; 0 = nenhum pedido
// novo (a roda fica onde está). peca: 1..3 (Fsm::peca).
char separadorAutoDestino(const SeparadorAuto& a, Estado estado, uint8_t peca, uint32_t agoraMs);
