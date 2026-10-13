// ============================================================
// DATA FLOW INVENTORY — Separador (roda giratória) — REGISTRO, NÃO ATIVO
// ------------------------------------------------------------
// Roda de 3 compartimentos no fim da esteira principal, acionada por um
// motor de passo 28BYJ-48 com driver ULN2003 (pinos 5 a 8 do Uno).
//
// ESTE ARQUIVO É SÓ UM REGISTRO: o que está abaixo é comentário, nada é
// compilado e o comportamento do firmware v3.0 não muda. O giro NUNCA foi
// testado em bancada. A integração e a validação estão previstas para quando a
// mecânica da roda estiver pronta (docs/INTEGRATION_GUIDE.md, seção 2).
//
// O que já está pronto e testado no PC (não precisa de hardware):
//   src/logica/plano_separador.*  decide quando dar cada passo e para onde
//                                 (testes: test/firmware_uno/teste_separador.cpp)
//
// COMO O RISCO DE REINÍCIO FOI RESOLVIDO
// O código do firmware v2.x chamava Stepper::step(delta), que é uma ESPERA
// ATIVA: a 10 RPM leva ~2,9 ms por passo, então 120° (682 passos) paralisam o
// loop() por ~2 s, o mesmo tempo do watchdog, e o Uno reiniciaria no meio do
// giro com os sensores, a FSM e a publicação parados. Agora:
//   1. o giro é fatiado: a cada volta do loop() dá-se NO MÁXIMO 1 passo, e só
//      quando o intervalo do motor já venceu, então Stepper::step(±1) devolve
//      na hora (nunca espera) e o watchdog continua sendo alimentado;
//   2. nunca há passos em rajada (um atraso do loop só deixa a roda mais lenta,
//      sem perder passo); a posição é atualizada a cada passo, e por isso um
//      novo pedido no meio do giro parte de onde a roda realmente está;
//   3. se o watchdog disparar, separadorPararNaInterrupcao() solta as bobinas
//      junto com os motores das esteiras (não fica corrente no motor de passo);
//   4. depois de 0,5 s parada, a roda solta as bobinas (menos corrente, calor e
//      ruído na alimentação de 5 V, que é a que alimenta o LCD).
//
// AINDA ABERTO (decidir na integração, com a mecânica):
//   - Não há sensor de referência (home): a posição é SUPOSTA 0 ao ligar e se
//     perde em qualquer reinício do Uno. Alinhar a roda à mão antes de ligar.
//   - O 28BYJ-48 puxa ~240 mA com as bobinas energizadas. Alimentar o ULN2003
//     por uma fonte de 5 V própria (não pelo 5 V do Uno), com GND comum.
//   - O momento do giro (na confirmação da entrega) e o tempo até a peça chegar
//     ao fim da esteira principal precisam ser medidos em bancada.
//
// Para habilitar no futuro (nesta ordem):
//   1. config.h: descomentar o bloco "Separador" (pinos e posições).
//   2. src/hw/separador.cpp: descomentar a implementação.
//   3. Aqui: descomentar as declarações abaixo.
//   4. data_flow_inventory.ino: descomentar o #include, o separadorIniciar() no
//      setup(), o separadorAtualizar() no loop() e a chamada de
//      separadorMoverPara() na entrega.
//   5. diagnostico.cpp: descomentar o separadorPararNaInterrupcao() no ISR do
//      watchdog.
//   6. Validar em bancada com o motor SEM carga, depois com a roda.
// ============================================================
#pragma once

/*
#include <stdint.h>

// Define a posição inicial suposta (0°) e a velocidade. Não gira.
void separadorIniciar();

// Pede o giro até o compartimento da peça ('A', 'B' ou 'C'); outra letra volta
// ao neutro. Não bloqueia: só define o alvo.
void separadorMoverPara(char peca);

// Chamar a cada volta do loop() com micros(). Dá no máximo 1 passo e solta as
// bobinas depois de um tempo parada.
void separadorAtualizar(uint32_t agoraUs);

// True enquanto a roda ainda está girando.
bool separadorOcupado();

// Segura para chamar de dentro de ISR (watchdog): solta as bobinas direto nos
// registradores (pinos 5, 6, 7 = PD5..PD7 e pino 8 = PB0).
void separadorPararNaInterrupcao();
*/
