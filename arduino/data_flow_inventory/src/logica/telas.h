// ============================================================
// DATA FLOW INVENTORY — Textos do LCD 16x2 (lógica pura)
// ------------------------------------------------------------
// Cada tela vira duas linhas de no máximo 16 caracteres. A camada de
// hardware só redesenha quando o texto muda. C++ puro (testado no PC).
// ============================================================
#pragma once
#include "fsm.h"

static const uint8_t LCD_COLUNAS = 16;

// l1 e l2 precisam ter espaço para LCD_COLUNAS + 1 caracteres.
void textoTela(const Fsm& f, char* l1, char* l2);
