#include "lcd_logica.h"

uint8_t lcdCandidato(uint8_t i) {
  if (i < LCD_N_CANDIDATOS) return (uint8_t)(0x3C + i);  // 0x3C, 0x3D
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
