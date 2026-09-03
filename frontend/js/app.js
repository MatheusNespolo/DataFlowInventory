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
  // Faixa anunciadora
  mqttStatus: document.getElementById('mqtt-status'),
  gatewayStatus: document.getElementById('gateway-status'),
  serverTime: document.getElementById('server-time'),
  annunEstado: document.getElementById('annun-estado'),
  annunEstadoV: document.getElementById('annun-estado-v'),
  annunEstoque: document.getElementById('annun-estoque'),
  annunEstoqueV: document.getElementById('annun-estoque-v'),

  // Estado
  estadoAtual: document.getElementById('estado-atual'),
  pecaSolicitada: document.getElementById('peca-solicitada'),
  uptime: document.getElementById('uptime'),

  // Estoque
  estoqueA: document.getElementById('estoque-a'),
  estoqueB: document.getElementById('estoque-b'),
  estoqueC: document.getElementById('estoque-c'),

  // Indicadores de estoque baixo (por peça)
  estoqueBadgeA: document.getElementById('estoque-badge-a'),
  estoqueBadgeB: document.getElementById('estoque-badge-b'),
  estoqueBadgeC: document.getElementById('estoque-badge-c'),

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
  btnReset: document.getElementById('btn-reset'),

  // Histórico
  historicoLista: document.getElementById('historico-lista'),

  // Vistas (roteamento por hash)
  viewPrincipal: document.getElementById('view-principal'),
  viewStatus: document.getElementById('view-status'),
};

// ============================================================
// ESTADO LOCAL DO DASHBOARD
// ============================================================
let historicoEventos = [];
const MAX_HISTORICO = 30;

// Respeita a preferência do sistema por menos movimento.
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Estado compartilhado com a cena 3D do diagrama (js/diagrama3d.js).
// Se o three.js/WebGL não carregar, este objeto simplesmente fica ocioso.
window.EstadoDiagrama = { esteiras: {}, sensores: {} };

// Dedupe de histórico durante o handshake do Socket.IO.
let historicoSemeado = false;   // replay de estado_inicial só na 1ª vez
let jaConectou = false;         // distingue 1ª conexão de reconexões
let ultimoGatewayStatus = null; // evita linhas repetidas de gateway

// ============================================================
// FAIXA ANUNCIADORA — janelas de estado
// ============================================================
// Estados: 'off' | 'stale' | 'idle' | 'run' | 'warn' | 'fault' | 'boot'
const RANK_ANUNCIADOR = { off: 0, stale: 0, idle: 1, boot: 1, run: 1, warn: 2, fault: 3 };

function setAnunciador(cell, estado, valor) {
  if (!cell) return;
  const anterior = cell.dataset.state || 'off';
  const valEl = cell.querySelector('.annun-v');
  if (valEl && valor !== undefined) valEl.textContent = valor;
  if (estado === anterior) return;

  cell.dataset.state = estado;

  // Comportamento "first-out": pisca uma vez ao piorar, depois assenta.
  const piorou = RANK_ANUNCIADOR[estado] > RANK_ANUNCIADOR[anterior];
  if (piorou && !semMovimento) {
    cell.classList.remove('is-alarm');
    void cell.offsetWidth; // reinicia a animação
    cell.classList.add('is-alarm');
    setTimeout(() => cell.classList.remove('is-alarm'), 1400);
  }
}

// ============================================================
// ESTOQUE BAIXO — classificação por nível
// ============================================================
// Limites (por peça):
//   >= 4  -> normal   (indicador oculto)
//   == 3  -> aviso
//   == 2  -> alerta
//   <= 1  -> critico   (0 ou 1)
// O indicador inline no card sempre reflete o nível atual.
// O histórico só registra quando a peça PIORA de nível.
const NIVEIS_ESTOQUE = ['normal', 'aviso', 'alerta', 'critico'];
const nivelEstoque = { A: 'normal', B: 'normal', C: 'normal' };
let estoqueSemeado = false; // o 1º snapshot não gera linha no histórico

const BADGE_ESTOQUE = {
  normal:  { texto: '',                    classe: '' },
  aviso:   { texto: '⚠️ Estoque baixo',    classe: 'estoque-badge-aviso' },
  alerta:  { texto: '🔴 Estoque em alerta', classe: 'estoque-badge-alerta' },
  critico: { texto: '🚨 Estoque crítico',  classe: 'estoque-badge-critico' },
};

function classificarEstoque(qtd) {
  if (qtd >= 4) return 'normal';
  if (qtd === 3) return 'aviso';
  if (qtd === 2) return 'alerta';
  return 'critico'; // 0 ou 1
}

// ============================================================
// EVENTOS SOCKET.IO — RECEBIMENTO DE DADOS
// ============================================================

// Conectado ao servidor
socket.on('connect', () => {
  console.log('[WS] Conectado ao servidor — ID:', socket.id);
  atualizarStatusConexao(true);
  if (jaConectou) adicionarHistorico('reconectado', '', '');
  jaConectou = true;
});

// Desconectado do servidor
socket.on('disconnect', () => {
  console.log('[WS] Desconectado do servidor');
  atualizarStatusConexao(false);
  marcarSemDados();
});

// Erro de conexão (servidor offline, porta errada, etc.)
socket.on('connect_error', (err) => {
  console.error('[WS] Erro de conexão:', err.message);
  atualizarStatusConexao(false);
  marcarSemDados();
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
  // Replay do histórico apenas na primeira vez — reconexões não repetem.
  if (!historicoSemeado && data.eventos && data.eventos.length > 0) {
    data.eventos.forEach(evt => {
      adicionarHistorico(evt.evento, evt.peca, evt.tipo, false);
    });
  }
  historicoSemeado = true;

  if (data.gateway && data.gateway.status) {
    ultimoGatewayStatus = data.gateway.status;
    atualizarGateway(data.gateway);
  }
});

// Status do gateway ESP32 (online/offline via MQTT LWT)
// O broker publica "offline" automaticamente se o ESP32 cair.
socket.on('gateway', (data) => {
  atualizarGateway(data);
  if (data.status !== ultimoGatewayStatus) {
    ultimoGatewayStatus = data.status;
    adicionarHistorico(
      data.status === 'online' ? 'gateway_online' : 'gateway_offline',
      '',
      ''
    );
  }
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

// Confirmação de comando (encaminhado ao Arduino com sucesso)
// Recebido de dataflow/comandos/pub quando o ESP32 confirma o encaminhamento.
// Se o ESP32 rejeitou (status="rejeitado"), emite 'comando_erro' em vez de
// adicionar ao histórico como enviado — evita que "CMD:PECA:Z" apareça como
// "comando enviado" no painel de histórico.
socket.on('comando', (data) => {
  console.log('[WS] Comando recebido:', data);
  if (data.status === 'rejeitado') {
    console.warn('[WS] Comando rejeitado pelo gateway:', data.motivo);
    adicionarHistorico('erro', data.peca || '', data.motivo || 'rejeitado');
  } else {
    adicionarHistorico('comando_enviado', data.peca, data.acao);
  }
});

// Erro de comando (validação no servidor, broker offline, rate limit,
// ou rejeição do gateway ESP32)
socket.on('comando_erro', (data) => {
  console.error('[WS] Erro de comando:', data);
  adicionarHistorico('erro', data.peca || '', data.erro);
});

// ============================================================
// FUNÇÕES DE ATUALIZAÇÃO DA UI
// ============================================================

function atualizarStatusConexao(conectado) {
  setAnunciador(
    els.mqttStatus,
    conectado ? 'run' : 'fault',
    conectado ? 'Conectado' : 'Sem enlace'
  );
}

function atualizarGateway(data) {
  const online = data.status === 'online';
  setAnunciador(
    els.gatewayStatus,
    online ? 'run' : 'fault',
    online ? 'ESP32 online' : 'ESP32 offline'
  );
}

// Mapeia o estado da máquina para uma luz de sinalização.
const LUZ_ESTADO = {
  AGUARDANDO_PEDIDO: 'idle',
  VERIFICANDO_ESTOQUE: 'warn',
  ACIONANDO_ESTEIRA: 'run',
  ENTREGANDO_PECA: 'run',
  ERRO: 'fault',
};

function atualizarAnunciadorEstado(estado) {
  setAnunciador(els.annunEstado, LUZ_ESTADO[estado] || 'boot', estado);
}

// Reflete o pior nível de estoque entre as três peças na faixa.
const LUZ_ESTOQUE = { normal: 'run', aviso: 'warn', alerta: 'fault', critico: 'fault' };
const TEXTO_ESTOQUE = { normal: 'Normal', aviso: 'Baixo', alerta: 'Alerta', critico: 'Crítico' };

function atualizarAnunciadorEstoque() {
  let pior = 'normal';
  let piorLetra = '';
  ['A', 'B', 'C'].forEach((l) => {
    if (NIVEIS_ESTOQUE.indexOf(nivelEstoque[l]) > NIVEIS_ESTOQUE.indexOf(pior)) {
      pior = nivelEstoque[l];
      piorLetra = l;
    }
  });
  const texto = pior === 'normal'
    ? TEXTO_ESTOQUE.normal
    : `${TEXTO_ESTOQUE[pior]} · ${piorLetra}`;
  setAnunciador(els.annunEstoque, LUZ_ESTOQUE[pior], texto);
}

// Fonte de dados perdida: Estado / Estoque / Gateway esmaecem até
// chegarem eventos reais na reconexão. (Enlace continua marcando falha.)
function marcarSemDados() {
  [els.annunEstado, els.annunEstoque, els.gatewayStatus].forEach((cell) => {
    if (!cell) return;
    cell.dataset.state = 'stale';
    const v = cell.querySelector('.annun-v');
    if (v) v.textContent = 'sem dados';
  });
}

function atualizarEstado(data) {
  const estado = data.estado || 'DESCONHECIDO';
  els.estadoAtual.textContent = estado;
  // Códigos de estado bem longos (ex.: VERIFICANDO_ESTOQUE) usam fonte
  // menor para caber numa linha. O box não muda de altura de qualquer
  // forma (min-height reservado no CSS).
  els.estadoAtual.classList.toggle('readout-value--compacto', estado.length > 18);
  atualizarAnunciadorEstado(estado);

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
    avaliarEstoqueBaixo('A', data.pecaA, els.estoqueBadgeA);
  }
  if (data.pecaB !== undefined) {
    animarNumero(els.estoqueB, parseInt(els.estoqueB.textContent), data.pecaB);
    avaliarEstoqueBaixo('B', data.pecaB, els.estoqueBadgeB);
  }
  if (data.pecaC !== undefined) {
    animarNumero(els.estoqueC, parseInt(els.estoqueC.textContent), data.pecaC);
    avaliarEstoqueBaixo('C', data.pecaC, els.estoqueBadgeC);
  }
  estoqueSemeado = true;
  atualizarAnunciadorEstoque();
}

// Classifica a quantidade da peça, atualiza o indicador inline e registra
// no histórico apenas quando o nível piora (normal < aviso < alerta < critico).
function avaliarEstoqueBaixo(letra, valor, elBadge) {
  const qtd = Number(valor);
  if (!Number.isFinite(qtd)) return;

  const nivel = classificarEstoque(qtd);
  const anterior = nivelEstoque[letra];

  atualizarBadgeEstoque(elBadge, nivel, qtd);

  if (
    estoqueSemeado &&
    NIVEIS_ESTOQUE.indexOf(nivel) > NIVEIS_ESTOQUE.indexOf(anterior)
  ) {
    adicionarHistorico('estoque_' + nivel, letra, qtd);
  }

  nivelEstoque[letra] = nivel;
}

function atualizarBadgeEstoque(elBadge, nivel, qtd) {
  if (!elBadge) return;
  const cfg = BADGE_ESTOQUE[nivel];
  elBadge.className = 'estoque-badge' + (cfg.classe ? ' ' + cfg.classe : '');
  if (nivel === 'normal') {
    elBadge.textContent = '';
    elBadge.hidden = true;
  } else if (nivel === 'critico' && qtd === 0) {
    elBadge.textContent = '🚨 Sem estoque';
    elBadge.hidden = false;
  } else {
    elBadge.textContent = `${cfg.texto} (${qtd})`;
    elBadge.hidden = false;
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

  Object.assign(window.EstadoDiagrama.esteiras, data);
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

  const s = window.EstadoDiagrama.sensores;
  if (data.topo) {
    s.topoA = !!data.topo.A; s.topoB = !!data.topo.B; s.topoC = !!data.topo.C;
  }
  if (data.juncao) {
    s.J1 = !!data.juncao.J1; s.J2 = !!data.juncao.J2; s.J3 = !!data.juncao.J3;
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
    case 'reconectado':
      msg = 'Reconectado ao servidor';
      classe = 'evento-inicio';
      break;
    case 'estoque_aviso':
      msg = `Peça ${peca}: estoque baixo — ${tipo} ${tipo === 1 ? 'restante' : 'restantes'}`;
      classe = 'evento-aviso';
      break;
    case 'estoque_alerta':
      msg = `Peça ${peca}: estoque em alerta — ${tipo} ${tipo === 1 ? 'restante' : 'restantes'}`;
      classe = 'evento-erro';
      break;
    case 'estoque_critico':
      msg = tipo === 0
        ? `Peça ${peca}: sem estoque`
        : `Peça ${peca}: estoque crítico — 1 restante`;
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
  // NOTA: o histórico é adicionado SOMENTE quando o servidor confirma
  // (evento 'comando') ou rejeita (evento 'comando_erro'). Antes, este
  // registro era adicionado antes da validação, fazendo com que comandos
  // rejeitados (ex.: CMD:PECA:Z via MQTT Box) aparecessem como
  // "comando enviado" no painel de histórico.
}

function resetSistema() {
  console.log('[UI] Resetando sistema');
  socket.emit('reset_sistema');
  // O histórico é adicionado quando o servidor confirma (evento 'comando').
}

// Ligação dos botões via JS (sem onclick inline — a CSP do helmet bloqueia
// handlers inline: script-src-attr 'none'). O script roda após o DOM.
els.btnSolicitarA.addEventListener('click', () => solicitarPeca('A'));
els.btnSolicitarB.addEventListener('click', () => solicitarPeca('B'));
els.btnSolicitarC.addEventListener('click', () => solicitarPeca('C'));
els.btnReset.addEventListener('click', () => resetSistema());

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
  if (de === para || Number.isNaN(para)) {
    if (!Number.isNaN(para)) element.textContent = para;
    return;
  }

  element.textContent = para;
  if (semMovimento) return;

  // Destaque momentâneo ao trocar o valor.
  element.style.transition = 'transform 0.3s ease, color 0.3s ease';
  element.style.transform = 'scale(1.22)';
  element.style.color = 'var(--led-warn)';
  setTimeout(() => {
    element.style.transform = 'scale(1)';
    element.style.color = 'var(--readout)';
  }, 380);
}

function flashCard(cardId, cor) {
  if (semMovimento) return;
  const card = document.querySelector('.' + cardId);
  if (!card) return;

  card.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease';
  card.style.borderColor = cor;
  card.style.boxShadow = `0 0 22px ${cor}40`;
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
// ROTEAMENTO POR HASH — principal (#/) e equipamentos+histórico (#/status)
// ============================================================
// Uma única conexão Socket.IO alimenta as duas vistas; alternar é só
// mostrar/ocultar. A faixa anunciadora fica fora das duas (sempre visível).
const TITULO_BASE = 'Data Flow Inventory — Painel';
const TITULO_STATUS = 'Equipamentos & histórico — Data Flow Inventory';

function definirLive(container, valor) {
  if (!container) return;
  container.querySelectorAll('[aria-live]').forEach((el) => el.setAttribute('aria-live', valor));
}

function roteador(mudarFoco) {
  const status = location.hash === '#/status';
  const ativa = status ? els.viewStatus : els.viewPrincipal;
  const inativa = status ? els.viewPrincipal : els.viewStatus;
  if (!ativa || !inativa) return;

  inativa.hidden = true;
  ativa.hidden = false;
  document.title = status ? TITULO_STATUS : TITULO_BASE;

  // O atalho no rodapé só faz sentido na página inicial.
  const footerNav = document.getElementById('footer-nav');
  if (footerNav) footerNav.hidden = status;

  // A vista oculta não deve anunciar atualizações para leitores de tela.
  definirLive(inativa, 'off');
  definirLive(ativa, 'polite');

  // Só move o foco quando o usuário navega (não no carregamento inicial).
  if (mudarFoco) {
    ativa.focus({ preventScroll: false });
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => roteador(true));
roteador(false);

// ============================================================
// PROFUNDIDADE DO DIAGRAMA — parallax suave do ponteiro
// ============================================================
// O ponteiro inclina o palco (--tilt-x / --tilt-y) e desloca a grade ao
// fundo (--par-x / --par-y) no sentido oposto, criando profundidade sem
// distorcer os elementos. Só roda durante a interação; desligado em
// movimento reduzido e em telas sem ponteiro.
(function parallaxDiagrama() {
  if (semMovimento) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  const mimic = document.querySelector('.mimic');
  const stage = document.querySelector('.mimic-stage');
  if (!mimic || !stage) return;

  const BASE_X = 7;   // graus (inclinação de repouso)
  const AMPL = 3.6;   // amplitude do parallax do ponteiro
  let raf = 0;

  mimic.addEventListener('pointermove', (e) => {
    const r = mimic.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;   // -0.5 .. 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      stage.style.setProperty('--tilt-y', (nx * AMPL * 2).toFixed(2) + 'deg');
      stage.style.setProperty('--tilt-x', (BASE_X - ny * AMPL).toFixed(2) + 'deg');
      mimic.style.setProperty('--par-x', nx.toFixed(3));
      mimic.style.setProperty('--par-y', ny.toFixed(3));
    });
  });

  mimic.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    stage.style.setProperty('--tilt-y', '0deg');
    stage.style.setProperty('--tilt-x', BASE_X + 'deg');
    mimic.style.setProperty('--par-x', '0');
    mimic.style.setProperty('--par-y', '0');
  });
})();

// ============================================================
// INICIALIZAÇÃO
// ============================================================
console.log('[Data Flow Inventory] Painel carregado');