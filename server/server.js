// ============================================================
// DATA FLOW INVENTORY — Servidor Node.js
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// ============================================================
// Descrição:
// Server Express que serve o front-end estático, conecta ao broker
// MQTT (Mosquitto local ou nuvem) e retransmite dados via
// WebSocket (Socket.IO) para o dashboard em tempo real.
//
// Para configurar a autenticação MQTT, edite o arquivo .env
// na pasta server/ com os dados do broker desejado.
// ============================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const helmet = require('helmet');
const path = require('path');

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Origens permitidas para o WebSocket/CORS.
// Defina ALLOWED_ORIGIN no .env com uma lista separada por vírgulas
// (ex.: http://localhost:3000,http://192.168.0.10:3000).
// Use "*" apenas em bancada isolada — evite em rede/nuvem.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Peças válidas aceitas em comandos (proteção contra payloads arbitrários)
const PECAS_VALIDAS = ['A', 'B', 'C'];

// Intervalo mínimo (ms) entre comandos de um mesmo cliente (anti-flood)
const COMANDO_INTERVALO_MS = parseInt(process.env.COMANDO_INTERVALO_MS, 10) || 500;

const MQTT_CONFIG = {
  // TODO: Altere MQTT_BROKER_URL no .env para o endpoint do seu broker
  // Exemplos: mqtt://localhost (local) | mqtt://xxx.s1.eu.hivemq.com (nuvem)
  brokerUrl:  process.env.MQTT_BROKER_URL || 'mqtt://localhost',

  // TODO: Altere MQTT_PORT no .env conforme o broker:
  //   1883 = MQTT sem TLS (local) | 8883 = MQTT com TLS (nuvem)
  port:       parseInt(process.env.MQTT_PORT, 10) || 1883,

  // TODO: Altere MQTT_USERNAME e MQTT_PASSWORD no .env
  // Para Mosquitto local sem auth, deixe vazio.
  // Para nuvem (HiveMQ, AWS), preencha com as credenciais.
  username:   process.env.MQTT_USERNAME || '',
  password:   process.env.MQTT_PASSWORD || '',

  // TODO: MQTT_CLIENT_ID deve ser único por instância do servidor
  clientId:   process.env.MQTT_CLIENT_ID || 'dataflow-node-server',
};

const TOPICS = {
  status:   process.env.MQTT_TOPIC_STATUS   || 'dataflow/status',
  estoque:  process.env.MQTT_TOPIC_ESTOQUE  || 'dataflow/estoque',
  eventos:  process.env.MQTT_TOPIC_EVENTOS  || 'dataflow/eventos',
  sensores: process.env.MQTT_TOPIC_SENSORES || 'dataflow/sensores',
  esteiras: process.env.MQTT_TOPIC_ESTEIRAS || 'dataflow/esteiras',
  cmdSub:   process.env.MQTT_TOPIC_CMD_SUB  || 'dataflow/comandos/sub',
  cmdPub:   process.env.MQTT_TOPIC_CMD_PUB  || 'dataflow/comandos/pub',

  // Tópico PRÓPRIO do servidor Node (online/offline + LWT).
  // NÃO reutiliza dataflow/status: aquele tópico é exclusivo do gateway
  // ESP32 (também retained). Publicar o status do server lá sobrescrevia
  // o retained do gateway e travava o badge "ESP32 Offline" no dashboard
  // (regressão do commit 9a7ce25). Ver docs/CHANGELOG.md.
  statusServer: process.env.MQTT_TOPIC_STATUS_SERVER || 'dataflow/status/server',
};

// ============================================================
// EXPRESS + HTTP + SOCKET.IO
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // Restrito às origens de ALLOWED_ORIGINS (padrão: http://localhost:PORT).
    // Evita que páginas de terceiros abram um socket e publiquem comandos MQTT.
    origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// Cliente MQTT — declarado antes das rotas para que /api/status possa
// consultá-lo com segurança (evita TDZ se a rota for chamada cedo).
let mqttClient = null;

// Estado atual do sistema (cache para novos clientes Socket.IO).
// Declarado aqui em cima para que /api/status e o handler de mensagens
// MQTT possam compartilhá-lo sem risco de ordem de declaração.
const estadoAtual = {
  status:   {},
  estoque:  {},
  eventos: [],
  sensores: {},
  esteiras: {},
  gateway:  {},   // online/offline do ESP32 (via LWT do broker MQTT)
};

// Métricas simples de observabilidade do health check
const metricas = {
  iniciadoEm:        new Date().toISOString(),
  mensagensPorTopico: {},
  ultimaMensagemEm:  null,
  comandosPublicados: 0,
  comandosRejeitados: 0,
};

// Headers de segurança (CSP liberada para o CDN do Socket.IO e Google Fonts,
// que são carregados pelo frontend/index.html)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", 'https://cdn.socket.io'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      imgSrc:     ["'self'", 'data:'],
    },
  },
  // O dashboard é servido em HTTP na bancada local; HSTS atrapalharia.
  hsts: false,
}));

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Rota de health check — retorna 503 se o broker MQTT estiver fora,
// permitindo que scripts de bancada/CI detectem o problema pelo status HTTP.
app.get('/api/status', (req, res) => {
  const mqttConectado = Boolean(mqttClient && mqttClient.connected);

  res.status(mqttConectado ? 200 : 503).json({
    server: 'online',
    mqtt: mqttConectado,
    brokerUrl: MQTT_CONFIG.brokerUrl,
    clientesWs: io.engine.clientsCount,
    gateway: estadoAtual.gateway.status || 'desconhecido',
    metricas: {
      iniciadoEm:         metricas.iniciadoEm,
      mensagensPorTopico: metricas.mensagensPorTopico,
      ultimaMensagemEm:   metricas.ultimaMensagemEm,
      comandosPublicados: metricas.comandosPublicados,
      comandosRejeitados: metricas.comandosRejeitados,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// MQTT CLIENT
// ============================================================
const mqttOptions = {
  port: MQTT_CONFIG.port,
  clientId: MQTT_CONFIG.clientId,
  clean: true,
  reconnectPeriod: 5000,    // Tenta reconectar a cada 5s
  connectTimeout: 10000,    // Timeout de 10s para conexão

  // LWT (Last Will Testament) do PRÓPRIO servidor Node.
  // Se este processo cair (queda, kill, falha de rede), o broker publica
  // automaticamente esta mensagem retida — assim o dashboard e o probe
  // conseguem distinguir "servidor fora do ar" de "sem dados".
  // Publicado em TOPICS.statusServer (NÃO em dataflow/status, que é do ESP32).
  will: {
    topic:   TOPICS.statusServer,
    payload: JSON.stringify({ type: 'server', status: 'offline' }),
    qos:     1,
    retain:  true,
  },

  // TODO: Para brokers com TLS (HiveMQ Cloud, AWS IoT), descomente:
  // rejectUnauthorized: false,  // Aceita certificados autoassinados
};

// Autenticação: só adiciona se username estiver definido no .env
if (MQTT_CONFIG.username) {
  mqttOptions.username = MQTT_CONFIG.username;
  mqttOptions.password = MQTT_CONFIG.password;
  console.log(`[MQTT] Autenticação habilitada — usuário: ${MQTT_CONFIG.username}`);
}

// TODO: Para TLS (porta 8883), altere a URL:
//   mqtt://  →  mqtts://
// Exemplo: mqtts://xxx.s1.eu.hivemq.com
mqttClient = mqtt.connect(MQTT_CONFIG.brokerUrl, mqttOptions);

// ============================================================
// EVENTOS MQTT
// ============================================================
mqttClient.on('connect', () => {
  console.log(`[MQTT] Conectado ao broker: ${MQTT_CONFIG.brokerUrl}`);

  // Anuncia que o servidor está online (retida, para novos assinantes).
  // Complementa o LWT configurado em mqttOptions.will.
  // Vai para TOPICS.statusServer para não sobrescrever o retained do gateway.
  mqttClient.publish(
    TOPICS.statusServer,
    JSON.stringify({ type: 'server', status: 'online' }),
    { qos: 1, retain: true }
  );

  // Inscreve em todos os tópicos de dados
  const topicosInscrever = [
    TOPICS.status,
    TOPICS.estoque,
    TOPICS.eventos,
    TOPICS.sensores,
    TOPICS.esteiras,
    TOPICS.cmdPub,
  ];

  topicosInscrever.forEach(topic => {
    // QoS 1: garante entrega ao menos uma vez mesmo com oscilação de rede
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Erro ao inscrever no tópico ${topic}:`, err.message);
      } else {
        console.log(`[MQTT] Inscrito no tópico: ${topic} (QoS 1)`);
      }
    });
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Erro de conexão:', err.message);
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] Offline — aguardando reconexão...');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconectando...');
});

// Recebe mensagens MQTT e retransmite via Socket.IO
mqttClient.on('message', (topic, message) => {
  const msgStr = message.toString();
  let msgJson;

  try {
    msgJson = JSON.parse(msgStr);
  } catch (e) {
    console.warn(`[MQTT] Mensagem não-JSON no tópico ${topic}:`, msgStr);
    return;
  }

  const timestamp = new Date().toISOString();
  msgJson._timestamp = timestamp;
  msgJson._topic = topic;

  // Métricas de observabilidade (expostas via /api/status)
  metricas.mensagensPorTopico[topic] = (metricas.mensagensPorTopico[topic] || 0) + 1;
  metricas.ultimaMensagemEm = timestamp;

  // Roteamento por tópico
  switch (topic) {
    case TOPICS.status:
      // Mensagens do tipo "gateway" (online/offline) vêm do LWT
      // (Last Will Testament) configurado no ESP32: o broker publica
      // "offline" automaticamente se o ESP32 cair. Isso permite ao
      // dashboard sinalizar "hardware offline" em tempo real.
      if (msgJson.type === 'gateway') {
        estadoAtual.gateway = msgJson;
        io.emit('gateway', msgJson);
        console.log(`[WS →] Gateway ESP32: ${msgJson.status}`);
      } else {
        estadoAtual.status = msgJson;
        io.emit('status', msgJson);
        console.log(`[WS →] Status: ${msgJson.estado || msgJson.status || ''}`);
      }
      break;

    case TOPICS.estoque:
      estadoAtual.estoque = msgJson;
      io.emit('estoque', msgJson);
      console.log(`[WS →] Estoque: A=${msgJson.pecaA} B=${msgJson.pecaB} C=${msgJson.pecaC}`);
      break;

    case TOPICS.eventos:
      // Mantém histórico dos últimos 50 eventos
      estadoAtual.eventos.unshift(msgJson);
      if (estadoAtual.eventos.length > 50) {
        estadoAtual.eventos = estadoAtual.eventos.slice(0, 50);
      }
      io.emit('evento', msgJson);
      console.log(`[WS →] Evento: ${msgJson.evento} ${msgJson.peca || ''}`);
      break;

    case TOPICS.sensores:
      estadoAtual.sensores = msgJson;
      io.emit('sensores', msgJson);
      break;

    case TOPICS.esteiras:
      estadoAtual.esteiras = msgJson;
      io.emit('esteiras', msgJson);
      break;

    case TOPICS.cmdPub:
      io.emit('comando', msgJson);
      console.log(`[WS →] Comando confirmado: ${msgJson.acao}`);
      break;

    default:
      io.emit('dados', msgJson);
      break;
  }
});

// ============================================================
// EVENTOS SOCKET.IO — Conexão dos clientes (front-end)
// ============================================================
/**
 * Publica um comando no broker MQTT com QoS 1 e trata erro/ack.
 * Encapsula o padrão repetido para "solicitar_peca" e "reset".
 */
function publicarComando(socket, comando, descricao) {
  if (!mqttClient || !mqttClient.connected) {
    metricas.comandosRejeitados++;
    socket.emit('comando_erro', { erro: 'Broker MQTT offline', acao: comando.acao });
    console.warn(`[MQTT] ${descricao} rejeitado — broker offline`);
    return;
  }

  mqttClient.publish(TOPICS.cmdSub, JSON.stringify(comando), { qos: 1 }, (err) => {
    if (err) {
      metricas.comandosRejeitados++;
      console.error('[MQTT] Erro ao publicar comando:', err.message);
      socket.emit('comando_erro', { erro: 'Falha ao enviar comando', acao: comando.acao });
    } else {
      metricas.comandosPublicados++;
      console.log(`[MQTT] Comando publicado: ${descricao}`);
    }
  });
}

io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);

  // Timestamp do último comando aceito deste socket (rate limit por cliente)
  socket.data.ultimoComandoMs = 0;

  /**
   * Verifica se o cliente pode enviar um novo comando agora.
   * Retorna true se passou o intervalo mínimo desde o último; senão emite
   * comando_erro e retorna false.
   */
  function podeEnviarComando(acao) {
    const agora = Date.now();
    if (agora - socket.data.ultimoComandoMs < COMANDO_INTERVALO_MS) {
      metricas.comandosRejeitados++;
      socket.emit('comando_erro', {
        erro: `Muitos comandos — aguarde ${COMANDO_INTERVALO_MS}ms entre envios`,
        acao,
      });
      console.warn(`[WS ←] Rate limit: ${acao} rejeitado (${socket.id})`);
      return false;
    }
    socket.data.ultimoComandoMs = agora;
    return true;
  }

  // Envia estado atual para o novo cliente
  socket.emit('estado_inicial', estadoAtual);

  // Recebe comandos do front-end
  socket.on('solicitar_peca', (data) => {
    // Validação de entrada — evita publicar JSON inválido/arbitrário no broker
    const peca = data && typeof data.peca === 'string' ? data.peca.toUpperCase() : null;
    if (!PECAS_VALIDAS.includes(peca)) {
      metricas.comandosRejeitados++;
      socket.emit('comando_erro', { erro: `Peça inválida: ${data?.peca}`, acao: 'solicitar_peca' });
      console.warn(`[WS ←] Peça inválida recebida de ${socket.id}:`, data?.peca);
      return;
    }
    if (!podeEnviarComando('solicitar_peca')) return;

    console.log(`[WS ←] Pedido de peça ${peca} do cliente ${socket.id}`);
    publicarComando(socket, {
      acao: 'solicitar_peca',
      peca,
      origem: 'frontend',
      clienteId: socket.id,
    }, `solicitar_peca ${peca}`);
  });

  socket.on('reset_sistema', () => {
    if (!podeEnviarComando('reset')) return;

    console.log(`[WS ←] Reset do cliente ${socket.id}`);
    publicarComando(socket, {
      acao: 'reset',
      origem: 'frontend',
      clienteId: socket.id,
    }, 'reset');
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================
server.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('  DATA FLOW INVENTORY — Servidor Node.js');
  console.log('============================================================');
  console.log(`  HTTP/WebSocket: http://localhost:${PORT}`);
  console.log(`  MQTT Broker:    ${MQTT_CONFIG.brokerUrl}`);
  console.log(`  Status API:     http://localhost:${PORT}/api/status`);
  console.log(`  Origens CORS:   ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('============================================================');
  console.log('');
});

// ============================================================
// SHUTDOWN GRACIOSO
// ============================================================
// Ao receber SIGINT (Ctrl+C) ou SIGTERM (kill do process manager), publica
// status "offline" no broker antes de fechar — assim o dashboard/probe
// percebem imediatamente, sem depender apenas do LWT.
function shutdown(sinal) {
  console.log(`\n[SYS] Sinal ${sinal} recebido — encerrando...`);

  const encerrar = () => {
    server.close(() => process.exit(0));
    // Fallback: força saída se algo travar
    setTimeout(() => process.exit(0), 3000).unref();
  };

  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(
      TOPICS.statusServer,
      JSON.stringify({ type: 'server', status: 'offline' }),
      { qos: 1, retain: true },
      () => mqttClient.end(false, {}, encerrar)
    );
  } else {
    encerrar();
  }
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Tratamento de erros não capturados — loga e encerra. O process manager
// (pm2/nssm/systemd) fica responsável por reiniciar. Manter o processo vivo
// em estado indefinido pode corromper sockets ou o cliente MQTT.
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Exceção não capturada:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promise rejeitada:', reason);
  shutdown('unhandledRejection');
});