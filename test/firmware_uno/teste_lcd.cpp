// src/hw/lcd.cpp de verdade (display OLED SSD1306), compilado no PC com um
// barramento I²C e um display de mentira (test/firmware_uno/mocks): busca de
// endereço, layout das 2 linhas, barramento preso, queda em operação e religamento.
#include <string.h>

#include "lcd.h"
#include "lcd_logica.h"
#include "teste.h"

// O Wire e a biblioteca do display são os de mentira (mocks/).
#include "SSD1306AsciiWire.h"
#include "Wire.h"

static const long TRANSACOES_DA_VARREDURA = 0x77 - 0x08 + 1;  // 112 endereços

static void cenarioLimpo() {
  barramentoReiniciar();
  telasReiniciar();
}

static void displayEm(uint8_t a) { barramento().responde[a] = true; }

static const char* linha1(uint8_t a) { return telaFalsa(a).pagina[OLED_PAGINA_LINHA1]; }
static const char* linha2(uint8_t a) { return telaFalsa(a).pagina[OLED_PAGINA_LINHA2]; }

TESTE(lcd_acha_0x3c_e_escreve_a_tela_de_abertura_nas_duas_linhas) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdAtivo());
  VERIFICA(lcdEndereco() == 0x3C);
  VERIFICA(telaFalsa(0x3C).deslocamentoColuna == 0);  // SSD1306 (OLED_CONTROLADOR_SH1106 = 0)
  lcdAtualizar("Data Flow", "Inventory v3.0");
  VERIFICA_TEXTO(linha1(0x3C), "Data Flow       ");
  VERIFICA_TEXTO(linha2(0x3C), "Inventory v3.0  ");
  // As outras páginas ficam apagadas (a fonte 7x14 ocupa também a página seguinte de cada linha).
  VERIFICA_TEXTO(telaFalsa(0x3C).pagina[2], "                ");
  VERIFICA_TEXTO(telaFalsa(0x3C).pagina[6], "                ");
}

TESTE(lcd_usa_a_fonte_7x14_com_2_px_entre_letras_e_cabem_16_colunas) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdAtualizar("ABCDEFGHIJKLMNOP", "A:15 B:15 C:15");
  VERIFICA(telaFalsa(0x3C).fonteLargura == OLED_FONTE_LARGURA_PX);  // X11fixed7x14: 6 x 14 px
  VERIFICA(telaFalsa(0x3C).fonteAltura == 14);
  VERIFICA(telaFalsa(0x3C).espacoLetra == OLED_ESPACO_LETRA_PX);  // o setFont não o desfez
  // A 16ª letra cabe inteira nos 128 px (o display de mentira corta o que passa da borda).
  VERIFICA_TEXTO(linha1(0x3C), "ABCDEFGHIJKLMNOP");
  VERIFICA_TEXTO(linha2(0x3C), "A:15 B:15 C:15  ");
}

TESTE(lcd_texto_mais_longo_que_16_colunas_e_cortado) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdAtualizar("0123456789ABCDEFGHIJ", "x");
  VERIFICA_TEXTO(linha1(0x3C), "0123456789ABCDEF");
}

TESTE(lcd_acha_0x3d) {
  cenarioLimpo();
  displayEm(0x3D);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x3D);
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  VERIFICA_TEXTO(linha1(0x3D), "Estoque:        ");
}

TESTE(lcd_prefere_0x3c_quando_ha_dois_displays) {
  cenarioLimpo();
  displayEm(0x3D);
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x3C);
}

TESTE(lcd_antigo_16x2_no_barramento_nao_e_confundido_com_o_display) {
  cenarioLimpo();
  displayEm(0x27);  // expansor PCF8574 do LCD 16x2 que saiu
  displayEm(0x3F);  // PCF8574A
  VERIFICA(!lcdIniciar());
  VERIFICA(lcdDispositivos() == 2);
  VERIFICA(telaFalsa(0x27).iniciou == 0);
  VERIFICA(telaFalsa(0x3F).iniciou == 0);
}

TESTE(lcd_sem_display_informa_quantos_dispositivos_viu) {
  cenarioLimpo();
  displayEm(0x50);  // uma EEPROM qualquer: não é display
  displayEm(0x68);  // um relógio qualquer
  VERIFICA(!lcdIniciar());
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
  VERIFICA(lcdDispositivos() == 2);  // barramento vivo, mas sem display
  lcdAtualizar("nao", "escreve");    // sem display: nada acontece, nada trava
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
  displayEm(0x3C);
  barramento().preso = true;
  VERIFICA(!lcdIniciar());
  VERIFICA(barramento().timeouts == 1);   // 25 ms, e não 112 x 25 ms (estouraria o watchdog)
  VERIFICA(barramento().transacoes == 1);
}

TESTE(lcd_timeout_na_inicializacao_segue_sem_display) {
  cenarioLimpo();
  displayEm(0x3C);
  barramento().falhaEm = TRANSACOES_DA_VARREDURA + 10;  // no meio do begin
  VERIFICA(!lcdIniciar());
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
}

TESTE(lcd_um_timeout_em_operacao_desliga_e_conta_a_queda) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  const uint16_t quedasAntes = lcdQuedas();
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  barramento().falhaEm = barramento().transacoes + 3;  // pico de ruído no meio da escrita
  lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdEndereco() == 0);
  VERIFICA(lcdQuedas() == quedasAntes + 1);
  // Barramento normal de novo, mas sem religar o display continua parado: é o que a
  // recuperação do .ino resolve.
  const long antes = barramento().transacoes;
  for (int i = 0; i < 50; i++) lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());
  VERIFICA(barramento().transacoes == antes);  // nem tenta falar com o display
}

TESTE(lcd_religa_depois_da_queda_e_redesenha_tudo) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  barramento().falhaEm = barramento().transacoes + 3;
  lcdAtualizar("Entregando", "Peca B");
  VERIFICA(!lcdAtivo());

  VERIFICA(lcdIniciar());  // o .ino chama isto com o sistema parado
  VERIFICA(lcdAtivo());
  VERIFICA(lcdEndereco() == 0x3C);
  VERIFICA(telaFalsa(0x3C).iniciou == 2);  // reinicializou o controlador (e apagou a tela)
  // O texto que já estava na tela antes da queda tem de ser redesenhado.
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  VERIFICA_TEXTO(linha1(0x3C), "Estoque:        ");
  VERIFICA_TEXTO(linha2(0x3C), "A:15 B:15 C:15  ");
}

TESTE(lcd_religa_em_outro_endereco_se_o_display_mudar) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  barramento().responde[0x3C] = false;  // sumiu...
  displayEm(0x3D);                      // ...e voltou em outro endereço
  VERIFICA(lcdIniciar());
  VERIFICA(lcdEndereco() == 0x3D);
}

TESTE(lcd_redesenha_so_a_linha_que_mudou) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  const long antes = barramento().transacoes;
  lcdAtualizar("Estoque:", "A:15 B:15 C:15");
  VERIFICA(barramento().transacoes == antes);  // nada mudou: nenhum acesso ao I2C
  lcdAtualizar("Estoque:", "A:14 B:15 C:15");
  VERIFICA(barramento().transacoes == antes + 1 + 16);  // cursor + 16 colunas da linha 2
  VERIFICA_TEXTO(linha2(0x3C), "A:14 B:15 C:15  ");
}
