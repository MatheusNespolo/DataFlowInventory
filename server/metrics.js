'use strict';
// ============================================================
// DATA FLOW INVENTORY — Métricas de performance (Prometheus)
// ------------------------------------------------------------
// Módulo isolado: não importa mqtt, express nem socket.io. O
// server.js só chama os métodos da fachada devolvida por
// criarMetricas() e expõe o texto em GET /metrics.
//
// REGRAS
//  1. Cada chamada cria um Registry PRÓPRIO (sem registro global).
//  2. Rótulos só recebem valores de listas permitidas; qualquer
//     outro valor vira "outro" — payloads do broker nunca criam
//     séries novas sem limite. Nenhum rótulo carrega brokerUrl,
//     usuário ou senha.
//  3. Todo método da fachada é embrulhado em try/catch: o server.js
//     encerra o processo em qualquer uncaughtException, então um bug
//     de métrica NUNCA pode chegar ao chamador.
// ============================================================
const client = require('prom-client');

const EVENTOS = ['pedido', 'entrega', 'erro', 'inicio'];
const ERROS_MQTT = ['conexao', 'json_invalido', 'publicacao', 'inscricao'];
const PECAS = ['A', 'B', 'C'];
const ESTEIRAS = ['principal', 'secA', 'secB', 'secC'];

const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');

/**
 * @param {object}   [opcoes]
 * @param {function} [opcoes.relogio]              ms monotônicos (injetável nos testes)
 * @param {number}   [opcoes.timeoutConfirmacaoMs] tempo máximo p/ o gateway confirmar um comando
 * @param {function} [opcoes.clientesWs]           quantos dashboards estão conectados agora
 * @param {object}   [opcoes.topicos]              objeto TOPICS do server.js (nome → tópico)
 */
function criarMetricas({
  relogio = () => performance.now(),
  timeoutConfirmacaoMs = 10000,
  clientesWs = () => 0,
  topicos = {},
} = {}) {
  // ---- Registro e métricas padrão ----
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const topicosPermitidos = Object.values(topicos);

  // ---- Estado interno ----
  // Início (ms, no relógio injetado) da conexão atual com o broker; null se offline.
  let conectadoDesde = null;
  // Já houve alguma conexão? A primeira não conta como reconexão.
  let jaConectou = false;
  // Último status do gateway ('online' | 'offline'); null enquanto desconhecido.
  let gatewayAtual = null;
  const avisados = new Set();
  function avisar(nome, err) {
    if (avisados.has(nome)) return; // um aviso por método, para não inundar o log
    avisados.add(nome);
    console.warn(`[METRICS] ${nome} falhou (ignorado): ${err.message}`);
  }

  // ---- Definições ----
  const mensagens = new client.Counter({
    name: 'dfi_mqtt_messages_total',
    help: 'Mensagens MQTT recebidas, por tópico',
    labelNames: ['topic'],
    registers: [registry],
  });
  const conectado = new client.Gauge({
    name: 'dfi_mqtt_connected',
    help: '1 se o servidor está conectado ao broker MQTT, 0 se não',
    registers: [registry],
  });
  new client.Gauge({
    name: 'dfi_mqtt_uptime_seconds',
    help: 'Tempo (s) conectado ao broker sem cair; 0 se offline',
    registers: [registry],
    collect() {
      let segundos = 0;
      try {
        if (conectadoDesde !== null) segundos = Math.max(0, (relogio() - conectadoDesde) / 1000);
      } catch (err) {
        avisar('mqtt_uptime', err);
      }
      this.set(segundos);
    },
  });
  const reconexoes = new client.Counter({
    name: 'dfi_mqtt_reconnects_total',
    help: 'Conexões com o broker restabelecidas após uma queda',
    registers: [registry],
  });
  const errosMqtt = new client.Counter({
    name: 'dfi_mqtt_errors_total',
    help: 'Erros MQTT, por tipo',
    labelNames: ['tipo'],
    registers: [registry],
  });
  const gatewayOnline = new client.Gauge({
    name: 'dfi_gateway_online',
    help: '1 se o gateway ESP32 está online (LWT), 0 se não',
    registers: [registry],
  });
  const gatewayQuedas = new client.Counter({
    name: 'dfi_gateway_offline_total',
    help: 'Vezes em que o LWT do gateway ESP32 foi disparado (online → offline)',
    registers: [registry],
  });
  const eventos = new client.Counter({
    name: 'dfi_events_total',
    help: 'Eventos do Arduino recebidos, por tipo',
    labelNames: ['evento'],
    registers: [registry],
  });
  const estoqueGauge = new client.Gauge({
    name: 'dfi_stock_pieces',
    help: 'Peças em estoque, por tipo',
    labelNames: ['peca'],
    registers: [registry],
  });
  const esteiraGauge = new client.Gauge({
    name: 'dfi_conveyor_on',
    help: '1 se a esteira está ligada, 0 se parada',
    labelNames: ['esteira'],
    registers: [registry],
  });
  new client.Gauge({
    name: 'dfi_websocket_clients',
    help: 'Dashboards conectados por WebSocket',
    registers: [registry],
    collect() {
      let n = 0;
      try {
        n = Number(clientesWs()) || 0;
      } catch (err) {
        avisar('websocket_clients', err);
      }
      this.set(n);
    },
  });

  // ---- Operações ----
  function mensagemMqtt(topic) {
    mensagens.inc({ topic: permitido(topic, topicosPermitidos) });
  }

  function mqttConectou() {
    if (jaConectou) reconexoes.inc();
    jaConectou = true;
    conectadoDesde = relogio();
    conectado.set(1);
  }

  function mqttCaiu() {
    conectadoDesde = null;
    conectado.set(0);
  }

  function mqttErro(tipo) {
    errosMqtt.inc({ tipo: permitido(tipo, ERROS_MQTT) });
  }

  function gateway(status) {
    if (status === 'online') {
      gatewayOnline.set(1);
      gatewayAtual = 'online';
    } else if (status === 'offline') {
      gatewayOnline.set(0);
      // O LWT retido chega de novo a cada reconexão do servidor: só a transição conta.
      if (gatewayAtual === 'online') gatewayQuedas.inc();
      gatewayAtual = 'offline';
    }
  }

  function evento(nome) {
    eventos.inc({ evento: permitido(nome, EVENTOS) });
  }

  function estoque(msg) {
    for (const p of PECAS) {
      const v = msg && msg[`peca${p}`];
      if (typeof v === 'number' && Number.isFinite(v)) estoqueGauge.set({ peca: p }, v);
    }
  }

  function esteiras(msg) {
    for (const e of ESTEIRAS) {
      const v = msg && msg[e];
      if (v === true || v === 1) esteiraGauge.set({ esteira: e }, 1);
      else if (v === false || v === 0) esteiraGauge.set({ esteira: e }, 0);
    }
  }

  // ---- API pública ----
  const publico = {
    mensagemMqtt,
    mqttConectou,
    mqttCaiu,
    mqttErro,
    gateway,
    evento,
    estoque,
    esteiras,
  };

  // ---- Fachada à prova de falha ----
  const fachada = {};
  for (const [nome, fn] of Object.entries(publico)) {
    fachada[nome] = (...args) => {
      try {
        return fn(...args);
      } catch (err) {
        avisar(nome, err);
        return undefined;
      }
    };
  }
  fachada.contentType = registry.contentType;
  fachada.texto = () => registry.metrics();
  return fachada;
}

module.exports = { criarMetricas };
