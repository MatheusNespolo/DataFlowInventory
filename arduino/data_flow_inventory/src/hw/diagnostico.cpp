#include "diagnostico.h"

#include <Arduino.h>
#include <avr/wdt.h>

#include "../logica/causa_reset.h"

namespace {
const uint32_t ASSINATURA = 0xDF1A3B5CUL;
const uint8_t MARCA_WATCHDOG = 0xA5;
const char* causa = "energia";
}  // namespace

// Variáveis que sobrevivem a resets com energia (não são zeradas no boot).
uint8_t dfiMcusrNoBoot __attribute__((section(".noinit")));
uint32_t dfiAssinatura __attribute__((section(".noinit")));
volatile uint8_t dfiMarcaWatchdog __attribute__((section(".noinit")));

// Roda antes de main(): guarda o MCUSR e desliga o watchdog (padrão avr-libc).
extern "C" void dfiCapturarMcusr(void) __attribute__((naked, used, section(".init3")));
extern "C" void dfiCapturarMcusr(void) {
  dfiMcusrNoBoot = MCUSR;
  MCUSR = 0;
  wdt_disable();
}

ISR(WDT_vect) {
  // O loop não alimentou o watchdog por 2 s: marca e deixa o próximo
  // estouro reiniciar o Uno.
  dfiMarcaWatchdog = MARCA_WATCHDOG;
}

static void armarWatchdog() {
  noInterrupts();
  wdt_reset();
  WDTCSR = _BV(WDCE) | _BV(WDE);
  WDTCSR = _BV(WDIE) | _BV(WDE) | _BV(WDP2) | _BV(WDP1) | _BV(WDP0);  // 2 s
  interrupts();
}

void diagnosticoIniciar() {
  const bool assinaturaValida = dfiAssinatura == ASSINATURA;
  const bool marcaWd = dfiMarcaWatchdog == MARCA_WATCHDOG;
  causa = causaReset(dfiMcusrNoBoot, assinaturaValida, marcaWd);
  dfiAssinatura = ASSINATURA;
  dfiMarcaWatchdog = 0;
  armarWatchdog();
}

const char* diagnosticoCausaReset() { return causa; }

extern int __heap_start;
extern int* __brkval;

long ramLivre() {
  int v;
  return (long)((int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval));
}

void watchdogAlimentar() {
  wdt_reset();
  if (dfiMarcaWatchdog == MARCA_WATCHDOG) {
    // O loop voltou depois de um aviso do watchdog: limpa a marca e
    // rearma o modo interrupção + reset.
    dfiMarcaWatchdog = 0;
    armarWatchdog();
  }
}
