// Événement de Noël : neige qui tombe, flocons à ramasser pendant la course,
// sapins et cadeaux dans le décor, grelots sur la musique et deux récompenses.
// Actif du 1er décembre au 6 janvier (ou avec ?noel dans l'adresse pour tester).
import * as THREE from "../vendor/three.module.min.js";
import { candy } from "./toons.js?v=b8";

export const NOEL_GOALS = [
  { flakes: 40, slot: "hat", id: "noel" },
  { flakes: 120, slot: "hat", id: "renne" },
];

export function isNoel(date = new Date()) {
  if (/[?&]noel\b/.test(location.search)) return true;
  const m = date.getMonth();
  return m === 11 || (m === 0 && date.getDate() <= 6);
}

const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
};

// --- Flocon à ramasser ------------------------------------------------------------------------
const ICE = candy(0xe8f8ff, { emissive: 0x8fd8ff, emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1 });
const ARM = new THREE.CapsuleGeometry(0.06, 0.62, 6, 10);
const TWIG = new THREE.CapsuleGeometry(0.045, 0.2, 4, 8);
export function createFlake() {
  const g = new THREE.Group();
  const star = new THREE.Group();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.z = a;
    arm.add(mesh(ARM, ICE, 0, 0.36, 0));
    for (const s of [-1, 1]) {
      const t = mesh(TWIG, ICE, s * 0.08, 0.5, 0);
      t.rotation.z = -s * 0.8;
      arm.add(t);
    }
    star.add(arm);
  }
  star.add(mesh(new THREE.SphereGeometry(0.13, 16, 10), ICE));
  star.scale.setScalar(0.75);
  g.add(star);
  g.userData.star = star;
  return g;
}

// --- Neige qui tombe autour de la caméra --------------------------------------------------------
export function createSnow(scene, count = 500) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  const grad = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = grad;
  x.fillRect(0, 0, 32, 32);
  const W = 34;
  const H = 16;
  const D = 60;
  const pos = new Float32Array(count * 3);
  const drift = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * W;
    pos[i * 3 + 1] = Math.random() * H;
    pos[i * 3 + 2] = -Math.random() * D;
    drift[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 0.22, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.95 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);
  let t = 0;
  return {
    points,
    /** Les flocons suivent la caméra ; le monde qui défile les fait « reculer ». */
    update(camera, dt, scroll = 0) {
      t += dt;
      const cx = camera.position.x;
      const cz = camera.position.z;
      for (let i = 0; i < count; i += 1) {
        let px = pos[i * 3];
        let py = pos[i * 3 + 1] - dt * (1.1 + (i % 5) * 0.12);
        let pz = pos[i * 3 + 2] + scroll;
        px += Math.sin(t * 0.8 + drift[i]) * dt * 0.4;
        if (py < 0) py += H;
        if (pz > -1.5) pz -= D;
        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
      }
      geo.attributes.position.needsUpdate = true;
      points.position.set(cx, 0, cz);
    },
  };
}

// --- Décor : sapins décorés et cadeaux ---------------------------------------------------------
const BALLS = [0xff3d6e, 0xffd23f, 0x5ad1ff, 0xb48cff, 0xffffff];
export const NOEL_DECOR = {
  xmastree() {
    const g = new THREE.Group();
    const green = candy(0x2fb35a, { roughness: 0.45 });
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 14), candy(0x8a5a2a), 0, 0.3, 0));
    [[1.5, 1.3, 0.9], [1.2, 1.1, 1.7], [0.85, 0.95, 2.4]].forEach(([r, h, y]) => g.add(mesh(new THREE.ConeGeometry(r, h, 22), green, 0, y, 0)));
    for (let i = 0; i < 12; i += 1) {
      const a = i * 2.4;
      const y = 0.6 + (i / 12) * 2.1;
      const r = 1.35 - (i / 12) * 0.95;
      g.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), candy(BALLS[i % BALLS.length], { emissive: BALLS[i % BALLS.length], emissiveIntensity: 0.25 }), Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const star = mesh(new THREE.OctahedronGeometry(0.28), candy(0xffd23f, { emissive: 0xffb000, emissiveIntensity: 0.8, metalness: 0.4 }), 0, 3.05, 0);
    star.scale.set(1, 1.2, 0.5);
    g.add(star);
    g.scale.setScalar(1.25);
    return g;
  },
  gifts() {
    const g = new THREE.Group();
    [[0, 0, 0.9], [1.0, 0.2, 0.65], [0.4, -0.9, 0.55]].forEach(([x, z, s], i) => {
      const box = new THREE.Group();
      const col = [0xff3d6e, 0x5ad1ff, 0xffd23f][i];
      const rib = candy([0xffd23f, 0xffffff, 0xff3d6e][i], { metalness: 0.2 });
      box.add(mesh(new THREE.BoxGeometry(1, 1, 1), candy(col), 0, 0.5, 0));
      box.add(mesh(new THREE.BoxGeometry(1.02, 1.02, 0.16), rib, 0, 0.5, 0), mesh(new THREE.BoxGeometry(0.16, 1.02, 1.02), rib, 0, 0.5, 0));
      for (const s2 of [-1, 1]) {
        const loop = mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), rib, s2 * 0.14, 1.08, 0);
        loop.rotation.y = Math.PI / 2;
        loop.rotation.x = s2 * 0.5;
        box.add(loop);
      }
      box.scale.setScalar(s);
      box.position.set(x, 0, z);
      box.rotation.y = i * 0.6;
      g.add(box);
    });
    return g;
  },
};
