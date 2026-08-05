// ============================================================
// DATA FLOW INVENTORY — Simulador Front-end JavaScript
// ============================================================
// Descrição:
// Conecta ao servidor Simulador (via Socket.IO) para exibir dados
// e enviar comandos simulados. Ideal para desenvolvimento e testes offline.
// ============================================================

// ============================================================
// CONEXÃO SOCKET.IO
// ============================================================
const socket = io();

// ============================================================
// REFERÊNCIAS DOS ELEMENTOS DO DOM
// ============================================================
const els = {
  mqttStatus: document.getElementById('mqtt-status'),
  serverTime: document.getElementById('server-time'),
  estadoAtual: document.getElementById('estado-atual'),
  pecaSolicitada: document.getElementById('peca-solicitada'),
  uptime: document.getElementById('uptime'),
  estoqueA: document.getElementById('estoque-a'),
  estoqueB: document.getElementById('estoque-b'),
  estoqueC: document.getElementById('estoque-c'),
  sensorTopoA: document.getElementById('sensor-topo-a'),
  sensorTopoB: document.getElementById('sensor-topo-b'),
  sensorTopoC: document.getElementById('sensor-topo-c'),
  sensorJ1: document.getElementById('sensor-j1'),
  sensorJ2: document.getElementById('sensor-j2'),
  sensorJ3: document.getElementById('sensor-j3'),
  historicoLista: document.getElementById('historico-lista'),
};

// ============================================================
// ESTADO LOCAL DO DASHBOARD
// ============================================================
let historicoEventos = [];
const MAX_HISTORICO = 30;

// ============================================================
// EVENTOS SOCKET.IO — RECEBIMENTO DE DADOS
// ============================================================

// Conectado ao servidor
socket.on('connect', () => {
  console.log('[SIM] Conectado ao servidor');
  atualizarStatusConexao(true);
});

// Desconectado do servidor
socket.on('disconnect', () => {
  console.log('[SIM] Desconectado do servidor');
  atualizarStatusConexao(false);
});

// Estado inicial (quando o cliente se conecta)
socket.on('estado_inicial', (data) => {
  console.log('[SIM] Estado inicial recebido:', data);
  if (data.status) atualizarStatus(data.status);
  if (data.estoque) atualizarEstoque(data.estoque);
  if (data.sensores) atualizarSensores(data.sensores);
  if (data.eventos) {
    data.eventos.forEach(evt => adicionarHistorico(evt.evento, evt.peca, evt.tipo, false));
  }
});

// Atualizações de status
socket.on('status', atualizarStatus);

// Atualizações de estoque
socket.on('estoque', atualizarEstoque);

// Atualizações de sensores
socket.on('sensores', atualizarSensores);

// Histórico de eventos
socket.on('evento', (data) => {
  adicionarHistorico(data.evento, data.peca, data.tipo);
});

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function atualizarStatusConexao(conectado) {
  if (conectado) {
    els.mqttStatus.className = 'status-badge status-sim';
    els.mqttStatus.innerHTML = '<span class="status-dot"></span> Conectado (Simulador)';
  } else {
    els.mqttStatus.className = 'status-badge status-offline';
    els.mqttStatus.innerHTML = '<span class="status-dot"></span> Desconectado';
  }
}

function atualizarStatus(data) {
  els.estadoAtual.textContent = data.estado || 'DESCONHECIDO';
  els.uptime.textContent = formatarUptime(data.uptime || 0);

  if (data.pecaSolicitada) {
    els.pecaSolicitada.textContent = `Peça ${['A', 'B', 'C'][data.pecaSolicitada - 1]}`;
  } else {
    els.pecaSolicitada.textContent = '—';
  }
}

function atualizarEstoque(data) {
  if (data.pecaA !== undefined) els.estoqueA.textContent = data.pecaA;
  if (data.pecaB !== undefined) els.estoqueB.textContent = data.pecaB;
  if (data.pecaC !== undefined) els.estoqueC.textContent = data.pecaC;
}

function atualizarSensores(data) {
  if (data.topo) {
    atualizarSensor(els.sensorTopoA, data.topo.A);
    atualizarSensor(els.sensorTopoB, data.topo.B);
    atualizarSensor(els.sensorTopoC, data.topo.C);
  }
  if (data.juncao) {
    atualizarSensor(els.sensorJ1, data.juncao.J1);
    atualizarSensor(els.sensorJ2, data.juncao.J2);
    atualizarSensor(els.sensorJ3, data.juncao.J3);
  }
}

function atualizarSensor(element, valor) {
  element.textContent = valor ? '● Ativo' : '○ Inativo';
  if (valor) {
    element.classList.add('ativo');
  } else {
    element.classList.remove('ativo');
  }
}

function adicionarHistorico(evento, peca, tipo, scroll = true) {
  if (els.historicoLista.querySelector('.historico-vazio')) {
    els.historicoLista.innerHTML = '';
  }
  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR');
  const item = document.createElement('div');
  item.className = `historico-item evento-${tipo}`;
  item.innerHTML = `<span class="historico-hora">${hora}</span><span class="historico-msg">${evento} — Peça: ${peca || '—'}`;
  els.historicoLista.prepend(item);
}

// Formatar uptime
function formatarUptime(segundos) {
  const h = Math.floor(segundos / 3600).toString().padStart(2, '0');
  const m = Math.floor((segundos % 3600) / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ============================================================
// CONTROLES
// ============================================================
function solicitarPeca(peca) {
  socket.emit('solicitar_peca', { peca });
  console.log(`[SIM] Solicitando peça ${peca}`);
}

function resetSistema() {
  socket.emit('reset_sistema');
  console.log('[SIM] Resetando sistema');
}

// ============================================================
// INICIALIZAÇÃO DO RELÓGIO
// ============================================================
setInterval(() => {
  const agora = new Date();
  els.serverTime.textContent = agora.toLocaleTimeString('pt-BR');
}, 1000);