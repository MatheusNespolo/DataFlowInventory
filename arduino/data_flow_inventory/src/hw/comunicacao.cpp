#include "comunicacao.h"

#include <Arduino.h>

#include "../../config.h"
#include "../logica/protocolo.h"
#include "diagnostico.h"
#include "sensores.h"

namespace {
LeitorLinha leitor;
char buf[160];  // buffer único de formatação (maior mensagem ~140 B)

void enviar(size_t n) {
  if (n == 0) return;  // não coube: não envia linha quebrada
  Serial.write(reinterpret_cast<const uint8_t*>(buf), n);
  Serial.write('\r');
  Serial.write('\n');
}
}  // namespace

void comunicacaoIniciar() { leitorIniciar(leitor); }

ComandoTipo comunicacaoLer(char* peca) {
  *peca = 0;
  while (Serial.available() > 0) {
    if (leitorAlimentar(leitor, (char)Serial.read())) {
      ComandoTipo c = interpretarComando(leitor.buf, peca);
      if (c != CMD_NENHUM) return c;
    }
  }
  return CMD_NENHUM;
}

void publicarEstado(const Fsm& f, uint32_t agora) {
  enviar(formatarStatus(buf, sizeof buf, nomeEstado(f.estado), f.peca, agora / 1000UL, ramLivre()));
}

void publicarEstoque(const Fsm& f) { enviar(formatarEstoque(buf, sizeof buf, f.estoque)); }

void publicarSensores() {
  bool topo[3], jun[3];
  for (uint8_t i = 0; i < 3; i++) {
    topo[i] = sensorTopo(i);
    jun[i] = sensorJuncaoNivel(i);
  }
  enviar(formatarSensores(buf, sizeof buf, topo, jun));
}

void publicarEsteiras(const Fsm& f) {
  bool sec[3];
  for (uint8_t i = 0; i < 3; i++) sec[i] = fsmMotorLigado(f, i);
  enviar(formatarEsteiras(buf, sizeof buf, sec));
}

void publicarInicio(const char* versao, const char* reset, bool lcd, long ram) {
  enviar(formatarInicio(buf, sizeof buf, versao, reset, lcd ? 1 : 0, ram));
}

void publicarEvento(const Evento& e, const Fsm& f, uint32_t agora) {
  switch (e.tipo) {
    case EV_PEDIDO:
      enviar(formatarPedido(buf, sizeof buf, e.peca));
      break;
    case EV_ENTREGA:
      enviar(formatarEntrega(buf, sizeof buf, e.peca, f.estoque));
      break;
    case EV_ERRO:
      enviar(formatarErro(buf, sizeof buf, nomeErro(e.erro), e.peca, nomeFaseErro(e.fase), e.tMs, e.bordas));
      break;
    case EV_ESTADO:
      publicarEstado(f, agora);
      break;
    case EV_ESTOQUE:
      publicarEstoque(f);
      break;
    case EV_ESTEIRAS:
      publicarEsteiras(f);
      break;
  }
}
