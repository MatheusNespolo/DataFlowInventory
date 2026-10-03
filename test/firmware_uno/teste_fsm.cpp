// Cenários da FSM com tempo simulado (casos de bancada P1–P5 inclusos).
#include "fsm.h"
#include "teste.h"

namespace {

ParamEsteira param() {
  ParamEsteira p;
  p.pwmRegime = 200;
  p.kickMs = 150;
  p.prazoPartidaMs = 3000;
  p.timeoutMs = 12500;
  p.saidaMs = 3000;
  p.pulsoMinJuncaoMs = 20;
  return p;
}

// Bancada simulada: guarda as entradas e registra o que a FSM publicou.
struct Bancada {
  Fsm f;
  EntradasFsm in;
  SaidasFsm out;
  char log[2048];   // eventos publicados, um por linha
  int debitos;      // vezes em que o estoque diminuiu
  int confirmacoes; // vezes em que houve EV_ENTREGA

  Bancada() {
    ParamEsteira p[3] = {param(), param(), param()};
    fsmIniciar(f, p, 15);
    memset(&in, 0, sizeof in);
    for (int i = 0; i < 3; i++) in.topo[i] = true;  // uma peça em cada topo
    log[0] = 0;
    debitos = 0;
    confirmacoes = 0;
  }

  void anota(const char* s) {
    strncat(log, s, sizeof log - strlen(log) - 1);
    strncat(log, "\n", sizeof log - strlen(log) - 1);
  }

  // Um ciclo do loop no instante t (ms).
  void passo(uint32_t t, ComandoTipo cmd = CMD_NENHUM, char peca = 0) {
    in.agora = t;
    in.cmd = cmd;
    in.cmdPeca = peca;
    int antes = f.estoque[0] + f.estoque[1] + f.estoque[2];
    fsmPasso(f, in, out);
    int depois = f.estoque[0] + f.estoque[1] + f.estoque[2];
    debitos += antes - depois;
    for (uint8_t i = 0; i < out.nEventos; i++) {
      const Evento& e = out.eventos[i];
      char linha[64];
      switch (e.tipo) {
        case EV_PEDIDO:   snprintf(linha, sizeof linha, "pedido %c", e.peca); break;
        case EV_ENTREGA:  snprintf(linha, sizeof linha, "entrega %c", e.peca); confirmacoes++; break;
        case EV_ESTADO:   snprintf(linha, sizeof linha, "estado %s", nomeEstado(f.estado)); break;
        case EV_ESTOQUE:  snprintf(linha, sizeof linha, "estoque %d %d %d", f.estoque[0], f.estoque[1], f.estoque[2]); break;
        case EV_ESTEIRAS: snprintf(linha, sizeof linha, "esteiras %d%d%d", fsmMotorLigado(f, 0), fsmMotorLigado(f, 1), fsmMotorLigado(f, 2)); break;
        default:
          snprintf(linha, sizeof linha, "erro %s %c %s", nomeErro(e.erro), e.peca ? e.peca : '-',
                   nomeFaseErro(e.fase) ? nomeFaseErro(e.fase) : "-");
          break;
      }
      anota(linha);
    }
    if (out.zerarJuncao >= 0) {
      LeituraJuncao& j = in.juncao[out.zerarJuncao];
      j.maiorPulsoMs = 0;
      j.bordas = 0;
    }
  }

  // Avança de t0 a t1 em passos de 5 ms.
  void ate(uint32_t t0, uint32_t t1) {
    for (uint32_t t = t0; t <= t1; t += 5) passo(t);
  }

  bool contem(const char* trecho) const { return strstr(log, trecho) != nullptr; }
  bool algumMotor() const { return fsmMotorLigado(f, 0) || fsmMotorLigado(f, 1) || fsmMotorLigado(f, 2); }
};

}  // namespace

TESTE(entrega_normal_debita_na_confirmacao_e_volta_a_aguardar) {
  for (int idx = 0; idx < 3; idx++) {
    Bancada b;
    const char letra = (char)('A' + idx);
    b.passo(0, CMD_PECA, letra);       // pedido + verificação
    VERIFICA(b.f.estado == ACIONANDO_ESTEIRA);
    b.passo(5);                        // liga a esteira
    VERIFICA(b.f.estado == ENTREGANDO_PECA);
    VERIFICA(fsmMotorLigado(b.f, (uint8_t)idx));
    b.in.topo[idx] = false;            // a peça saiu do topo
    b.ate(10, 4000);
    VERIFICA(b.f.estoque[idx] == 15);  // ainda não confirmou
    b.in.juncao[idx].ocupada = true;   // peça sobre a junção
    b.in.juncao[idx].ocupouEm = 4005;
    b.ate(4005, 4030);
    VERIFICA(b.f.estoque[idx] == 14);  // debitou na confirmação
    VERIFICA(fsmMotorLigado(b.f, (uint8_t)idx));  // motor segue na saída
    b.in.juncao[idx].ocupada = false;  // a peça caiu na principal
    b.ate(4035, 7025);
    VERIFICA(!b.algumMotor());         // saída de 3 s terminou
    VERIFICA(b.f.estado == ENTREGANDO_PECA && b.f.emPausa);
    b.ate(7030, 8600);
    VERIFICA(b.f.estado == AGUARDANDO_PEDIDO);
    VERIFICA(b.debitos == 1 && b.confirmacoes == 1);
    char esperado[48];
    snprintf(esperado, sizeof esperado, "pedido %c\nestado ACIONANDO_ESTEIRA", letra);
    VERIFICA(b.contem(esperado));
    VERIFICA(b.contem("estado AGUARDANDO_PEDIDO"));
  }
}

TESTE(checagem_previa_vai_para_erro_sem_ligar_motor) {
  {  // estoque zerado
    Bancada b;
    b.f.estoque[0] = 0;
    b.passo(0, CMD_PECA, 'A');
    VERIFICA(b.f.estado == ERRO && !b.algumMotor());
    VERIFICA(b.contem("erro sem_estoque A verificacao\nestado ERRO\nesteiras 000"));
  }
  {  // contador > 0 mas sem peça no topo
    Bancada b;
    b.in.topo[1] = false;
    b.passo(0, CMD_PECA, 'B');
    VERIFICA(b.f.estado == ERRO && !b.algumMotor());
    VERIFICA(b.contem("erro sem_peca_topo B verificacao"));
  }
  {  // junção já ocupada antes de ligar (sensor obstruído ou peça esquecida)
    Bancada b;
    b.in.juncao[2].ocupada = true;
    b.passo(0, CMD_PECA, 'C');
    VERIFICA(b.f.estado == ERRO && !b.algumMotor());
    VERIFICA(b.contem("erro juncao_obstruida C verificacao"));
  }
}

TESTE(caso_p2_esteira_c_travada_para_em_3s_sem_debito) {
  Bancada b;
  b.passo(0, CMD_PECA, 'C');
  b.passo(5);
  b.ate(10, 3000);                    // topo continua ocupado: motor não avança
  VERIFICA(b.f.estado == ENTREGANDO_PECA);
  b.ate(3005, 3010);
  VERIFICA(b.f.estado == ERRO);
  VERIFICA(!b.algumMotor());
  VERIFICA(b.contem("erro motor_sem_avanco C partida"));
  VERIFICA(b.debitos == 0);
}

TESTE(caso_p1_juncao_b_nao_registra_e_termina_em_timeout_sem_debito) {
  Bancada b;
  b.passo(0, CMD_PECA, 'B');
  b.passo(5);
  b.in.topo[1] = false;               // saiu do topo...
  b.ate(10, 12500);                   // ...mas J2 nunca mudou
  VERIFICA(b.f.estado == ENTREGANDO_PECA);
  b.ate(12505, 12510);
  VERIFICA(b.f.estado == ERRO && !b.algumMotor());
  VERIFICA(b.contem("erro timeout B transito"));
  VERIFICA(b.debitos == 0);
}

TESTE(ruido_na_juncao_nao_debita) {
  Bancada b;
  b.passo(0, CMD_PECA, 'A');
  b.passo(5);
  b.in.topo[0] = false;
  b.ate(10, 2000);
  b.in.juncao[0].maiorPulsoMs = 8;    // pico de 8 ms capturado pela interrupção
  b.in.juncao[0].bordas = 2;
  b.ate(2005, 3000);
  VERIFICA(b.debitos == 0);
  VERIFICA(b.f.estado == ENTREGANDO_PECA);
}

TESTE(peca_presa_na_saida_ja_debitou_e_vai_para_erro) {
  Bancada b;
  b.passo(0, CMD_PECA, 'A');
  b.passo(5);
  b.in.topo[0] = false;
  b.in.juncao[0].ocupada = true;
  b.in.juncao[0].ocupouEm = 1000;
  b.ate(1000, 1030);
  VERIFICA(b.debitos == 1);
  b.ate(1035, 4100);                  // junção continua ocupada
  VERIFICA(b.f.estado == ERRO && !b.algumMotor());
  VERIFICA(b.contem("erro peca_presa_saida A saida"));
  VERIFICA(b.debitos == 1);
}

TESTE(comandos_rejeitados_nao_mudam_estado) {
  Bancada b;
  b.passo(0, CMD_PECA, 'A');
  b.passo(5);
  b.passo(10, CMD_PECA, 'B');         // ocupado, com a peça PEDIDA
  VERIFICA(b.contem("erro ocupado B -"));
  b.passo(15, CMD_PECA_INVALIDA, 0);
  VERIFICA(b.contem("erro peca_invalida - -"));
  b.passo(20, CMD_DESCONHECIDO, 0);
  VERIFICA(b.contem("erro comando_desconhecido - -"));
  b.passo(25, CMD_RESET, 0);          // RESET fora de ERRO: ignorado
  VERIFICA(b.f.estado == ENTREGANDO_PECA);
  VERIFICA(fsmMotorLigado(b.f, 0));
}

TESTE(reset_em_erro_volta_a_aguardar_e_republica) {
  Bancada b;
  b.f.estoque[0] = 0;
  b.passo(0, CMD_PECA, 'A');
  VERIFICA(b.f.estado == ERRO);
  b.log[0] = 0;
  b.passo(5, CMD_RESET, 0);
  VERIFICA(b.f.estado == AGUARDANDO_PEDIDO);
  VERIFICA(b.contem("estado AGUARDANDO_PEDIDO\nestoque 0 15 15"));
  b.passo(10, CMD_PECA, 'B');         // aceita novo pedido
  VERIFICA(b.contem("pedido B"));
}

TESTE(saida_segura_em_erro_mantem_motores_desligados) {
  Bancada b;
  b.passo(0, CMD_PECA, 'C');
  b.passo(5);
  b.ate(10, 3010);                    // motor_sem_avanco
  VERIFICA(b.f.estado == ERRO);
  for (uint32_t t = 3015; t < 20000; t += 50) {
    b.in.topo[2] = (t / 50) % 2;       // sensores mudando não religam nada
    b.in.juncao[2].ocupada = (t / 100) % 2;
    b.passo(t);
    VERIFICA(!b.algumMotor());
  }
}

TESTE(propriedade_debito_so_com_passagem_valida_na_juncao_pedida) {
  // Varre peça pedida × junção que recebe o pulso × largura × instante e
  // compara com o esperado calculado à parte: só debita se o pulso veio na
  // junção da esteira PEDIDA, durou >= 20 ms e chegou antes do timeout.
  const uint16_t larguras[] = {5, 19, 20, 35};
  const uint32_t instantes[] = {2000, 13000};
  for (int pedida = 0; pedida < 3; pedida++) {
    for (int jun = 0; jun < 3; jun++) {
      for (int l = 0; l < 4; l++) {
        for (int k = 0; k < 2; k++) {
          Bancada b;
          const uint32_t t0 = instantes[k];
          const uint16_t larg = larguras[l];
          b.passo(0, CMD_PECA, (char)('A' + pedida));
          b.passo(5);
          b.in.topo[pedida] = false;
          b.ate(10, t0 - 5);
          LeituraJuncao& j = b.in.juncao[jun];
          for (uint32_t t = t0; t <= t0 + 40; t++) {  // passo de 1 ms em volta do pulso
            if (t == t0) { j.ocupada = true; j.ocupouEm = t0; j.bordas++; }
            if (t == t0 + larg) {
              j.ocupada = false;
              if (larg > j.maiorPulsoMs) j.maiorPulsoMs = larg;
              j.bordas++;
            }
            b.passo(t);
          }
          b.ate(t0 + 45, 20000);
          const int esperado = (jun == pedida && larg >= 20 && t0 < 12500) ? 1 : 0;
          VERIFICA(b.debitos == esperado);
          VERIFICA(b.debitos == b.confirmacoes);
        }
      }
    }
  }
}
