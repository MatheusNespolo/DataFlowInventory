// Separador automático: a roda se prepara de acordo com a peça pedida.
#include "separador_auto.h"
#include "teste.h"

TESTE(separador_auto_so_se_move_para_pedido_aprovado) {
  SeparadorAuto a;
  separadorAutoIniciar(a, 0);
  VERIFICA(separadorAutoDestino(a, AGUARDANDO_PEDIDO, 0, 100) == 0);
  VERIFICA(separadorAutoDestino(a, VERIFICANDO_ESTOQUE, 2, 100) == 0);  // ainda checando
  VERIFICA(separadorAutoDestino(a, ERRO, 2, 100) == 0);                 // pedido recusado
  VERIFICA(separadorAutoDestino(a, ACIONANDO_ESTEIRA, 1, 100) == 'A');
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 2, 100) == 'B');
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 3, 100) == 'C');
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 0, 100) == 0);      // sem peça
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 4, 100) == 0);      // peça inválida
}

TESTE(separador_auto_espera_a_peca_anterior_antes_de_mudar_de_compartimento) {
  SeparadorAuto a;
  separadorAutoIniciar(a, 8000);
  // Primeiro pedido: sem entrega anterior, não espera nada.
  VERIFICA(separadorAutoDestino(a, ACIONANDO_ESTEIRA, 2, 0) == 'B');
  separadorAutoEntrega(a, 5000);
  VERIFICA(separadorAutoDestino(a, ACIONANDO_ESTEIRA, 1, 12999) == 0);    // 7999 ms depois: ainda espera
  VERIFICA(separadorAutoDestino(a, ACIONANDO_ESTEIRA, 1, 13000) == 'A');  // 8000 ms: libera
}

TESTE(separador_auto_funciona_no_estouro_do_millis) {
  SeparadorAuto a;
  separadorAutoIniciar(a, 8000);
  const uint32_t quase = 0xFFFFFF00UL;
  separadorAutoEntrega(a, quase);
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 3, quase + 7999) == 0);   // passou de 0
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 3, quase + 8000) == 'C');
}

TESTE(separador_auto_e_nivel_repetir_a_pergunta_nao_muda_nada) {
  SeparadorAuto a;
  separadorAutoIniciar(a, 0);
  for (int i = 0; i < 5; i++) VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 2, 100 + (uint32_t)i) == 'B');
  separadorAutoEntrega(a, 200);  // com espera 0, a entrega não atrapalha o próprio pedido
  VERIFICA(separadorAutoDestino(a, ENTREGANDO_PECA, 2, 200) == 'B');
}
