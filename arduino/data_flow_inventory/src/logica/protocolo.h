// ============================================================
// DATA FLOW INVENTORY — Protocolo serial Uno ↔ ESP32 (lógica pura)
// ------------------------------------------------------------
// Interpreta comandos (CMD:PECA:X, CMD:RESET) e formata as mensagens
// JSON publicadas pelo Uno. C++ puro, sem Arduino.h: testado no PC
// (test/firmware_uno). O formato de cada mensagem é idêntico ao do
// firmware v2.x (ArduinoJson): mesma ordem de campos, sem espaços.
// Campos novos são sempre OPCIONAIS (só saem quando informados).
// Textos fixos passados às funções formatar* (estado, tipo, fase, versão,
// reset) devem ser TXT(...) — ver texto_flash.h.
// ============================================================
#pragma once
#include <stddef.h>
#include <stdint.h>

// ---- Comandos -----------------------------------------------------------
enum ComandoTipo : uint8_t {
  CMD_NENHUM = 0,       // linha vazia
  CMD_PECA,             // CMD:PECA:A|B|C (peça válida em *peca)
  CMD_PECA_INVALIDA,    // CMD:PECA: com letra/forma inválida
  CMD_RESET,            // CMD:RESET
  CMD_DESCONHECIDO      // qualquer outra linha
};

// Interpreta uma linha (sem '\n'). Ignora espaços nas pontas.
// Em CMD_PECA, *peca recebe 'A', 'B' ou 'C'; nos demais casos, 0.
ComandoTipo interpretarComando(const char* linha, char* peca);

// Acumula bytes da serial até '\n'. '\r' é ignorado. Linha maior que
// a capacidade é DESCARTADA inteira (até o próximo '\n').
struct LeitorLinha {
  static const uint8_t CAPACIDADE = 32;
  char buf[CAPACIDADE + 1];
  uint8_t n;
  bool descartando;
};
void leitorIniciar(LeitorLinha& l);
// Devolve true quando uma linha completa está em l.buf (terminada em 0).
bool leitorAlimentar(LeitorLinha& l, char c);

// ---- Mensagens --------------------------------------------------------------
// Todas escrevem em buf (capacidade cap), terminam em 0 e devolvem o
// tamanho escrito (sem o 0), ou 0 se não couber.
// Valores "opcionais": passe -1 (inteiros) ou nullptr (texto) para omitir.
size_t formatarStatus(char* buf, size_t cap, const char* estado,
                      int pecaSolicitada, uint32_t uptimeS, long ramLivre);
size_t formatarEstoque(char* buf, size_t cap, const int estoque[3]);
size_t formatarSensores(char* buf, size_t cap, const bool topo[3],
                        const bool juncao[3]);
size_t formatarEsteiras(char* buf, size_t cap, const bool secundaria[3]);
size_t formatarPedido(char* buf, size_t cap, char peca);
size_t formatarEntrega(char* buf, size_t cap, char peca, const int estoque[3]);
// peca = 0 omite o campo; fase = nullptr omite; tMs/bordas = -1 omitem.
size_t formatarErro(char* buf, size_t cap, const char* tipo, char peca,
                    const char* fase, long tMs, long bordas);
// reset = nullptr omite; lcd = -1 omite (0/1 → false/true); ramLivre = -1 omite.
size_t formatarInicio(char* buf, size_t cap, const char* versao,
                      const char* reset, int lcd, long ramLivre);
