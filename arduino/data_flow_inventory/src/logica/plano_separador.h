// ============================================================
// DATA FLOW INVENTORY — Plano de giro do separador (lógica pura)
// ------------------------------------------------------------
// Decide QUANDO e PARA ONDE dar cada passo do motor de passo da roda de
// separação, sem bloquear. Substitui o Stepper::step(delta) do firmware v2.x,
// que é uma espera ativa (a 10 RPM, 120° levam ~2 s) e deixaria o loop()
// parado por mais que o watchdog de 2 s.
//
// Regras desta lógica:
//   - no máximo UM passo por chamada (o loop nunca fica preso no giro);
//   - nunca dois passos em menos que o intervalo do motor (sem perder passo,
//     mesmo se o loop atrasar: atrasar só deixa a roda mais lenta);
//   - a posição é atualizada a cada passo dado, então mudar o alvo no meio do
//     giro é seguro: o novo caminho parte de onde a roda realmente está;
//   - solta as bobinas depois de um tempo parada (menos corrente, calor e
//     ruído na alimentação de 5 V).
//
// C++ puro, testado no PC (test/firmware_uno). Ainda NÃO é usado pelo firmware:
// a camada de hardware está só registrada, comentada, em src/hw/separador.*.
// ============================================================
#pragma once
#include <stdint.h>

// Quanto tempo a roda fica parada com as bobinas energizadas antes de soltá-las.
static const uint32_t SEPARADOR_ESPERA_SOLTAR_US = 500000UL;  // 0,5 s

struct PlanoSeparador {
  int32_t passosPorVolta;    // ex.: 2048 (28BYJ-48 em passo completo)
  int32_t posicao;           // 0..passosPorVolta-1, atualizada a cada passo
  int32_t restantes;         // passos que faltam; sinal = sentido (+ horário)
  uint32_t intervaloUs;      // tempo mínimo entre dois passos
  uint32_t ultimoPassoUs;    // instante do último passo dado
  uint32_t paradoDesdeUs;    // instante em que a roda terminou de girar
  bool bobinasEnergizadas;   // há corrente nas bobinas
};

// RPM → intervalo entre passos (µs). Mesma conta do Stepper::setSpeed.
uint32_t separadorIntervaloUs(int32_t passosPorVolta, int32_t rpm);

// Menor deslocamento (em passos, com sinal) de `de` até `para`. Empate
// (exatamente meia volta) vai no sentido horário (+).
int32_t separadorDelta(int32_t de, int32_t para, int32_t passosPorVolta);

// A roda é suposta estar na posição 0 (não há sensor de referência).
void planoIniciar(PlanoSeparador& p, int32_t passosPorVolta, int32_t rpm, uint32_t agoraUs);

// Define o alvo (qualquer inteiro: é reduzido à volta). Seguro no meio do giro.
void planoIrPara(PlanoSeparador& p, int32_t alvo);

bool planoOcupado(const PlanoSeparador& p);

// Chamar a cada volta do loop. Devolve o passo a dar AGORA: +1, -1 ou 0.
// Quem chama executa motor.step(retorno) só quando for diferente de 0.
int8_t planoPasso(PlanoSeparador& p, uint32_t agoraUs);

// True quando a roda está parada há tempo suficiente e as bobinas ainda estão
// energizadas: quem chama solta os 4 pinos e avisa com planoSoltou().
bool planoDeveSoltar(const PlanoSeparador& p, uint32_t agoraUs);
void planoSoltou(PlanoSeparador& p);
