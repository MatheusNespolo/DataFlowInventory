// ============================================================
// DATA FLOW INVENTORY — Separador (roda giratória) — REGISTRO, NÃO ATIVO
// ------------------------------------------------------------
// Implementação vinda do firmware v2.x (commit d5fa4c4^), onde já estava
// comentada. Nunca foi compilada nem testada em bancada. Leia o cabeçalho de
// separador.h antes de habilitar (inclusive o aviso do watchdog de 2 s).
//
// Stepper.step() é RELATIVO (número de passos a girar a partir de onde a
// roda está), diferente de servo.write(), que é absoluto — por isso o
// controle guarda posicaoAtualSeparador e calcula o delta a cada movimento,
// sempre pelo caminho mais curto.
//
// Com tudo comentado, este arquivo não gera código: o Arduino IDE e o
// arduino-cli o compilam como uma unidade vazia.
// ============================================================

/*
#include "separador.h"

#include <Arduino.h>
#include <Stepper.h>

#include "../../config.h"

namespace {
Stepper motorSeparador(STEPS_PER_REV, STEPPER_IN1, STEPPER_IN3, STEPPER_IN2, STEPPER_IN4);
long posicaoAtualSeparador = 0;  // posição atual em passos (0..STEPS_PER_REV-1)

void moverSeparadorPara(long posicaoAlvo) {
  long delta = (posicaoAlvo - posicaoAtualSeparador) % STEPS_PER_REV;
  if (delta < 0) delta += STEPS_PER_REV;
  if (delta > STEPS_PER_REV / 2) delta -= STEPS_PER_REV;  // caminho mais curto (horário ou anti-horário)

  motorSeparador.step(delta);
  posicaoAtualSeparador = posicaoAlvo;
}
}  // namespace

void separadorIniciar() {
  motorSeparador.setSpeed(SEPARADOR_RPM);
  moverSeparadorPara(SEPARADOR_POSICAO_INICIAL);
}

void separadorMoverPara(char peca) {
  long alvo = SEPARADOR_POSICAO_INICIAL;
  if (peca == 'A') alvo = SEPARADOR_POSICAO_A;
  if (peca == 'B') alvo = SEPARADOR_POSICAO_B;
  if (peca == 'C') alvo = SEPARADOR_POSICAO_C;

  moverSeparadorPara(alvo);
}

void separadorReiniciar() {
  moverSeparadorPara(SEPARADOR_POSICAO_INICIAL);
}
*/
