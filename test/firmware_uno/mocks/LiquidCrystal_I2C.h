// LCD de mentira: cada operação vira transações no barramento falso e o que foi
// escrito fica guardado por endereço. Só para testar src/hw/lcd.cpp no PC.
#pragma once
#include <stddef.h>
#include <stdint.h>

#include "Wire.h"

struct TelaFalsa {
  char linha[2][17];
  long iniciou;   // quantas vezes o init rodou neste endereço
};
inline TelaFalsa& telaFalsa(uint8_t addr) {
  static TelaFalsa t[128] = {};
  return t[addr];
}
inline void telasReiniciar() {
  for (int a = 0; a < 128; a++) {
    telaFalsa(a).iniciou = 0;
    for (int l = 0; l < 2; l++)
      for (int c = 0; c < 17; c++) telaFalsa(a).linha[l][c] = 0;
  }
}

class LiquidCrystal_I2C {
 public:
  LiquidCrystal_I2C(uint8_t endereco, uint8_t, uint8_t) : a_(endereco), col_(0), lin_(0) {}
  void init() {
    for (int i = 0; i < 43; i++) tx();  // ~43 transações no init real da biblioteca (estimativa)
    telaFalsa(a_).iniciou++;
    for (int l = 0; l < 2; l++) {
      for (int c = 0; c < 16; c++) telaFalsa(a_).linha[l][c] = ' ';
      telaFalsa(a_).linha[l][16] = 0;
    }
  }
  void backlight() { tx(); }
  void clear() { tx(); }
  void setCursor(uint8_t col, uint8_t lin) {
    col_ = col;
    lin_ = lin;
    tx();
  }
  size_t write(uint8_t ch) {
    Wire.beginTransmission(a_);
    const uint8_t r = Wire.endTransmission();
    if (r == 0 && col_ < 16 && lin_ < 2) telaFalsa(a_).linha[lin_][col_] = (char)ch;
    col_++;
    return 1;
  }

 private:
  void tx() {
    Wire.beginTransmission(a_);
    Wire.endTransmission();
  }
  uint8_t a_, col_, lin_;
};
