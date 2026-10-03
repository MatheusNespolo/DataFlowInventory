#include "lcd.h"

#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <string.h>

#include "../../config.h"

namespace {
LiquidCrystal_I2C lcd1(LCD_ENDERECO_1, 16, 2);
LiquidCrystal_I2C lcd2(LCD_ENDERECO_2, 16, 2);
LiquidCrystal_I2C* ativo = nullptr;
char linha1[17] = "";
char linha2[17] = "";

bool responde(uint8_t endereco) {
  Wire.beginTransmission(endereco);
  return Wire.endTransmission() == 0;
}

// Devolve false se o I2C estourou o timeout (barramento preso). Cada
// transação presa custa 25 ms; sem abortar no primeiro timeout, uma linha
// inteira bloquearia o loop por segundos e o watchdog reiniciaria o Uno
// com o motor ligado.
bool escreverLinha(uint8_t linha, const char* texto) {
  ativo->setCursor(0, linha);
  if (Wire.getWireTimeoutFlag()) {
    Wire.clearWireTimeoutFlag();
    return false;
  }
  uint8_t i = 0;
  for (; texto[i] && i < 16; i++) {
    ativo->write(texto[i]);
    if (Wire.getWireTimeoutFlag()) {
      Wire.clearWireTimeoutFlag();
      return false;
    }
  }
  for (; i < 16; i++) {
    ativo->write(' ');
    if (Wire.getWireTimeoutFlag()) {
      Wire.clearWireTimeoutFlag();
      return false;
    }
  }
  return true;
}
}  // namespace

bool lcdIniciar() {
  Wire.begin();
  // Um barramento I2C preso (ruído do motor) não pode travar o Uno.
  Wire.setWireTimeout(25000, true);
  if (responde(LCD_ENDERECO_1)) ativo = &lcd1;
  else if (responde(LCD_ENDERECO_2)) ativo = &lcd2;
  if (ativo == nullptr) return false;
  ativo->init();
  ativo->backlight();
  ativo->clear();
  // Barramento preso já no boot: segue sem LCD, como se ele não existisse.
  if (Wire.getWireTimeoutFlag()) {
    Wire.clearWireTimeoutFlag();
    ativo = nullptr;
    return false;
  }
  linha1[0] = 0;
  linha2[0] = 0;
  return true;
}

void lcdAtualizar(const char* l1, const char* l2) {
  if (ativo == nullptr) return;
  if (strncmp(l1, linha1, 16) != 0) {
    if (!escreverLinha(0, l1)) {
      ativo = nullptr;  // I2C preso: desiste do LCD para não travar o loop
      return;
    }
    strncpy(linha1, l1, 16);
    linha1[16] = 0;
  }
  if (strncmp(l2, linha2, 16) != 0) {
    if (!escreverLinha(1, l2)) {
      ativo = nullptr;
      return;
    }
    strncpy(linha2, l2, 16);
    linha2[16] = 0;
  }
}
