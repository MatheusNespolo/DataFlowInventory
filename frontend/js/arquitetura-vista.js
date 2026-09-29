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
  rotulo.title = n.nome;
  rotulo.dataset.estado = 'desconhecido';
  rotulo.setAttribute('aria-pressed', 'false');
  rotulo.innerHTML = `<span class="arq-rotulo-led" aria-hidden="true"></span>`
    + `<span class="arq-rotulo-k" aria-hidden="true">${n.codigo}</span>`
    + `<span class="arq-rotulo-nome">${n.curto}</span>`;
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
  atualizarDetalhes(c, r, s);
}

// ============================================================
// SELEÇÃO + PAINEL DE DETALHES (comum ao 3D e ao SVG)
// ============================================================
const painel = document.getElementById('arq-detalhes');
const tituloPainel = document.getElementById('arq-detalhes-titulo');
const corpoPainel = document.getElementById('arq-detalhes-corpo');
const botaoEnquadrar = document.getElementById('arq-enquadrar');

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function secao(titulo) {
  const s = el('section');
  s.append(el('h4', null, titulo));
  return s;
}

function montarSecaoDoc(s) {
  const bloco = secao(s.titulo);
  if (s.itens) {
    const ul = el('ul');
    s.itens.forEach((t) => ul.append(el('li', null, t)));
    bloco.append(ul);
  } else {
    const tabela = el('table');
    const thead = el('thead');
    const cab = el('tr');
    s.colunas.forEach((t) => cab.append(el('th', null, t)));
    thead.append(cab);
    const tbody = el('tbody');
    s.linhas.forEach((linha) => {
      const tr = el('tr');
      linha.forEach((t) => tr.append(el('td', null, t)));
      tbody.append(tr);
    });
    tabela.append(thead, tbody);
    bloco.append(tabela);
  }
  bloco.append(el('p', 'arq-fonte', `Fonte: ${s.fonte}`));
  return bloco;
}

// Monta o DOM do painel uma vez por seleção; atualizarDetalhes só troca textos
// e data-estado (sem recriar nós, para não perder o foco do teclado).
function montarDetalhes(c, sel) {
  corpoPainel.replaceChildren();
  const refs = { estado: el('p', 'arq-estado'), conexoes: [], fonte: null, ultimo: null };
  corpoPainel.append(refs.estado);

  if (sel.tipo === 'no') {
    const n = NOS_ARQ[sel.id];
    tituloPainel.textContent = n.nome;
    const funcao = secao(`${n.codigo} · ${n.camada}`);
    funcao.append(el('p', null, n.funcao));
    corpoPainel.append(funcao);

    const conexoes = secao('Conexões');
    const ul = el('ul', 'arq-lista-enlaces');
    Object.entries(ENLACES_ARQ)
      .filter(([, e]) => e.de === sel.id || e.para === sel.id)
      .forEach(([id, e]) => {
        const li = el('li');
        const b = el('button', 'arq-link-enlace');
        b.type = 'button';
        b.dataset.enlace = id;
        const est = el('span', 'arq-estado');
        b.append(el('span', null, `${e.rotulo} · ${e.protocolo}`), est);
        b.addEventListener('click', () => selecionar(c, { tipo: 'enlace', id }));
        li.append(b);
        ul.append(li);
        refs.conexoes.push({ id, el: est });
      });
    conexoes.append(ul);
    corpoPainel.append(conexoes);
    n.secoes.forEach((s) => corpoPainel.append(montarSecaoDoc(s)));
  } else {
    const e = ENLACES_ARQ[sel.id];
    tituloPainel.textContent = e.rotulo;
    const info = secao('Enlace');
    const ul = el('ul');
    ul.append(
      el('li', null, `Protocolo: ${e.protocolo}`),
      el('li', null, `De ${NOS_ARQ[e.de].nome} para ${NOS_ARQ[e.para].nome}`),
    );
    info.append(ul);
    corpoPainel.append(info);

    const origem = secao('De onde vem o status');
    refs.fonte = el('p');
    refs.ultimo = el('p', 'arq-fonte');
    origem.append(refs.fonte, refs.ultimo);
    corpoPainel.append(origem);

    if (e.topicos.length) {
      const t = secao('Tópicos MQTT');
      const lista = el('ul');
      e.topicos.forEach((tp) => lista.append(el('li', 'mono', tp)));
      t.append(lista);
      corpoPainel.append(t);
    }
  }
  c.detalhes = refs;
}

function pintarEstado(alvo, estado) {
  alvo.dataset.estado = estado;
  alvo.textContent = ROTULO_ESTADO[estado];
}

function atualizarDetalhes(c, r, s) {
  if (!c.selecao || !c.detalhes) return;
  const d = c.detalhes;
  if (c.selecao.tipo === 'no') {
    pintarEstado(d.estado, r.nos[c.selecao.id]);
    d.conexoes.forEach(({ id, el: alvo }) => {
      pintarEstado(alvo, r.enlaces[id].estado);
      if (r.enlaces[id].inferido) alvo.textContent += ' (inferido)';
    });
    return;
  }
  const info = r.enlaces[c.selecao.id];
  pintarEstado(d.estado, info.estado);
  if (info.inferido) d.estado.append(el('span', 'arq-selo-inferido', 'inferido'));
  d.fonte.textContent = info.fonte;
  const quando = c.selecao.id === 'uart' ? s.ultimoDadoCampoEm
    : c.selecao.id === 'mqtt-servidor' ? s.apiEm : null;
  d.ultimo.textContent = quando
    ? `Último sinal há ${Math.max(0, Math.round((Date.now() - quando) / 1000))} s`
    : '';
}

function selecionar(c, sel) {
  if (sel && !c.selecao) c.focoRetorno = document.activeElement;
  c.selecao = sel;

  for (const [id, n] of Object.entries(c.nos)) {
    n.rotulo.setAttribute('aria-pressed', String(!!sel && sel.tipo === 'no' && sel.id === id));
  }
  if (c.destacar) c.destacar(sel);
  if (botaoEnquadrar) botaoEnquadrar.disabled = !sel || !c.enquadrar;

  if (!sel) {
    painel.hidden = true;
    c.detalhes = null;
    if (c.visaoGeral) c.visaoGeral();
    const volta = c.focoRetorno;
    c.focoRetorno = null;
    if (volta && document.contains(volta)) volta.focus();
    return;
  }

  montarDetalhes(c, sel);
  painel.hidden = false;
  reavaliar(c);
  if (c.enquadrar) c.enquadrar(sel);
  tituloPainel.focus();
}

// Evento de seleção, Fechar, Enquadrar e Esc — ligados uma única vez.
function ligarPainel(c) {
  palco.addEventListener('arq:selecionar', (ev) => selecionar(c, ev.detail));

  const fechar = document.getElementById('arq-fechar');
  if (fechar) fechar.addEventListener('click', () => selecionar(c, null));

  if (botaoEnquadrar) {
    botaoEnquadrar.addEventListener('click', () => {
      if (c.selecao && c.enquadrar) c.enquadrar(c.selecao);
    });
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || location.hash !== ROTA) return;
    if (c.selecao) selecionar(c, null);
    else if (c.visaoGeral) c.visaoGeral();
  });
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
    ligarPainel(ctx);
  }
  // Relê o hash: a rota pode ter mudado durante o import().
  if (ctx) ativar(ctx, location.hash === ROTA);
}

coletor.aoMudar(() => { if (ctx && ctx.ativa) reavaliar(ctx); });
window.addEventListener('hashchange', aoMudarRota);
aoMudarRota();
