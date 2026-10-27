// ============================================================
// DATA FLOW INVENTORY — Regras do display (lógica pura)
// ------------------------------------------------------------
// O display é um OLED 0,96" 128x64 I²C (controlador SSD1306). Os nomes "lcd*"
// ficaram do LCD 16x2 que ele substituiu: as mesmas funções, os mesmos campos
// do status (lcd_end, i2c_n, lcd_quedas) e a mesma tela de 2 linhas x 16
// colunas (src/logica/telas.h), sem mudar ESP32, servidor nem dashboard.
//
// Três assuntos, todos testados no PC (test/firmware_uno):
//   1. Em que endereços procurar o display.
//   2. Quando tentar religar o display depois que ele sumiu.
//   3. Onde as 2 linhas da tela ficam no OLED.
// A conversa com o hardware fica em src/hw/lcd.cpp.
// ============================================================
#pragma once
#include <stdint.h>

// ---- 1. Endereços -------------------------------------------------------------
// O SSD1306 responde em 0x3C (quase todos os módulos) ou 0x3D (jumper/resistor
// "ADDR" trocado no verso da placa). O 0x3C vem primeiro.
static const uint8_t LCD_N_CANDIDATOS = 2;

// i = 0..1 → endereço (0x3C, 0x3D). Fora disso, 0.
uint8_t lcdCandidato(uint8_t i);

// Endereço → posição na lista de candidatos, ou -1 se não é um candidato.
int8_t lcdIndiceCandidato(uint8_t endereco);

// mascara: bit i ligado = o candidato i respondeu no barramento. Devolve o
// índice do preferido (o menor), ou -1 se nenhum respondeu.
int8_t lcdEscolher(uint16_t mascara);

// ---- 2. Recuperação -----------------------------------------------------------
// Religar o display leva ~0,1 s (inicialização + apagar a tela pelo I²C) e
// pode chegar a ~1 s com o barramento ruim, então só se tenta com o sistema
// parado e, se não adiantar, cada vez mais devagar.
struct LcdRecuperacao {
  uint32_t ultimaTentativaMs;
  uint32_t intervaloMs;   // espera atual até a próxima tentativa
  uint32_t baseMs;        // intervalo depois de um sucesso
  uint32_t maxMs;         // teto do intervalo
};

void lcdRecuperacaoIniciar(LcdRecuperacao& r, uint32_t agoraMs, uint32_t baseMs, uint32_t maxMs);

// Só tenta se o LCD está fora, o sistema está parado (sem motor ligado) e o
// intervalo já passou. Robusto ao estouro de millis().
bool lcdDeveTentar(const LcdRecuperacao& r, bool lcdAtivo, bool sistemaParado, uint32_t agoraMs);

// Falha dobra o intervalo (até o teto); sucesso volta ao intervalo base.
void lcdRegistrarTentativa(LcdRecuperacao& r, uint32_t agoraMs, bool deuCerto);

// ---- 3. Layout no OLED --------------------------------------------------------
// Fonte X11fixed7x14 (6 px de largura útil, 14 px de altura = 2 páginas de 8 px).
// Com 2 px entre letras, cada coluna ocupa 8 px: 16 colunas = os 128 px da tela.
static const uint8_t OLED_LARGURA_PX = 128;
static const uint8_t OLED_PAGINAS = 8;            // 64 px de altura / 8
static const uint8_t OLED_FONTE_LARGURA_PX = 6;
static const uint8_t OLED_FONTE_PAGINAS = 2;
static const uint8_t OLED_ESPACO_LETRA_PX = 2;
// Linha 1 nas páginas 0–1 (a faixa amarela dos módulos bicolores: o estado fica
// em destaque); linha 2 nas páginas 4–5, separada da primeira.
static const uint8_t OLED_PAGINA_LINHA1 = 0;
static const uint8_t OLED_PAGINA_LINHA2 = 4;
