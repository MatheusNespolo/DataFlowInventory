#include "separador.h"

#include <Arduino.h>
#include <Stepper.h>

#include "../../config.h"
#include "../logica/plano_separador.h"

// O ritmo vem dos passos reais da roda (2038), que são MENOS que os 2048 da
// biblioteca: o intervalo entre passos do plano é, portanto, sempre >= ao da
// biblioteca, e step(±1) nunca espera.
static_assert(SEPARADOR_PASSOS_POR_VOLTA <= SEPARADOR_PASSOS_BIBLIOTECA,
              "o plano nao pode ser mais rapido que a biblioteca Stepper");
static_assert(SEPARADOR_PASSOS_BIBLIOTECA % 4 == 0,
              "a Stepper usa 4 fases: o numero de passos deve ser multiplo de 4");

namespace {
// A ordem IN1, IN3, IN2, IN4 é a da fiação do ULN2003 com o 28BYJ-48.
Stepper motor(SEPARADOR_PASSOS_BIBLIOTECA, STEPPER_IN1, STEPPER_IN3, STEPPER_IN2, STEPPER_IN4);
PlanoSeparador plano;

int32_t grausDoDestino(char destino) {
  switch (destino) {
    case 'A': return SEPARADOR_GRAUS_A;
    case 'B': return SEPARADOR_GRAUS_B;
    case 'C': return SEPARADOR_GRAUS_C;
    default:  return SEPARADOR_GRAUS_NEUTRO;
  }
}

void soltarBobinas() {
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
}
}  // namespace

void separadorIniciar(uint32_t agoraUs) {
  motor.setSpeed(SEPARADOR_RPM);
  planoIniciar(plano, SEPARADOR_PASSOS_POR_VOLTA, SEPARADOR_RPM, agoraUs);  // roda suposta no neutro
  soltarBobinas();
}

void separadorMoverPara(char destino) {
  planoIrPara(plano, separadorGrausParaPassos(grausDoDestino(destino), SEPARADOR_PASSOS_POR_VOLTA));
}

void separadorAtualizar(uint32_t agoraUs) {
  const int8_t passo = planoPasso(plano, agoraUs);
  if (passo != 0) {
    // O intervalo do motor já venceu, então step(±1) executa e devolve na hora.
    motor.step(SEPARADOR_INVERTER_SENTIDO ? -passo : passo);
  } else if (planoDeveSoltar(plano, agoraUs)) {
    soltarBobinas();
    planoSoltou(plano);
  }
}

bool separadorOcupado() {
  return planoOcupado(plano);
}

void separadorPararNaInterrupcao() {
  PORTD &= ~(_BV(PD5) | _BV(PD6) | _BV(PD7));  // pinos 5, 6 e 7
  PORTB &= ~_BV(PB0);                          // pino 8
}
