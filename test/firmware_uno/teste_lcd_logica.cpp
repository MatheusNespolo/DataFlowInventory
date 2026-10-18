// Regras do LCD: onde procurar o módulo e quando tentar religá-lo.
#include "lcd_logica.h"
#include "teste.h"

TESTE(lcd_candidatos_cobrem_os_dois_expansores_sem_repetir) {
  bool visto[128] = {};
  for (uint8_t i = 0; i < LCD_N_CANDIDATOS; i++) {
    const uint8_t a = lcdCandidato(i);
    VERIFICA((a >= 0x20 && a <= 0x27) || (a >= 0x38 && a <= 0x3F));
    VERIFICA(!visto[a]);
    visto[a] = true;
  }
  for (uint8_t a = 0x20; a <= 0x27; a++) VERIFICA(visto[a]);  // PCF8574
  for (uint8_t a = 0x38; a <= 0x3F; a++) VERIFICA(visto[a]);  // PCF8574A
  VERIFICA(lcdCandidato(0) == 0x27);  // os mais comuns primeiro
  VERIFICA(lcdCandidato(1) == 0x3F);
  VERIFICA(lcdCandidato(LCD_N_CANDIDATOS) == 0);
}

TESTE(lcd_indice_e_candidato_sao_inversos) {
  for (uint8_t i = 0; i < LCD_N_CANDIDATOS; i++) {
    VERIFICA(lcdIndiceCandidato(lcdCandidato(i)) == (int8_t)i);
  }
  VERIFICA(lcdIndiceCandidato(0x50) == -1);  // EEPROM, por exemplo
  VERIFICA(lcdIndiceCandidato(0x28) == -1);  // entre as duas faixas
  VERIFICA(lcdIndiceCandidato(0x00) == -1);
}

TESTE(lcd_escolhe_o_candidato_preferido) {
  VERIFICA(lcdEscolher(0) == -1);
  VERIFICA(lcdEscolher((uint16_t)(1u << lcdIndiceCandidato(0x3F))) == lcdIndiceCandidato(0x3F));
  // Dois módulos no barramento: vence o mais comum (0x27).
  const uint16_t dois = (uint16_t)((1u << lcdIndiceCandidato(0x27)) | (1u << lcdIndiceCandidato(0x3F)));
  VERIFICA(lcdCandidato((uint8_t)lcdEscolher(dois)) == 0x27);
  // 0x20 e 0x3F: 0x3F é mais comum que 0x20.
  const uint16_t outros = (uint16_t)((1u << lcdIndiceCandidato(0x20)) | (1u << lcdIndiceCandidato(0x3F)));
  VERIFICA(lcdCandidato((uint8_t)lcdEscolher(outros)) == 0x3F);
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
