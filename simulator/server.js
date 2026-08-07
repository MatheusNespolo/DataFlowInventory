// ============================================================
// DATA FLOW INVENTORY — Servidor Simulador (Offline)
// ============================================================
// Descrição:
// Servidor Express + Socket.IO que SIMULA a máquina de estados
// do Arduino Mega para testes offline, sem necessidade de
// dispositivos ou MQTT real.
//
// Modo de operação: SIMULADO
// Para modo REAL (com hardware), usar ../server/server.js
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURAÇÃO DA SIMULAÇÃO
// ============================================================
const TIMEOUT_ENTREGA = 3000;  // ms — timeout para entrega
const DELAY_ENTREGA   = 1500;  // ms — delay simulado da entrega
const ESTOQUE_INICIAL = 5;     // peças de cada tipo

// ============================================================
// ESTADO SIMULADO (espelha a FSM do Arduino Mega)
// ============================================================
const ESTADOS = {
  AGUARDANDO:     "Aguardando",
  VERIFICANDO:    "Verificando Estoque",
  ACIONANDO:      "Acionando Esteira",
  ENTREGANDO:     "Entregando Peça",
  ERRO:           "Erro"
};

let estado = {
  fsm:             ESTADOS.AGUARDANDO,
  pecaSolicitada:  null,      // "A", "B", "C" ou null
  uptime:          0,
  mqttCount:       0,
  estoque:         { A: ESTOQUE_INICIAL, B: ESTOQUE_INICIAL, C: ESTOQUE_INICIAL },
  esteiras:        { principal: true, A: false, B: false, C: false },
  sensores:        { topoA: 1, topoB: 1, topoC: 1, j1: 0, j2: 0, j3: 0 },
  historico:       [],
  timerEntrega:    null,
  timerVerificacao: null,
};

// ============================================================
// SERVE ARQUIVOS ESTÁTICOS (frontend)
// ============================================================
app.use(express.static('frontend'));

// ============================================================
// SOCKET.IO — COMUNICAÇÃO COM FRONTEND
// ============================================================
io.on("connection", (socket) => {
  console.log(`[SIM] Cliente conectado: ${socket.id}`);

  // Envia estado inicial ao conectar
  emitirEstado(socket);

  // ---- Solicitação de peça ----
  socket.on("solicitarPeca", (data) => {
    const peca = data.peca; // "A", "B" ou "C"

    if (estado.fsm !== ESTADOS.AGUARDANDO) {
      console.log(`[SIM] Ignorado — sistema não está aguardando (estado: ${estado.fsm})`);
      return;
    }

    console.log(`[SIM] Pedido recebido: Peça ${peca}`);

    // Registra evento de pedido
    adicionarHistorico("pedido", `Peça ${peca} solicitada`);

    // Transição: AGUARDANDO → VERIFICANDO
    estado.fsm = ESTADOS.VERIFICANDO;
    estado.pecaSolicitada = peca;
    emitirEstado(io);

    // Simula verificação de estoque (imediato)
    setTimeout(() => {
      verificarEstoque(peca);
    }, 300);
  });

  // ---- Reset do sistema ----
  socket.on("resetSistema", () => {
    if (estado.fsm !== ESTADOS.ERRO) {
      console.log(`[SIM] Ignorado reset — sistema não está em erro`);
      return;
    }

    console.log(`[SIM] Sistema resetado`);

    // Limpa timers pendentes
    if (estado.timerEntrega) {
      clearTimeout(estado.timerEntrega);
      estado.timerEntrega = null;
    }

    estado.fsm = ESTADOS.AGUARDANDO;
    estado.pecaSolicitada = null;
    emitirEstado(io);
    console.log(`[SIM] Sistema resetado. Aguardando pedido...`);
  });

  // ---- Desconexão ----
  socket.on("disconnect", () => {
    console.log(`[SIM] Cliente desconectado: ${socket.id}`);
  });
});

// ============================================================
// LÓGICA DA MÁQUINA DE ESTADOS SIMULADA
// ============================================================

function verificarEstoque(peca) {
  const temSensor = estado.sensores["topo" + peca] === 1;
  const temEstoque = estado.estoque[peca] > 0;

  if (temSensor && temEstoque) {
    console.log(`[SIM] Estoque OK — Peça ${peca} detectada`);

    // Transição: VERIFICANDO → ACIONANDO
    estado.fsm = ESTADOS.ACIONANDO;
    emitirEstado(io);

    // Simula acionamento da esteira (imediato)
    setTimeout(() => {
      acionarEsteira(peca);
    }, 200);
  } else {
    console.log(`[SIM] ERRO — Sem estoque ou peça não detectada (${peca})`);
    estado.fsm = ESTADOS.ERRO;
    adicionarHistorico("erro", `Sem estoque ou peça não detectada: ${peca}`);
    emitirEstado(io);
  }
}

function acionarEsteira(peca) {
  console.log(`[SIM] Acionando esteira secundária ${peca}`);

  // Liga a esteira correspondente
  estado.esteiras[peca] = true;

  // Transição: ACIONANDO → ENTREGANDO
  estado.fsm = ESTADOS.ENTREGANDO;
  emitirEstado(io);

  // Simula a entrega (peça percorre a esteira)
  estado.timerEntrega = setTimeout(() => {
    confirmarEntrega(peca);
  }, DELAY_ENTREGA);
}

function confirmarEntrega(peca) {
  console.log(`[SIM] Peça ${peca} entregue com sucesso`);

  // Desliga a esteira
  estado.esteiras[peca] = false;

  // Atualiza estoque
  estado.estoque[peca]--;

  // Atualiza sensor de junção (simula detecção)
  const sensorJuncao = "j" + ["A", "B", "C"].indexOf(peca) + 1;
  estado.sensores[sensorJuncao] = 1;
  setTimeout(() => { estado.sensores[sensorJuncao] = 0; }, 500);

  // Incrementa contador MQTT simulado
  estado.mqttCount++;

  // Registra evento
  adicionarHistorico("entrega", `Peça ${peca} entregue — Estoque: ${estado.estoque[peca]}`);

  // Transição: ENTREGANDO → AGUARDANDO
  estado.fsm = ESTADOS.AGUARDANDO;
  estado.pecaSolicitada = null;
  estado.timerEntrega = null;

  console.log(`[SIM] Publica MQTT: estoque A=${estado.estoque.A} B=${estado.estoque.B} C=${estado.estoque.C}`);
  emitirEstado(io);
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function emitirEstado(target) {
  const dados = {
    estado:          estado.fsm,
    pecaSolicitada:  estado.pecaSolicitada || "—",
    uptime:          estado.uptime,
    mqttCount:       estado.mqttCount,
    estoque:         { ...estado.estoque },
    esteiras:        { ...estado.esteiras },
    sensores:        { ...estado.sensores },
  };
  target.emit("estadoAtualizado", dados);
}

function adicionarHistorico(tipo, descricao) {
  const evento = {
    tempo:     formatarUptime(estado.uptime),
    tipo:      tipo,       // "pedido", "entrega", "erro"
    descricao: descricao,
  };
  estado.historico.push(evento);

  // Mantém apenas os últimos 50 eventos
  if (estado.historico.length > 50) {
    estado.historico.shift();
  }

  io.emit("historicoAtualizado", estado.historico);
}

function formatarUptime(segundos) {
  if (segundos < 60) return segundos + "s";
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return min + "m " + seg + "s";
}

// ============================================================
// TIMER DE UPTIME (1s)
// ============================================================
setInterval(() => {
  estado.uptime++;
  emitirEstado(io);
}, 1000);

// ============================================================
// INICIAR SERVIDOR
// ============================================================
server.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║  Data Flow Inventory — Simulador                ║");
  console.log(`  ║  Rodando em: http://localhost:${PORT}             ║`);
  console.log("  ║  Modo: SIMULADO (sem hardware)                  ║");
  console.log("  ╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("[SIM] Sistema iniciado. Aguardando pedido...");
});