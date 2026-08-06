// ============================================================
// DATA FLOW INVENTORY — Servidor Simulador (Offline)
// ============================================================
// Descrição:
// Servidor Express + Socket.IO que SIMULA o funcionamento para testes
// offline, sem necessidade de dispositivos ou MQTT real.
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Simulação de dados do sistema
let estadoSimulado = {
  estado: "Aguardando",
  uptime: 0,
  historico: [],
};

// Envia arquivos estáticos da pasta "frontend"
app.use(express.static('frontend'));

// Conexão com os clientes via Socket.IO
io.on("connection", (socket) => {
  console.log("Novo cliente conectado:", socket.id);
  
  // Envia estado inicial
  socket.emit("estadoAtualizado", {
    estado: estadoSimulado.estado,
    uptime: estadoSimulado.uptime,
  });

  socket.emit("historicoAtualizado", estadoSimulado.historico);

  // Solicitação de Peça
  socket.on("solicitarPeca", (data) => {
    console.log("Peça solicitada:", data.peca);
    const novoEvento = {
      tempo: `${estadoSimulado.uptime}s`,
      peca: data.peca,
    };
    estadoSimulado.historico.push(novoEvento);
    io.emit("historicoAtualizado", estadoSimulado.historico);
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Incrementa uptime periodicamente
setInterval(() => {
  estadoSimulado.uptime += 1;
  io.emit("estadoAtualizado", {
    estado: estadoSimulado.estado,
    uptime: estadoSimulado.uptime,
  });
}, 1000);

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});