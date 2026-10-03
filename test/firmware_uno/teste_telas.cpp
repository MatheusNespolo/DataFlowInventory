// Textos do LCD (16 colunas).
#include "fsm.h"
#include "telas.h"
#include "teste.h"

static ParamEsteira paramPadrao() {
  ParamEsteira p;
  p.pwmRegime = 200;
  p.kickMs = 150;
  p.prazoPartidaMs = 3000;
  p.timeoutMs = 12500;
  p.saidaMs = 3000;
  p.pulsoMinJuncaoMs = 20;
  return p;
}

// ---- Telas ---------------------------------------------------------------------

static Fsm fsmNova() {
  Fsm f;
  ParamEsteira p[3] = {paramPadrao(), paramPadrao(), paramPadrao()};
  fsmIniciar(f, p, 15);
  return f;
}

TESTE(telas_cabem_em_16_colunas) {
  char l1[17], l2[17];
  Fsm f = fsmNova();
  textoTela(f, l1, l2);
  VERIFICA_TEXTO(l1, "Estoque:");
  VERIFICA_TEXTO(l2, "A:15 B:15 C:15");

  f.peca = 2;
  f.tela = TELA_ENTREGANDO;
  textoTela(f, l1, l2);
  VERIFICA_TEXTO(l1, "Entregando B");

  f.tela = TELA_ENTREGUE;
  f.estoque[1] = 14;
  textoTela(f, l1, l2);
  VERIFICA_TEXTO(l2, "Entregue! B:14");

  const TipoErro erros[] = {ERR_MOTOR_SEM_AVANCO, ERR_TIMEOUT, ERR_JUNCAO_OBSTRUIDA, ERR_SEM_PECA_TOPO,
                            ERR_SEM_ESTOQUE, ERR_PECA_PRESA_SAIDA, ERR_COMANDO_DESCONHECIDO};
  const char* esperado1[] = {"ERRO: Motor B", "ERRO: Timeout B", "ERRO: Juncao J2", "ERRO: Topo B",
                             "ERRO: Estoque B", "ERRO: Saida B", "ERRO"};
  const char* esperado2[] = {"Sem avanco", "Retire a peca", "Obstruida", "Sem peca",
                             "Zerado", "Peca presa", "comando_desconhe"};
  f.tela = TELA_ERRO;
  for (int i = 0; i < 7; i++) {
    f.erroAtual = erros[i];
    textoTela(f, l1, l2);
    VERIFICA_TEXTO(l1, esperado1[i]);
    VERIFICA_TEXTO(l2, esperado2[i]);
    VERIFICA(strlen(l1) <= 16 && strlen(l2) <= 16);
  }
}
