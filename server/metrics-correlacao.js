'use strict';
// ============================================================
// DATA FLOW INVENTORY — Correlação comando → confirmação
// ------------------------------------------------------------
// Fila FIFO de comandos que aguardam a confirmação do gateway
// ESP32 em dataflow/comandos/pub. O firmware NÃO devolve um id de
// correlação: a confirmação traz só acao (+ peca quando encaminha;
// a REJEIÇÃO não traz peca). O casamento é feito por ordem de chegada.
//
// Módulo PURO: sem prom-client, sem timers, sem I/O — o tempo entra
// como argumento, então é testável sem relógio real.
// ============================================================
const LIMITE_FILA = 100;

class CorrelacaoComandos {
  constructor({ limite = LIMITE_FILA } = {}) {
    this.limite = limite;
    this.filas = new Map(); // chave "acao|peca" → [{ id, t0 }]
    this.proximoId = 1;
  }

  static chave(acao, peca) {
    return `${acao}|${peca || ''}`;
  }

  /**
   * Registra um comando aguardando confirmação.
   * @returns {{ token: {chave: string, id: number}, descartados: number }}
   *   descartados = entradas mais antigas removidas por estourar o limite da fila.
   */
  registrar(acao, peca, t0) {
    const chave = CorrelacaoComandos.chave(acao, peca);
    let fila = this.filas.get(chave);
    if (!fila) {
      fila = [];
      this.filas.set(chave, fila);
    }
    const token = { chave, id: this.proximoId++ };
    fila.push({ id: token.id, t0 });
    let descartados = 0;
    while (fila.length > this.limite) {
      fila.shift();
      descartados++;
    }
    return { token, descartados };
  }

  /** Remove um comando pendente (ex.: o publish falhou). true se ele existia. */
  cancelar(token) {
    if (!token) return false;
    const fila = this.filas.get(token.chave);
    if (!fila) return false;
    const i = fila.findIndex((e) => e.id === token.id);
    if (i === -1) return false;
    fila.splice(i, 1);
    return true;
  }

  /**
   * Casa uma confirmação com o comando pendente mais antigo.
   * Com `peca`: fila exata acao|peca. Sem `peca` (a rejeição do gateway não ecoa a peça):
   * o mais antigo entre TODAS as filas da ação.
   * @returns {{ t0: number } | null} null se não havia pendente (confirmação órfã)
   */
  confirmar(acao, peca) {
    let alvo = null; // { fila, entrada }
    if (peca) {
      const fila = this.filas.get(CorrelacaoComandos.chave(acao, peca));
      if (fila && fila.length) alvo = { fila, entrada: fila[0] };
    } else {
      for (const [chave, fila] of this.filas) {
        if (!chave.startsWith(`${acao}|`) || !fila.length) continue;
        if (!alvo || fila[0].t0 < alvo.entrada.t0) alvo = { fila, entrada: fila[0] };
      }
    }
    if (!alvo) return null;
    alvo.fila.shift();
    return { t0: alvo.entrada.t0 };
  }

  /** Remove os pendentes com idade >= timeoutMs; devolve quantos expiraram. */
  expirar(agora, timeoutMs) {
    let expirados = 0;
    for (const fila of this.filas.values()) {
      while (fila.length && agora - fila[0].t0 >= timeoutMs) {
        fila.shift();
        expirados++;
      }
    }
    return expirados;
  }

  /** Quantos comandos aguardam confirmação. */
  get pendentes() {
    let n = 0;
    for (const fila of this.filas.values()) n += fila.length;
    return n;
  }
}

module.exports = { CorrelacaoComandos, LIMITE_FILA };
