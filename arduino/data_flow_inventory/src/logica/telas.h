// ============================================================
// DATA FLOW INVENTORY — Textos do display (lógica pura)
// ------------------------------------------------------------
// Cada tela vira duas linhas de no máximo 16 caracteres (o formato do antigo
// LCD 16x2, mantido no display OLED; ver src/hw/lcd.h). A camada de hardware
// só redesenha quando o texto muda. C++ puro (testado no PC).
// ============================================================
#pragma once
#include "fsm.h"

static const uint8_t LCD_COLUNAS = 16;

// l1 e l2 precisam ter espaço para LCD_COLUNAS + 1 caracteres.
void textoTela(const Fsm& f, char* l1, char* l2);

// Ícone do estado atual na faixa do rodapé do display (0..TELA_N_ICONES-1, na
// ordem de Estado: aguardando, verificando, acionando, entregando, erro).
static const uint8_t TELA_N_ICONES = 5;
uint8_t iconeTela(const Fsm& f);
