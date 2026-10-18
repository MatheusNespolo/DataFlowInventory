// Plano de giro do separador: sem bloquear, sem perder passo e sem reiniciar o Uno.
#include "plano_separador.h"
#include "teste.h"

static const int32_t PASSOS = 2048;  // 28BYJ-48 em passo completo
static const int32_t RPM = 10;

// Simula o loop() do Uno: chama o plano a cada `tickUs` até a roda parar.
struct Resultado {
  uint32_t duracaoUs;
  int32_t passos;
  uint32_t minEntrePassosUs;  // menor tempo medido entre dois passos seguidos
};

static Resultado girar(PlanoSeparador& p, uint32_t inicioUs, uint32_t tickUs) {
  Resultado r = {0, 0, 0xFFFFFFFFUL};
  uint32_t t = inicioUs;
  uint32_t ultimo = 0;
  bool deuPasso = false;
  const uint32_t limite = 10000000UL;  // 10 s: se estourar, o teste falha por tempo
  while (planoOcupado(p) && r.duracaoUs < limite) {
    if (planoPasso(p, t) != 0) {
      if (deuPasso && (uint32_t)(t - ultimo) < r.minEntrePassosUs) r.minEntrePassosUs = (uint32_t)(t - ultimo);
      ultimo = t;
      deuPasso = true;
      r.passos++;
    }
    t += tickUs;
    r.duracaoUs += tickUs;
  }
  return r;
}

TESTE(separador_intervalo_igual_ao_do_stepper_a_10_rpm) {
  VERIFICA(separadorIntervaloUs(PASSOS, RPM) == 2929);  // 60e6 / 2048 / 10
  VERIFICA(separadorIntervaloUs(0, RPM) == 0);
  VERIFICA(separadorIntervaloUs(PASSOS, 0) == 0);
}

TESTE(separador_escolhe_o_caminho_mais_curto) {
  VERIFICA(separadorDelta(0, 683, PASSOS) == 683);        // 120°
  VERIFICA(separadorDelta(0, 1365, PASSOS) == -683);      // 240° = volta pelo outro lado
  VERIFICA(separadorDelta(2000, 10, PASSOS) == 58);       // passa pelo zero
  VERIFICA(separadorDelta(10, 2000, PASSOS) == -58);
  VERIFICA(separadorDelta(0, 1024, PASSOS) == 1024);      // empate: sentido horário
  VERIFICA(separadorDelta(300, 300, PASSOS) == 0);
}

TESTE(separador_da_um_passo_por_chamada_e_respeita_o_intervalo) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, 683);
  VERIFICA(planoPasso(p, 100) == 0);    // cedo demais
  VERIFICA(planoPasso(p, 2928) == 0);   // 1 µs antes
  VERIFICA(planoPasso(p, 2929) == 1);   // venceu
  VERIFICA(planoPasso(p, 2930) == 0);   // outro passo só 2929 µs depois
  VERIFICA(planoPasso(p, 2929 + 2929) == 1);
  VERIFICA(p.posicao == 2);
}

TESTE(separador_120_graus_chega_exato_sem_perder_passo) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, PASSOS / 3);  // 682 passos
  Resultado r = girar(p, 0, 1000);  // loop de 1 ms
  VERIFICA(!planoOcupado(p));
  VERIFICA(p.posicao == PASSOS / 3);
  VERIFICA(r.passos == PASSOS / 3);
  VERIFICA(r.duracaoUs > 1900000 && r.duracaoUs < 2400000);  // ~2 s de giro real
  // Nunca mais rápido que o motor aguenta: sem perda de passo.
  VERIFICA(r.minEntrePassosUs >= separadorIntervaloUs(PASSOS, RPM));
  // Para o watchdog: cada chamada devolve na hora (no máximo 1 passo, que o
  // Stepper executa sem espera porque o intervalo já venceu), então o giro de
  // ~2 s acontece ao longo de ~2000 voltas do loop de 1 ms, e não dentro de uma.
}

TESTE(separador_volta_pelo_outro_lado_quando_e_mais_curto) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, (PASSOS * 2) / 3);  // 1365 = 240°
  Resultado r = girar(p, 0, 1000);
  VERIFICA(p.posicao == (PASSOS * 2) / 3);
  VERIFICA(r.passos == PASSOS - (PASSOS * 2) / 3);  // 683 passos, no sentido contrário
}

TESTE(separador_muda_de_alvo_no_meio_do_giro_sem_perder_a_posicao) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, 683);
  uint32_t t = 0;
  int dados = 0;
  while (dados < 100) {
    t += 1000;
    if (planoPasso(p, t) != 0) dados++;
  }
  VERIFICA(p.posicao == 100);
  planoIrPara(p, 0);  // novo pedido: volta ao neutro
  VERIFICA(p.restantes == -100);
  Resultado r = girar(p, t, 1000);
  VERIFICA(p.posicao == 0);
  VERIFICA(r.passos == 100);
}

TESTE(separador_alvo_fora_da_faixa_e_reduzido_a_volta) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, PASSOS);  // uma volta cheia = mesma posição
  VERIFICA(!planoOcupado(p));
  planoIrPara(p, -1);      // = 2047, um passo para trás
  VERIFICA(p.restantes == -1);
}

TESTE(separador_funciona_no_estouro_do_micros) {
  PlanoSeparador p;
  const uint32_t quase = 0xFFFFFF00UL;
  planoIniciar(p, PASSOS, RPM, quase);
  planoIrPara(p, 50);
  Resultado r = girar(p, quase, 1000);
  VERIFICA(p.posicao == 50);
  VERIFICA(r.passos == 50);
}

TESTE(separador_atraso_do_loop_nao_gera_passos_em_rajada) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  planoIrPara(p, 683);
  VERIFICA(planoPasso(p, 3000) == 1);
  // O loop travou 25 ms (I²C do LCD em timeout): continua sendo um passo por
  // chamada, não 8 de uma vez, e o próximo só vem depois de um intervalo cheio.
  VERIFICA(planoPasso(p, 3000 + 25000) == 1);
  VERIFICA(planoPasso(p, 3000 + 25000 + 100) == 0);
  VERIFICA(p.posicao == 2);
}

TESTE(separador_solta_as_bobinas_depois_de_parado) {
  PlanoSeparador p;
  planoIniciar(p, PASSOS, RPM, 0);
  VERIFICA(!planoDeveSoltar(p, 1000000));  // nunca andou: nada energizado
  planoIrPara(p, 3);
  uint32_t t = 0;
  while (planoOcupado(p)) planoPasso(p, t += 3000);
  VERIFICA(p.bobinasEnergizadas);
  VERIFICA(!planoDeveSoltar(p, t + SEPARADOR_ESPERA_SOLTAR_US - 1));
  VERIFICA(planoDeveSoltar(p, t + SEPARADOR_ESPERA_SOLTAR_US));
  planoSoltou(p);
  VERIFICA(!planoDeveSoltar(p, t + 2 * SEPARADOR_ESPERA_SOLTAR_US));
  planoIrPara(p, 0);  // volta a girar: energiza de novo no primeiro passo
  VERIFICA(planoPasso(p, t + 3000000UL) == -1);
  VERIFICA(p.bobinasEnergizadas);
}

TESTE(separador_graus_para_passos_arredonda_e_normaliza) {
  VERIFICA(separadorGrausParaPassos(0, 2038) == 0);
  VERIFICA(separadorGrausParaPassos(120, 2038) == 679);    // 679,33
  VERIFICA(separadorGrausParaPassos(240, 2038) == 1359);   // 1358,67
  VERIFICA(separadorGrausParaPassos(360, 2038) == 0);      // volta cheia = mesma posição
  VERIFICA(separadorGrausParaPassos(-120, 2038) == 1359);  // = 240°
  VERIFICA(separadorGrausParaPassos(480, 2038) == 679);    // = 120°
  VERIFICA(separadorGrausParaPassos(120, 2048) == 683);    // 682,67
  VERIFICA(separadorGrausParaPassos(90, 0) == 0);          // passos inválidos
}

// Os compartimentos são posições ABSOLUTAS: pedir A, B e C em sequência, muitas
// vezes, não acumula erro de arredondamento no software (o erro que sobra, se houver,
// é a diferença entre os passos por volta configurados e os reais do motor).
TESTE(separador_ciclo_a_b_c_fecha_exatamente_uma_volta) {
  const int32_t volta = 2038;
  const int32_t alvo[3] = {separadorGrausParaPassos(120, volta), separadorGrausParaPassos(240, volta), 0};
  PlanoSeparador p;
  planoIniciar(p, volta, RPM, 0);
  uint32_t t = 0;
  int32_t passos = 0;
  for (int ciclo = 0; ciclo < 100; ciclo++) {
    for (int k = 0; k < 3; k++) {
      planoIrPara(p, alvo[k]);
      Resultado r = girar(p, t, 1000);
      t += r.duracaoUs;
      passos += r.passos;
      VERIFICA(p.posicao == alvo[k]);
    }
  }
  VERIFICA(passos == 100 * volta);  // 100 ciclos = 100 voltas exatas, sempre pelo caminho mais curto
}
