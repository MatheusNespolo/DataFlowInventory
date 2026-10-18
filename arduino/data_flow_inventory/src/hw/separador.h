// ============================================================
// DATA FLOW INVENTORY — Separador (roda giratória) (hardware)
// ------------------------------------------------------------
// Roda de 3 compartimentos no fim da esteira principal, acionada por um motor
// de passo 28BYJ-48 com driver ULN2003 (IN1..IN4 nos pinos 5 a 8 do Uno; ver
// config.h). Na confirmação da entrega (marco M2), a roda gira até o
// compartimento da peça.
//
// NÃO BLOQUEIA. Stepper::step() é uma espera ativa (a 10 RPM, 120° levam ~2 s,
// o mesmo tempo do watchdog), então o giro é fatiado: no máximo UM passo por
// volta do loop(), só quando o intervalo do motor já venceu (então step(±1)
// devolve na hora) e nunca em rajada. Quem decide quando dar cada passo é
// src/logica/plano_separador.* (testado no PC).
//
// Sem sensor de referência: a roda é SUPOSTA no neutro quando o Uno liga e a
// posição é contada por software. Alinhe a roda à mão ANTES de ligar ou
// reiniciar o Uno (abrir a Serial Monitor também reinicia).
// ============================================================
#pragma once
#include <stdint.h>

// Põe os pinos em repouso (bobinas soltas) e assume a roda no neutro.
void separadorIniciar(uint32_t agoraUs);

// Pede o giro até o compartimento da peça ('A', 'B' ou 'C'); '0' = neutro.
// Não bloqueia: só define o alvo. Seguro no meio de outro giro.
void separadorMoverPara(char destino);

// Chamar a cada volta do loop() com micros(): dá no máximo 1 passo e solta as
// bobinas depois de um tempo parada.
void separadorAtualizar(uint32_t agoraUs);

// True enquanto a roda ainda está girando.
bool separadorOcupado();

// Segura para chamar de dentro de ISR (watchdog): solta as bobinas direto nos
// registradores (pinos 5, 6, 7 = PD5..PD7 e pino 8 = PB0).
void separadorPararNaInterrupcao();
