// ============================================================
// DATA FLOW INVENTORY — Diagrama 3D (three.js)
// ------------------------------------------------------------
// Cena WebGL da bancada, servida como aprimoramento progressivo:
// o SVG continua sendo o padrão; se o WebGL e o three.js
// carregarem, a cena 3D assume o lugar dele dentro de .mimic.
// O three.js é servido localmente (frontend/vendor/), então a
// CSP scriptSrc 'self' já cobre este módulo e o import.
// ============================================================
import * as THREE from '/vendor/three.module.min.js';

const mount = document.getElementById('mimic-3d');
const mimic = document.querySelector('.mimic');
if (mount && mimic) init();

function suportaWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function init() {
  if (!suportaWebGL()) return;

  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // contexto negado — mantém o SVG
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0.9, 7.2, 9.8);
  camera.lookAt(0, 0.2, -0.15);

  // --- Ambiente tipo "light probe": esfera com gradiente céu→chão,
  //     pré-filtrada (IBL) para iluminação difusa realista ---
  scene.environment = ambienteGradiente(renderer);

  // --- Luzes ---
  const hemi = new THREE.HemisphereLight(0x9ec3ff, 0x24201c, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe9cf, 2.1);
  key.position.set(-5, 8.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0012;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x8ab0ff, 0.45);
  fill.position.set(6, 3.5, -5);
  scene.add(fill);

  // --- Mundo (recebe o parallax) ---
  const mundo = new THREE.Group();
  scene.add(mundo);

  const CINZA = 0x3a3f4d;
  const corA = 0xe74c3c, corB = 0x2ecc71, corC = 0x3498db;

  // Bancada
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 0.4, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.95, metalness: 0.05 })
  );
  base.position.y = -0.2;
  base.receiveShadow = true;
  mundo.add(base);

  // Esteira principal (ao longo de X)
  const principal = bloco(6.6, 0.42, 1.15, 0x2a8f63, { x: -0.1, y: 0.34, z: 1.0 });
  mundo.add(principal.mesh);

  // Esteiras secundárias A / B / C (ao longo de Z, atrás da principal)
  const secA = bloco(1.15, 0.4, 2.4, CINZA, { x: -2.15, y: 0.33, z: -0.55 });
  const secB = bloco(1.15, 0.4, 2.4, CINZA, { x: 0.0, y: 0.33, z: -0.55 });
  const secC = bloco(1.15, 0.4, 2.4, CINZA, { x: 2.15, y: 0.33, z: -0.55 });
  secA.corLigada = new THREE.Color(corA);
  secB.corLigada = new THREE.Color(corB);
  secC.corLigada = new THREE.Color(corC);
  [secA, secB, secC].forEach((s) => mundo.add(s.mesh));

  // Roda de estoque (fim da principal)
  const roda = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.55, 32),
    new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.5, metalness: 0.5 })
  );
  roda.rotation.z = Math.PI / 2;
  roda.position.set(3.75, 0.42, 1.0);
  roda.castShadow = true;
  mundo.add(roda);

  // Sensores: topo de cada secundária + junção com a principal
  const sensores = {
    topoA: sensor(-2.15, 1.05, -1.65),
    topoB: sensor(0.0, 1.05, -1.65),
    topoC: sensor(2.15, 1.05, -1.65),
    J1: sensor(-2.15, 0.95, 0.55),
    J2: sensor(0.0, 0.95, 0.55),
    J3: sensor(2.15, 0.95, 0.55),
  };
  Object.values(sensores).forEach((s) => mundo.add(s.mesh));

  function bloco(w, h, d, cor, pos) {
    const corBase = new THREE.Color(CINZA);
    const mat = new THREE.MeshStandardMaterial({
      color: corBase.clone(), roughness: 0.55, metalness: 0.35,
      emissive: new THREE.Color(cor), emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return { mesh, mat, corBase, corLigada: new THREE.Color(cor), alvo: 0, atual: 0 };
  }

  function sensor(x, y, z) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2c323c, roughness: 0.35, metalness: 0.25,
      emissive: new THREE.Color(0x33d67f), emissiveIntensity: 0.03,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return { mesh, mat, alvo: 0, atual: 0 };
  }

  // --- Estado compartilhado com app.js ---
  const estado = (window.EstadoDiagrama = window.EstadoDiagrama || { esteiras: {}, sensores: {} });

  // --- Controle do laço de renderização (por sujeira: não desenha à toa) ---
  let sujo = true;
  let visivel = true;
  const relogio = new THREE.Clock();
  function marcarSujo() { sujo = true; }

  // --- Parallax do ponteiro sobre a cena ---
  let alvoRotX = 0, alvoRotY = 0;
  const baseRotX = 0.0;
  if (!semMovimento && window.matchMedia('(hover: hover)').matches) {
    mimic.addEventListener('pointermove', (e) => {
      const r = mimic.getBoundingClientRect();
      alvoRotY = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
      alvoRotX = ((e.clientY - r.top) / r.height - 0.5) * 0.22;
      marcarSujo();
    });
    mimic.addEventListener('pointerleave', () => { alvoRotY = 0; alvoRotX = 0; marcarSujo(); });
  }

  // --- Dimensionamento: casa o buffer com o tamanho exibido a cada
  //     quadro (evita canvas 1x1 quando o mount ainda estava oculto). ---
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  function ajustarTamanho() {
    const w = Math.max(1, Math.round(mount.clientWidth));
    const h = Math.max(1, Math.round(mount.clientHeight));
    if (renderer.domElement.width === w * pr && renderer.domElement.height === h * pr) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    marcarSujo();
  }
  new ResizeObserver(marcarSujo).observe(mount);

  const io = new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    if (visivel) marcarSujo();
  }, { threshold: 0.01 });
  io.observe(mount);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) marcarSujo();
  });

  function passo() {
    if (!visivel || document.hidden) return;

    ajustarTamanho();
    const dt = Math.min(relogio.getDelta(), 0.05);

    // metas a partir do estado
    principal.alvo = estado.esteiras.principal ? 1 : 0;
    secA.alvo = estado.esteiras.secA ? 1 : 0;
    secB.alvo = estado.esteiras.secB ? 1 : 0;
    secC.alvo = estado.esteiras.secC ? 1 : 0;
    sensores.topoA.alvo = estado.sensores.topoA ? 1 : 0;
    sensores.topoB.alvo = estado.sensores.topoB ? 1 : 0;
    sensores.topoC.alvo = estado.sensores.topoC ? 1 : 0;
    sensores.J1.alvo = estado.sensores.J1 ? 1 : 0;
    sensores.J2.alvo = estado.sensores.J2 ? 1 : 0;
    sensores.J3.alvo = estado.sensores.J3 ? 1 : 0;

    let animando = false;
    const aprox = (obj, prop, meta, taxa) => {
      const v = THREE.MathUtils.damp(obj[prop], meta, taxa, dt);
      if (Math.abs(v - obj[prop]) > 1e-4) animando = true;
      obj[prop] = v;
      return v;
    };

    [principal, secA, secB, secC].forEach((b) => {
      const k = aprox(b, 'atual', b.alvo, 6);
      b.mat.emissiveIntensity = 0.03 + k * 0.32;
      b.mat.color.copy(b.corBase).lerp(b.corLigada, b === principal ? k : k * 0.85);
    });
    Object.values(sensores).forEach((s) => {
      const k = aprox(s, 'atual', s.alvo, 8);
      s.mat.emissiveIntensity = 0.03 + k * 1.0;
      s.mesh.scale.setScalar(1 + k * 0.14);
    });

    // parallax
    const rx = THREE.MathUtils.damp(mundo.rotation.x, baseRotX + alvoRotX, 5, dt);
    const ry = THREE.MathUtils.damp(mundo.rotation.y, alvoRotY, 5, dt);
    if (Math.abs(rx - mundo.rotation.x) > 1e-4 || Math.abs(ry - mundo.rotation.y) > 1e-4) animando = true;
    mundo.rotation.x = rx;
    mundo.rotation.y = ry;

    if (sujo || animando) {
      renderer.render(scene, camera);
      sujo = false;
    }
  }
  renderer.setAnimationLoop(passo);

  // --- Ativa a cena 3D (o CSS esconde o SVG) ---
  mimic.classList.add('diag-3d-ativo');

  // Pausa a cena ao ir para #/status; retoma ao voltar
  window.addEventListener('hashchange', () => {
    const ativo = location.hash !== '#/status';
    mount.style.display = ativo ? '' : 'none';
    if (ativo) marcarSujo();
  });
}

// Esfera com gradiente vertical, pré-filtrada como mapa de ambiente (IBL).
function ambienteGradiente(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cena = new THREE.Scene();
  const geo = new THREE.SphereGeometry(60, 40, 24);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
  const pos = geo.attributes.position;
  const cores = [];
  const topo = new THREE.Color(0x93bcff);
  const meio = new THREE.Color(0x2a2f3a);
  const chao = new THREE.Color(0x0b0a08);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 60; // -1..1
    if (y >= 0) c.copy(meio).lerp(topo, y);
    else c.copy(meio).lerp(chao, -y);
    cores.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  cena.add(new THREE.Mesh(geo, mat));
  const tex = pmrem.fromScene(cena, 0.04).texture;
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return tex;
}
