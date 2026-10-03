// Supervisor de entrega por marcos (M1 partida, M2 trânsito, M3 saída).
#include "supervisor_entrega.h"
#include "teste.h"

// ---- Supervisor ---------------------------------------------------------------

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

static LeituraJuncao livre() {
  LeituraJuncao j;
  j.ocupada = false;
  j.ocupouEm = 0;
  j.maiorPulsoMs = 0;
  j.bordas = 0;
  return j;
}

TESTE(supervisor_m1_motor_sem_avanco) {
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 1000);
  LeituraJuncao j = livre();
  VERIFICA(supervisorAtualizar(s, 3999, true, j) == SUP_SEGUE);
  VERIFICA(supervisorAtualizar(s, 4000, true, j) == SUP_FALHA_SEM_AVANCO);
}

TESTE(supervisor_m2_timeout_sem_bordas) {
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao j = livre();
  VERIFICA(supervisorAtualizar(s, 1000, false, j) == SUP_SEGUE);  // topo liberou
  VERIFICA(s.fase == FASE_TRANSITO);
  VERIFICA(supervisorAtualizar(s, 12499, false, j) == SUP_SEGUE);
  VERIFICA(supervisorAtualizar(s, 12500, false, j) == SUP_FALHA_TIMEOUT);
}

TESTE(supervisor_confirma_por_pulso_completo_capturado) {
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao j = livre();
  supervisorAtualizar(s, 1000, false, j);
  j.maiorPulsoMs = 25;  // a interrupção viu um pulso de 25 ms entre dois ciclos
  j.bordas = 2;
  VERIFICA(supervisorAtualizar(s, 5000, false, j) == SUP_CONFIRMOU);
  VERIFICA(s.fase == FASE_SAIDA);
}

TESTE(supervisor_ignora_pulso_curto_de_ruido) {
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao j = livre();
  supervisorAtualizar(s, 1000, false, j);
  j.maiorPulsoMs = 5;
  j.bordas = 2;
  VERIFICA(supervisorAtualizar(s, 2000, false, j) == SUP_SEGUE);
  j.ocupada = true;
  j.ocupouEm = 2000;
  VERIFICA(supervisorAtualizar(s, 2010, false, j) == SUP_SEGUE);     // 10 ms
  VERIFICA(supervisorAtualizar(s, 2020, false, j) == SUP_CONFIRMOU); // 20 ms
}

TESTE(supervisor_m3_saida_ok_e_peca_presa) {
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao j = livre();
  j.maiorPulsoMs = 30;
  VERIFICA(supervisorAtualizar(s, 4000, false, j) == SUP_CONFIRMOU);
  VERIFICA(supervisorAtualizar(s, 6999, false, j) == SUP_SEGUE);
  VERIFICA(supervisorAtualizar(s, 7000, false, j) == SUP_SAIDA_OK);

  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao k = livre();
  k.ocupada = true;
  k.ocupouEm = 4000;
  VERIFICA(supervisorAtualizar(s, 4030, false, k) == SUP_CONFIRMOU);
  VERIFICA(supervisorAtualizar(s, 7030, false, k) == SUP_FALHA_PRESA_SAIDA);
}

TESTE(supervisor_timeout_conta_desde_a_partida_no_estouro_do_millis) {
  Supervisor s;
  const uint32_t ini = 0xFFFFF000UL;
  supervisorIniciar(s, paramPadrao(), ini);
  LeituraJuncao j = livre();
  supervisorAtualizar(s, ini + 500, false, j);
  VERIFICA(supervisorAtualizar(s, ini + 12499, false, j) == SUP_SEGUE);
  VERIFICA(supervisorAtualizar(s, ini + 12500, false, j) == SUP_FALHA_TIMEOUT);
}

TESTE(supervisor_ocupou_depois_da_leitura_do_millis_nao_confirma) {
  // A interrupção marcou ocupouEm 1 ms DEPOIS do agora lido pelo loop.
  Supervisor s;
  supervisorIniciar(s, paramPadrao(), 0);
  LeituraJuncao j = livre();
  supervisorAtualizar(s, 1000, false, j);
  j.ocupada = true;
  j.ocupouEm = 2001;
  VERIFICA(supervisorAtualizar(s, 2000, false, j) == SUP_SEGUE);
  VERIFICA(!passagemValida(j, 2000, 20));
  VERIFICA(supervisorAtualizar(s, 2021, false, j) == SUP_CONFIRMOU);  // 20 ms reais depois
}
