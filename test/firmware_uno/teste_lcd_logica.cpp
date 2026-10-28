// Regras do display OLED: onde procurar, quando tentar religar e o layout das 2 linhas.
#include "lcd_logica.h"
#include "telas.h"
#include "teste.h"

TESTE(lcd_candidatos_sao_os_dois_enderecos_do_ssd1306) {
  VERIFICA(LCD_N_CANDIDATOS == 2);
  VERIFICA(lcdCandidato(0) == 0x3C);  // o de quase todos os módulos vem primeiro
  VERIFICA(lcdCandidato(1) == 0x3D);
  VERIFICA(lcdCandidato(LCD_N_CANDIDATOS) == 0);
}

TESTE(lcd_indice_e_candidato_sao_inversos) {
  for (uint8_t i = 0; i < LCD_N_CANDIDATOS; i++) {
    VERIFICA(lcdIndiceCandidato(lcdCandidato(i)) == (int8_t)i);
  }
  VERIFICA(lcdIndiceCandidato(0x50) == -1);  // EEPROM, por exemplo
  VERIFICA(lcdIndiceCandidato(0x27) == -1);  // expansor do LCD 16x2 antigo
  VERIFICA(lcdIndiceCandidato(0x3F) == -1);
  VERIFICA(lcdIndiceCandidato(0x00) == -1);
}

TESTE(lcd_escolhe_o_candidato_preferido) {
  VERIFICA(lcdEscolher(0) == -1);
  VERIFICA(lcdEscolher((uint16_t)(1u << lcdIndiceCandidato(0x3D))) == lcdIndiceCandidato(0x3D));
  // Dois displays no barramento: vence o 0x3C.
  const uint16_t dois = (uint16_t)((1u << lcdIndiceCandidato(0x3C)) | (1u << lcdIndiceCandidato(0x3D)));
  VERIFICA(lcdCandidato((uint8_t)lcdEscolher(dois)) == 0x3C);
}

TESTE(lcd_layout_16_colunas_cabem_nos_128_px_e_as_linhas_nao_se_sobrepoem) {
  VERIFICA(LCD_COLUNAS * (OLED_FONTE_LARGURA_PX + OLED_ESPACO_LETRA_PX) <= OLED_LARGURA_PX);
  VERIFICA(OLED_PAGINA_LINHA1 + OLED_FONTE_PAGINAS <= OLED_PAGINA_LINHA2);
  VERIFICA(OLED_PAGINA_LINHA2 + OLED_FONTE_PAGINAS <= OLED_PAGINAS);
  // Linha 1 inteira nos 16 px de cima (faixa amarela dos módulos bicolores).
  VERIFICA((OLED_PAGINA_LINHA1 + OLED_FONTE_PAGINAS) * 8 <= 16);
}

TESTE(lcd_layout_faixa_de_icones_cabe_no_rodape_sem_encostar_no_texto) {
  VERIFICA(OLED_PAGINA_LINHA2 + OLED_FONTE_PAGINAS <= OLED_PAGINA_ICONES);  // não sobrepõe a linha 2
  VERIFICA(OLED_PAGINA_ICONES + 2 <= OLED_PAGINAS);                         // 16 px de altura
  // O último ícone termina dentro dos 128 px e eles não se sobrepõem.
  VERIFICA(oledIconeX(TELA_N_ICONES - 1) + OLED_ICONE_LARGURA_PX <= OLED_LARGURA_PX);
  VERIFICA(OLED_ICONE_PASSO_PX >= OLED_ICONE_LARGURA_PX);
  VERIFICA(oledIconeX(0) == 2 && oledIconeX(4) == 102);
  VERIFICA(OLED_ICONE_NENHUM >= TELA_N_ICONES);
}

TESTE(lcd_recuperacao_so_tenta_parado_e_sem_lcd) {
  LcdRecuperacao r;
  lcdRecuperacaoIniciar(r, 1000, 5000, 60000);
  VERIFICA(!lcdDeveTentar(r, false, true, 5999));   // cedo demais
  VERIFICA(lcdDeveTentar(r, false, true, 6000));    // venceu o intervalo
  VERIFICA(!lcdDeveTentar(r, true, true, 60000));   // o LCD já está ativo
  VERIFICA(!lcdDeveTentar(r, false, false, 60000)); // motor ligado: nunca
}

TESTE(lcd_recuperacao_dobra_o_intervalo_ate_o_teto_e_volta_no_sucesso) {
  LcdRecuperacao r;
  lcdRecuperacaoIniciar(r, 0, 5000, 60000);
  uint32_t t = 0;
  const uint32_t esperado[] = {10000, 20000, 40000, 60000, 60000};
  for (int i = 0; i < 5; i++) {
    t += r.intervaloMs;
    VERIFICA(lcdDeveTentar(r, false, true, t));
    lcdRegistrarTentativa(r, t, false);
    VERIFICA(r.intervaloMs == esperado[i]);
  }
  t += r.intervaloMs;
  lcdRegistrarTentativa(r, t, true);   // religou
  VERIFICA(r.intervaloMs == 5000);
}

TESTE(lcd_recuperacao_funciona_no_estouro_do_millis) {
  LcdRecuperacao r;
  const uint32_t quase = 0xFFFFFF00UL;
  lcdRecuperacaoIniciar(r, quase, 5000, 60000);
  VERIFICA(!lcdDeveTentar(r, false, true, quase + 4000));
  VERIFICA(lcdDeveTentar(r, false, true, quase + 5000));  // passou de 0
}
