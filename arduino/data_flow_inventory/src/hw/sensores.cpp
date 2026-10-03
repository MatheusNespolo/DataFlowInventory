#include "sensores.h"

#include <Arduino.h>

#include "../../config.h"
#include "../logica/filtro_entrada.h"

namespace {
const uint8_t PINOS_TOPO[3] = {SENSOR_TOPO_A, SENSOR_TOPO_B, SENSOR_TOPO_C};
FiltroEntrada topo[3];

struct CapturaJuncao {
  volatile bool ocupada;
  volatile uint32_t ocupouEm;
  volatile uint16_t maiorPulsoMs;
  volatile uint8_t bordas;
};
CapturaJuncao juncao[3];

// Leitura direta das portas (rápida, dentro da ISR). LOW = ocupada.
inline bool lerJ1() { return (PINC & _BV(PC3)) == 0; }  // A3
inline bool lerJ2() { return (PIND & _BV(PD2)) == 0; }  // D2
inline bool lerJ3() { return (PIND & _BV(PD4)) == 0; }  // D4

// Chamada só com interrupções desabilitadas (dentro da ISR).
inline void registrar(uint8_t i, bool ocupada, uint32_t agora) {
  CapturaJuncao& c = juncao[i];
  if (ocupada == c.ocupada) return;
  c.ocupada = ocupada;
  if (c.bordas < 255) c.bordas = c.bordas + 1;
  if (ocupada) {
    c.ocupouEm = agora;
  } else {
    uint32_t largura = agora - c.ocupouEm;
    uint16_t l = largura > 65535UL ? 65535 : (uint16_t)largura;
    if (l > c.maiorPulsoMs) c.maiorPulsoMs = l;
  }
}
}  // namespace

ISR(PCINT1_vect) {  // porta C: A3 (J1)
  registrar(0, lerJ1(), millis());
}

ISR(PCINT2_vect) {  // porta D: D2 (J2) e D4 (J3)
  const uint32_t agora = millis();
  registrar(1, lerJ2(), agora);
  registrar(2, lerJ3(), agora);
}

void sensoresIniciar(uint32_t agora) {
  for (uint8_t i = 0; i < 3; i++) {
    pinMode(PINOS_TOPO[i], INPUT_PULLUP);
    filtroIniciar(topo[i], digitalRead(PINOS_TOPO[i]) == LOW, agora, FILTRO_TOPO_MS);
  }
  pinMode(SENSOR_JUNCAO_J1, INPUT_PULLUP);
  pinMode(SENSOR_JUNCAO_J2, INPUT_PULLUP);
  pinMode(SENSOR_JUNCAO_J3, INPUT_PULLUP);

  noInterrupts();
  const bool inicial[3] = {lerJ1(), lerJ2(), lerJ3()};
  for (uint8_t i = 0; i < 3; i++) {
    juncao[i].ocupada = inicial[i];
    juncao[i].ocupouEm = agora;
    juncao[i].maiorPulsoMs = 0;
    juncao[i].bordas = 0;
  }
  PCMSK1 |= _BV(PCINT11);                  // A3
  PCMSK2 |= _BV(PCINT18) | _BV(PCINT20);   // D2, D4
  PCIFR = _BV(PCIF1) | _BV(PCIF2);         // descarta pendências antigas
  PCICR |= _BV(PCIE1) | _BV(PCIE2);
  interrupts();
}

void sensoresAmostrar(uint32_t agora) {
  for (uint8_t i = 0; i < 3; i++) {
    filtroAtualizar(topo[i], digitalRead(PINOS_TOPO[i]) == LOW, agora);
  }
}

bool sensorTopo(uint8_t i) { return topo[i].estavel; }

bool sensorJuncaoNivel(uint8_t i) { return juncao[i].ocupada; }

LeituraJuncao sensorJuncao(uint8_t i) {
  LeituraJuncao l;
  noInterrupts();
  l.ocupada = juncao[i].ocupada;
  l.ocupouEm = juncao[i].ocupouEm;
  l.maiorPulsoMs = juncao[i].maiorPulsoMs;
  l.bordas = juncao[i].bordas;
  interrupts();
  return l;
}

void sensorJuncaoZerar(uint8_t i) {
  noInterrupts();
  juncao[i].maiorPulsoMs = 0;
  juncao[i].bordas = 0;
  interrupts();
}
