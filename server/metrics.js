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
const { CorrelacaoComandos } = require('./metrics-correlacao');

const EVENTOS = ['pedido', 'entrega', 'erro', 'inicio'];
const ERROS_MQTT = ['conexao', 'json_invalido', 'publicacao', 'inscricao'];
const PECAS = ['A', 'B', 'C'];
const ESTEIRAS = ['principal', 'secA', 'secB', 'secC'];

const permitido = (valor, lista) => (lista.includes(valor) ? valor : 'outro');

const METODOS_HTTP = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BUCKETS_HTTP = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];

const ACOES = ['solicitar_peca', 'reset'];
const STATUS_CONFIRMACAO = ['encaminhado', 'rejeitado'];
const RESULTADOS_RECUSA = ['peca_invalida', 'rate_limit', 'broker_offline'];
const BUCKETS_MQTT = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

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
  // Comandos aguardando a confirmação do gateway (fila FIFO por ação|peça).
  const correlacao = new CorrelacaoComandos();
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

  const publishAckHist = new client.Histogram({
    name: 'dfi_mqtt_publish_ack_seconds',
    help: 'Tempo entre o publish e o PUBACK do broker (QoS 1)',
    labelNames: ['topic'],
    buckets: BUCKETS_MQTT,
    registers: [registry],
  });
  const confirmacaoHist = new client.Histogram({
    name: 'dfi_command_confirmation_seconds',
    help: 'Tempo entre o comando ser aceito e a confirmação do gateway ESP32',
    labelNames: ['acao', 'status'],
    buckets: BUCKETS_MQTT,
    registers: [registry],
  });
  const comandos = new client.Counter({
    name: 'dfi_commands_total',
    help: 'Comandos do dashboard, por resultado',
    labelNames: ['resultado'],
    registers: [registry],
  });
  const semResposta = new client.Counter({
    name: 'dfi_command_unconfirmed_total',
    help: 'Comandos sem confirmação do gateway dentro do timeout',
    registers: [registry],
  });
  const orfas = new client.Counter({
    name: 'dfi_command_confirmation_orphan_total',
    help: 'Confirmações do gateway sem comando pendente',
    registers: [registry],
  });

  const httpHist = new client.Histogram({
    name: 'dfi_http_request_duration_seconds',
    help: 'Tempo de resposta da API HTTP, por rota',
    labelNames: ['rota', 'metodo', 'codigo'],
    buckets: BUCKETS_HTTP,
    registers: [registry],
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

  const normalizarPeca = (peca) => (PECAS.includes(peca) ? peca : '');

  // O t0 é registrado ANTES do publish: a confirmação do gateway poderia, em tese, chegar antes do PUBACK.
  function comandoAceito(acao, peca) {
    const { token, descartados } = correlacao.registrar(permitido(acao, ACOES), normalizarPeca(peca), relogio());
    if (descartados) semResposta.inc(descartados);
    return token;
  }

  function comandoFalhou(token) {
    correlacao.cancelar(token);
    comandos.inc({ resultado: 'falha_publicacao' });
  }

  function publishAck(topic, segundos, ehComando = false) {
    if (Number.isFinite(segundos)) {
      publishAckHist.observe({ topic: permitido(topic, topicosPermitidos) }, segundos);
    }
    if (ehComando) comandos.inc({ resultado: 'publicado' });
  }

  function comandoRecusado(motivo) {
    comandos.inc({ resultado: permitido(motivo, RESULTADOS_RECUSA) });
  }

  function confirmacaoGateway({ acao, peca, status } = {}) {
    const acaoOk = permitido(acao, ACOES);
    const casado = correlacao.confirmar(acaoOk, normalizarPeca(peca));
    if (!casado) {
      orfas.inc();
      return;
    }
    const segundos = (relogio() - casado.t0) / 1000;
    confirmacaoHist.observe({ acao: acaoOk, status: permitido(status, STATUS_CONFIRMACAO) }, segundos);
  }

  function varrerPendentes() {
    const expirados = correlacao.expirar(relogio(), timeoutConfirmacaoMs);
    if (expirados) semResposta.inc(expirados);
  }

  // Middleware do Express: mede no evento "finish" da resposta. O rótulo "rota" vem da rota
  // registrada (nunca da URL), então requisições arbitrárias não criam séries novas.
  function middlewareHttp() {
    return (req, res, next) => {
      try {
        const t0 = relogio();
        res.on('finish', () => {
          try {
            if (req.path === '/metrics') return; // o scrape não entra nos percentis da API
            const rota = req.route && typeof req.route.path === 'string'
              ? req.route.path
              : (res.statusCode === 404 ? 'nao_encontrada' : 'estatico');
            httpHist.observe(
              { rota, metodo: permitido(req.method, METODOS_HTTP), codigo: String(res.statusCode) },
              (relogio() - t0) / 1000,
            );
          } catch (err) {
            avisar('middlewareHttp', err);
          }
        });
      } catch (err) {
        avisar('middlewareHttp', err);
      }
      next();
    };
  }

  // ---- API pública ----
  const publico = {
    middlewareHttp,
    comandoAceito,
    comandoFalhou,
    publishAck,
    comandoRecusado,
    confirmacaoGateway,
    varrerPendentes,
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
