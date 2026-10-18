// src/hw/lcd.cpp de verdade, compilado no PC com um barramento I²C e um LCD de
// mentira (test/firmware_uno/mocks): busca de endereço, barramento preso,
// queda em operação e religamento.
#include <string.h>

#include "lcd.h"
#include "teste.h"

// O Wire e a biblioteca do LCD são os de mentira (mocks/).
#include "LiquidCrystal_I2C.h"
#include "Wire.h"

static const long TRANSACOES_DA_VARREDURA = 0x77 - 0x08 + 1;  // 112 endereços

static void cenarioLimpo() {
  barramentoReiniciar();
  telasReiniciar();
}

static void lcdEm(uint8_t a) { barramento().responde[a] = true; }

TESTE(lcd_acha_0x27_e_escreve_a_tela_de_abertura) {
  cenarioLimpo();
  lcdEm(0x27);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdAtivo());
  VERIFICA(lcdEndereco() == 0x27);
  lcdAtualizar("Data Flow", "Inventory v3.0");
  VERIFICA_TEXTO(telaFalsa(0x27).linha[0], "Data Flow       ");
  VERIFICA_TEXTO(telaFalsa(0x27).linha[1], "Inventory v3.0  ");
}

TESTE(lcd_acha_0x3f) {
  cenarioLimpo();
  lcdEm(0x3F);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x3F);
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  VERIFICA_TEXTO(telaFalsa(0x3F).linha[0], "Estoque:        ");
}

TESTE(lcd_acha_modulo_com_jumpers_em_outro_endereco) {
  const uint8_t enderecos[] = {0x20, 0x26, 0x38, 0x3E};
  for (uint8_t i = 0; i < 4; i++) {
    cenarioLimpo();
    lcdEm(enderecos[i]);
    VERIFICA(lcdIniciar());
    VERIFICA(lcdEndereco() == enderecos[i]);
    lcdAtualizar("Teste", "endereco");
    VERIFICA_TEXTO(telaFalsa(enderecos[i]).linha[0], "Teste           ");
  }
}

TESTE(lcd_prefere_0x27_quando_ha_dois_modulos) {
  cenarioLimpo();
  lcdEm(0x3F);
  lcdEm(0x27);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x27);
}

TESTE(lcd_sem_modulo_informa_quantos_dispositivos_viu) {
  cenarioLimpo();
  lcdEm(0x50);  // uma EEPROM qualquer: não é LCD
  lcdEm(0x68);  // um relógio qualquer
  VERIFICA(!lcdIniciar());
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
  VERIFICA(lcdDispositivos() == 2);  // barramento vivo, mas sem módulo de LCD
  lcdAtualizar("nao", "escreve");    // sem LCD: nada acontece, nada trava
  VERIFICA(telaFalsa(0x50).iniciou == 0);
}

TESTE(lcd_barramento_vazio_conta_zero_dispositivos) {
  cenarioLimpo();
  VERIFICA(!lcdIniciar());
  VERIFICA(lcdDispositivos() == 0);  // nada responde: fiação, solda ou pull-up
  VERIFICA(barramento().transacoes == TRANSACOES_DA_VARREDURA);
}

TESTE(lcd_barramento_preso_desiste_no_primeiro_timeout) {
  cenarioLimpo();
  lcdEm(0x27);
  barramento().preso = true;
  VERIFICA(!lcdIniciar());
  VERIFICA(barramento().timeouts == 1);   // 25 ms, e não 112 x 25 ms (estouraria o watchdog)
  VERIFICA(barramento().transacoes == 1);
}

TESTE(lcd_timeout_na_inicializacao_segue_sem_lcd) {
  cenarioLimpo();
  lcdEm(0x27);
  barramento().falhaEm = TRANSACOES_DA_VARREDURA + 10;  // no meio do init
  VERIFICA(!lcdIniciar());
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
}

TESTE(lcd_um_timeout_em_operacao_desliga_e_conta_a_queda) {
  cenarioLimpo();
  lcdEm(0x27);
  VERIFICA(lcdIniciar());
  const uint16_t quedasAntes = lcdQuedas();
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  barramento().falhaEm = barramento().transacoes + 3;  // pico de ruído no meio da escrita
  lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
  VERIFICA(lcdQuedas() == quedasAntes + 1);
  // Barramento normal de novo, mas sem religar o LCD continua parado: é o que a
  // recuperação do .ino resolve.
  for (int i = 0; i < 50; i++) lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());
}

TESTE(lcd_religa_depois_da_queda_e_redesenha_tudo) {
  cenarioLimpo();
  lcdEm(0x27);
  VERIFICA(lcdIniciar());
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  barramento().falhaEm = barramento().transacoes + 3;
  lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());

  VERIFICA(lcdIniciar());  // o .ino chama isto com o sistema parado
  VERIFICA(lcdAtivo());
  VERIFICA(lcdEndereco() == 0x27);
  VERIFICA(telaFalsa(0x27).iniciou == 2);  // reinicializou o controlador
  // O texto que já estava na tela antes da queda tem de ser redesenhado (a tela foi apagada).
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  VERIFICA_TEXTO(telaFalsa(0x27).linha[0], "Estoque:        ");
  VERIFICA_TEXTO(telaFalsa(0x27).linha[1], "A:15 B:15 C:15  ");
}

TESTE(lcd_religa_em_outro_endereco_se_o_modulo_mudar) {
  cenarioLimpo();
  lcdEm(0x27);
  VERIFICA(lcdIniciar());
  barramento().responde[0x27] = false;  // sumiu...
  lcdEm(0x3F);                          // ...e voltou em outro endereço
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x3F);
}
