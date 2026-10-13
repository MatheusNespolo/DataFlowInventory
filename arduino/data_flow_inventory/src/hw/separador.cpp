// ============================================================
// DATA FLOW INVENTORY — Separador (roda giratória) — REGISTRO, NÃO ATIVO
// ------------------------------------------------------------
// Camada de hardware do separador, versão SEM BLOQUEIO. Parte do rascunho do
// firmware v2.x (commit d5fa4c4^), que usava Stepper::step(delta) bloqueante,
// agora apoiada em src/logica/plano_separador.* (testado no PC).
//
// Tudo comentado: nunca foi compilado com o hardware nem testado em bancada.
// Leia o cabeçalho de separador.h antes de habilitar (riscos abertos,
// alimentação do motor e ordem de ativação).
//
// Com tudo comentado, este arquivo não gera código: o Arduino IDE e o
// arduino-cli o compilam como uma unidade vazia.
// ============================================================

/*
#include "separador.h"

#include <Arduino.h>
#include <Stepper.h>

#include "../../config.h"
#include "../logica/plano_separador.h"

namespace {
// A ordem IN1, IN3, IN2, IN4 é a da fiação do ULN2003 com o 28BYJ-48.
Stepper motorSeparador(STEPS_PER_REV, STEPPER_IN1, STEPPER_IN3, STEPPER_IN2, STEPPER_IN4);
PlanoSeparador plano;

long alvoDaPeca(char peca) {
  if (peca == 'A') return SEPARADOR_POSICAO_A;
  if (peca == 'B') return SEPARADOR_POSICAO_B;
  if (peca == 'C') return SEPARADOR_POSICAO_C;
  return SEPARADOR_POSICAO_INICIAL;
}

void soltarBobinas() {
  digitalWrite(STEPPER_IN1, LOW);
  digitalWrite(STEPPER_IN2, LOW);
  digitalWrite(STEPPER_IN3, LOW);
  digitalWrite(STEPPER_IN4, LOW);
}
}  // namespace

void separadorIniciar() {
  motorSeparador.setSpeed(SEPARADOR_RPM);
  planoIniciar(plano, STEPS_PER_REV, SEPARADOR_RPM, micros());  // posição suposta: 0
  soltarBobinas();
}

void separadorMoverPara(char peca) {
  planoIrPara(plano, alvoDaPeca(peca));
}

void separadorAtualizar(uint32_t agoraUs) {
  const int8_t passo = planoPasso(plano, agoraUs);
  if (passo != 0) {
    // O intervalo do motor já venceu, então step(±1) executa e devolve na hora.
    motorSeparador.step(passo);
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
*/
