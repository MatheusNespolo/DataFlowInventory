#include "plano_separador.h"

uint32_t separadorIntervaloUs(int32_t passosPorVolta, int32_t rpm) {
  if (passosPorVolta <= 0 || rpm <= 0) return 0;
  return 60000000UL / (uint32_t)passosPorVolta / (uint32_t)rpm;
}

static int32_t reduzir(int32_t v, int32_t volta) {
  int32_t r = v % volta;
  return r < 0 ? r + volta : r;
}

int32_t separadorGrausParaPassos(int32_t graus, int32_t passosPorVolta) {
  if (passosPorVolta <= 0) return 0;
  const int32_t g = reduzir(graus, 360);
  return (g * passosPorVolta + 180) / 360;
}

int32_t separadorDelta(int32_t de, int32_t para, int32_t passosPorVolta) {
  int32_t delta = reduzir(para - de, passosPorVolta);
  if (delta > passosPorVolta / 2) delta -= passosPorVolta;  // caminho mais curto
  return delta;
}

void planoIniciar(PlanoSeparador& p, int32_t passosPorVolta, int32_t rpm, uint32_t agoraUs) {
  p.passosPorVolta = passosPorVolta;
  p.posicao = 0;
  p.restantes = 0;
  p.intervaloUs = separadorIntervaloUs(passosPorVolta, rpm);
  p.ultimoPassoUs = agoraUs;
  p.paradoDesdeUs = agoraUs;
  p.bobinasEnergizadas = false;
}

void planoIrPara(PlanoSeparador& p, int32_t alvo) {
  p.restantes = separadorDelta(p.posicao, reduzir(alvo, p.passosPorVolta), p.passosPorVolta);
}

bool planoOcupado(const PlanoSeparador& p) { return p.restantes != 0; }

int8_t planoPasso(PlanoSeparador& p, uint32_t agoraUs) {
  if (p.restantes == 0) return 0;
  // Aritmética sem sinal: continua certa no estouro do micros() (a cada ~71 min).
  if ((uint32_t)(agoraUs - p.ultimoPassoUs) < p.intervaloUs) return 0;

  const int8_t dir = p.restantes > 0 ? 1 : -1;
  p.ultimoPassoUs = agoraUs;  // não acumula atraso: nunca dá passos em rajada
  p.posicao = reduzir(p.posicao + dir, p.passosPorVolta);
  p.restantes -= dir;
  p.bobinasEnergizadas = true;
  if (p.restantes == 0) p.paradoDesdeUs = agoraUs;
  return dir;
}

bool planoDeveSoltar(const PlanoSeparador& p, uint32_t agoraUs) {
  return p.restantes == 0 && p.bobinasEnergizadas &&
         (uint32_t)(agoraUs - p.paradoDesdeUs) >= SEPARADOR_ESPERA_SOLTAR_US;
}

void planoSoltou(PlanoSeparador& p) { p.bobinasEnergizadas = false; }
