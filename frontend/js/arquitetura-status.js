// ============================================================
// DATA FLOW INVENTORY — Status das conexões (lógica pura)
// ------------------------------------------------------------
// Converte os sinais disponíveis no navegador (socket, /api/status,
// LWT do gateway, idade do último dado de campo) em estados por
// enlace e por nó. Sem DOM e sem three.js: testado em Node
// (test/frontend/arquitetura-status.test.mjs). Regras: spec §4.5.
// ============================================================

export const NOS = ['arduino', 'esp32', 'broker', 'servidor', 'simulador', 'dashboard', 'beckhoff'];

export const TOPOLOGIA = {
  'uart':             ['arduino', 'esp32'],
  'mqtt-esp32':       ['esp32', 'broker'],
  'mqtt-servidor':    ['broker', 'servidor'],
  'socket-servidor':  ['servidor', 'dashboard'],
  'mqtt-beckhoff':    ['broker', 'beckhoff'],
  'socket-simulador': ['simulador', 'dashboard'],
  'mqtt-simulador':   ['simulador', 'broker'],
};

// Do mais grave para o menos grave (só estados que contam como monitorados).
export const ORDEM_GRAVIDADE = ['falha', 'atencao', 'desconhecido', 'sem-dados', 'ok'];

// Silêncio do Arduino por mais que isso vira "sem dados recentes".
export const LIMITE_CAMPO_MS = 60000;

const FONTES = {
  'uart':             'Inferido pela chegada de dados do Arduino (status, sensores, esteiras)',
  'mqtt-esp32':       'LWT do gateway em dataflow/status (evento "gateway")',
  'mqtt-servidor':    'GET /api/status (campo mqtt), consultado a cada 5 s',
  'socket-servidor':  'Conexão Socket.IO deste navegador',
  'socket-simulador': 'Conexão Socket.IO deste navegador',
  'mqtt-beckhoff':    'Não monitorado — telemetria oficial planejada como melhoria',
  'mqtt-simulador':   'Não monitorado — publicação opcional (MQTT_PUBLISH=true)',
};

const NAO_MONITORADOS = new Set(['sem-telemetria', 'fora-do-modo']);

export function detectarModo(api) {
  if (!api) return 'desconhecido';
  if (api.tipo === 'ausente') return 'simulador';
  if (api.tipo !== 'ok') return 'desconhecido';
  const url = String(api.brokerUrl || '').toLowerCase();
  if (url.includes('hivemq') || url.startsWith('mqtts://') || url.includes(':8883')) return 'nuvem';
  return 'local';
}

function pior(estados) {
  let melhorIdx = ORDEM_GRAVIDADE.length - 1;
  for (const e of estados) {
    const i = ORDEM_GRAVIDADE.indexOf(e);
    if (i !== -1 && i < melhorIdx) melhorIdx = i;
  }
  return ORDEM_GRAVIDADE[melhorIdx];
}

function estadoComSocket(id, s, modo, agora) {
  const sim = modo === 'simulador';
  switch (id) {
    case 'socket-servidor':
      return sim ? 'fora-do-modo' : 'ok';
    case 'socket-simulador':
      if (sim) return 'ok';
      return modo === 'desconhecido' ? 'desconhecido' : 'fora-do-modo';
    case 'mqtt-servidor':
      if (sim) return 'fora-do-modo';
      if (s.api && s.api.tipo === 'ok') return s.api.mqtt ? 'ok' : 'falha';
      return 'desconhecido';
    case 'mqtt-esp32':
      if (sim) return 'fora-do-modo';
      if (s.gateway === 'online') return 'ok';
      if (s.gateway === 'offline') return 'falha';
      return 'desconhecido';
    case 'uart':
      if (sim) return 'fora-do-modo';
      if (s.gateway !== 'online') return 'desconhecido';
      if (s.ultimoDadoCampoEm != null && agora - s.ultimoDadoCampoEm < LIMITE_CAMPO_MS) return 'ok';
      return 'atencao'; // silêncio não prova falha: nunca 'falha'
    case 'mqtt-beckhoff':
      return 'sem-telemetria';
    case 'mqtt-simulador':
      return modo === 'local' || modo === 'nuvem' ? 'fora-do-modo' : 'sem-telemetria';
    default:
      return 'desconhecido';
  }
}

function estadoSemSocket(id, modo) {
  const sim = modo === 'simulador';
  const desc = modo === 'desconhecido';
  switch (id) {
    case 'socket-servidor':
      return sim ? 'fora-do-modo' : 'falha';
    case 'socket-simulador':
      return sim || desc ? 'falha' : 'fora-do-modo';
    case 'mqtt-beckhoff':
      return 'sem-telemetria';
    case 'mqtt-simulador':
      return modo === 'local' || modo === 'nuvem' ? 'fora-do-modo' : 'sem-telemetria';
    default: // uart, mqtt-esp32, mqtt-servidor
      return sim ? 'fora-do-modo' : 'sem-dados';
  }
}

export function derivarStatus(sinais, agora) {
  const s = sinais || {};
  const modo = detectarModo(s.api);

  const enlaces = {};
  for (const id of Object.keys(TOPOLOGIA)) {
    enlaces[id] = {
      estado: s.socketConectado ? estadoComSocket(id, s, modo, agora) : estadoSemSocket(id, modo),
      inferido: id === 'uart',
      fonte: FONTES[id],
    };
  }

  const nos = {};
  for (const no of NOS) {
    const proprios = Object.keys(TOPOLOGIA)
      .filter((id) => TOPOLOGIA[id].includes(no))
      .map((id) => enlaces[id].estado);
    const monitorados = proprios.filter((e) => !NAO_MONITORADOS.has(e));
    if (monitorados.length) nos[no] = pior(monitorados);
    else if (proprios.every((e) => e === 'fora-do-modo')) nos[no] = 'fora-do-modo';
    else nos[no] = 'sem-telemetria';
  }

  const monitorados = Object.values(enlaces).map((e) => e.estado).filter((e) => !NAO_MONITORADOS.has(e));
  const resumo = {
    pior: monitorados.length ? pior(monitorados) : 'desconhecido',
    monitorados: monitorados.length,
    ok: monitorados.filter((e) => e === 'ok').length,
  };

  return { modo, enlaces, nos, resumo };
}
