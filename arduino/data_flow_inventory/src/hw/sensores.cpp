#include "sensores.h"

#include <Arduino.h>

#include "../../config.h"
#include "../logica/filtro_entrada.h"

namespace {
const uint8_t PINOS_TOPO[3] = {SENSOR_TOPO_A, SENSOR_TOPO_B, SENSOR_TOPO_C};
FiltroEntrada topo[3];

// Mais que isto de bordas de uma junção no mesmo milissegundo = rajada.
const uint8_t MAX_BORDAS_POR_MS = 8;

struct CapturaJuncao {
  volatile bool ocupada;
  volatile uint32_t ocupouEm;
  volatile uint16_t maiorPulsoMs;
  volatile uint8_t bordas;
  // O pulso em curso começou antes do último zerar: a largura dele não vale.
  volatile bool descartarPulsoAtual;
  // Limitador de rajada (ver registrar): interrupção da junção desligada.
  volatile bool suspensa;
  volatile uint16_t msUltimaBorda;   // 16 bits baixos do millis() da última borda
  volatile uint8_t bordasNoMs;
};
CapturaJuncao juncao[3];

// Leitura direta das portas (rápida, dentro da ISR). LOW = ocupada.
inline bool lerJ1() { return (PINC & _BV(PC3)) == 0; }  // A3
inline bool lerJ2() { return (PIND & _BV(PD2)) == 0; }  // D2
inline bool lerJ3() { return (PIND & _BV(PD4)) == 0; }  // D4

inline bool lerJuncao(uint8_t i) {
  return i == 0 ? lerJ1() : (i == 1 ? lerJ2() : lerJ3());
}

// Liga/desliga o bit da junção no PCMSK do grupo dela.
inline void mascara(uint8_t i, bool ligar) {
  if (i == 0) {
    if (ligar) PCMSK1 |= _BV(PCINT11); else PCMSK1 &= (uint8_t)~_BV(PCINT11);
  } else {
    const uint8_t bit = (i == 1) ? _BV(PCINT18) : _BV(PCINT20);
    if (ligar) PCMSK2 |= bit; else PCMSK2 &= (uint8_t)~bit;
  }
}

// Chamada só com interrupções desabilitadas (dentro da ISR).
//
// Limitador de rajada: com a peça parada no limiar, o comparador LM393 do
// TCRT5000 pode oscilar a dezenas de kHz. As PCINT têm prioridade maior que
// WDT_vect e TIMER0_OVF; uma rajada contínua deixaria o loop e a interrupção
// do watchdog sem CPU (sem reset, motor ligado). Por isso, se uma junção
// registra mais de MAX_BORDAS_POR_MS bordas no mesmo valor de millis() (que
// nem avança durante a rajada), a interrupção dela é desligada e a junção é
// marcada como suspensa; sensoresAmostrar ressincroniza o nível e religa.
inline void registrar(uint8_t i, bool ocupada, uint32_t agora) {
  CapturaJuncao& c = juncao[i];
  if (c.suspensa) return;
  if (ocupada == c.ocupada) return;
  const uint16_t ms = (uint16_t)agora;
  if (ms == c.msUltimaBorda) {
    if (++c.bordasNoMs > MAX_BORDAS_POR_MS) {
      mascara(i, false);
      c.suspensa = true;
      return;
    }
  } else {
    c.msUltimaBorda = ms;
    c.bordasNoMs = 1;
  }
  c.ocupada = ocupada;
  if (c.bordas < 255) c.bordas = c.bordas + 1;
  if (ocupada) {
    c.ocupouEm = agora;
    c.descartarPulsoAtual = false;
  } else if (c.descartarPulsoAtual) {
    // Pulso que já estava em curso no zerar (começou antes da partida):
    // a largura dele não pode confirmar a entrega.
    c.descartarPulsoAtual = false;
  } else {
    uint32_t largura = agora - c.ocupouEm;
    uint16_t l = largura > 65535UL ? 65535 : (uint16_t)largura;
    if (l > c.maiorPulsoMs) c.maiorPulsoMs = l;
  }
}

// Religa uma junção suspensa pelo limitador. Chamada com interrupções
// desabilitadas. Ordem: limpa a flag pendente do grupo, religa o bit e só
// então lê os níveis; uma borda depois da leitura deixa a flag pendente e a
// ISR trata. Como limpar a flag do grupo pode descartar uma borda da outra
// junção do mesmo grupo (J2 e J3 dividem PCINT2), ela também é relida.
void retomar(uint8_t i, uint32_t agora) {
  if (i == 0) {
    PCIFR = _BV(PCIF1);
  } else {
    PCIFR = _BV(PCIF2);
  }
  mascara(i, true);
  CapturaJuncao& c = juncao[i];
  const bool nivel = lerJuncao(i);
  if (nivel != c.ocupada) {
    // A largura do pulso durante a rajada é incerta: não vira maiorPulsoMs.
    c.ocupada = nivel;
    c.ocupouEm = agora;
    c.descartarPulsoAtual = false;
    if (c.bordas < 255) c.bordas = c.bordas + 1;
  }
  c.bordasNoMs = 0;
  c.suspensa = false;
  if (i != 0) {
    const uint8_t outra = (i == 1) ? 2 : 1;
    registrar(outra, lerJuncao(outra), agora);
  }
}
}  // namespace

ISR(PCINT1_vect) {  // porta C: A3 (J1)
  registrar(0, lerJ1(), millis());
}

ISR(PCINT2_vect) {  // porta D: D2 (J2) e D4 (J3)
  const uint32_t agora = millis();
  registrar(1, lerJ2(), agora);
  registrar(2, lerJ3(), agora);
}

void sensoresIniciar(uint32_t agora) {
  for (uint8_t i = 0; i < 3; i++) {
    pinMode(PINOS_TOPO[i], INPUT_PULLUP);
    filtroIniciar(topo[i], digitalRead(PINOS_TOPO[i]) == LOW, agora, FILTRO_TOPO_MS);
  }
  pinMode(SENSOR_JUNCAO_J1, INPUT_PULLUP);
  pinMode(SENSOR_JUNCAO_J2, INPUT_PULLUP);
  pinMode(SENSOR_JUNCAO_J3, INPUT_PULLUP);

  noInterrupts();
  // Máscaras e flags primeiro; a leitura inicial depois: uma borda após a
  // leitura deixa a flag pendente e a ISR ressincroniza.
  PCMSK1 |= _BV(PCINT11);                  // A3
  PCMSK2 |= _BV(PCINT18) | _BV(PCINT20);   // D2, D4
  PCIFR = _BV(PCIF1) | _BV(PCIF2);         // descarta pendências antigas
  const bool inicial[3] = {lerJ1(), lerJ2(), lerJ3()};
  for (uint8_t i = 0; i < 3; i++) {
    juncao[i].ocupada = inicial[i];
    juncao[i].ocupouEm = agora;
    juncao[i].maiorPulsoMs = 0;
    juncao[i].bordas = 0;
    juncao[i].descartarPulsoAtual = inicial[i];  // largura desconhecida
    juncao[i].suspensa = false;
    juncao[i].msUltimaBorda = 0;
    juncao[i].bordasNoMs = 0;
  }
  PCICR |= _BV(PCIE1) | _BV(PCIE2);
  interrupts();
}

void sensoresAmostrar(uint32_t agora) {
  for (uint8_t i = 0; i < 3; i++) {
    filtroAtualizar(topo[i], digitalRead(PINOS_TOPO[i]) == LOW, agora);
  }
  for (uint8_t i = 0; i < 3; i++) {
    if (!juncao[i].suspensa) continue;
    noInterrupts();
    retomar(i, millis());
    interrupts();
  }
}

bool sensorTopo(uint8_t i) { return topo[i].estavel; }

bool sensorJuncaoNivel(uint8_t i) { return juncao[i].ocupada; }

LeituraJuncao sensorJuncao(uint8_t i) {
  LeituraJuncao l;
  noInterrupts();
  l.ocupada = juncao[i].ocupada;
  l.ocupouEm = juncao[i].ocupouEm;
  l.maiorPulsoMs = juncao[i].maiorPulsoMs;
  l.bordas = juncao[i].bordas;
  interrupts();
  return l;
}

void sensorJuncaoZerar(uint8_t i) {
  noInterrupts();
  juncao[i].maiorPulsoMs = 0;
  juncao[i].bordas = 0;
  // Se a junção já está ocupada, o pulso começou antes da partida: quando
  // ela liberar, a largura medida desde o ocupouEm antigo é descartada.
  juncao[i].descartarPulsoAtual = juncao[i].ocupada;
  interrupts();
}
