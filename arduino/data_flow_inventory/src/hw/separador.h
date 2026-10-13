// ============================================================
// DATA FLOW INVENTORY — Separador (roda giratória) — REGISTRO, NÃO ATIVO
// ------------------------------------------------------------
// Roda de 3 compartimentos no fim da esteira principal, acionada por um
// motor de passo 28BYJ-48 com driver ULN2003 (pinos 5 a 8 do Uno).
//
// ESTE ARQUIVO É SÓ UM REGISTRO: tudo está comentado, nada é compilado e o
// comportamento do firmware v3.0 não muda. O código vem do firmware v2.x
// (commit d5fa4c4^, onde já estava comentado) e NUNCA foi testado em bancada.
// A integração e a validação estão previstas para quando a mecânica da roda
// estiver pronta (ver docs/INTEGRATION_GUIDE.md, seção 2).
//
// Para habilitar no futuro (nesta ordem):
//   1. config.h: descomentar o bloco "Separador" (pinos e posições).
//   2. src/hw/separador.cpp: descomentar a implementação.
//   3. Aqui: descomentar as declarações abaixo.
//   4. data_flow_inventory.ino: descomentar o #include, o separadorIniciar()
//      no setup() e a chamada de separadorMoverPara() na entrega.
//   5. Resolver o ponto de atenção abaixo ANTES de ligar o motor.
//
// PONTO DE ATENÇÃO (novo na v3.0): Stepper::step() é BLOQUEANTE. A 10 RPM o
// 28BYJ-48 faz ~341 passos/s, então 120° (683 passos) levam ~2 s e 180°
// (1024 passos) ~3 s. O watchdog da v3.0 é de 2 s e o loop() fica parado
// durante o giro (sensores, FSM e publicação). Ao habilitar, mova em fatias
// curtas (por exemplo, step(1) por volta do loop, sem bloquear) ou alimente o
// watchdog durante o giro com watchdogAlimentar().
// ============================================================
#pragma once

/*
#include <stdint.h>

// Posiciona a roda no compartimento da peça ('A', 'B' ou 'C'); outra letra
// volta ao compartimento neutro. Bloqueante (ver ponto de atenção acima).
void separadorMoverPara(char peca);

// Configura a velocidade e leva a roda à posição inicial (0°).
void separadorIniciar();

// Volta ao compartimento neutro (0°), por exemplo depois de um RESET.
void separadorReiniciar();
*/
