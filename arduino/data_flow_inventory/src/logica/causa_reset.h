// ============================================================
// DATA FLOW INVENTORY — Causa do último reset (lógica pura)
// ------------------------------------------------------------
// O Optiboot do Uno costuma zerar o MCUSR antes do sketch; por isso a
// causa combina: o MCUSR (quando vier preenchido), uma assinatura em
// RAM não inicializada (.noinit, some quando a energia cai) e a marca
// gravada pela interrupção do watchdog. C++ puro (testado no PC).
// ============================================================
#pragma once
#include <stdint.h>

// Bits do MCUSR do ATmega328P.
static const uint8_t MCUSR_PORF  = 0x01;  // energização
static const uint8_t MCUSR_EXTRF = 0x02;  // pino de reset
static const uint8_t MCUSR_BORF  = 0x04;  // brownout
static const uint8_t MCUSR_WDRF  = 0x08;  // watchdog

// Devolve TXT("watchdog"), TXT("brownout"), TXT("energia") ou TXT("reinicio").
const char* causaReset(uint8_t mcusr, bool assinaturaValida, bool marcaWatchdog);
