// ============================================================
// DATA FLOW INVENTORY — Servidor Simulador (Offline)
// ============================================================
// Descrição:
// Server Express + Socket.IO que SIMULA o comportamento do
// Arduino + ESP32 + MQTT, gerando dados fake em tempo real.
// Não precisa de hardware, broker MQTT, nem .env.
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const PORT = process.env.PORT || 3000;

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

// Serve arquivos estáticos do frontend (simulador)
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rota de health check
app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    modo: 'simulador',
    mqtt: false,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// MÁQUINA DE ESTADOS SIMULADA
// ============================================================
const ESTADOS = {
  AGUARDANDO: 'AGUARDANDO_PEDIDO',
  VERIFICANDO: 'VERIFICANDO_ESTOQUE',
  ACIONANDO: 'ACIONANDO_ESTEIRA',
  ENTREGANDO: 'ENTREGANDO_PECA',
  ERRO: 'ERRO',
};

let sim = {
  fsm: ESTADOS.AGUARDANDO,
  pecaSolicitada: 0,
  estoque: { pecaA: 5, pecaB: 5, pecaC: 5 },
  esteiras: { principal: true, secA: false, secB: false, secC: false },
  sensores: {
    topo: { A: true, B: true, C: true },
    juncao: { J1: false, J2: false, J3: false },
  },
  uptime: 0,
};

// ============================================================
// FUNÇÕES DO SIMULADOR
// ============================================================

function publicarStatus() {
  const data = {
    estado: sim.fsm,
    pecaSolicitada: sim.pecaSolicitada,
    uptime: sim.uptime,
    origem: 'simulador',
  };
  io.emit('status', data);
}

function publicarEstoque() {
  io.emit('estoque', { ...sim.estoque, origem: 'simulador' });
}

function publicarSensores() {
  io.emit('sensores', { ...sim.sensores, origem: 'simulador' });
}

function publicarEsteiras() {
  io.emit('esteiras', { ...sim.esteiras, origem: 'simulador' });
}

function publicarEvento(evento, peca, tipo) {
  const evt = { evento, peca, tipo, origem: 'simulador' };
  io.emit('evento', evt);
}

function processarPeca(peca) {
  if (sim.fsm !== ESTADOS.AGUARDANDO) return;

  const estoqueKey = `peca${peca}`;
  if (sim.estoque[estoqueKey] <= 0) {
    sim.fsm = ESTADOS.ERRO;
    sim.pecaSolicitada = 0;
    publicarEvento('erro', peca, 'sem_estoque');
    publicarStatus();
    return;
  }

  // 1. Pedido recebido
  sim.pecaSolicitada = ['A', 'B', 'C'].indexOf(peca) + 1;
  sim.fsm = ESTADOS.VERIFICANDO;
  publicarEvento('pedido', peca);
  publicarStatus();

  // 2. Verificação OK (500ms)
  setTimeout(() => {
    sim.fsm = ESTADOS.ACIONANDO;
    sim.esteiras[`sec${peca}`] = true;
    publicarStatus();
    publicarEsteiras();

    // 3. Acionamento → entrega (1.5s)
    setTimeout(() => {
      sim.fsm = ESTADOS.ENTREGANDO;
      const jKey = `J${sim.pecaSolicitada}`;
      sim.sensores.juncao[jKey] = true;
      publicarStatus();
      publicarSensores();

      // 4. Entrega concluída (1s)
      setTimeout(() => {
        sim.estoque[estoqueKey]--;
        sim.esteiras[`sec${peca}`] = false;
        sim.sensores.juncao[jKey] = false;
        sim.fsm = ESTADOS.AGUARDANDO;
        sim.pecaSolicitada = 0;

        publicarEvento('entrega', peca);
        publicarEstoque();
        publicarEsteiras();
        publicarSensores();
        publicarStatus();
      }, 1000);
    }, 1500);
  }, 500);
}

function resetSimulador() {
  sim.fsm = ESTADOS.AGUARDANDO;
  sim.pecaSolicitada = 0;
  sim.estoque = { pecaA: 5, pecaB: 5, pecaC: 5 };
  sim.esteiras = { principal: true, secA: false, secB: false, secC: false };
  sim.sensores = {
    topo: { A: true, B: true, C: true },
    juncao: { J1: false, J2: false, J3: false },
  };

  publicarEvento('inicio', '', 'reset_simulador');
  publicarStatus();
  publicarEstoque();
  publicarEsteiras();
  publicarSensores();
}

// ============================================================
// EVENTOS SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
  console.log(`[SIMULADOR] Cliente conectado: ${socket.id}`);

  // Estado inicial
  socket.emit('estado_inicial', {
    status: { estado: sim.fsm, pecaSolicitada: sim.pecaSolicitada, uptime: sim.uptime },
    estoque: sim.estoque,
    sensores: sim.sensores,
    esteiras: sim.esteiras,
    eventos: [],
  });

  // Comandos do frontend
  socket.on('solicitar_peca', (data) => {
    console.log(`[SIMULADOR] Pedido peça ${data.peca}`);
    processarPeca(data.peca);
  });

  socket.on('reset_sistema', () => {
    console.log('[SIMULADOR] Reset solicitado');
    resetSimulador();
  });

  socket.on('disconnect', () => {
    console.log(`[SIMULADOR] Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
// TICKS PERIÓDICOS DO SIMULADOR
// ============================================================

// Atualiza uptime a cada 2s
setInterval(() => {
  sim.uptime += 2;
  if (sim.fsm === ESTADOS.AGUARDANDO) {
    publicarStatus();
  }
}, 2000);

// Publica estoque a cada 5s (manter sincronizado)
setInterval(() => {
  publicarEstoque();
}, 5000);

// ============================================================
// INICIALIZAÇÃO
// ============================================================
server.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('  DATA FLOW INVENTORY — SIMULADOR (Offline)');
  console.log('============================================================');
  console.log(`  Dashboard:  http://localhost:${PORT}`);
  console.log(`  Status API: http://localhost:${PORT}/api/status`);
  console.log('============================================================');
  console.log('  ⚠  Modo simulador: sem hardware conectado');
  console.log('     Dados gerados automaticamente.');
  console.log('     Botões simulam pedidos reais do Arduino.');
  console.log('============================================================');
  console.log('');
});