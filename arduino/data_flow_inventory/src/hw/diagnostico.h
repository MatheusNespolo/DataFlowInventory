// ============================================================
// DATA FLOW INVENTORY — Diagnóstico: causa do reset, RAM, watchdog
// ------------------------------------------------------------
// O watchdog (2 s, modo interrupção + reset) reinicia o Uno se o loop
// travar; a interrupção grava a marca "watchdog" em RAM .noinit antes
// do reset. O watchdog é desligado logo no boot (.init3), senão um
// reset por watchdog deixaria o Uno reiniciando em laço.
// ============================================================
#pragma once
#include <stdint.h>

void diagnosticoIniciar();            // calcula a causa do reset e arma o watchdog
const char* diagnosticoCausaReset();  // "energia", "reinicio", "watchdog" ou "brownout"
long ramLivre();                      // bytes entre o heap e a pilha
void watchdogAlimentar();             // chamar uma vez por ciclo do loop
