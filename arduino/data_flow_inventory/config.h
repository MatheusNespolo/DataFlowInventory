// ============================================================
// DATA FLOW INVENTORY — Configuração do firmware do Uno
// ------------------------------------------------------------
// Pinos (iguais ao firmware v2.x e ao diagrama elétrico) e parâmetros
// por esteira. Para calibrar uma esteira, mude só a linha dela.
// ============================================================
#pragma once
#include "src/logica/supervisor_entrega.h"

#define VERSAO_FIRMWARE "3.0"

// ---- Serial (deve ser IGUAL ao Serial2 do ESP32) --------------------------
#define BAUD_SERIAL 9600

// ---- Motores DC (IRF520: 1 pino PWM por motor) ----------------------------
#define MOTOR_A 9    // Timer1
#define MOTOR_B 10   // Timer1
#define MOTOR_C 11   // Timer2

// ---- Sensores TCRT5000 (LOW = peça detectada; INPUT_PULLUP) ---------------
#define SENSOR_TOPO_A    A0
#define SENSOR_TOPO_B    A1
#define SENSOR_TOPO_C    A2
#define SENSOR_JUNCAO_J1 A3   // PCINT11 (porta C)
#define SENSOR_JUNCAO_J2 2    // PCINT18 (porta D)
#define SENSOR_JUNCAO_J3 4    // PCINT20 (porta D)

// ---- LCD I2C 16x2 (endereços procurados no boot) ---------------------------
#define LCD_ENDERECO_1 0x27
#define LCD_ENDERECO_2 0x3F

// ---- Separador (roda giratória) — REGISTRO, NÃO ATIVO ------------------------
// Motor de passo 28BYJ-48 + driver ULN2003 (4 fios IN1-IN4). Pinos 5 a 8:
// sequenciais e livres no Uno. Valores do firmware v2.x, nunca testados em
// bancada; veja src/hw/separador.h antes de habilitar.
// #define STEPPER_IN1        5      // [HABILITAR]
// #define STEPPER_IN2        6      // [HABILITAR]
// #define STEPPER_IN3        7      // [HABILITAR]
// #define STEPPER_IN4        8      // [HABILITAR]
// #define STEPS_PER_REV      2048   // 28BYJ-48 em passo completo; conferir no datasheet do driver usado
// #define SEPARADOR_RPM      10     // velocidade do giro; ajustar conforme o torque necessário
// #define SEPARADOR_POSICAO_INICIAL  0                          // 0°   — compartimento neutro
// #define SEPARADOR_POSICAO_A        (STEPS_PER_REV / 3)        // 120° — compartimento A
// #define SEPARADOR_POSICAO_B        ((STEPS_PER_REV * 2) / 3)  // 240° — compartimento B
// #define SEPARADOR_POSICAO_C        0                          // 0°   — compartimento C (mesmo ponto do neutro; ajustar ao layout físico)

// ---- Sistema -----------------------------------------------------------------
#define ESTOQUE_INICIAL       15     // peças de cada tipo ao ligar (não persiste)
#define INTERVALO_AMOSTRA_MS   5      // amostragem dos sensores
#define FILTRO_TOPO_MS         20     // estabilidade exigida no sensor de topo
#define INTERVALO_PUBLICACAO   1000   // ciclo das mensagens periódicas
#define PASSOS_PUBLICACAO      4      // status, estoque, sensores, esteiras
#define TELA_ABERTURA_MS       2000   // "Data Flow / Inventory v3.0" no boot

// ---- Parâmetros por esteira (A, B, C) ----------------------------------------
// pwmRegime  : PWM depois do kick (bancada: mínimo ~150 para mover com peça)
// kickMs     : partida em PWM 255 para vencer o atrito estático
// prazoPartidaMs : M1 — o topo precisa ficar livre neste prazo
// timeoutMs  : M2 — a junção precisa confirmar a passagem neste prazo
// saidaMs    : M3 — motor ligado depois da confirmação
// pulsoMinJuncaoMs : pulso mínimo na junção para valer como passagem
//                         pwm  kick  partida  timeout  saida  pulso
#define PARAM_ESTEIRA_A { 200,  150,  3000,    12500,   3000,  20 }
#define PARAM_ESTEIRA_B { 200,  150,  3000,    12500,   3000,  20 }
#define PARAM_ESTEIRA_C { 200,  150,  3000,    12500,   3000,  20 }
