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

void motoresAplicar(const bool desejado[3], const ParamEsteira params[3], uint32_t agora) {
  for (uint8_t i = 0; i < 3; i++) {
    EstadoMotor& m = motor[i];
    if (!desejado[i]) {
      if (m.ligado) {
        analogWrite(PINOS[i], 0);
        m.ligado = false;
        m.emRegime = false;
      }
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
