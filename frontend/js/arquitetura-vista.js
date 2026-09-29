// ============================================================
// DATA FLOW INVENTORY — Vista #/arquitetura (entrada)
// ------------------------------------------------------------
// Ciclo de vida da rota, status (coletor → derivarStatus), barra,
// anúncios e rótulos. NÃO importa three.js: a cena 3D é carregada
// sob demanda com import(); se falhar, a vista segue em 2D
// (Task 10). Independente de app.js: se este módulo falhar, o
// painel e os botões seguem funcionando.
//
// Contexto de representação (c), comum à cena 3D e ao SVG:
//   c.nos[id].rotulo       botão .arq-rotulo do nó
//   c.aplicar(r)           pinta o status na representação
//   c.definirAtiva(bool)   (opcional) liga/desliga o render
//   c.destacar(sel), c.enquadrar(sel), c.visaoGeral()  (Task 9, opcionais)
// ============================================================
import { NOS_ARQ, ENLACES_ARQ, ROTULO_MODO, ROTULO_ESTADO } from './arquitetura-dados.js';
import { derivarStatus } from './arquitetura-status.js';
import { coletorCompartilhado } from './arquitetura-sinais.js';

const ROTA = '#/arquitetura';
const palco = document.getElementById('arq-palco');
const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coletor = coletorCompartilhado();
let ctx = null;
let construindo = false;
let relogioStatus = null;

// Placa de identificação do nó: botão real (Tab/Enter), igual no 3D e no SVG.
function criarRotulo(id) {
  const n = NOS_ARQ[id];
  const rotulo = document.createElement('button');
  rotulo.type = 'button';
  rotulo.className = 'arq-rotulo';
  rotulo.dataset.no = id;
  rotulo.dataset.estado = 'desconhecido';
  rotulo.setAttribute('aria-pressed', 'false');
  rotulo.innerHTML = `<span class="arq-rotulo-led" aria-hidden="true"></span>`
    + `<span class="arq-rotulo-k" aria-hidden="true">${n.codigo}</span>`
    + `<span class="arq-rotulo-nome">${n.nome}</span>`;
  rotulo.addEventListener('click', () => {
    palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail: { tipo: 'no', id } }));
  });
  return rotulo;
}

function aplicarComum(c, r) {
  for (const [id, estado] of Object.entries(r.nos)) {
    const rotulo = c.nos[id].rotulo;
    rotulo.dataset.estado = estado;
    rotulo.setAttribute('aria-label', `${NOS_ARQ[id].nome}: ${ROTULO_ESTADO[estado]}`);
  }
  const modo = document.getElementById('arq-modo');
  if (modo) modo.textContent = ROTULO_MODO[r.modo];
  anunciarMudancas(c, r);
}

// Anuncia (aria-live) só as mudanças de estado dos enlaces, nunca a primeira pintura.
function anunciarMudancas(c, r) {
  const atual = Object.fromEntries(Object.entries(r.enlaces).map(([id, e]) => [id, e.estado]));
  const antes = c.estadosAnteriores;
  c.estadosAnteriores = atual;
  const el = document.getElementById('arq-anuncio');
  if (!antes || !el) return;
  const msgs = Object.keys(atual)
    .filter((id) => antes[id] !== atual[id])
    .map((id) => `${ENLACES_ARQ[id].rotulo}: ${ROTULO_ESTADO[atual[id]]}`);
  if (msgs.length) el.textContent = msgs.join('. ');
}

function atualizarBarra(s) {
  const el = document.getElementById('arq-atualizado');
  if (el) {
    el.textContent = s.apiEm
      ? `atualizado há ${Math.max(0, Math.round((Date.now() - s.apiEm) / 1000))} s`
      : 'aguardando dados…';
  }
  const aviso = document.getElementById('arq-aviso');
  if (aviso) {
    aviso.hidden = s.socketConectado;
    if (!s.socketConectado) {
      aviso.textContent = 'Sem conexão com o servidor: estados marcados como "sem dados" até reconectar.';
    }
  }
}

function reavaliar(c) {
  const s = coletor.obter();
  const r = derivarStatus(s, Date.now());
  c.aplicar(r);
  aplicarComum(c, r);
  atualizarBarra(s);
}

async function obterContexto() {
  try {
    const m = await import('./arquitetura3d.js');
    const c = m.construir3d({ palco, criarRotulo, semMovimento });
    if (c) {
      palco.dataset.pronto = '3d';
      return c;
    }
  } catch (e) {
    console.warn('[ARQ] Cena 3D indisponível:', e && e.message);
  }
  // Sem WebGL/three.js: substituído pelo fallback SVG na Task 10.
  const aviso = document.getElementById('arq-aviso');
  if (aviso) {
    aviso.textContent = 'WebGL indisponível neste navegador.';
    aviso.hidden = false;
  }
  return null;
}

function ativar(c, ativa) {
  if (ativa === !!c.ativa) return;
  c.ativa = ativa;
  if (c.definirAtiva) c.definirAtiva(ativa);
  if (ativa) {
    relogioStatus = setInterval(() => reavaliar(c), 1000); // "atualizado há X s" + regra de 60 s do UART
    reavaliar(c);
  } else {
    clearInterval(relogioStatus);
    relogioStatus = null;
  }
}

async function aoMudarRota() {
  if (!palco) return;
  if (location.hash === ROTA && !ctx && !construindo) {
    construindo = true;
    ctx = await obterContexto();
    construindo = false;
    if (!ctx) return;
  }
  // Relê o hash: a rota pode ter mudado durante o import().
  if (ctx) ativar(ctx, location.hash === ROTA);
}

coletor.aoMudar(() => { if (ctx && ctx.ativa) reavaliar(ctx); });
window.addEventListener('hashchange', aoMudarRota);
aoMudarRota();
