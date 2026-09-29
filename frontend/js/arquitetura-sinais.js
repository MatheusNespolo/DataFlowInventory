// ============================================================
// DATA FLOW INVENTORY — Coletor de sinais de conectividade
// ------------------------------------------------------------
// Junta os sinais já disponíveis no navegador (spec §4.3/§4.6):
// conexão Socket.IO, LWT do gateway, chegada de dados do Arduino
// e GET /api/status (404 no simulador). Registra os PRÓPRIOS
// listeners no socket compartilhado — não altera os handlers de
// app.js. Dependências injetáveis para teste em Node.
// ============================================================

export function criarColetor({
  socket,
  fetchFn,
  relogio = () => Date.now(),
  agendar = (fn, ms) => setInterval(fn, ms),
  cancelar = (id) => clearInterval(id),
  intervaloAtivoMs = 5000,
  intervaloFundoMs = 30000,
  timeoutMs = 3000,
  gatewayInicial = null, // último status já recebido por app.js antes deste coletor existir
}) {
  const sinais = {
    socketConectado: !!(socket && socket.connected),
    api: { tipo: 'pendente' },
    gateway: gatewayInicial || null,
    ultimoDadoCampoEm: null,
    apiEm: null,
  };
  const ouvintes = new Set();
  let ritmo = 'parado';
  let timer = null;

  function emitir() {
    const copia = obter();
    ouvintes.forEach((cb) => {
      try { cb(copia); } catch (e) { console.error('[ARQ] Falha em ouvinte de sinais:', e); }
    });
  }

  function obter() {
    return { ...sinais, api: { ...sinais.api } };
  }

  function aoMudar(cb) {
    ouvintes.add(cb);
    return () => ouvintes.delete(cb);
  }

  if (socket) {
    socket.on('connect', () => { sinais.socketConectado = true; emitir(); });
    socket.on('disconnect', () => { sinais.socketConectado = false; emitir(); });
    socket.on('gateway', (d) => { sinais.gateway = (d && d.status) || null; emitir(); });
    socket.on('estado_inicial', (d) => {
      // O estado inicial vem do cache do servidor: não prova que o Arduino
      // está falando agora, então só aproveita o gateway (retained).
      if (d && d.gateway && d.gateway.status) { sinais.gateway = d.gateway.status; emitir(); }
    });
    const dadoDeCampo = () => { sinais.ultimoDadoCampoEm = relogio(); emitir(); };
    socket.on('status', dadoDeCampo);
    socket.on('sensores', dadoDeCampo);
    socket.on('esteiras', dadoDeCampo);
  }

  async function consultarApi() {
    // 404 = simulador, que não ganha o endpoint no meio da sessão: não
    // consulta de novo (evita um erro 404 no console a cada ciclo).
    if (sinais.api.tipo === 'ausente') {
      sinais.apiEm = relogio();
      emitir();
      return;
    }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const limite = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const r = await fetchFn('/api/status', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (r.status === 404) {
        sinais.api = { tipo: 'ausente' };
      } else if (r.status === 200 || r.status === 503) {
        const corpo = (await r.json()) || {};
        sinais.api = { tipo: 'ok', mqtt: !!corpo.mqtt, brokerUrl: String(corpo.brokerUrl || '') };
      } else {
        sinais.api = { tipo: 'erro' };
      }
    } catch (e) {
      sinais.api = { tipo: 'erro' };
    } finally {
      if (limite) clearTimeout(limite);
      sinais.apiEm = relogio();
      emitir();
    }
  }

  function definirRitmo(novo) {
    if (novo === ritmo) return;
    ritmo = novo;
    if (timer !== null) { cancelar(timer); timer = null; }
    if (novo === 'parado') return;
    consultarApi();
    timer = agendar(consultarApi, novo === 'ativo' ? intervaloAtivoMs : intervaloFundoMs);
  }

  return { obter, aoMudar, consultarApi, definirRitmo };
}

let unico = null;

/** Instância única ligada ao socket de app.js (window.dfiSocket). */
export function coletorCompartilhado() {
  if (!unico) {
    unico = criarColetor({
      socket: window.dfiSocket || null,
      fetchFn: (url, opts) => fetch(url, opts),
      // O estado_inicial pode ter chegado antes deste módulo carregar.
      gatewayInicial: window.dfiUltimoGateway || null,
    });
  }
  return unico;
}
