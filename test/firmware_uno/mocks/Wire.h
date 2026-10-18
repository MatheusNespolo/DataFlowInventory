// Barramento I²C de mentira: quais endereços respondem, falhas programadas e
// contagem de transações. Só para testar src/hw/lcd.cpp no PC.
#pragma once
#include <stdint.h>

struct BarramentoFalso {
  bool responde[128];        // endereços que dão ACK
  bool preso;                // todo acesso estoura o timeout (SDA presa)
  long falhaEm;              // número da transação que estoura o timeout (0 = nenhuma)
  bool flag;                 // flag de timeout do Wire
  long transacoes;
  long timeouts;
  uint8_t alvo;
};

inline BarramentoFalso& barramento() {
  static BarramentoFalso b = {};
  return b;
}
inline void barramentoReiniciar() { barramento() = BarramentoFalso(); }

struct TwoWire {
  void begin() {}
  void setWireTimeout(uint32_t, bool) {}
  void beginTransmission(uint8_t a) { barramento().alvo = a; }
  uint8_t endTransmission() {
    BarramentoFalso& b = barramento();
    b.transacoes++;
    if (b.preso || (b.falhaEm != 0 && b.transacoes == b.falhaEm)) {
      b.flag = true;
      b.timeouts++;
      return 5;  // timeout
    }
    return b.responde[b.alvo] ? 0 : 2;  // 2 = NACK no endereço
  }
  bool getWireTimeoutFlag() { return barramento().flag; }
  void clearWireTimeoutFlag() { barramento().flag = false; }
};
static TwoWire Wire __attribute__((unused));
