// ============================================================
// DATA FLOW INVENTORY — Servidor Simulador (Offline)
// ============================================================
// Descrição:
// Servidor Express + Socket.IO que SIMULA a máquina de estados
// do Arduino para testes offline, sem hardware nem broker MQTT.
//
// IMPORTANTE: este simulador emite os MESMOS eventos Socket.IO
// que o servidor real (../server/server.js), permitindo usar o
// front-end unificado (../frontend) sem nenhuma modificação.
//
// Modo de operação: SIMULADO
// Para modo REAL (com hardware + MQTT), usar ../server/server.js
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURAÇÃO DA SIMULAÇÃO
// ============================================================
const DELAY_VERIFICACAO = 300;   // ms — delay simulado da verificação
const DELAY_ACIONAMENTO = 200;   // ms — delay simulado do acionamento
const DELAY_ENTREGA     = 1500;  // ms — delay simulado da entrega
const ESTOQUE_INICIAL   = 5;     // peças de cada tipo

// ============================================================
// ESTADO SIMULADO (espelha a FSM do Arduino)
// Os nomes de estado são idênticos aos publicados via MQTT
// pelo firmware real, para compatibilidade com o dashboard.
// ============================================================
let sim = {
  estado:          'AGUARDANDO_PEDIDO',
  pecaSolicitada:  0,   // 0 = nenhuma, 1 = A, 2 = B, 3 = C
  uptime:          0,
  estoque:         { pecaA: ESTOQUE_INICIAL, pecaB: ESTOQUE_INICIAL, pecaC: ESTOQUE_INICIAL },
  esteiras:        { principal: true, secA: false, secB: false, secC: false },
  sensores:        { topo: { A: 1, B: 1, C: 1 }, juncao: { J1: 0, J2: 0, J3: 0 } },
  eventos:         [],
  timerEntrega:    null,
};

const PECAS = ['A', 'B', 'C'];

// ============================================================
// SERVE O FRONT-END UNIFICADO (../frontend)
// ============================================================
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ============================================================
// FUNÇÕES DE EMISSÃO (mesmo formato do servidor real)
// ============================================================

function emitirStatus() {
  io.emit('status', {
    estado: sim.estado,
    pecaSolicitada: sim.pecaSolicitada,
    uptime: sim.uptime,
  });
}

function emitirEstoque() {
  io.emit('estoque', { ...sim.estoque });
}

function emitirEsteiras() {
  io.emit('esteiras', { ...sim.esteiras });
}

function emitirSensores() {
  io.emit('sensores', {
    topo: { ...sim.sensores.topo },
    juncao: { ...sim.sensores.juncao },
  });
}

function emitirEvento(evento, peca, extra = {}) {
  const evt = { evento, peca, ...extra };
  sim.eventos.unshift(evt);
  if (sim.eventos.length > 50) sim.eventos = sim.eventos.slice(0, 50);
  io.emit('evento', evt);
}

function estadoInicial() {
  return {
    status:   { estado: sim.estado, pecaSolicitada: sim.pecaSolicitada, uptime: sim.uptime },
    estoque:  { ...sim.estoque },
    sensores: { topo: { ...sim.sensores.topo }, juncao: { ...sim.sensores.juncao } },
    esteiras: { ...sim.esteiras },
    eventos:  sim.eventos.slice(0, 10),
    gateway:  { status: 'online', type: 'gateway' }, // simulado sempre online
  };
}

// ============================================================
// LÓGICA DA MÁQUINA DE ESTADOS SIMULADA
// ============================================================

function solicitarPeca(peca) {
  if (sim.estado !== 'AGUARDANDO_PEDIDO') {
    console.log(`[SIM] Ignorado — sistema não está aguardando (estado: ${sim.estado})`);
    return;
  }

  const idx = PECAS.indexOf(peca);
  if (idx === -1) return;

  console.log(`[SIM] Pedido recebido: Peça ${peca}`);
  sim.pecaSolicitada = idx + 1;
  sim.estado = 'VERIFICANDO_ESTOQUE';
  emitirStatus();
  emitirEvento('pedido', peca);

  setTimeout(() => verificarEstoque(peca), DELAY_VERIFICACAO);
}

function verificarEstoque(peca) {
  const temSensor = sim.sensores.topo[peca] === 1;
  const temEstoque = sim.estoque['peca' + peca] > 0;

  if (temSensor && temEstoque) {
    console.log(`[SIM] Estoque OK — Peça ${peca} detectada`);
    sim.estado = 'ACIONANDO_ESTEIRA';
    emitirStatus();
    setTimeout(() => acionarEsteira(peca), DELAY_ACIONAMENTO);
  } else {
    console.log(`[SIM] ERRO — Sem estoque ou peça não detectada (${peca})`);
    sim.estado = 'ERRO';
    emitirStatus();
    emitirEvento('erro', peca, { tipo: 'sem_estoque' });
  }
}

function acionarEsteira(peca) {
  console.log(`[SIM] Acionando esteira secundária ${peca}`);
  sim.esteiras['sec' + peca] = true;
  sim.estado = 'ENTREGANDO_PECA';
  emitirStatus();
  emitirEsteiras();

  sim.timerEntrega = setTimeout(() => confirmarEntrega(peca), DELAY_ENTREGA);
}

function confirmarEntrega(peca) {
  console.log(`[SIM] Peça ${peca} entregue com sucesso`);

  // Desliga a esteira e decrementa estoque
  sim.esteiras['sec' + peca] = false;
  sim.estoque['peca' + peca]--;

  // Pulso no sensor de junção (simula detecção da peça)
  const juncao = 'J' + (PECAS.indexOf(peca) + 1);
  sim.sensores.juncao[juncao] = 1;
  emitirSensores();
  setTimeout(() => {
    sim.sensores.juncao[juncao] = 0;
    emitirSensores();
  }, 500);

  // Se o estoque zerou, o sensor de topo deixa de detectar peça
  if (sim.estoque['peca' + peca] === 0) {
    sim.sensores.topo[peca] = 0;
  }

  sim.estado = 'AGUARDANDO_PEDIDO';
  sim.pecaSolicitada = 0;
  sim.timerEntrega = null;

  emitirStatus();
  emitirEstoque();
  emitirEsteiras();
  emitirEvento('entrega', peca);

  console.log(`[SIM] Estoque: A=${sim.estoque.pecaA} B=${sim.estoque.pecaB} C=${sim.estoque.pecaC}`);
}

function resetSistema() {
  console.log('[SIM] Sistema resetado');

  if (sim.timerEntrega) {
    clearTimeout(sim.timerEntrega);
    sim.timerEntrega = null;
  }

  sim.esteiras.secA = false;
  sim.esteiras.secB = false;
  sim.esteiras.secC = false;
  sim.estado = 'AGUARDANDO_PEDIDO';
  sim.pecaSolicitada = 0;

  emitirStatus();
  emitirEsteiras();
  console.log('[SIM] Aguardando pedido...');
}

// ============================================================
// SOCKET.IO — mesmos eventos do servidor real
// ============================================================
io.on('connection', (socket) => {
  console.log(`[SIM] Cliente conectado: ${socket.id}`);

  // Envia estado inicial (mesmo formato do servidor real)
  socket.emit('estado_inicial', estadoInicial());
  socket.emit('gateway', { status: 'online', type: 'gateway' });

  socket.on('solicitar_peca', (data) => {
    io.emit('comando', { acao: 'solicitar_peca', peca: data.peca });
    solicitarPeca(data.peca);
  });

  socket.on('reset_sistema', () => {
    io.emit('comando', { acao: 'reset' });
    resetSistema();
  });

  socket.on('disconnect', () => {
    console.log(`[SIM] Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
// TIMER DE UPTIME (emite status a cada 5s, como o firmware real)
// ============================================================
setInterval(() => {
  sim.uptime++;
  if (sim.uptime % 5 === 0) emitirStatus();
}, 1000);

// ============================================================
// INICIAR SERVIDOR
// ============================================================
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  Data Flow Inventory — Simulador                 ║');
  console.log(`  ║  Rodando em: http://localhost:${PORT}               ║`);
  console.log('  ║  Modo: SIMULADO (sem hardware, sem MQTT)         ║');
  console.log('  ║  Front-end: ../frontend (unificado)              ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('[SIM] Sistema iniciado. Aguardando pedido...');
});