// ============================================================
// DATA FLOW INVENTORY — Cena 3D da arquitetura (three.js)
// ------------------------------------------------------------
// Padrão do exemplo three.js misc_exporter_stl (chão com grade
// sumindo na névoa, OrbitControls livre, painel de controles no
// canto) com a luz do mímico da tela principal. Carregado sob
// demanda por js/arquitetura-vista.js; não conhece o coletor de
// sinais nem o painel de detalhes — só desenha o que recebe em
// c.aplicar(r) e dispara "arq:selecionar" no palco.
// ============================================================
import * as THREE from '/vendor/three.module.min.js';
import { OrbitControls } from '/vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '/vendor/CSS2DRenderer.js';
import { ambienteGradiente } from './ambiente3d.js';
import { NOS_ARQ, ENLACES_ARQ, HARDWARE, CAMERAS } from './arquitetura-dados.js';

const FUNDO = 0x14161c; // --panel
// Visão geral: elevação da câmera (acima dos ~36° de CAMERAS.geral, para
// separar na tela as placas de nós alinhados em profundidade).
const ELEVACAO_GERAL = THREE.MathUtils.degToRad(50);
const FOLGA_PX = 8;                        // folga das placas até bordas e painéis
const ROTULO_ESTIMADO = { w: 150, h: 34 }; // antes da primeira medição

// Espelha os tokens IEC 60073 de style.css (:root).
export const COR_ESTADO = {
  'ok':             0x3ddc84, // --led-run
  'atencao':        0xffb020, // --led-warn
  'falha':          0xff4d4f, // --led-fault
  'desconhecido':   0x4aa3ff, // --led-idle
  'sem-dados':      0x8b93a7, // --legend
  'sem-telemetria': 0x858ca3, // --muted
  'fora-do-modo':   0x3a3f4d, // --etch-strong
};

function suportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

// Textura de listras usada como alphaMap: tubo tracejado para enlaces
// inferidos ou não monitorados.
function texturaTracejada() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 2;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 32, 2);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 18, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function corpoPorForma(forma) {
  const grupo = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a3f4d, roughness: 0.55, metalness: 0.45, transparent: true,
  });
  const add = (geo, y) => {
    const m = new THREE.Mesh(geo, material);
    m.position.y = y;
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
    return m;
  };
  let altura = 1;
  switch (forma) {
    case 'placa':
      add(new THREE.BoxGeometry(2.2, 0.22, 1.5), 0.2);
      add(new THREE.BoxGeometry(0.7, 0.14, 0.5), 0.38);
      altura = 0.45;
      break;
    case 'torre':
      add(new THREE.BoxGeometry(1.3, 2.2, 1.3), 1.1);
      altura = 2.2;
      break;
    case 'monitor':
      add(new THREE.BoxGeometry(1.0, 0.08, 0.6), 0.04);
      add(new THREE.BoxGeometry(0.18, 0.7, 0.18), 0.4);
      add(new THREE.BoxGeometry(2.4, 1.45, 0.14), 1.45);
      altura = 2.2;
      break;
    case 'rack':
      add(new THREE.BoxGeometry(1.8, 1.6, 1.2), 0.8);
      altura = 1.6;
      break;
  }
  return { grupo, material, altura };
}

/**
 * Constrói a cena dentro do palco.
 * @param {{ palco: HTMLElement, criarRotulo: (id: string) => HTMLButtonElement, semMovimento: boolean }} opcoes
 * @returns contexto de representação, ou null sem WebGL.
 */
export function construir3d({ palco, criarRotulo, semMovimento }) {
  if (!suportaWebGL()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Diagrama 3D da arquitetura do Data Flow Inventory. Arraste para girar, use a roda para aproximar '
    + 'e o botão direito para deslocar. Use Tab para percorrer os componentes.');
  palco.prepend(canvas);

  const rotulos = new CSS2DRenderer();
  rotulos.domElement.className = 'arq-camada-rotulos';
  canvas.after(rotulos.domElement);

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(FUNDO);
  cena.fog = new THREE.Fog(FUNDO, 22, 48);
  cena.environment = ambienteGradiente(renderer);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  // Pose provisória: o primeiro quadro (ajustarTamanho) enquadra a cena no palco.
  camera.position.fromArray(CAMERAS.geral.posicao);

  // --- Luzes (mesmas do mímico) ---
  cena.add(new THREE.HemisphereLight(0x9ec3ff, 0x24201c, 0.6));
  const key = new THREE.DirectionalLight(0xffe9cf, 2.0);
  key.position.set(-8, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  key.shadow.bias = -0.0012;
  cena.add(key);
  const fill = new THREE.DirectionalLight(0x8ab0ff, 0.4);
  fill.position.set(10, 6, -8);
  cena.add(fill);

  // --- Chão + grade que some na névoa (padrão misc_exporter_stl) ---
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: FUNDO, roughness: 1, metalness: 0 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);
  const grade = new THREE.GridHelper(90, 90, 0x3a3f4d, 0x2b2f3a);
  grade.position.y = 0.002;
  grade.material.transparent = true;
  grade.material.opacity = 0.7;
  cena.add(grade);

  // --- Navegação (OrbitControls, como no exemplo de referência) ---
  const controles = new OrbitControls(camera, canvas);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.maxPolarAngle = THREE.MathUtils.degToRad(85); // nunca abaixo do chão
  controles.minDistance = 5;
  controles.maxDistance = 38;
  controles.screenSpacePanning = true;
  controles.target.fromArray(CAMERAS.geral.alvo);
  controles.update();

  const c = {
    renderer, rotulos, cena, camera, controles,
    nos: {}, enlaces: {}, etiquetasHw: [],
    sujo: true, voo: null, w: 0, h: 0,
    particulasLigadas: !semMovimento,
    emVisaoGeral: true, // reenquadra sozinha ao redimensionar o palco
  };
  c.marcarSujo = () => { c.sujo = true; };
  controles.addEventListener('change', c.marcarSujo);
  controles.addEventListener('start', () => { // o usuário assume a câmera
    c.voo = null;
    c.emVisaoGeral = false;
  });

  // --- Nós ---
  for (const [id, n] of Object.entries(NOS_ARQ)) {
    const { grupo, material, altura } = corpoPorForma(n.forma);
    grupo.position.fromArray(n.posicao);
    grupo.traverse((o) => { o.userData.no = id; });

    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.05, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1d24, emissive: COR_ESTADO.desconhecido, emissiveIntensity: 1.4 })
    );
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 0.04;
    grupo.add(anel);

    const rotulo = criarRotulo(id);
    rotulos.domElement.append(rotulo); // já no DOM: mede o tamanho antes do 1º quadro
    const obj = new CSS2DObject(rotulo);
    obj.position.set(0, altura + 0.55, 0);
    grupo.add(obj);

    cena.add(grupo);
    c.nos[id] = { grupo, corpo: material, anel, rotulo, altura };
  }

  // --- Cluster de hardware ao redor do Arduino (sem status) ---
  const matHw = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.6, metalness: 0.3 });
  const matFio = new THREE.LineBasicMaterial({ color: 0x3a3f4d });
  const origem = new THREE.Vector3().fromArray(NOS_ARQ.arduino.posicao).setY(0.2);
  for (const h of HARDWARE) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.6), matHw);
    m.position.set(h.posicao[0], 0.15, h.posicao[2]);
    m.castShadow = true;
    cena.add(m);
    cena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origem, m.position.clone()]), matFio));
    const et = document.createElement('div');
    et.className = 'arq-hw';
    for (const linha of [h.nome, h.detalhe]) { // duas linhas (.arq-hw span: display block)
      const s = document.createElement('span');
      s.textContent = linha;
      et.append(s);
    }
    const obj = new CSS2DObject(et);
    obj.position.set(0, 0.5, 0);
    m.add(obj);
    c.etiquetasHw.push(obj);
  }

  // --- Enlaces: tubo sobre curva + partículas no sentido do fluxo ---
  const baseTracejada = texturaTracejada();
  const geoParticula = new THREE.SphereGeometry(0.1, 12, 8);
  for (const [id, e] of Object.entries(ENLACES_ARQ)) {
    const a = new THREE.Vector3().fromArray(NOS_ARQ[e.de].posicao).setY(0.35);
    const b = new THREE.Vector3().fromArray(NOS_ARQ[e.para].posicao).setY(0.35);
    const meio = a.clone().lerp(b, 0.5);
    meio.y = 0.35 + Math.min(2.2, a.distanceTo(b) * 0.18);
    const curva = new THREE.QuadraticBezierCurve3(a, meio, b);

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1d24, emissive: COR_ESTADO.desconhecido, emissiveIntensity: 1.1,
      roughness: 0.4, metalness: 0.1, transparent: true,
    });
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.07, 8, false), material);
    tubo.userData.enlace = id;
    cena.add(tubo);

    const tracejado = baseTracejada.clone();
    tracejado.repeat.set(Math.max(4, Math.round(curva.getLength() * 3)), 1);
    tracejado.needsUpdate = true;

    const particulas = [0, 1 / 3, 2 / 3].map((t) => {
      const p = new THREE.Mesh(geoParticula, new THREE.MeshStandardMaterial({
        color: 0x1a1d24, emissive: COR_ESTADO.ok, emissiveIntensity: 2,
      }));
      p.userData.t = t;
      p.position.copy(curva.getPointAt(t));
      p.visible = false;
      cena.add(p);
      return p;
    });

    c.enlaces[id] = { tubo, curva, material, tracejado, particulas, estado: 'desconhecido' };
  }

  // --- Câmera: voo suave entre enquadramentos (corte seco com movimento reduzido) ---
  c.voarPara = (destino, instantaneo = semMovimento) => {
    const pos = new THREE.Vector3().fromArray(destino.posicao);
    const alvo = new THREE.Vector3().fromArray(destino.alvo);
    if (instantaneo) {
      camera.position.copy(pos);
      controles.target.copy(alvo);
      controles.update();
      c.voo = null;
    } else {
      c.voo = { t: 0, dePos: camera.position.clone(), deAlvo: controles.target.clone(), pos, alvo };
    }
    c.marcarSujo();
  };

  // --- Visão geral: enquadra a cena inteira na proporção do palco ---
  // Caixa com corpos, anéis, hardware e as âncoras das placas; o alvo é o centro.
  const caixaCena = new THREE.Box3();
  for (const [id, n] of Object.entries(NOS_ARQ)) {
    const [x, , z] = n.posicao;
    caixaCena.expandByPoint(new THREE.Vector3(x - 1.45, 0, z - 1.45)); // raio do anel
    caixaCena.expandByPoint(new THREE.Vector3(x + 1.45, c.nos[id].altura + 0.55, z + 1.45));
  }
  for (const h of HARDWARE) {
    caixaCena.expandByPoint(new THREE.Vector3(h.posicao[0] - 0.45, 0, h.posicao[2] - 0.3));
    caixaCena.expandByPoint(new THREE.Vector3(h.posicao[0] + 0.45, 0.3, h.posicao[2] + 0.3));
  }
  const centroCena = caixaCena.getCenter(new THREE.Vector3());
  const cantos = [];
  for (const x of [caixaCena.min.x, caixaCena.max.x]) {
    for (const y of [caixaCena.min.y, caixaCena.max.y]) {
      for (const z of [caixaCena.min.z, caixaCena.max.z]) cantos.push(new THREE.Vector3(x, y, z));
    }
  }
  const ancoras = Object.entries(c.nos).map(([id, n]) => ({
    id, rotulo: n.rotulo, p: n.grupo.position.clone().setY(n.altura + 0.55),
  }));
  const medidas = {};
  const tamanhoRotulo = ({ id, rotulo }) => {
    if (rotulo.offsetWidth) medidas[id] = { w: rotulo.offsetWidth, h: rotulo.offsetHeight };
    return medidas[id] || ROTULO_ESTIMADO;
  };

  // Direção da visão geral: azimute de CAMERAS.geral (ou +90° no retrato,
  // câmera do lado +x: fluxo campo → apresentação de cima para baixo).
  function direcaoGeral(girar) {
    const d = new THREE.Vector3().fromArray(CAMERAS.geral.posicao)
      .sub(new THREE.Vector3().fromArray(CAMERAS.geral.alvo));
    const az = Math.atan2(d.x, d.z) + (girar ? Math.PI / 2 : 0);
    const cosE = Math.cos(ELEVACAO_GERAL);
    return new THREE.Vector3(Math.sin(az) * cosE, Math.sin(ELEVACAO_GERAL), Math.cos(az) * cosE);
  }

  // Área útil do palco em px, com os painéis sobrepostos (controles, legenda) como obstáculos.
  function areaUtil() {
    const base = canvas.getBoundingClientRect();
    if (!base.width || !base.height) return null;
    const obstaculos = [];
    for (const seletor of ['.arq-controles', '.arq-legenda']) {
      const e = palco.querySelector(seletor);
      if (!e || !e.offsetWidth) continue;
      const r = e.getBoundingClientRect();
      obstaculos.push({
        x0: r.left - base.left - FOLGA_PX, y0: r.top - base.top - FOLGA_PX,
        x1: r.right - base.left + FOLGA_PX, y1: r.bottom - base.top + FOLGA_PX,
      });
    }
    return { w: base.width, h: base.height, obstaculos };
  }

  const v = new THREE.Vector3();
  function cabe(dir, dist, area) {
    camera.position.copy(centroCena).addScaledVector(dir, dist);
    camera.lookAt(centroCena);
    camera.updateMatrixWorld();
    const mx = 1 - (2 * FOLGA_PX) / area.w;
    const my = 1 - (2 * FOLGA_PX) / area.h;
    for (const p of cantos) {
      v.copy(p).project(camera);
      if (v.z > 1 || Math.abs(v.x) > mx || Math.abs(v.y) > my) return false;
    }
    for (const a of ancoras) {
      v.copy(a.p).project(camera);
      const { w, h } = tamanhoRotulo(a);
      const x0 = ((v.x + 1) / 2) * area.w - w / 2;
      const y0 = ((1 - v.y) / 2) * area.h - h / 2;
      const x1 = x0 + w;
      const y1 = y0 + h;
      if (x0 < FOLGA_PX || y0 < FOLGA_PX || x1 > area.w - FOLGA_PX || y1 > area.h - FOLGA_PX) return false;
      for (const o of area.obstaculos) {
        if (x0 < o.x1 && o.x0 < x1 && y0 < o.y1 && o.y0 < y1) return false;
      }
    }
    return true;
  }

  // Menor distância em que tudo cabe (busca binária; afastar só encolhe a cena na tela).
  function distanciaGeral(dir, area) {
    let perto = controles.minDistance;
    let longe = 90;
    if (!cabe(dir, longe, area)) return longe;
    for (let i = 0; i < 20; i++) {
      const meio = (perto + longe) / 2;
      if (cabe(dir, meio, area)) longe = meio;
      else perto = meio;
    }
    return longe;
  }

  c.enquadrarGeral = (instantaneo = semMovimento) => {
    c.emVisaoGeral = true;
    const area = areaUtil();
    let dir = direcaoGeral(false);
    let dist = 14;
    if (area) {
      const pos0 = camera.position.clone();
      const quat0 = camera.quaternion.clone();
      dist = distanciaGeral(dir, area);
      if (area.w / area.h < 0.9) {
        const dirRetrato = direcaoGeral(true);
        const distRetrato = distanciaGeral(dirRetrato, area);
        if (distRetrato < dist * 0.85) { dir = dirRetrato; dist = distRetrato; }
      }
      camera.position.copy(pos0);
      camera.quaternion.copy(quat0);
      camera.updateMatrixWorld();
    }
    controles.maxDistance = Math.max(38, dist * 1.25);
    cena.fog.near = dist * 0.9; // sem isso o retrato (câmera longe) some na névoa
    cena.fog.far = dist + 30;
    const pos = centroCena.clone().addScaledVector(dir, dist);
    c.voarPara({ posicao: pos.toArray(), alvo: centroCena.toArray() }, instantaneo);
  };

  // --- Status → cena ---
  c.atualizarParticulas = () => {
    for (const e of Object.values(c.enlaces)) {
      const mostrar = e.estado === 'ok' && c.particulasLigadas && !semMovimento;
      e.particulas.forEach((p) => { p.visible = mostrar; });
    }
    c.marcarSujo();
  };

  c.aplicar = (r) => {
    for (const [id, info] of Object.entries(r.enlaces)) {
      const e = c.enlaces[id];
      e.estado = info.estado;
      e.material.emissive.setHex(COR_ESTADO[info.estado]);
      const alpha = info.inferido || info.estado === 'sem-telemetria' ? e.tracejado : null;
      if (e.material.alphaMap !== alpha) {
        e.material.alphaMap = alpha;
        e.material.alphaTest = alpha ? 0.5 : 0;
        e.material.needsUpdate = true;
      }
      e.material.opacity = info.estado === 'fora-do-modo' ? 0.15 : 1;
    }
    for (const [id, estado] of Object.entries(r.nos)) {
      const n = c.nos[id];
      n.anel.material.emissive.setHex(COR_ESTADO[estado]);
      n.corpo.opacity = estado === 'fora-do-modo' ? 0.3 : 1;
    }
    c.atualizarParticulas();
  };

  // --- Laço de renderização (por sujeira, como o mímico) ---
  const relogio = new THREE.Clock();
  const suave = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function ajustarTamanho() {
    const w = Math.max(1, palco.clientWidth);
    const h = Math.max(1, palco.clientHeight);
    if (w === c.w && h === c.h) return;
    c.w = w;
    c.h = h;
    renderer.setSize(w, h, false);
    rotulos.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (c.emVisaoGeral && !c.voo) c.enquadrarGeral(true); // inclui o 1º quadro
    c.sujo = true;
  }

  function passo() {
    const dt = Math.min(relogio.getDelta(), 0.05);
    ajustarTamanho();
    let animando = false;

    if (c.voo) {
      c.voo.t = Math.min(1, c.voo.t + dt / 0.6);
      const k = suave(c.voo.t);
      camera.position.lerpVectors(c.voo.dePos, c.voo.pos, k);
      controles.target.lerpVectors(c.voo.deAlvo, c.voo.alvo, k);
      if (c.voo.t >= 1) c.voo = null;
      animando = true;
    }
    if (controles.update()) animando = true; // amortecimento ainda em curso

    if (c.particulasLigadas && !semMovimento) {
      for (const e of Object.values(c.enlaces)) {
        if (e.estado !== 'ok') continue;
        for (const p of e.particulas) {
          p.userData.t = (p.userData.t + dt * 0.22) % 1;
          p.position.copy(e.curva.getPointAt(p.userData.t));
        }
        animando = true;
      }
    }

    // Etiquetas do hardware de campo só aparecem com a câmera perto do Arduino.
    const perto = camera.position.distanceTo(origem) < 9;
    for (const obj of c.etiquetasHw) {
      if (obj.visible !== perto) { obj.visible = perto; c.sujo = true; }
    }

    if (c.sujo || animando) {
      renderer.render(cena, camera);
      rotulos.render(cena, camera);
      c.sujo = false;
    }
  }

  // Só o laço de renderização; o relógio de status é da vista (arquitetura-vista.js).
  c.definirAtiva = (ativa) => {
    if (ativa) {
      relogio.getDelta();
      c.sujo = true;
      renderer.setAnimationLoop(passo);
    } else {
      renderer.setAnimationLoop(null);
    }
  };

  // --- Seleção: realce do enlace e enquadramento de câmera ---
  c.destacar = (sel) => {
    for (const [id, e] of Object.entries(c.enlaces)) {
      e.material.emissiveIntensity = sel && sel.tipo === 'enlace' && sel.id === id ? 2.4 : 1.1;
    }
    c.marcarSujo();
  };
  c.enquadrar = (sel) => {
    c.emVisaoGeral = false;
    c.voarPara(enquadramento(c, sel));
  };
  c.visaoGeral = () => c.enquadrarGeral();

  // A fonte da interface pode chegar depois: remede as placas e reenquadra.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (c.emVisaoGeral && !c.voo && c.w) c.enquadrarGeral(true); });
  }

  ligarControles(c, palco, semMovimento);
  ligarRaycast(c, palco);
  ligarFoco(c, palco);
  return c;
}

function ligarControles(c, palco, semMovimento) {
  palco.querySelectorAll('[data-camera]').forEach((b) => {
    b.addEventListener('click', () => {
      // CAMERAS.geral só dá a direção: a visão geral é enquadrada no palco.
      if (b.dataset.camera === 'geral') {
        c.enquadrarGeral();
        return;
      }
      c.emVisaoGeral = false;
      c.voarPara(CAMERAS[b.dataset.camera]);
    });
  });

  const particulas = document.getElementById('arq-particulas');
  if (particulas) {
    particulas.checked = !semMovimento;
    particulas.disabled = semMovimento;
    particulas.addEventListener('change', () => {
      c.particulasLigadas = particulas.checked;
      c.atualizarParticulas();
    });
  }

  const rotulos = document.getElementById('arq-rotulos');
  if (rotulos) {
    rotulos.addEventListener('change', () => {
      c.rotulos.domElement.hidden = !rotulos.checked;
      c.marcarSujo();
    });
  }

  const abrir = palco.querySelector('.arq-controles-abrir');
  const caixa = document.getElementById('arq-controles');
  if (abrir && caixa) {
    abrir.addEventListener('click', () => {
      const aberto = abrir.getAttribute('aria-expanded') !== 'true';
      abrir.setAttribute('aria-expanded', String(aberto));
      caixa.toggleAttribute('data-aberto', aberto);
    });
  }
}

// Tab até uma placa fora da tela: o navegador rolaria a camada de rótulos
// (overflow:hidden) e o palco, desalinhando as placas da cena. Desfaz a
// rolagem e leva a câmera até o nó (sem abrir o painel).
function ligarFoco(c, palco) {
  const camada = c.rotulos.domElement;
  const zerar = (e) => {
    if (e.scrollLeft || e.scrollTop) { e.scrollLeft = 0; e.scrollTop = 0; }
  };
  camada.addEventListener('scroll', () => zerar(camada));
  palco.addEventListener('scroll', () => zerar(palco));
  camada.addEventListener('focusin', (ev) => {
    const rotulo = ev.target.closest && ev.target.closest('.arq-rotulo');
    if (!rotulo || !rotulo.dataset.no) return;
    zerar(camada);
    zerar(palco);
    const r = rotulo.getBoundingClientRect();
    const b = c.renderer.domElement.getBoundingClientRect();
    const dentro = r.left >= b.left && r.top >= b.top && r.right <= b.right && r.bottom <= b.bottom;
    if (dentro) return;
    c.emVisaoGeral = false;
    c.voarPara(enquadramento(c, { tipo: 'no', id: rotulo.dataset.no }));
  });
}

function enquadramento(c, sel) {
  const p = sel.tipo === 'no'
    ? new THREE.Vector3().fromArray(NOS_ARQ[sel.id].posicao)
    : c.enlaces[sel.id].curva.getPointAt(0.5);
  return { alvo: [p.x, 0.5, p.z], posicao: [p.x + 2.5, 5.5, p.z + 7] };
}

// Clique curto (sem arrastar) no canvas: raycast em nós e enlaces.
// Não conhece o painel: só dispara "arq:selecionar" no palco.
function ligarRaycast(c, palco) {
  // Alvos de clique mais grossos (invisíveis) para os tubos finos.
  const alvos = [];
  for (const [id, e] of Object.entries(c.enlaces)) {
    const alvo = new THREE.Mesh(
      new THREE.TubeGeometry(e.curva, 32, 0.28, 6, false),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    alvo.userData.enlace = id;
    c.cena.add(alvo);
    alvos.push(alvo);
  }
  Object.values(c.nos).forEach((n) => n.grupo.traverse((o) => { if (o.isMesh) alvos.push(o); }));

  const canvas = c.renderer.domElement;
  const raio = new THREE.Raycaster();
  let inicio = null;
  canvas.addEventListener('pointerdown', (ev) => { inicio = { x: ev.clientX, y: ev.clientY }; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!inicio || Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 5) return;
    const r = canvas.getBoundingClientRect();
    const ponto = new THREE.Vector2(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1
    );
    raio.setFromCamera(ponto, c.camera);
    const [acerto] = raio.intersectObjects(alvos, false);
    if (!acerto) return;
    const { enlace, no } = acerto.object.userData;
    const detail = enlace ? { tipo: 'enlace', id: enlace } : no ? { tipo: 'no', id: no } : null;
    if (detail) palco.dispatchEvent(new CustomEvent('arq:selecionar', { detail }));
  });
}
