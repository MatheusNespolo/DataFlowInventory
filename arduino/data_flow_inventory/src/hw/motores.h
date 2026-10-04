// ============================================================
// DATA FLOW INVENTORY — Motores das esteiras secundárias (hardware)
// ------------------------------------------------------------
// IRF520: 1 pino PWM por motor. Partida com kick-start (PWM 255 por
// kickMs) e depois o PWM de regime da esteira. O estado desejado vem
// da FSM a cada ciclo; o que não está desejado fica em 0.
// ============================================================
#pragma once
#include <stdint.h>

#include "../logica/supervisor_entrega.h"

// Configura os 3 pinos como saída em 0. Chamar ANTES de qualquer outra
// inicialização (o gate do IRF520 não pode ficar flutuando).
void motoresIniciar();

// Segura para chamar de dentro de ISR (watchdog): desliga as saídas PWM e
// os pinos direto nos registradores. A próxima motoresAplicar religa com kick.
void motoresPararNaInterrupcao();

// desejado[i] = esteira i deve estar ligada agora.
void motoresAplicar(const bool desejado[3], const ParamEsteira params[3], uint32_t agora);
