#include "fsm.h"

#include "texto_flash.h"

const char* nomeEstado(Estado e) {
  switch (e) {
    case AGUARDANDO_PEDIDO:   return TXT("AGUARDANDO_PEDIDO");
    case VERIFICANDO_ESTOQUE: return TXT("VERIFICANDO_ESTOQUE");
    case ACIONANDO_ESTEIRA:   return TXT("ACIONANDO_ESTEIRA");
    case ENTREGANDO_PECA:     return TXT("ENTREGANDO_PECA");
    default:                  return TXT("ERRO");
  }
}

const char* nomeErro(TipoErro e) {
  switch (e) {
    case ERR_SEM_ESTOQUE:          return TXT("sem_estoque");
    case ERR_SEM_PECA_TOPO:        return TXT("sem_peca_topo");
    case ERR_JUNCAO_OBSTRUIDA:     return TXT("juncao_obstruida");
    case ERR_MOTOR_SEM_AVANCO:     return TXT("motor_sem_avanco");
    case ERR_TIMEOUT:              return TXT("timeout");
    case ERR_PECA_PRESA_SAIDA:     return TXT("peca_presa_saida");
    case ERR_OCUPADO:              return TXT("ocupado");
    case ERR_PECA_INVALIDA:        return TXT("peca_invalida");
    case ERR_COMANDO_DESCONHECIDO: return TXT("comando_desconhecido");
    default:                       return TXT("desconhecido");
  }
}

const char* nomeFaseErro(FaseErro f) {
  switch (f) {
    case FERR_VERIFICACAO: return TXT("verificacao");
    case FERR_PARTIDA:     return TXT("partida");
    case FERR_TRANSITO:    return TXT("transito");
    case FERR_SAIDA:       return TXT("saida");
    default:               return nullptr;
  }
}

char letraPeca(uint8_t peca) {
  return (peca >= 1 && peca <= 3) ? (char)('A' + peca - 1) : 0;
}

static void emitir(SaidasFsm& out, TipoEvento tipo, char peca = 0,
                   TipoErro erro = ERR_NENHUM, FaseErro fase = FERR_NENHUMA,
                   long tMs = -1, long bordas = -1) {
  if (out.nEventos >= SaidasFsm::MAX_EVENTOS) return;
  Evento& e = out.eventos[out.nEventos++];
  e.tipo = tipo;
  e.peca = peca;
  e.erro = erro;
  e.fase = fase;
  e.tMs = tMs;
  e.bordas = bordas;
}

// Vai para ERRO: motores param (fsmMotorLigado passa a ser falso), o erro é
// publicado com o diagnóstico e o dashboard recebe o novo estado e as esteiras.
static void falhar(Fsm& f, SaidasFsm& out, TipoErro erro, FaseErro fase,
                   long tMs, long bordas) {
  f.estado = ERRO;
  f.emPausa = false;
  f.tela = TELA_ERRO;
  f.erroAtual = erro;
  emitir(out, EV_ERRO, letraPeca(f.peca), erro, fase, tMs, bordas);
  emitir(out, EV_ESTADO);
  emitir(out, EV_ESTEIRAS);
}

void fsmIniciar(Fsm& f, const ParamEsteira params[3], int estoqueInicial) {
  f.estado = AGUARDANDO_PEDIDO;
  f.peca = 0;
  for (uint8_t i = 0; i < 3; i++) {
    f.estoque[i] = estoqueInicial;
    f.params[i] = params[i];
  }
  supervisorIniciar(f.sup, params[0], 0);
  f.sup.fase = FASE_FIM;
  f.emPausa = false;
  f.pausaDesde = 0;
  f.tela = TELA_ESTOQUE;
  f.erroAtual = ERR_NENHUM;
}

bool fsmMotorLigado(const Fsm& f, uint8_t idx) {
  if (f.peca != idx + 1) return false;
  if (f.estado != ENTREGANDO_PECA) return false;
  if (f.emPausa) return false;
  return f.sup.fase != FASE_FIM;
}

static void tratarComando(Fsm& f, const EntradasFsm& in, SaidasFsm& out) {
  switch (in.cmd) {
    case CMD_PECA:
      if (f.estado != AGUARDANDO_PEDIDO) {
        emitir(out, EV_ERRO, in.cmdPeca, ERR_OCUPADO);
        return;
      }
      f.peca = (uint8_t)(in.cmdPeca - 'A' + 1);
      emitir(out, EV_PEDIDO, in.cmdPeca);
      f.estado = VERIFICANDO_ESTOQUE;
      return;
    case CMD_PECA_INVALIDA:
      emitir(out, EV_ERRO, 0, ERR_PECA_INVALIDA);
      return;
    case CMD_DESCONHECIDO:
      emitir(out, EV_ERRO, 0, ERR_COMANDO_DESCONHECIDO);
      return;
    case CMD_RESET:
      if (f.estado == ERRO) {
        f.estado = AGUARDANDO_PEDIDO;
        f.peca = 0;
        f.emPausa = false;
        f.sup.fase = FASE_FIM;
        f.tela = TELA_ESTOQUE;
        f.erroAtual = ERR_NENHUM;
        emitir(out, EV_ESTADO);
        emitir(out, EV_ESTOQUE);
      }
      // RESET fora de ERRO: ignorado de propósito (sistema já estável).
      return;
    default:
      return;
  }
}

void fsmPasso(Fsm& f, const EntradasFsm& in, SaidasFsm& out) {
  out.nEventos = 0;
  out.zerarJuncao = -1;

  tratarComando(f, in, out);
  const uint8_t idx = (f.peca >= 1 && f.peca <= 3) ? (uint8_t)(f.peca - 1) : 0;

  switch (f.estado) {
    case VERIFICANDO_ESTOQUE:
      // Checagem prévia: qualquer falha vai para ERRO SEM ligar o motor.
      if (f.estoque[idx] <= 0) {
        falhar(f, out, ERR_SEM_ESTOQUE, FERR_VERIFICACAO, -1, -1);
      } else if (!in.topo[idx]) {
        falhar(f, out, ERR_SEM_PECA_TOPO, FERR_VERIFICACAO, -1, -1);
      } else if (in.juncao[idx].ocupada) {
        falhar(f, out, ERR_JUNCAO_OBSTRUIDA, FERR_VERIFICACAO, -1, -1);
      } else {
        f.estado = ACIONANDO_ESTEIRA;
        f.tela = TELA_ENTREGANDO;
        emitir(out, EV_ESTADO);
      }
      break;

    case ACIONANDO_ESTEIRA:
      out.zerarJuncao = (int8_t)idx;
      supervisorIniciar(f.sup, f.params[idx], in.agora);
      f.estado = ENTREGANDO_PECA;
      emitir(out, EV_ESTEIRAS);
      break;

    case ENTREGANDO_PECA: {
      if (f.emPausa) {
        if ((uint32_t)(in.agora - f.pausaDesde) >= PAUSA_POS_ENTREGA_MS) {
          f.emPausa = false;
          f.peca = 0;
          f.estado = AGUARDANDO_PEDIDO;
          f.tela = TELA_ESTOQUE;
          emitir(out, EV_ESTADO);
          emitir(out, EV_ESTEIRAS);
        }
        break;
      }
      const LeituraJuncao& j = in.juncao[idx];
      const long tMs = (long)(uint32_t)(in.agora - f.sup.inicioMs);
      switch (supervisorAtualizar(f.sup, in.agora, in.topo[idx], j)) {
        case SUP_CONFIRMOU:
          f.estoque[idx]--;
          f.tela = TELA_SAINDO;
          emitir(out, EV_ENTREGA, letraPeca(f.peca));
          emitir(out, EV_ESTOQUE);
          break;
        case SUP_SAIDA_OK:
          f.emPausa = true;
          f.pausaDesde = in.agora;
          f.tela = TELA_ENTREGUE;
          emitir(out, EV_ESTEIRAS);
          break;
        case SUP_FALHA_SEM_AVANCO:
          falhar(f, out, ERR_MOTOR_SEM_AVANCO, FERR_PARTIDA, tMs, j.bordas);
          break;
        case SUP_FALHA_TIMEOUT:
          falhar(f, out, ERR_TIMEOUT, FERR_TRANSITO, tMs, j.bordas);
          break;
        case SUP_FALHA_PRESA_SAIDA:
          falhar(f, out, ERR_PECA_PRESA_SAIDA, FERR_SAIDA, tMs, j.bordas);
          break;
        default:
          break;
      }
      break;
    }

    default:  // AGUARDANDO_PEDIDO e ERRO: nada a fazer (motores desligados)
      break;
  }
}
