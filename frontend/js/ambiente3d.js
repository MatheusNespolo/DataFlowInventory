// ============================================================
// DATA FLOW INVENTORY — Ambiente 3D compartilhado
// ------------------------------------------------------------
// Esfera com gradiente vertical, pré-filtrada como mapa de ambiente
// (IBL). Usada pelo mímico (diagrama3d.js) e pela arquitetura
// (arquitetura3d.js), para que as duas cenas tenham a mesma luz.
// ============================================================
import * as THREE from '/vendor/three.module.min.js';

export function ambienteGradiente(renderer) {
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
