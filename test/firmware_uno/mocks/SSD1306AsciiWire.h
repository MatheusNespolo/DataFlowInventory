// SSD1306AsciiWire de mentira: ver SSD1306Ascii.h.
#pragma once
#include "SSD1306Ascii.h"

class SSD1306AsciiWire : public SSD1306Ascii {
 public:
  void begin(const DevType* dev, uint8_t endereco) {
    a_ = endereco;
    col_ = 0;
    pagina_ = 0;
    // ~25 comandos de inicialização + apagar 1024 bytes em lotes de 17 (estimativa).
    for (int i = 0; i < 25 + 61; i++) tx();
    TelaFalsa& t = telaFalsa(a_);
    t.iniciou++;
    t.deslocamentoColuna = dev->deslocamentoColuna;
    telaApagar(t);
  }
};
