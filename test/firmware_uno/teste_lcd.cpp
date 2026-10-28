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
#include "icones_fsm.h"
#include "telas.h"

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

// ---- Faixa de ícones da FSM --------------------------------------------------------

static char iconeEm(uint8_t a, uint8_t k) { return telaFalsa(a).glifo[OLED_PAGINA_ICONES][oledIconeX(k)]; }
static bool iconeInvertido(uint8_t a, uint8_t k) {
  return telaFalsa(a).glifoInvertido[OLED_PAGINA_ICONES][oledIconeX(k)];
}

TESTE(lcd_icones_fonte_tem_5_glifos_de_20x16_com_margem_de_2_px) {
  VERIFICA(IconesFsm[0] == 0 && IconesFsm[1] == 0);  // largura fixa
  VERIFICA(IconesFsm[2] == OLED_ICONE_LARGURA_PX);
  VERIFICA(IconesFsm[3] == 16);
  VERIFICA(IconesFsm[4] == ICONE_PRIMEIRO);
  VERIFICA(IconesFsm[5] == TELA_N_ICONES);
  VERIFICA(sizeof(IconesFsm) == 6 + TELA_N_ICONES * 2 * OLED_ICONE_LARGURA_PX);
  for (uint8_t k = 0; k < TELA_N_ICONES; k++) {
    const uint8_t* g = IconesFsm + 6 + k * 2 * OLED_ICONE_LARGURA_PX;
    bool temDesenho = false;
    for (uint8_t pagina = 0; pagina < 2; pagina++) {
      const uint8_t* p = g + pagina * OLED_ICONE_LARGURA_PX;
      // 2 colunas vazias de cada lado: o ícone invertido vira um bloco com borda.
      VERIFICA(p[0] == 0 && p[1] == 0 && p[18] == 0 && p[19] == 0);
      for (uint8_t c = 2; c < 18; c++) temDesenho = temDesenho || p[c] != 0;
    }
    VERIFICA(temDesenho);
  }
}

TESTE(lcd_icones_primeira_vez_desenha_a_faixa_inteira_com_o_atual_invertido) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdIcones(0);  // aguardando
  for (uint8_t k = 0; k < TELA_N_ICONES; k++) {
    VERIFICA(iconeEm(0x3C, k) == (char)(ICONE_PRIMEIRO + k));
    VERIFICA(iconeInvertido(0x3C, k) == (k == 0));
  }
  VERIFICA(telaFalsa(0x3C).glifosEscritos == TELA_N_ICONES);
}

TESTE(lcd_icones_mesmo_estado_nao_acessa_o_i2c) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdIcones(0);
  const long antes = barramento().transacoes;
  for (int i = 0; i < 20; i++) lcdIcones(0);  // o loop chama a cada ciclo
  VERIFICA(barramento().transacoes == antes);
}

TESTE(lcd_icones_troca_de_estado_redesenha_so_os_dois_que_mudam) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdIcones(0);
  const long escritos = telaFalsa(0x3C).glifosEscritos;
  lcdIcones(3);  // entregando
  VERIFICA(telaFalsa(0x3C).glifosEscritos == escritos + 2);
  VERIFICA(!iconeInvertido(0x3C, 0));
  VERIFICA(iconeInvertido(0x3C, 3));
  const uint8_t outros[] = {1, 2, 4};
  for (uint8_t k : outros) VERIFICA(!iconeInvertido(0x3C, k));
}

TESTE(lcd_icones_nao_atrapalham_o_texto_que_vem_depois) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdIcones(4);  // erro: escreve invertido e com outra fonte
  lcdAtualizar("ERRO: Timeout A", "Retire a peca");
  // Texto na fonte 7x14, com 2 px entre letras e sem inversão (o dublê não guarda texto invertido).
  VERIFICA_TEXTO(linha1(0x3C), "ERRO: Timeout A ");
  VERIFICA_TEXTO(linha2(0x3C), "Retire a peca   ");
  VERIFICA(telaFalsa(0x3C).fonteLargura == OLED_FONTE_LARGURA_PX);
  VERIFICA(telaFalsa(0x3C).espacoLetra == OLED_ESPACO_LETRA_PX);
}

TESTE(lcd_icones_fora_da_faixa_ou_sem_display_nao_fazem_nada) {
  cenarioLimpo();
  VERIFICA(!lcdIniciar());  // barramento vazio: segue sem display
  const long semDisplay = barramento().transacoes;
  lcdIcones(0);
  VERIFICA(barramento().transacoes == semDisplay);
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  const long antes = barramento().transacoes;
  lcdIcones(TELA_N_ICONES);
  lcdIcones(OLED_ICONE_NENHUM);
  VERIFICA(barramento().transacoes == antes);
}

TESTE(lcd_icones_timeout_desliga_o_display_e_religar_redesenha_a_faixa) {
  cenarioLimpo();
  displayEm(0x3C);
  VERIFICA(lcdIniciar());
  lcdIcones(0);
  const uint16_t quedasAntes = lcdQuedas();
  barramento().falhaEm = barramento().transacoes + 2;  // ruído no meio da troca de ícone
  lcdIcones(2);
  VERIFICA(!lcdAtivo());
  VERIFICA(lcdQuedas() == quedasAntes + 1);

  VERIFICA(lcdIniciar());  // tela apagada no begin
  const long escritos = telaFalsa(0x3C).glifosEscritos;
  lcdIcones(2);
  VERIFICA(telaFalsa(0x3C).glifosEscritos == escritos + TELA_N_ICONES);  // a faixa inteira de novo
  VERIFICA(iconeInvertido(0x3C, 2));
  VERIFICA(!iconeInvertido(0x3C, 0));
}
