// ============================================================
// DATA FLOW INVENTORY — Arquitetura em 2D (sem WebGL/three.js)
// ------------------------------------------------------------
// Planta baixa da mesma topologia (x e z de arquitetura-dados.js),
// com os mesmos rótulos, estados e painel de detalhes da cena 3D.
// Não importa three.js.
// ============================================================
import { NOS_ARQ, ENLACES_ARQ } from './arquitetura-dados.js';

const NS = 'http://www.w3.org/2000/svg';
// Janela da planta em unidades de cena → viewBox 1000 × 520.
const X0 = -11, X1 = 10, Z0 = -6.5, Z1 = 4.5, W = 1000, H = 520;
const px = (x) => ((x - X0) / (X1 - X0)) * W;
const pz = (z) => ((z - Z0) / (Z1 - Z0)) * H;

export function desenharFallback(palco, criarRotulo) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // "none": o SVG ocupa o palco inteiro e os rótulos (em %) ficam alinhados às pontas dos enlaces.
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'arq-fallback');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Diagrama 2D da arquitetura. Use Tab para percorrer os componentes.');

  const enlaces = {};
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    const ax = px(NOS_ARQ[e.de].posicao[0]);
    const az = pz(NOS_ARQ[e.de].posicao[2]);
    const bx = px(NOS_ARQ[e.para].posicao[0]);
    const bz = pz(NOS_ARQ[e.para].posicao[2]);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2 - Math.min(60, Math.hypot(bx - ax, bz - az) * 0.15);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M ${ax} ${az} Q ${mx} ${mz} ${bx} ${bz}`);
    path.setAttribute('class', 'arq-fb-enlace');
    path.dataset.enlace = id;
    path.dataset.estado = 'desconhecido';
    path.addEventListener('click', () => {
      palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail: { tipo: 'enlace', id } }));
    });
    svg.append(path);
    enlaces[id] = path;
  }

  const camada = document.createElement('div');
  camada.className = 'arq-fb-rotulos';
  const nos = {};
  for (const id of Object.keys(NOS_ARQ)) {
    const [x, , z] = NOS_ARQ[id].posicao;
    const rotulo = criarRotulo(id);
    rotulo.style.left = `${(px(x) / W) * 100}%`;
    rotulo.style.top = `${(pz(z) / H) * 100}%`;
    camada.append(rotulo);
    nos[id] = { rotulo };
  }

  palco.prepend(camada);
  palco.prepend(svg);

  return {
    nos,
    enlaces,
    aplicar(r) {
      for (const [id, info] of Object.entries(r.enlaces)) {
        const p = enlaces[id];
        p.dataset.estado = info.estado;
        p.classList.toggle('arq-fb-tracejado', info.inferido || info.estado === 'sem-telemetria');
      }
    },
    destacar(sel) {
      for (const [id, p] of Object.entries(enlaces)) {
        p.classList.toggle('arq-fb-selecionado', !!sel && sel.tipo === 'enlace' && sel.id === id);
      }
    },
  };
}
