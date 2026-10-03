// ============================================================
// DATA FLOW INVENTORY — Textos fixos na memória flash
// ------------------------------------------------------------
// No AVR, um literal "..." ocupa RAM (o Uno só tem 2 KB). TXT("...")
// grava o texto na flash (PROGMEM) e lerTxt() lê um caractere dele.
// No PC (testes) os dois viram o comportamento normal de C++.
// Convenção: todo `const char*` de texto FIXO nas APIs de src/logica
// é um TXT (flash no AVR). Textos montados em RAM (buffers) não são.
// ============================================================
#pragma once

#if defined(__AVR__)
#include <avr/pgmspace.h>
#define TXT(s) PSTR(s)
inline char lerTxt(const char* p) { return (char)pgm_read_byte(p); }
#else
#define TXT(s) (s)
inline char lerTxt(const char* p) { return *p; }
#endif
