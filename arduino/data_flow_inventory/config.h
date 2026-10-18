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

// ---- LCD I2C 16x2 -------------------------------------------------------------
// O endereço não é fixo: o firmware varre o barramento e usa o módulo que
// responder em 0x20–0x27 ou 0x38–0x3F (src/logica/lcd_logica.h). Se o LCD sumir
// (ruído de motor, mau contato), tenta religá-lo com o sistema parado:
// primeiro depois de LCD_RECUPERACAO_BASE_MS e, se não adiantar, cada vez mais
// devagar, até LCD_RECUPERACAO_MAX_MS.
#define LCD_RECUPERACAO_BASE_MS  5000UL
#define LCD_RECUPERACAO_MAX_MS   60000UL

// ---- Separador (roda giratória): motor de passo 28BYJ-48 + driver ULN2003 -----
// ULN2003 IN1..IN4 nos pinos 5 a 8: sequenciais, livres no Uno e fora do que já
// está em uso (serial 0/1, sensores 2, 4 e A0–A3, I²C A4/A5, motores DC 9/10/11).
// NÃO ligue o VCC do ULN2003 no 5 V do Uno alimentado por USB: o motor puxa
// ~240 mA e o ruído derruba o LCD. Use 5 V próprios, com o GND em comum.
#define STEPPER_IN1        5
#define STEPPER_IN2        6
#define STEPPER_IN3        7
#define STEPPER_IN4        8
// Passos por volta DA RODA (passo completo). O 28BYJ-48 tem engrenagem 63,68:1, ou
// seja ~2038 passos por volta, e não 2048: com 2048 o erro acumularia ~1,8° a cada
// volta e os compartimentos desalinhariam em poucos ciclos. Calibre em bancada.
#define SEPARADOR_PASSOS_POR_VOLTA   2038
// A biblioteca Stepper só precisa de um múltiplo de 4 (fases das bobinas) e do ritmo.
#define SEPARADOR_PASSOS_BIBLIOTECA  2048
#define SEPARADOR_RPM      10     // se a roda perder passos ou travar, diminua (ex.: 8)
// 1 = inverte o sentido do giro: use se a roda girar ao contrário do esperado (A e B trocam de lugar).
#define SEPARADOR_INVERTER_SENTIDO  0
// 1 = a roda gira sozinha até o compartimento da peça quando a entrega é confirmada.
// 0 (padrão) = só gira pelo comando de bancada CMD:SEP:A|B|C|0 no Serial Monitor.
// Valide a roda ISOLADA (sem a FSM) e só então mude para 1: assim o motor de passo
// não interfere nos testes das esteiras.
#define SEPARADOR_NA_ENTREGA  0
// Ângulo de cada compartimento a partir da posição ao ligar (a roda deve estar no
// neutro quando o Uno liga: não há sensor de referência). C = neutro por padrão.
#define SEPARADOR_GRAUS_NEUTRO  0
#define SEPARADOR_GRAUS_A       120
#define SEPARADOR_GRAUS_B       240
#define SEPARADOR_GRAUS_C       0

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
#define PARAM_ESTEIRA_A { 225,  180,  3000,    12500,   3000,  20 }
#define PARAM_ESTEIRA_B { 200,  130,  3000,    12500,   3000,  20 }
#define PARAM_ESTEIRA_C { 230,  180,  3000,    12500,   3000,  20 }
