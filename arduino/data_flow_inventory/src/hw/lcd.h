// ============================================================
// DATA FLOW INVENTORY — LCD I2C 16x2 (hardware)
// ------------------------------------------------------------
// Procura o módulo em LCD_ENDERECO_1 e LCD_ENDERECO_2. Se nenhum
// responder, o sistema segue SEM LCD (nada trava). Redesenha só quando
// o texto muda, sobrescrevendo com espaços (sem lcd.clear(), sem piscar).
// ============================================================
#pragma once
#include <stdint.h>

bool lcdIniciar();                                  // true se encontrou o LCD
void lcdAtualizar(const char* l1, const char* l2);  // no-op sem LCD
