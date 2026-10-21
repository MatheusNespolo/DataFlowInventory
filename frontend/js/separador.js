// ============================================================
// DATA FLOW INVENTORY — Roda do separador no diagrama
// ------------------------------------------------------------
// Mantém a posição ESTIMADA da roda do separador para os dois diagramas
// (cena 3D e SVG de reserva). Não depende de three.js nem do DOM: o socket,
// o relógio e o agendador de quadros são injetáveis, então os testes rodam
// em Node (test/frontend/separador.test.mjs).
//
// MALHA ABERTA: o firmware não publica a posição da roda. O diagrama aplica a
// MESMA regra do firmware (src/logica/separador_auto.cpp) sobre o `status`
// que já recebe: assim que a checagem prévia aprova o pedido (estado
// ACIONANDO_ESTEIRA) até o fim da entrega (ENTREGANDO_PECA), a roda busca o
// compartimento da peça pedida; depois da entrega ela FICA onde está até o
// pedido seguinte. A posição real pode diferir (a roda é suposta no neutro ao
// ligar; qualquer reinício do Uno a desalinha; o comando de bancada CMD:SEP
// também a move sem aparecer no status).
// ============================================================

// Ângulo de cada compartimento a partir do neutro: IGUAL a SEPARADOR_GRAUS_*
// em arduino/data_flow_inventory/config.h.
export const GRAUS = Object.freeze({ A: 120, B: 240, C: 0, neutro: 0 });

// 10 RPM (SEPARADOR_RPM) = 60°/s: o diagrama gira na mesma velocidade da roda.
export const GRAUS_POR_SEGUNDO = 60;

const ESTADOS_DE_PREPARO = new Set(['ACIONANDO_ESTEIRA', 'ENTREGANDO_PECA']);

/**
 * Compartimento que a roda deve buscar para este status ('A', 'B', 'C') ou null
 * (nenhum pedido novo: a roda fica onde está). Espelha separadorAutoDestino().
 */
export function destinoPorStatus(estado, pecaSolicitada) {
  if (!ESTADOS_DE_PREPARO.has(estado)) return null;
  return ['A', 'B', 'C'][pecaSolicitada - 1] || null;
}

/** Reduz um ângulo ao intervalo [0, 360). */
export function normalizar(graus) {
  return ((graus % 360) + 360) % 360;
}

/**
 * Menor deslocamento (com sinal) de `de` até `para`, em graus, em (-180, 180].
 * Empate (exatamente meia volta) vai no sentido positivo, como no firmware.
 */
export function menorCaminho(de, para) {
  let d = normalizar(para - de);
  if (d > 180) d -= 360;
  return d;
}

/** Avança `atual` rumo a `alvo` pelo caminho mais curto, sem passar do alvo. */
export function avancar(atual, alvo, dt, velocidade = GRAUS_POR_SEGUNDO) {
  const d = menorCaminho(atual, alvo);
  const passo = velocidade * dt;
  if (Math.abs(d) <= passo) return normalizar(alvo);
  return normalizar(atual + Math.sign(d) * passo);
}

/**
 * Controlador da roda.
 *  - socket: Socket.IO (ou falso) de onde vêm status, estado_inicial e evento.
 *  - agendar/cancelar: padrão requestAnimationFrame/cancelAnimationFrame.
 *  - agora: relógio em ms (padrão performance.now).
 *  - semMovimento: prefers-reduced-motion → a roda vai direto ao destino.
 * `estado` é o objeto compartilhado com os diagramas: { destino, alvo, graus, movendo }.
 */
export function criarSeparador({
  socket = null,
  agendar = (fn) => requestAnimationFrame(fn),
  cancelar = (id) => cancelAnimationFrame(id),
  agora = () => performance.now(),
  semMovimento = false,
} = {}) {
  const estado = { destino: null, alvo: GRAUS.neutro, graus: GRAUS.neutro, movendo: false };
  const ouvintes = new Set();
  let idQuadro = null;
  let ultimoMs = null;

  function avisar() {
    ouvintes.forEach((cb) => {
      try { cb(estado); } catch (e) { console.error('[SEP] Falha em ouvinte do separador:', e); }
    });
  }

  function quadro() {
    idQuadro = null;
    const t = agora();
    // Sem teto curto: depois de uma aba oculta a roda já chegou ao destino (o tempo real passou).
    const dt = ultimoMs === null ? 0 : Math.min(Math.max((t - ultimoMs) / 1000, 0), 5);
    ultimoMs = t;
    estado.graus = avancar(estado.graus, estado.alvo, dt);
    if (menorCaminho(estado.graus, estado.alvo) === 0) {
      estado.graus = normalizar(estado.alvo);
      estado.movendo = false;
      ultimoMs = null;
    } else {
      idQuadro = agendar(quadro);
    }
    avisar();
  }

  function mover() {
    if (menorCaminho(estado.graus, estado.alvo) === 0) {
      estado.movendo = false;
      avisar();
      return;
    }
    if (semMovimento) {
      estado.graus = normalizar(estado.alvo);
      estado.movendo = false;
      avisar();
      return;
    }
    estado.movendo = true;
    if (idQuadro === null) {
      ultimoMs = null;
      idQuadro = agendar(quadro);
    }
    avisar();
  }

  /** Aplica um `status`: só reage a um pedido NOVO aprovado (outro compartimento). */
  function aplicarStatus(nomeEstado, pecaSolicitada) {
    const d = destinoPorStatus(nomeEstado, pecaSolicitada);
    if (!d || d === estado.destino) return;
    estado.destino = d;
    estado.alvo = GRAUS[d];
    mover();
  }

  /** O Uno reiniciou: o firmware volta a SUPOR a roda no neutro (sem movê-la). */
  function aplicarInicio() {
    if (idQuadro !== null) { cancelar(idQuadro); idQuadro = null; }
    ultimoMs = null;
    estado.destino = null;
    estado.alvo = GRAUS.neutro;
    estado.graus = GRAUS.neutro;
    estado.movendo = false;
    avisar();
  }

  if (socket) {
    socket.on('estado_inicial', (d) => {
      if (d && d.status) aplicarStatus(d.status.estado, d.status.pecaSolicitada);
    });
    socket.on('status', (d) => { if (d) aplicarStatus(d.estado, d.pecaSolicitada); });
    socket.on('evento', (d) => { if (d && d.evento === 'inicio') aplicarInicio(); });
  }

  return {
    estado,
    aplicarStatus,
    aplicarInicio,
    aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
  };
}

// ---- Ligação com a página (só no navegador) -----------------------------------

let unico = null;

/** Instância única ligada ao socket de app.js (window.dfiSocket) e aos diagramas. */
export function separadorCompartilhado() {
  if (unico) return unico;
  const semMovimento = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  unico = criarSeparador({ socket: window.dfiSocket || null, semMovimento });

  // Estado que a cena 3D lê a cada quadro (window.EstadoDiagrama é criado por app.js).
  const compartilhado = (window.EstadoDiagrama = window.EstadoDiagrama || { esteiras: {}, sensores: {} });
  compartilhado.separador = unico.estado;

  // SVG de reserva: a roda gira ao redor do centro do círculo (440, 150). Em SVG
  // o ângulo positivo é horário; a roda gira no sentido anti-horário da tela,
  // igual à cena 3D, então o sinal é invertido.
  const roda = document.getElementById('svg-separador-roda');
  const aplicarSvg = (e) => {
    if (!roda) return;
    roda.setAttribute('transform', `rotate(${(-e.graus).toFixed(2)} 440 150)`);
    roda.dataset.destino = e.destino || '';
    roda.dataset.movendo = e.movendo ? 'sim' : 'nao';
  };
  unico.aoMudar(aplicarSvg);
  aplicarSvg(unico.estado);

  // O estado_inicial pode ter chegado antes deste módulo carregar.
  if (window.dfiUltimoStatus) {
    unico.aplicarStatus(window.dfiUltimoStatus.estado, window.dfiUltimoStatus.pecaSolicitada);
  }
  return unico;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') separadorCompartilhado();
