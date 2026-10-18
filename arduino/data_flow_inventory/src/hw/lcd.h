// ============================================================
// DATA FLOW INVENTORY — LCD I2C 16x2 (hardware)
// ------------------------------------------------------------
// Varre o barramento I²C e usa o primeiro módulo de LCD que responder, em
// qualquer endereço de expansor (0x20–0x27 ou 0x38–0x3F, ver lcd_logica.h).
// Sem LCD, o sistema segue SEM LCD (nada trava). Redesenha só quando o texto
// muda, sobrescrevendo com espaços (sem lcd.clear(), sem piscar).
//
// lcdIniciar() pode ser chamada de novo para religar o LCD que sumiu (ruído de
// motor, mau contato): ela refaz a busca e a inicialização do zero. Leva ~1 s
// quando acha o módulo (a biblioteca espera 1 s), então só com os motores
// parados. A política de quando tentar está em lcd_logica.h.
// ============================================================
#pragma once
#include <stdint.h>

bool lcdIniciar();                                  // true se achou e iniciou o LCD
void lcdAtualizar(const char* l1, const char* l2);  // no-op sem LCD

bool lcdAtivo();                // o LCD está respondendo agora
uint8_t lcdEndereco();          // endereço I²C em uso; 0 se o LCD está fora
uint8_t lcdDispositivos();      // dispositivos I²C vistos na última varredura (diagnóstico)
uint16_t lcdQuedas();           // vezes em que o LCD parou de responder em operação
