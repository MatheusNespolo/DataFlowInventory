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

// Espelha os tokens IEC 60073 de style.css (:root).
export const COR_ESTADO = {
  'ok':             0x3ddc84, // --led-run
  'atencao':        0xffb020, // --led-warn
  'falha':          0xff4d4f, // --led-fault
  'desconhecido':   0x4aa3ff, // --led-idle
  'sem-dados':      0x858ca3, // --muted
  'sem-telemetria': 0x6b7189,
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
    nos: {}, enlaces: {},
    sujo: true, voo: null, w: 0, h: 0,
    particulasLigadas: !semMovimento,
  };
  c.marcarSujo = () => { c.sujo = true; };
  controles.addEventListener('change', c.marcarSujo);
  controles.addEventListener('start', () => { c.voo = null; }); // o usuário assume a câmera

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
    et.innerHTML = `${h.nome}<br>${h.detalhe}`;
    const obj = new CSS2DObject(et);
    obj.position.set(0, 0.5, 0);
    m.add(obj);
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

  ligarControles(c, palco, semMovimento);
  return c;
}

function ligarControles(c, palco, semMovimento) {
  palco.querySelectorAll('[data-camera]').forEach((b) => {
    b.addEventListener('click', () => c.voarPara(CAMERAS[b.dataset.camera]));
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
