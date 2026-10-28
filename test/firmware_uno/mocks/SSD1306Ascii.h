// Display OLED de mentira (biblioteca SSD1306Ascii): cada operação vira
// transações no barramento falso e o texto escrito fica guardado por endereço e
// por página (faixa de 8 px de altura). Só para testar src/hw/lcd.cpp no PC.
#pragma once
#include <stddef.h>
#include <stdint.h>

#include "Wire.h"

struct DevType {
  uint8_t largura;
  uint8_t altura;
  uint8_t deslocamentoColuna;
};
static const DevType Adafruit128x64 = {128, 64, 0};
static const DevType SH1106_128x64 = {128, 64, 2};

// Como na biblioteca (fonts/allFonts.h), sem PROGMEM no PC.
#define GLCDFONTDECL(_n) static const uint8_t _n[]

// Só o cabeçalho de uma fonte de largura fixa: tamanho 0, largura, altura,
// primeiro caractere, quantidade (igual ao formato da biblioteca).
static const uint8_t X11fixed7x14[] = {0, 0, 6, 14, 0x20, 0x60};

struct TelaFalsa {
  char pagina[8][17];        // texto por página; ' ' = apagado
  long iniciou;              // quantas vezes o begin rodou neste endereço
  uint8_t deslocamentoColuna;  // 0 = SSD1306; 2 = SH1106
  uint8_t fonteLargura;
  uint8_t fonteAltura;
  uint8_t espacoLetra;
  // Glifos de outras fontes (os ícones da FSM): caractere escrito em cada
  // (página, coluna em px), 0 = nada, e se foi escrito invertido.
  char glifo[8][128];
  bool glifoInvertido[8][128];
  long glifosEscritos;
};
inline TelaFalsa& telaFalsa(uint8_t addr) {
  static TelaFalsa t[128] = {};
  return t[addr];
}
inline void telaApagar(TelaFalsa& t) {
  for (int p = 0; p < 8; p++) {
    for (int c = 0; c < 16; c++) t.pagina[p][c] = ' ';
    t.pagina[p][16] = 0;
  }
}
inline void telasReiniciar() {
  for (int a = 0; a < 128; a++) {
    telaFalsa(a) = TelaFalsa();
  }
}

class SSD1306Ascii {
 public:
  void setFont(const uint8_t* f) {
    fonte_ = f;
    espaco_ = 1;  // a biblioteca volta a 1 px a cada setFont (fonte de largura fixa)
  }
  void setLetterSpacing(uint8_t px) { espaco_ = px; }
  void setInvertMode(bool inv) { invertido_ = inv; }
  void setCursor(uint8_t col, uint8_t pagina) {
    col_ = col;
    pagina_ = pagina;
    tx();
  }
  size_t write(uint8_t ch) {
    if (fonte_ == nullptr) return 0;
    Wire.beginTransmission(a_);
    const uint8_t r = Wire.endTransmission();
    const uint8_t largura = fonte_[2];
    if (largura != 6) {  // não é a fonte do texto (6 x 14): é um ícone
      if (r == 0 && pagina_ < 8 && col_ + largura <= 128) {
        TelaFalsa& t = telaFalsa(a_);
        t.glifo[pagina_][col_] = (char)ch;
        t.glifoInvertido[pagina_][col_] = invertido_;
        t.glifosEscritos++;
      }
      col_ = (uint8_t)(col_ + largura + espaco_);
      return 1;
    }
    if (invertido_) return 1;  // o firmware nunca escreve texto invertido
    const uint8_t passo = (uint8_t)(largura + espaco_);
    // Como a biblioteca: o que passa da borda direita (128 px) é cortado.
    if (r == 0 && pagina_ < 8 && col_ + largura <= 128 && col_ % passo == 0 && col_ / passo < 16) {
      TelaFalsa& t = telaFalsa(a_);
      t.pagina[pagina_][col_ / passo] = (char)ch;
      t.fonteLargura = fonte_[2];
      t.fonteAltura = fonte_[3];
      t.espacoLetra = espaco_;
    }
    col_ = (uint8_t)(col_ + passo);
    return 1;
  }

 protected:
  void tx() {
    Wire.beginTransmission(a_);
    Wire.endTransmission();
  }
  uint8_t a_ = 0, col_ = 0, pagina_ = 0, espaco_ = 1;
  bool invertido_ = false;
  const uint8_t* fonte_ = nullptr;
};
