// ============================================================
// DATA FLOW INVENTORY — Serial Uno ↔ ESP32 (hardware)
// ------------------------------------------------------------
// Lê comandos sem bloquear e publica as mensagens JSON (formatadas por
// src/logica/protocolo, idênticas ao firmware v2.x + campos opcionais).
// Cada mensagem é uma linha terminada em "\r\n" (como Serial.println).
// ============================================================
#pragma once
#include <stdint.h>

#include "../logica/fsm.h"

void comunicacaoIniciar();

// Consome bytes disponíveis até completar UMA linha; devolve o comando
// (CMD_NENHUM se ainda não há linha completa). Bytes restantes ficam
// para o próximo ciclo.
ComandoTipo comunicacaoLer(char* peca);

void publicarEvento(const Evento& e, const Fsm& f, uint32_t agora);
void publicarEstado(const Fsm& f, uint32_t agora);
void publicarEstoque(const Fsm& f);
void publicarSensores();
void publicarEsteiras(const Fsm& f);
void publicarInicio(const char* versao, const char* reset, bool lcd, long ramLivre);
