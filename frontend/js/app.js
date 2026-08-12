// ============================================================
// DATA FLOW INVENTORY — Front-end JavaScript
// SENAI São Caetano do Sul — Engenharia de Controle e Automação
// ============================================================
// Descrição:
// Conecta ao servidor Node.js via Socket.IO, recebe dados em
// tempo real do Arduino (via MQTT) e atualiza a interface.
// Também envia comandos do usuário (solicitar peça, reset).
// ============================================================

// ============================================================
// CONEXÃO SOCKET.IO
// ============================================================
const socket = io();

// ============================================================
// REFERÊNCIAS DOS ELEMENTOS DO DOM
// ============================================================
const els = {
  // Header
  mqttStatus: document.getElementById('mqtt-status'),
  gatewayStatus: document.getElementById('gateway-status'),
  serverTime: document.getElementById('server-time'),

  // Estado
  estadoAtual: document.getElementById('estado-atual'),
  pecaSolicitada: document.getElementById('peca-solicitada'),
  uptime: document.getElementById('uptime'),

  // Estoque
  estoqueA: document.getElementById('estoque-a'),
  estoqueB: document.getElementById('estoque-b'),
  estoqueC: document.getElementById('estoque-c'),

  // Esteiras
  esteiraPrincipal: document.getElementById('esteira-principal'),
  esteiraA: document.getElementById('esteira-a'),
  esteiraB: document.getElementById('esteira-b'),
  esteiraC: document.getElementById('esteira-c'),

  // Sensores
  sensorTopoA: document.getElementById('sensor-topo-a'),
  sensorTopoB: document.getElementById('sensor-topo-b'),
  sensorTopoC: document.getElementById('sensor-topo-c'),
  sensorJ1: document.getElementById('sensor-j1'),
  sensorJ2: document.getElementById('sensor-j2'),
  sensorJ3: document.getElementById('sensor-j3'),

  // Diagrama SVG
  svgEsteiraPrincipal: document.getElementById('svg-esteira-principal'),
  svgEsteiraA: document.getElementById('svg-esteira-a'),
  svgEsteiraB: document.getElementById('svg-esteira-b'),
  svgEsteiraC: document.getElementById('svg-esteira-c'),
  svgSensorTopoA: document.getElementById('svg-sensor-topo-a'),
  svgSensorTopoB: document.getElementById('svg-sensor-topo-b'),
  svgSensorTopoC: document.getElementById('svg-sensor-topo-c'),
  svgSensorJ1: document.getElementById('svg-sensor-j1'),
  svgSensorJ2: document.getElementById('svg-sensor-j2'),
  svgSensorJ3: document.getElementById('svg-sensor-j3'),

  // Driver/versão (header)
  driverInfo: document.getElementById('driver-info'),

  // Botões
  btnSolicitarA: document.getElementById('btn-solicitar-a'),
  btnSolicitarB: document.getElementById('btn-solicitar-b'),
  btnSolicitarC: document.getElementById('btn-solicitar-c'),

  // Histórico
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
  console.log('[WS] Conectado ao servidor — ID:', socket.id);
  atualizarStatusConexao(true);
});

// Desconectado do servidor
socket.on('disconnect', () => {
  console.log('[WS] Desconectado do servidor');
  atualizarStatusConexao(false);
});

// Erro de conexão (servidor offline, porta errada, etc.)
socket.on('connect_error', (err) => {
  console.error('[WS] Erro de conexão:', err.message);
  atualizarStatusConexao(false);
  adicionarHistorico('erro', '', `Conexão perdida: ${err.message}`);
});

// Estado inicial (quando o cliente se conecta)
socket.on('estado_inicial', (data) => {
  console.log('[WS] Estado inicial recebido:', data);

  if (data.status && data.status.estado) {
    atualizarEstado(data.status);
  }
  if (data.estoque && data.estoque.pecaA !== undefined) {
    atualizarEstoque(data.estoque);
  }
  if (data.sensores && data.sensores.topo) {
    atualizarSensores(data.sensores);
  }
  if (data.esteiras) {
    atualizarEsteiras(data.esteiras);
  }
  if (data.eventos && data.eventos.length > 0) {
    data.eventos.forEach(evt => {
      adicionarHistorico(evt.evento, evt.peca, evt.tipo, false);
    });
  }
  if (data.gateway && data.gateway.status) {
    atualizarGateway(data.gateway);
  }
});

// Status do gateway ESP32 (online/offline via MQTT LWT)
// O broker publica "offline" automaticamente se o ESP32 cair.
socket.on('gateway', (data) => {
  atualizarGateway(data);
  adicionarHistorico(
    data.status === 'online' ? 'gateway_online' : 'gateway_offline',
    '',
    ''
  );
});

// Status do sistema
socket.on('status', (data) => {
  atualizarEstado(data);
});

// Estoque
socket.on('estoque', (data) => {
  atualizarEstoque(data);
});

// Eventos (pedido, entrega, erro, inicio)
socket.on('evento', (data) => {
  adicionarHistorico(data.evento, data.peca, data.tipo || data.msg);

  // Efeitos visuais por tipo de evento
  if (data.evento === 'entrega') {
    flashCard('card-estoque', 'var(--accent-green)');
  } else if (data.evento === 'erro') {
    flashCard('card-estado', 'var(--accent-red)');
  } else if (data.evento === 'inicio') {
    // Arduino v2.1 envia versao e driver no evento de início
    atualizarDriver(data.versao, data.driver);
    flashCard('card-estado', 'var(--accent-purple)');
  }
});

// Sensores
socket.on('sensores', (data) => {
  atualizarSensores(data);
});

// Esteiras
socket.on('esteiras', (data) => {
  atualizarEsteiras(data);
});

// Confirmação de comando
socket.on('comando', (data) => {
  console.log('[WS] Comando confirmado:', data);
  adicionarHistorico('comando_enviado', data.peca, data.acao);
});

// Erro de comando
socket.on('comando_erro', (data) => {
  console.error('[WS] Erro de comando:', data);
  adicionarHistorico('erro', '', data.erro);
});

// ============================================================
// FUNÇÕES DE ATUALIZAÇÃO DA UI
// ============================================================

function atualizarStatusConexao(conectado) {
  if (conectado) {
    els.mqttStatus.className = 'status-badge status-online';
    els.mqttStatus.innerHTML = '<span class="status-dot"></span> Conectado';
  } else {
    els.mqttStatus.className = 'status-badge status-offline';
    els.mqttStatus.innerHTML = '<span class="status-dot"></span> Desconectado';
  }
}

function atualizarGateway(data) {
  if (!els.gatewayStatus) return;
  if (data.status === 'online') {
    els.gatewayStatus.className = 'status-badge status-online';
    els.gatewayStatus.innerHTML = '<span class="status-dot"></span> ESP32 Online';
  } else {
    els.gatewayStatus.className = 'status-badge status-offline';
    els.gatewayStatus.innerHTML = '<span class="status-dot"></span> ESP32 Offline';
  }
}

function atualizarEstado(data) {
  const estado = data.estado || 'DESCONHECIDO';
  els.estadoAtual.textContent = estado;

  // Cor do estado baseado no tipo
  switch (estado) {
    case 'AGUARDANDO_PEDIDO':
      els.estadoAtual.style.color = 'var(--accent-blue)';
      break;
    case 'VERIFICANDO_ESTOQUE':
      els.estadoAtual.style.color = 'var(--accent-yellow)';
      break;
    case 'ACIONANDO_ESTEIRA':
      els.estadoAtual.style.color = 'var(--accent-green)';
      break;
    case 'ENTREGANDO_PECA':
      els.estadoAtual.style.color = 'var(--accent-green)';
      break;
    case 'ERRO':
      els.estadoAtual.style.color = 'var(--accent-red)';
      break;
    default:
      els.estadoAtual.style.color = 'var(--accent-purple)';
  }

  // Peça solicitada
  if (data.pecaSolicitada !== undefined) {
    if (data.pecaSolicitada === 0) {
      els.pecaSolicitada.textContent = '—';
    } else {
      const nome = ['A', 'B', 'C'][data.pecaSolicitada - 1] || '—';
      els.pecaSolicitada.textContent = 'Peça ' + nome;
      els.pecaSolicitada.style.color =
        nome === 'A' ? 'var(--color-a)' :
        nome === 'B' ? 'var(--color-b)' :
        'var(--color-c)';
    }
  }

  // Uptime
  if (data.uptime !== undefined) {
    els.uptime.textContent = formatarUptime(data.uptime);
  }

  // Atualizar status dos botões
  const aguardando = estado === 'AGUARDANDO_PEDIDO';
  els.btnSolicitarA.disabled = !aguardando;
  els.btnSolicitarB.disabled = !aguardando;
  els.btnSolicitarC.disabled = !aguardando;
}

function atualizarEstoque(data) {
  if (data.pecaA !== undefined) {
    animarNumero(els.estoqueA, parseInt(els.estoqueA.textContent), data.pecaA);
  }
  if (data.pecaB !== undefined) {
    animarNumero(els.estoqueB, parseInt(els.estoqueB.textContent), data.pecaB);
  }
  if (data.pecaC !== undefined) {
    animarNumero(els.estoqueC, parseInt(els.estoqueC.textContent), data.pecaC);
  }
}

function atualizarEsteiras(data) {
  atualizarEsteira(els.esteiraPrincipal, data.principal);
  atualizarEsteira(els.esteiraA, data.secA);
  atualizarEsteira(els.esteiraB, data.secB);
  atualizarEsteira(els.esteiraC, data.secC);

  // Atualizar diagrama SVG
  if (data.principal) {
    attrsSvg(els.svgEsteiraPrincipal, { fill: '#2d6a4f', stroke: '#40916c' });
  }
  if (data.secA !== undefined) {
    attrsSvg(els.svgEsteiraA, data.secA ? { fill: '#e74c3c', stroke: '#c0392b' } : { fill: '#555', stroke: '#777' });
  }
  if (data.secB !== undefined) {
    attrsSvg(els.svgEsteiraB, data.secB ? { fill: '#2ecc71', stroke: '#27ae60' } : { fill: '#555', stroke: '#777' });
  }
  if (data.secC !== undefined) {
    attrsSvg(els.svgEsteiraC, data.secC ? { fill: '#3498db', stroke: '#2980b9' } : { fill: '#555', stroke: '#777' });
  }
}

function atualizarEsteira(element, ligada) {
  if (ligada) {
    element.className = 'esteira-status esteira-on';
    element.textContent = '● Ligada';
  } else {
    element.className = 'esteira-status esteira-off';
    element.textContent = '● Parada';
  }
}

function atualizarSensores(data) {
  if (data.topo) {
    atualizarSensor(els.sensorTopoA, els.svgSensorTopoA, data.topo.A);
    atualizarSensor(els.sensorTopoB, els.svgSensorTopoB, data.topo.B);
    atualizarSensor(els.sensorTopoC, els.svgSensorTopoC, data.topo.C);
  }
  if (data.juncao) {
    atualizarSensor(els.sensorJ1, els.svgSensorJ1, data.juncao.J1);
    atualizarSensor(els.sensorJ2, els.svgSensorJ2, data.juncao.J2);
    atualizarSensor(els.sensorJ3, els.svgSensorJ3, data.juncao.J3);
  }
}

function atualizarDriver(versao, driver) {
  if (!els.driverInfo) return;
  const partes = [];
  if (versao) partes.push('v' + versao);
  if (driver) partes.push(driver);
  if (partes.length > 0) {
    els.driverInfo.textContent = partes.join(' · ');
    els.driverInfo.classList.add('driver-online');
  }
}

function atualizarSensor(elementText, elementSvg, valor) {
  elementText.textContent = valor;
  if (valor) {
    elementText.classList.add('ativo');
    if (elementSvg) {
      elementSvg.setAttribute('fill', '#34d399');
    }
  } else {
    elementText.classList.remove('ativo');
    if (elementSvg) {
      elementSvg.setAttribute('fill', '#666');
    }
  }
}

// ============================================================
// FUNÇÕES DE HISTÓRICO
// ============================================================

function adicionarHistorico(evento, peca, tipo, scroll = true) {
  // Remove mensagem de "vazio"
  const vazio = els.historicoLista.querySelector('.historico-vazio');
  if (vazio) vazio.remove();

  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR');

  let msg = '';
  let classe = '';

  switch (evento) {
    case 'pedido':
      msg = `Peça ${peca} solicitada`;
      classe = 'evento-pedido';
      break;
    case 'entrega':
      msg = `Peça ${peca} entregue`;
      classe = 'evento-entrega';
      break;
    case 'erro':
      msg = `Erro: ${tipo || 'desconhecido'}${peca ? ' — Peça ' + peca : ''}`;
      classe = 'evento-erro';
      break;
    case 'inicio':
      msg = 'Sistema iniciado';
      classe = 'evento-inicio';
      break;
    case 'comando_enviado':
      msg = `Comando enviado: ${tipo}${peca ? ' — Peça ' + peca : ''}`;
      classe = 'evento-pedido';
      break;
    case 'gateway_online':
      msg = 'Gateway ESP32 online';
      classe = 'evento-inicio';
      break;
    case 'gateway_offline':
      msg = 'Gateway ESP32 OFFLINE (hardware desconectado)';
      classe = 'evento-erro';
      break;
    default:
      msg = `${evento}${peca ? ' — ' + peca : ''}`;
      classe = '';
  }

  const item = document.createElement('div');
  item.className = `historico-item ${classe}`;
  item.innerHTML = `<span class="historico-hora">${hora}</span><span class="historico-msg">${msg}</span>`;

  // Insere no topo
  els.historicoLista.insertBefore(item, els.historicoLista.firstChild);

  // Limita o histórico
  const itens = els.historicoLista.querySelectorAll('.historico-item');
  if (itens.length > MAX_HISTORICO) {
    itens[itens.length - 1].remove();
  }
}

// ============================================================
// FUNÇÕES DE CONTROLE (ENVIAR COMANDOS)
// ============================================================

function solicitarPeca(peca) {
  console.log(`[UI] Solicitando peça ${peca}`);
  socket.emit('solicitar_peca', { peca: peca });
  adicionarHistorico('comando_enviado', peca, 'solicitar_peca');
}

function resetSistema() {
  console.log('[UI] Resetando sistema');
  socket.emit('reset_sistema');
  adicionarHistorico('comando_enviado', '', 'reset');
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function formatarUptime(segundos) {
  if (segundos < 60) return segundos + 's';
  if (segundos < 3600) return Math.floor(segundos / 60) + 'm ' + (segundos % 60) + 's';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function animarNumero(element, de, para) {
  if (de === para) return;

  // Define a transição ANTES de alterar o valor (necessário para animar)
  element.style.transition = 'all 0.3s ease';
  element.textContent = para;

  // Animação de destaque
  element.style.transform = 'scale(1.3)';
  element.style.color = 'var(--accent-yellow)';
  setTimeout(() => {
    element.style.transform = 'scale(1)';
    element.style.color = 'var(--text-primary)';
  }, 400);
}

function flashCard(cardId, cor) {
  const card = document.querySelector('.' + cardId);
  if (!card) return;

  card.style.borderColor = cor;
  card.style.boxShadow = `0 0 20px ${cor}40`;
  setTimeout(() => {
    card.style.borderColor = '';
    card.style.boxShadow = '';
  }, 800);
}

function attrsSvg(element, attrs) {
  if (!element) return;
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
}

// ============================================================
// RELÓGIO DO SERVIDOR
// ============================================================
setInterval(() => {
  const agora = new Date();
  els.serverTime.textContent = agora.toLocaleTimeString('pt-BR');
}, 1000);

// Relógio inicial
els.serverTime.textContent = new Date().toLocaleTimeString('pt-BR');

// ============================================================
// INICIALIZAÇÃO
// ============================================================
console.log('[Data Flow Inventory] Dashboard carregado');