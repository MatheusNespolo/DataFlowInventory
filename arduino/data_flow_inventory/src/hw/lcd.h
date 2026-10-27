// ============================================================
// DATA FLOW INVENTORY — Display OLED 0,96" I2C (SSD1306, 128x64) (hardware)
// ------------------------------------------------------------
// Substitui o LCD 16x2; os nomes "lcd*" ficaram (ver lcd_logica.h). Varre o
// barramento I²C e usa o display que responder em 0x3C ou 0x3D. Sem display,
// o sistema segue SEM display (nada trava). Mostra as mesmas 2 linhas de 16
// colunas de antes, em fonte 7x14; redesenha só quando o texto muda,
// sobrescrevendo com espaços (sem clear(), sem piscar).
//
// lcdIniciar() pode ser chamada de novo para religar o display que sumiu
// (ruído de motor, mau contato): ela refaz a busca e a inicialização do zero.
// Leva ~0,1 s quando acha o display, então só com os motores parados. A
// política de quando tentar está em lcd_logica.h.
// ============================================================
#pragma once
#include <stdint.h>

bool lcdIniciar();                                  // true se achou e iniciou o LCD
void lcdAtualizar(const char* l1, const char* l2);  // no-op sem LCD

bool lcdAtivo();                // o LCD está respondendo agora
uint8_t lcdEndereco();          // endereço I²C em uso; 0 se o LCD está fora
uint8_t lcdDispositivos();      // dispositivos I²C vistos na última varredura (diagnóstico)
uint16_t lcdQuedas();           // vezes em que o LCD parou de responder em operação
