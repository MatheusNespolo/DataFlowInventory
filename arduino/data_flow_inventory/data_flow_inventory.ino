// ============================================================
// DATA FLOW INVENTORY — Sistema de Intralogística Automatizada
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// Autores: Henrique Moni, Matheus Nespolo, Murilo Tolardo, Vitor Marcolongo
// Ano: 2026 — Firmware do Arduino Uno v3.0
// ============================================================
// Máquina de estados com 5 etapas (fluxograma oficial):
//   AGUARDANDO_PEDIDO → VERIFICANDO_ESTOQUE → ACIONANDO_ESTEIRA
//   → ENTREGANDO_PECA → ERRO
// A entrega é supervisionada por marcos (src/logica/supervisor_entrega):
//   M1 partida  — o topo fica livre em 3 s (senão motor_sem_avanco)
//   M2 trânsito — a junção confirma a passagem em 12,5 s (senão timeout)
//   M3 saída    — motor 3 s depois da confirmação; a junção precisa liberar
// O estoque só diminui na confirmação da junção da esteira pedida.
//
// Organização:
//   config.h        pinos e parâmetros por esteira
//   src/logica/     regras puras (FSM, marcos, filtro, protocolo, telas),
//                   testadas no PC em test/firmware_uno
//   src/hw/         motores, sensores, serial, LCD e diagnóstico
//
// Comunicação com o ESP32 (Serial 9600): mensagens JSON idênticas às do
// firmware v2.x, com campos opcionais novos. Comandos: CMD:PECA:X, CMD:RESET.
// Botões físicos seguem desabilitados (o código deles está só no histórico do Git,
// firmware v2.1). O separador (motor de passo 28BYJ-48 + ULN2003, pinos 5 a 8) não
// bloqueia o loop (src/hw/separador.*). Por padrão só gira pelo comando de bancada
// CMD:SEP:A|B|C|0 no Serial Monitor; a rotação automática na entrega liga em
// SEPARADOR_NA_ENTREGA (config.h), depois de validar a roda isolada.
// ============================================================

#include "config.h"
#include "src/hw/comunicacao.h"
#include "src/hw/diagnostico.h"
#include "src/hw/lcd.h"
#include "src/hw/motores.h"
#include "src/hw/sensores.h"
#include "src/hw/separador.h"
#include "src/logica/fsm.h"
#include "src/logica/lcd_logica.h"
#include "src/logica/telas.h"
#include "src/logica/texto_flash.h"

static const ParamEsteira PARAMS[3] = {PARAM_ESTEIRA_A, PARAM_ESTEIRA_B, PARAM_ESTEIRA_C};

// M1 precisa caber dentro de M2: o prazo da partida não pode passar do timeout.
#define PRAZOS_COERENTES(P) (ParamEsteira P.prazoPartidaMs <= ParamEsteira P.timeoutMs)
static_assert(PRAZOS_COERENTES(PARAM_ESTEIRA_A), "esteira A: prazoPartidaMs > timeoutMs");
static_assert(PRAZOS_COERENTES(PARAM_ESTEIRA_B), "esteira B: prazoPartidaMs > timeoutMs");
static_assert(PRAZOS_COERENTES(PARAM_ESTEIRA_C), "esteira C: prazoPartidaMs > timeoutMs");

static Fsm fsm;
static LcdRecuperacao lcdRecup;
static uint32_t inicioMs = 0;
static uint32_t aberturaMs = 0;
static uint32_t ultimaAmostra = 0;
static uint32_t ultimaPublicacao = 0;
static uint8_t passoPublicacao = 0;

void setup() {
  motoresIniciar();       // 1º: gates do IRF520 em 0 antes de qualquer coisa
  diagnosticoIniciar();   // causa do reset + watchdog de 2 s
  Serial.begin(BAUD_SERIAL);
  comunicacaoIniciar();

  inicioMs = millis();
  sensoresIniciar(inicioMs);
  // lcdIniciar pode levar mais de 1 s com o I2C ruim: alimenta o watchdog
  // antes e depois para não entrar em laço de reset no boot.
  watchdogAlimentar();
  const bool lcdNoBoot = lcdIniciar();
  watchdogAlimentar();
  lcdRecuperacaoIniciar(lcdRecup, millis(), LCD_RECUPERACAO_BASE_MS, LCD_RECUPERACAO_MAX_MS);
  lcdAtualizar("Data Flow", "Inventory v" VERSAO_FIRMWARE);
  aberturaMs = millis();  // lcdIniciar leva ~1 s: a abertura conta daqui

  // Separador (roda giratória): bobinas soltas e roda suposta no neutro.
  separadorIniciar(micros());

  fsmIniciar(fsm, PARAMS, ESTOQUE_INICIAL);

  // Mesma ordem do firmware v2.x: estoque inicial e depois o evento de início.
  publicarEstoque(fsm);
  publicarInicio(TXT(VERSAO_FIRMWARE), diagnosticoCausaReset(), lcdNoBoot, ramLivre());
}

void loop() {
  const uint32_t agora = millis();

  if ((uint32_t)(agora - ultimaAmostra) >= INTERVALO_AMOSTRA_MS) {
    ultimaAmostra = agora;
    sensoresAmostrar(agora);
  }

  // Entradas do ciclo → FSM.
  EntradasFsm in;
  in.agora = agora;
  for (uint8_t i = 0; i < 3; i++) {
    in.topo[i] = sensorTopo(i);
    in.juncao[i] = sensorJuncao(i);
  }
  in.cmd = comunicacaoLer(&in.cmdPeca);
  // Teste de bancada do separador (só pela USB; o ESP32 nunca gera este comando):
  // gira a roda sem passar pela FSM, sem pedido e sem estoque.
  if (in.cmd == CMD_SEPARADOR) {
    separadorMoverPara(in.cmdPeca);
    in.cmd = CMD_NENHUM;
  }

  SaidasFsm out;
  fsmPasso(fsm, in, out);
  if (out.zerarJuncao >= 0) sensorJuncaoZerar((uint8_t)out.zerarJuncao);

  // Motores derivados do estado: em ERRO nenhum fica ligado.
  bool desejado[3];
  for (uint8_t i = 0; i < 3; i++) desejado[i] = fsmMotorLigado(fsm, i);
  motoresAplicar(desejado, PARAMS, agora);

  for (uint8_t i = 0; i < out.nEventos; i++) {
    publicarEvento(out.eventos[i], fsm, agora);
#if SEPARADOR_NA_ENTREGA
    // Confirmação da entrega: a roda gira até o compartimento da peça (sem bloquear).
    if (out.eventos[i].tipo == EV_ENTREGA) separadorMoverPara(out.eventos[i].peca);
#endif
  }

  // Publicação periódica escalonada: uma mensagem a cada 250 ms, cada uma
  // 1x por segundo (evita prender o loop na serial de 9600 baud).
  if ((uint32_t)(agora - ultimaPublicacao) >= INTERVALO_PUBLICACAO / PASSOS_PUBLICACAO) {
    ultimaPublicacao = agora;
    switch (passoPublicacao) {
      case 0:  publicarEstado(fsm, agora); break;
      case 1:  publicarEstoque(fsm);       break;
      case 2:  publicarSensores();         break;
      default: publicarEsteiras(fsm);      break;
    }
    passoPublicacao = (uint8_t)((passoPublicacao + 1) % PASSOS_PUBLICACAO);
  }

  // LCD fora do ar (ruído de motor, mau contato, módulo que ainda não respondia no
  // boot): tenta religar, mas só com o sistema parado. Achar o módulo custa ~1 s
  // (a biblioteca espera 1 s no init), então nunca com motor ligado; o watchdog é
  // alimentado antes e depois.
  const bool sistemaParado = (fsm.estado == AGUARDANDO_PEDIDO || fsm.estado == ERRO) &&
                             !desejado[0] && !desejado[1] && !desejado[2];
  if (lcdDeveTentar(lcdRecup, lcdAtivo(), sistemaParado, agora)) {
    watchdogAlimentar();
    const bool religou = lcdIniciar();
    watchdogAlimentar();
    lcdRegistrarTentativa(lcdRecup, millis(), religou);
  }

  // LCD: depois da tela de abertura, mostra a tela da FSM (redesenha só se mudou).
  if (lcdAtivo() && (uint32_t)(agora - aberturaMs) >= TELA_ABERTURA_MS) {
    char l1[LCD_COLUNAS + 1], l2[LCD_COLUNAS + 1];
    textoTela(fsm, l1, l2);
    lcdAtualizar(l1, l2);
  }

  // Separador: no máximo 1 passo por volta do loop (não bloqueia) e solta as bobinas parado.
  separadorAtualizar(micros());

  // De novo depois da serial e do LCD: no ciclo da partida, o kick de 255
  // termina no tempo certo mesmo que a publicação tenha demorado.
  motoresAplicar(desejado, PARAMS, millis());

  watchdogAlimentar();
}
