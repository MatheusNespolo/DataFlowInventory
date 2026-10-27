#include "lcd.h"

#include <Arduino.h>
#include <SSD1306Ascii.h>
#include <SSD1306AsciiWire.h>
#include <Wire.h>
#include <string.h>

#include "../../config.h"
#include "../logica/lcd_logica.h"
#include "../logica/telas.h"

namespace {
// SSD1306Ascii escreve direto na memória do display, sem imagem da tela na RAM
// do Uno (a Adafruit_SSD1306 precisaria de 1024 bytes que o firmware não tem).
SSD1306AsciiWire oled;
bool ativo = false;
uint8_t endereco = 0;
uint8_t dispositivos = 0;
uint16_t quedas = 0;
char linha1[LCD_COLUNAS + 1] = "";
char linha2[LCD_COLUNAS + 1] = "";

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
// de display responderam. Desiste no primeiro timeout: com o barramento preso,
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
// com o motor ligado. A linha é sempre completada com espaços até a coluna
// 16: sobrescreve o texto anterior sem clear() (sem piscar).
bool escreverLinha(uint8_t pagina, const char* texto) {
  oled.setCursor(0, pagina);
  if (houveTimeout()) return false;
  uint8_t i = 0;
  for (; texto[i] && i < LCD_COLUNAS; i++) {
    oled.write((uint8_t)texto[i]);
    if (houveTimeout()) return false;
  }
  for (; i < LCD_COLUNAS; i++) {
    oled.write(' ');
    if (houveTimeout()) return false;
  }
  return true;
}

// I2C preso em operação: desiste do display para não travar o loop. Quem chama
// lcdIniciar() de novo (política em lcd_logica.h) pode religá-lo.
void desistir() {
  ativo = false;
  quedas++;
}
}  // namespace

bool lcdIniciar() {
  ativo = false;
  endereco = 0;
  dispositivos = 0;
  Wire.begin();
  // Um barramento I2C preso (ruído do motor) não pode travar o Uno.
  Wire.setWireTimeout(25000, true);
  Wire.clearWireTimeoutFlag();

  uint16_t mascara;
  if (!varrer(mascara, dispositivos)) return false;  // barramento preso: segue sem display
  const int8_t escolhido = lcdEscolher(mascara);
  if (escolhido < 0) return false;                   // nenhum display respondeu

  endereco = lcdCandidato((uint8_t)escolhido);
#if OLED_CONTROLADOR_SH1106
  oled.begin(&SH1106_128x64, endereco);
#else
  oled.begin(&Adafruit128x64, endereco);  // inicializa e apaga a tela (~0,1 s)
#endif
  oled.setFont(X11fixed7x14);
  oled.setLetterSpacing(OLED_ESPACO_LETRA_PX);  // depois do setFont, que o redefine
  // Barramento preso já na inicialização: segue sem display, como se não existisse.
  if (houveTimeout()) {
    endereco = 0;
    return false;
  }
  ativo = true;
  linha1[0] = 0;
  linha2[0] = 0;
  return true;
}

void lcdAtualizar(const char* l1, const char* l2) {
  if (!ativo) return;
  if (strncmp(l1, linha1, LCD_COLUNAS) != 0) {
    if (!escreverLinha(OLED_PAGINA_LINHA1, l1)) {
      desistir();
      return;
    }
    strncpy(linha1, l1, LCD_COLUNAS);
    linha1[LCD_COLUNAS] = 0;
  }
  if (strncmp(l2, linha2, LCD_COLUNAS) != 0) {
    if (!escreverLinha(OLED_PAGINA_LINHA2, l2)) {
      desistir();
      return;
    }
    strncpy(linha2, l2, LCD_COLUNAS);
    linha2[LCD_COLUNAS] = 0;
  }
}

bool lcdAtivo() { return ativo; }
uint8_t lcdEndereco() { return ativo ? endereco : 0; }
uint8_t lcdDispositivos() { return dispositivos; }
uint16_t lcdQuedas() { return quedas; }
