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
const path = require('path');

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const PORT = process.env.PORT || 3000;

const MQTT_CONFIG = {
  // TODO: Altere MQTT_BROKER_URL no .env para o endpoint do seu broker
  // Exemplos: mqtt://localhost (local) | mqtt://xxx.s1.eu.hivemq.com (nuvem)
  brokerUrl:  process.env.MQTT_BROKER_URL || 'mqtt://localhost',

  // TODO: Altere MQTT_PORT no .env conforme o broker:
  //   1883 = MQTT sem TLS (local) | 8883 = MQTT com TLS (nuvem)
  port:       parseInt(process.env.MQTT_PORT) || 1883,

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
};

// ============================================================
// EXPRESS + HTTP + SOCKET.IO
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Rota de health check
app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    mqtt: mqttClient ? mqttClient.connected : false,
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
const mqttClient = mqtt.connect(MQTT_CONFIG.brokerUrl, mqttOptions);

// Estado atual do sistema (cache para novos clientes)
let estadoAtual = {
  status: {},
  estoque: {},
  eventos: [],
  sensores: {},
  esteiras: {},
  gateway: {},   // online/offline do ESP32 (via LWT do broker MQTT)
};

// ============================================================
// EVENTOS MQTT
// ============================================================
mqttClient.on('connect', () => {
  console.log(`[MQTT] Conectado ao broker: ${MQTT_CONFIG.brokerUrl}`);

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
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT] Erro ao inscrever no tópico ${topic}:`, err.message);
      } else {
        console.log(`[MQTT] Inscrito no tópico: ${topic}`);
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
io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);

  // Envia estado atual para o novo cliente
  socket.emit('estado_inicial', estadoAtual);

  // Recebe comandos do front-end
  socket.on('solicitar_peca', (data) => {
    const peca = data.peca; // "A", "B" ou "C"
    console.log(`[WS ←] Pedido de peça ${peca} do cliente ${socket.id}`);

    const comando = {
      acao: 'solicitar_peca',
      peca: peca,
      origem: 'frontend',
      clienteId: socket.id
    };

    mqttClient.publish(TOPICS.cmdSub, JSON.stringify(comando), (err) => {
      if (err) {
        console.error('[MQTT] Erro ao publicar comando:', err.message);
        socket.emit('comando_erro', { erro: 'Falha ao enviar comando' });
      } else {
        console.log(`[MQTT] Comando publicado: solicitar_peca ${peca}`);
      }
    });
  });

  socket.on('reset_sistema', () => {
    console.log(`[WS ←] Reset do cliente ${socket.id}`);

    const comando = {
      acao: 'reset',
      origem: 'frontend',
      clienteId: socket.id
    };

    mqttClient.publish(TOPICS.cmdSub, JSON.stringify(comando), (err) => {
      if (err) {
        console.error('[MQTT] Erro ao publicar reset:', err.message);
        socket.emit('comando_erro', { erro: 'Falha ao enviar reset' });
      } else {
        console.log('[MQTT] Comando publicado: reset');
      }
    });
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
  console.log('============================================================');
  console.log('');
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Exceção não capturada:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promise rejeitada:', reason);
});