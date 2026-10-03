// ============================================================
// DATA FLOW INVENTORY — Máquina de estados do Uno (lógica pura)
// ------------------------------------------------------------
// 5 estados (fluxograma oficial) + supervisão da entrega por marcos.
// A FSM não toca em hardware: recebe as entradas de um ciclo e devolve
// os eventos a publicar. Motores e LCD são derivados do estado
// (fsmMotorLigado / tela): em ERRO, nenhum motor fica ligado.
// Invariante: o estoque só diminui em SUP_CONFIRMOU (passagem válida
// na junção da esteira pedida).
// C++ puro (testado no PC).
// ============================================================
#pragma once
#include <stdint.h>

#include "protocolo.h"
#include "supervisor_entrega.h"

enum Estado : uint8_t {
  AGUARDANDO_PEDIDO = 0,
  VERIFICANDO_ESTOQUE,
  ACIONANDO_ESTEIRA,
  ENTREGANDO_PECA,
  ERRO
};

enum TipoErro : uint8_t {
  ERR_NENHUM = 0,
  ERR_SEM_ESTOQUE,            // contador zerado            → ERRO
  ERR_SEM_PECA_TOPO,          // contador > 0, topo vazio   → ERRO
  ERR_JUNCAO_OBSTRUIDA,       // junção ocupada antes de ligar → ERRO
  ERR_MOTOR_SEM_AVANCO,       // M1                          → ERRO
  ERR_TIMEOUT,                // M2                          → ERRO
  ERR_PECA_PRESA_SAIDA,       // M3                          → ERRO
  ERR_OCUPADO,                // rejeição (não muda o estado)
  ERR_PECA_INVALIDA,          // rejeição
  ERR_COMANDO_DESCONHECIDO    // rejeição
};

enum FaseErro : uint8_t { FERR_NENHUMA = 0, FERR_VERIFICACAO, FERR_PARTIDA, FERR_TRANSITO, FERR_SAIDA };

// Nomes publicados no JSON (TXT: flash no AVR).
const char* nomeEstado(Estado e);
const char* nomeErro(TipoErro e);
const char* nomeFaseErro(FaseErro f);  // nullptr para FERR_NENHUMA

enum TelaLcd : uint8_t { TELA_ESTOQUE = 0, TELA_ENTREGANDO, TELA_SAINDO, TELA_ENTREGUE, TELA_ERRO };

enum TipoEvento : uint8_t { EV_PEDIDO = 0, EV_ERRO, EV_ENTREGA, EV_ESTADO, EV_ESTOQUE, EV_ESTEIRAS };

struct Evento {
  TipoEvento tipo;
  char peca;          // 'A'..'C' ou 0
  TipoErro erro;      // EV_ERRO
  FaseErro fase;      // EV_ERRO
  long tMs;           // EV_ERRO: tempo desde a partida (ou -1)
  long bordas;        // EV_ERRO: bordas na junção (ou -1)
};

struct EntradasFsm {
  uint32_t agora;
  bool topo[3];              // sensores de topo FILTRADOS (true = peça presente)
  LeituraJuncao juncao[3];   // junções (capturadas por interrupção)
  ComandoTipo cmd;           // comando recebido neste ciclo (CMD_NENHUM se nenhum)
  char cmdPeca;              // peça do CMD_PECA
};

struct SaidasFsm {
  static const uint8_t MAX_EVENTOS = 6;  // pior caso atual: 4 (pedido/ocupado + falha)
  Evento eventos[MAX_EVENTOS];
  uint8_t nEventos;
  int8_t zerarJuncao;        // -1 = nada; 0..2 = zerar a captura dessa junção
};

struct Fsm {
  Estado estado;
  uint8_t peca;              // 0 = nenhuma; 1..3 = A..C
  int estoque[3];
  ParamEsteira params[3];
  Supervisor sup;
  bool emPausa;              // pausa pós-entrega (motor parado)
  uint32_t pausaDesde;
  TelaLcd tela;
  TipoErro erroAtual;        // último erro que levou a ERRO (para o LCD)
};

static const uint16_t PAUSA_POS_ENTREGA_MS = 1500;

void fsmIniciar(Fsm& f, const ParamEsteira params[3], int estoqueInicial);
void fsmPasso(Fsm& f, const EntradasFsm& in, SaidasFsm& out);
// Esteira idx (0..2) deve estar ligada agora?
bool fsmMotorLigado(const Fsm& f, uint8_t idx);
char letraPeca(uint8_t peca);  // 1..3 → 'A'..'C'; outro → 0
