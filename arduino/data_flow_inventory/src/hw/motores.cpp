#include "motores.h"

#include <Arduino.h>

#include "../../config.h"

namespace {
const uint8_t PINOS[3] = {MOTOR_A, MOTOR_B, MOTOR_C};

struct EstadoMotor {
  bool ligado;
  bool emRegime;
  uint32_t ligouEm;
};
EstadoMotor motor[3];
volatile bool paradosPorEmergencia = false;
}  // namespace

void motoresIniciar() {
  for (uint8_t i = 0; i < 3; i++) {
    pinMode(PINOS[i], OUTPUT);
    analogWrite(PINOS[i], 0);
    motor[i].ligado = false;
    motor[i].emRegime = false;
    motor[i].ligouEm = 0;
  }
}

void motoresPararNaInterrupcao() {
  TCCR1A &= ~(_BV(COM1A1) | _BV(COM1B1));  // pinos 9 e 10
  TCCR2A &= ~_BV(COM2A1);                  // pino 11
  PORTB &= ~(_BV(PB1) | _BV(PB2) | _BV(PB3));
  paradosPorEmergencia = true;
}

void motoresAplicar(const bool desejado[3], const ParamEsteira params[3], uint32_t agora) {
  if (paradosPorEmergencia) {
    // O watchdog cortou as saídas: o estado interno não vale mais, então
    // um motor desejado volta a partir com kick.
    noInterrupts();
    paradosPorEmergencia = false;
    interrupts();
    for (uint8_t i = 0; i < 3; i++) {
      motor[i].ligado = false;
      motor[i].emRegime = false;
    }
  }
  for (uint8_t i = 0; i < 3; i++) {
    EstadoMotor& m = motor[i];
    if (!desejado[i]) {
      analogWrite(PINOS[i], 0);  // saída segura a cada ciclo
      m.ligado = false;
      m.emRegime = false;
      continue;
    }
    if (!m.ligado) {
      m.ligado = true;
      m.ligouEm = agora;
      if (params[i].kickMs > 0) {
        analogWrite(PINOS[i], 255);  // kick-start
        m.emRegime = false;
      } else {
        analogWrite(PINOS[i], params[i].pwmRegime);
        m.emRegime = true;
      }
    } else if (!m.emRegime && (uint32_t)(agora - m.ligouEm) >= params[i].kickMs) {
      analogWrite(PINOS[i], params[i].pwmRegime);
      m.emRegime = true;
    }
  }
}
