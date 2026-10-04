// ============================================================
// DATA FLOW INVENTORY — Sensores TCRT5000 (hardware)
// ------------------------------------------------------------
// Topo (A0–A2): amostrados a cada INTERVALO_AMOSTRA_MS e filtrados.
// Junção (J1=A3, J2=D2, J3=D4): mudanças capturadas por interrupção de
// mudança de pino (PCINT), para que um pulso curto não se perca quando
// o loop está ocupado (serial, LCD). LOW no pino = peça detectada.
// ============================================================
#pragma once
#include <stdint.h>

#include "../logica/supervisor_entrega.h"

void sensoresIniciar(uint32_t agora);
void sensoresAmostrar(uint32_t agora);

bool sensorTopo(uint8_t i);                 // filtrado (true = peça presente)
bool sensorJuncaoNivel(uint8_t i);          // nível atual da junção
LeituraJuncao sensorJuncao(uint8_t i);      // cópia atômica da captura
void sensorJuncaoZerar(uint8_t i);          // zera pulsos/bordas (início da entrega)
