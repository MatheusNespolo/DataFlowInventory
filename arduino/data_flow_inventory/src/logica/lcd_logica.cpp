#include "lcd_logica.h"

uint8_t lcdCandidato(uint8_t i) {
  if (i == 0) return 0x27;
  if (i == 1) return 0x3F;
  if (i < 9) return (uint8_t)(0x20 + (i - 2));   // 0x20..0x26
  if (i < LCD_N_CANDIDATOS) return (uint8_t)(0x38 + (i - 9));  // 0x38..0x3E
  return 0;
}

int8_t lcdIndiceCandidato(uint8_t endereco) {
  for (uint8_t i = 0; i < LCD_N_CANDIDATOS; i++) {
    if (lcdCandidato(i) == endereco) return (int8_t)i;
  }
  return -1;
}

int8_t lcdEscolher(uint16_t mascara) {
  for (uint8_t i = 0; i < LCD_N_CANDIDATOS; i++) {
    if (mascara & (uint16_t)(1u << i)) return (int8_t)i;
  }
  return -1;
}

void lcdRecuperacaoIniciar(LcdRecuperacao& r, uint32_t agoraMs, uint32_t baseMs, uint32_t maxMs) {
  r.ultimaTentativaMs = agoraMs;
  r.intervaloMs = baseMs;
  r.baseMs = baseMs;
  r.maxMs = maxMs;
}

bool lcdDeveTentar(const LcdRecuperacao& r, bool lcdAtivo, bool sistemaParado, uint32_t agoraMs) {
  if (lcdAtivo || !sistemaParado) return false;
  return (uint32_t)(agoraMs - r.ultimaTentativaMs) >= r.intervaloMs;
}

void lcdRegistrarTentativa(LcdRecuperacao& r, uint32_t agoraMs, bool deuCerto) {
  r.ultimaTentativaMs = agoraMs;
  if (deuCerto) {
    r.intervaloMs = r.baseMs;
  } else {
    r.intervaloMs = (r.intervaloMs > r.maxMs / 2) ? r.maxMs : r.intervaloMs * 2;
  }
}
