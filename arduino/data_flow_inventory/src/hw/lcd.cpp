#include "lcd.h"

#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <new>
#include <string.h>

#include "../logica/lcd_logica.h"

namespace {
// O endereço só é conhecido depois da varredura: o objeto é criado no lugar
// (placement new) em vez de manter um por endereço possível.
alignas(LiquidCrystal_I2C) uint8_t armazenamento[sizeof(LiquidCrystal_I2C)];
LiquidCrystal_I2C* lcd = nullptr;
uint8_t endereco = 0;
uint8_t dispositivos = 0;
uint16_t quedas = 0;
char linha1[17] = "";
char linha2[17] = "";

// Um timeout de I²C (barramento preso) liga a flag do Wire: lê e limpa.
bool houveTimeout() {
  if (!Wire.getWireTimeoutFlag()) return false;
  Wire.clearWireTimeoutFlag();
  return true;
}

bool responde(uint8_t a) {
  Wire.beginTransmission(a);
  return Wire.endTransmission() == 0;
}

// Varre 0x08..0x77: conta quem responde (diagnóstico) e marca quais candidatos
// de LCD responderam. Desiste no primeiro timeout: com o barramento preso,
// cada endereço custaria 25 ms e a varredura estouraria o watchdog.
bool varrer(uint16_t& mascara, uint8_t& total) {
  mascara = 0;
  total = 0;
  for (uint8_t a = 0x08; a <= 0x77; a++) {
    const bool achou = responde(a);
    if (houveTimeout()) return false;
    if (!achou) continue;
    total++;
    const int8_t i = lcdIndiceCandidato(a);
    if (i >= 0) mascara |= (uint16_t)(1u << i);
  }
  return true;
}

// Devolve false se o I2C estourou o timeout (barramento preso). Cada
// transação presa custa 25 ms; sem abortar no primeiro timeout, uma linha
// inteira bloquearia o loop por segundos e o watchdog reiniciaria o Uno
// com o motor ligado.
bool escreverLinha(uint8_t linha, const char* texto) {
  lcd->setCursor(0, linha);
  if (houveTimeout()) return false;
  uint8_t i = 0;
  for (; texto[i] && i < 16; i++) {
    lcd->write(texto[i]);
    if (houveTimeout()) return false;
  }
  for (; i < 16; i++) {
    lcd->write(' ');
    if (houveTimeout()) return false;
  }
  return true;
}

// I2C preso em operação: desiste do LCD para não travar o loop. Quem chama
// lcdIniciar() de novo (política em lcd_logica.h) pode religá-lo.
void desistir() {
  lcd = nullptr;
  quedas++;
}
}  // namespace

bool lcdIniciar() {
  lcd = nullptr;
  endereco = 0;
  dispositivos = 0;
  Wire.begin();
  // Um barramento I2C preso (ruído do motor) não pode travar o Uno.
  Wire.setWireTimeout(25000, true);
  Wire.clearWireTimeoutFlag();

  uint16_t mascara;
  if (!varrer(mascara, dispositivos)) return false;  // barramento preso: segue sem LCD
  const int8_t escolhido = lcdEscolher(mascara);
  if (escolhido < 0) return false;                   // nenhum módulo de LCD respondeu

  endereco = lcdCandidato((uint8_t)escolhido);
  // O objeto anterior não tem nada a liberar: criar por cima é seguro.
  lcd = new (armazenamento) LiquidCrystal_I2C(endereco, 16, 2);
  lcd->init();
  lcd->backlight();
  lcd->clear();
  // Barramento preso já na inicialização: segue sem LCD, como se não existisse.
  if (houveTimeout()) {
    lcd = nullptr;
    endereco = 0;
    return false;
  }
  linha1[0] = 0;
  linha2[0] = 0;
  return true;
}

void lcdAtualizar(const char* l1, const char* l2) {
  if (lcd == nullptr) return;
  if (strncmp(l1, linha1, 16) != 0) {
    if (!escreverLinha(0, l1)) {
      desistir();
      return;
    }
    strncpy(linha1, l1, 16);
    linha1[16] = 0;
  }
  if (strncmp(l2, linha2, 16) != 0) {
    if (!escreverLinha(1, l2)) {
      desistir();
      return;
    }
    strncpy(linha2, l2, 16);
    linha2[16] = 0;
  }
}

bool lcdAtivo() { return lcd != nullptr; }
uint8_t lcdEndereco() { return lcd != nullptr ? endereco : 0; }
uint8_t lcdDispositivos() { return dispositivos; }
uint16_t lcdQuedas() { return quedas; }
