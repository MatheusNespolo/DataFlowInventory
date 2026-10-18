// ============================================================
// DATA FLOW INVENTORY — Regras do LCD (lógica pura)
// ------------------------------------------------------------
// Dois assuntos, ambos testados no PC (test/firmware_uno):
//   1. Em que endereços procurar o módulo I²C do LCD.
//   2. Quando tentar religar o LCD depois que ele sumiu.
// A conversa com o hardware fica em src/hw/lcd.cpp.
// ============================================================
#pragma once
#include <stdint.h>

// ---- 1. Endereços -------------------------------------------------------------
// Módulos de LCD usam um expansor PCF8574 (0x20–0x27) ou PCF8574A (0x38–0x3F);
// os jumpers A0–A2 do módulo escolhem o endereço. Os mais comuns vêm primeiro.
static const uint8_t LCD_N_CANDIDATOS = 16;

// i = 0..15 → endereço (0x27, 0x3F, 0x20..0x26, 0x38..0x3E). Fora disso, 0.
uint8_t lcdCandidato(uint8_t i);

// Endereço → posição na lista de candidatos, ou -1 se não é um candidato.
int8_t lcdIndiceCandidato(uint8_t endereco);

// mascara: bit i ligado = o candidato i respondeu no barramento. Devolve o
// índice do preferido (o menor), ou -1 se nenhum respondeu.
int8_t lcdEscolher(uint16_t mascara);

// ---- 2. Recuperação -----------------------------------------------------------
// Religar o LCD pode levar ~1 s (a biblioteca espera 1 s no init), então só se
// tenta com o sistema parado e, se não adiantar, cada vez mais devagar.
struct LcdRecuperacao {
  uint32_t ultimaTentativaMs;
  uint32_t intervaloMs;   // espera atual até a próxima tentativa
  uint32_t baseMs;        // intervalo depois de um sucesso
  uint32_t maxMs;         // teto do intervalo
};

void lcdRecuperacaoIniciar(LcdRecuperacao& r, uint32_t agoraMs, uint32_t baseMs, uint32_t maxMs);

// Só tenta se o LCD está fora, o sistema está parado (sem motor ligado) e o
// intervalo já passou. Robusto ao estouro de millis().
bool lcdDeveTentar(const LcdRecuperacao& r, bool lcdAtivo, bool sistemaParado, uint32_t agoraMs);

// Falha dobra o intervalo (até o teto); sucesso volta ao intervalo base.
void lcdRegistrarTentativa(LcdRecuperacao& r, uint32_t agoraMs, bool deuCerto);
