// Cinématique de fin, style bonbon, rendue image par image (voir le script de rendu).
// Kichta, avec le même modèle 3D que dans le jeu, fête sa victoire au milieu d'une
// avalanche de croquettes ; Pucci boude dans un coin, avec béquilles et bandages.
import * as THREE from "../../vendor/three.module.min.js";
import { createWorld } from "../world.js?v=b5";
import { createToon, dressToon, animateToon, addInjuries, candy, canvasTexture } from "../toons.js?v=b5";

const W = 1280;
const H = 720;
const FPS = 30;
const canvas = document.querySelector("#scene");
const world = createWorld(canvas);
world.setQuality(0);
world.resize(W, H);
world.setBiome(0, true);
world.clearDecor(0);
const { scene, camera } = world;

// --- Kichta, couronnée --------------------------------------------------------------
const kichta = createToon("kichta");
dressToon(kichta, { hat: "couronne", neck: "noeudpap" });
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);

// --- Pucci dans son coin, blessée -------------------------------------------------------
const pucci = createToon("pucci");
addInjuries(pucci);
pucci.scale.setScalar(1.05);
pucci.position.set(-3.1, 0, -1.6);
pucci.rotation.y = 0.75;
pucci.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(pucci);
// Petit nuage de pluie au-dessus de Pucci
const rainCloud = new THREE.Group();
const greyCloud = candy(0x9a93a8, { roughness: 0.6, clearcoat: 0.2 });
for (let i = 0; i < 5; i += 1) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.28 + (i % 2) * 0.08, 16, 12), greyCloud);
  s.position.set((i - 2) * 0.24, (i % 2) * 0.08, (i % 3) * 0.08);
  rainCloud.add(s);
}
rainCloud.position.set(-3.1, 2.55, -1.6);
scene.add(rainCloud);
const DROPS = 40;
const dropGeo = new THREE.BufferGeometry();
const dropPos = new Float32Array(DROPS * 6);
dropGeo.setAttribute("position", new THREE.BufferAttribute(dropPos, 3));
const drops = new THREE.LineSegments(dropGeo, new THREE.LineBasicMaterial({ color: 0x7fc8ff, transparent: true, opacity: 0.8 }));
drops.frustumCulled = false;
scene.add(drops);
const dropSeeds = Array.from({ length: DROPS }, () => ({ x: (Math.random() - 0.5) * 1.1, z: (Math.random() - 0.5) * 0.5, p: Math.random() }));

// --- Croquettes (bonbons vernis) --------------------------------------------------------
const kibbleGeo = new THREE.IcosahedronGeometry(0.06, 1);
kibbleGeo.scale(1, 0.6, 0.9);
const kibbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
const PILE = 1300;
const RAIN = 1500;
const N = PILE + RAIN;
const kibbles = new THREE.InstancedMesh(kibbleGeo, kibbleMat, N);
kibbles.castShadow = true;
kibbles.receiveShadow = true;
kibbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(kibbles);
const shades = [0xc8742f, 0xe0923f, 0xb45f24, 0xf0b050, 0xffc21a, 0xd9823a];
const PILE_C = new THREE.Vector3(0.4, 0, -0.6);
const K = [];
const col = new THREE.Color();
for (let i = 0; i < N; i += 1) {
  const pile = i < PILE;
  let p;
  if (pile) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 1.25;
    p = new THREE.Vector3(PILE_C.x + Math.cos(a) * r, 0.04 + (1 - (r / 1.25) ** 2) * 0.45 * Math.random() ** 0.3, PILE_C.z + Math.sin(a) * r);
  } else {
    p = new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 7, (Math.random() - 0.5) * 5 - 0.6);
  }
  K.push({
    p,
    v: new THREE.Vector3(0, pile ? 0 : -Math.random(), 0),
    rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
    start: pile ? 0 : Math.random() * 8,
    rest: pile,
  });
  kibbles.setColorAt(i, col.setHex(shades[i % shades.length]));
}
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const hiddenPos = new THREE.Vector3(0, -9, 0);
function kick(center, radius, power, dir = null) {
  for (const k of K) {
    const d = k.p.clone().sub(center);
    const dist = d.length();
    if (dist > radius) continue;
    const f = (1 - dist / radius) * power;
    d.y = 0;
    d.normalize();
    if (dir) d.lerp(dir, 0.7).normalize();
    k.v.add(new THREE.Vector3(d.x * f, f * (1.1 + Math.random()), d.z * f));
    k.spin.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
    k.rest = false;
  }
}
function stepKibble(t, dt) {
  for (const k of K) {
    if (t < k.start || k.rest) continue;
    k.v.y -= 9.8 * dt;
    k.p.addScaledVector(k.v, dt);
    k.rot.x += k.spin.x * dt;
    k.rot.y += k.spin.y * dt;
    k.rot.z += k.spin.z * dt;
    if (k.p.y < 0.03) {
      k.p.y = 0.03;
      if (Math.abs(k.v.y) < 0.7) {
        k.v.set(0, 0, 0);
        k.spin.set(0, 0, 0);
        k.rest = true;
      } else {
        k.v.y *= -0.38;
        k.v.x *= 0.6;
        k.v.z *= 0.6;
        k.spin.multiplyScalar(0.6);
      }
    }
  }
}
function uploadKibble(t) {
  for (let i = 0; i < N; i += 1) {
    const k = K[i];
    tmpQ.setFromEuler(k.rot);
    tmpM.compose(t < k.start ? hiddenPos : k.p, tmpQ, one);
    kibbles.setMatrixAt(i, tmpM);
  }
  kibbles.instanceMatrix.needsUpdate = true;
}

// --- Feux d'artifice ----------------------------------------------------------------------
const dot = canvasTexture(64, 64, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,.8)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
});
const FW = 2000;
const fwPos = new Float32Array(FW * 3);
const fwCol = new Float32Array(FW * 3);
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3));
fwGeo.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.35, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
fireworks.frustumCulled = false;
scene.add(fireworks);
const bursts = [
  { t: 9.8, c: new THREE.Vector3(-3, 6.5, -9), col: [2.4, 0.8, 1.6] },
  { t: 10.4, c: new THREE.Vector3(3.2, 7.2, -10), col: [2.4, 2, 0.5] },
  { t: 11.0, c: new THREE.Vector3(0.2, 8, -11), col: [0.7, 2.2, 1.2] },
  { t: 11.6, c: new THREE.Vector3(-4.2, 7.4, -10), col: [0.8, 1.6, 2.6] },
  { t: 12.2, c: new THREE.Vector3(4, 6.4, -9), col: [2.6, 1, 0.5] },
];
const fwDirs = Array.from({ length: FW }, () => {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s).multiplyScalar(2.6 + Math.random());
});
function updateFireworks(t) {
  const per = FW / bursts.length;
  for (let i = 0; i < FW; i += 1) {
    const b = bursts[Math.floor(i / per)];
    const age = t - b.t;
    const j = i * 3;
    if (age < 0 || age > 2) {
      fwPos[j + 1] = -99;
      continue;
    }
    const d = fwDirs[i];
    fwPos[j] = b.c.x + d.x * age;
    fwPos[j + 1] = b.c.y + d.y * age - 1.3 * age * age;
    fwPos[j + 2] = b.c.z + d.z * age;
    const f = Math.max(0, 1 - age / 2);
    fwCol[j] = b.col[0] * f;
    fwCol[j + 1] = b.col[1] * f;
    fwCol[j + 2] = b.col[2] * f;
  }
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.color.needsUpdate = true;
}

// --- Chorégraphie de Kichta -------------------------------------------------------------------
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const seg = (t, a, b) => ease((t - a) / (b - a));
const START = new THREE.Vector3(1.5, 0, 1.4);
function choreo(t) {
  let pos = START.clone();
  let yaw = 0.25; // face à la caméra
  let roll = 0;
  let pose = "idle";
  let flip = 0;
  let headUp = 0;
  let speed = 1;
  if (t < 1.9) {
    headUp = seg(t, 0.2, 1.0) * 0.55;
    pose = t > 1.2 ? "win" : "idle";
  } else if (t < 4.3) {
    // Trois bonds de joie, le dernier avec un salto
    const k = (t - 1.9) / 2.4;
    const hop = (k * 3) % 1;
    const n = Math.floor(k * 3);
    pos.y = Math.sin(hop * Math.PI) * (n === 2 ? 1.1 : 0.5);
    yaw = 0.25 + n * 2.1 + ease(hop) * 2.1;
    pose = hop < 0.5 ? "jump" : "fall";
    if (n === 2) flip = ease(hop);
  } else if (t < 5.2) {
    // Elle s'élance et plonge dans le tas
    const k = seg(t, 4.3, 5.2);
    pos = START.clone().lerp(PILE_C, k);
    pos.y = Math.sin(k * Math.PI) * 0.8;
    yaw = Math.atan2(PILE_C.x - START.x, PILE_C.z - START.z);
    pose = k < 0.4 ? "run" : "jump";
    speed = 1.4;
  } else if (t < 7.1) {
    // Roule sur le dos dans les croquettes, pattes en l'air
    pos = PILE_C.clone();
    pos.y = 0.15;
    yaw = 0.6 + Math.sin((t - 5.2) * 3) * 0.4;
    roll = seg(t, 5.2, 5.55) * Math.PI * 0.95 + Math.sin((t - 5.2) * 9) * 0.2;
    pose = "run";
    speed = 1.6;
  } else if (t < 7.6) {
    pos = PILE_C.clone();
    yaw = 0.6;
    roll = (1 - seg(t, 7.1, 7.6)) * Math.PI * 0.95;
  } else if (t < 9.3) {
    // Coups de patte dans les croquettes
    pos = PILE_C.clone();
    yaw = 0.5 + Math.sin((t - 7.6) * 2.2) * 0.5;
    pose = Math.abs(t - 8.0) < 0.25 || Math.abs(t - 8.8) < 0.25 ? "throw" : "idle";
  } else if (t < 10.3) {
    // Elle court après sa queue
    const k = (t - 9.3) / 1;
    pos = PILE_C.clone().add(new THREE.Vector3(0.5 + Math.sin(k * Math.PI * 4) * 0.25, 0, 0.6 + Math.cos(k * Math.PI * 4) * 0.25));
    yaw = 0.5 + k * Math.PI * 4;
    pose = "run";
    speed = 1.5;
  } else {
    // Fière, couronnée, sous les feux d'artifice
    pos = PILE_C.clone().add(new THREE.Vector3(0.5, 0, 0.6));
    yaw = 0.15;
    pose = "win";
    headUp = 0.15;
  }
  return { pos, yaw, roll, pose, flip, headUp, speed };
}
const events = [
  { t: 5.2, fn: () => kick(PILE_C, 1.3, 3.4) },
  { t: 8.0, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.35, 0, 0.3)), 0.6, 2.8, new THREE.Vector3(1, 0, 0.4)) },
  { t: 8.8, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.3, 0, 0.35)), 0.6, 2.8, new THREE.Vector3(-0.3, 0, 1)) },
  { t: 9.5, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.5, 0, 0.6)), 0.7, 1.8) },
].map((e) => ({ ...e, done: false }));

// Caméra : plans successifs
function shot(t, c) {
  const target = new THREE.Vector3(c.pos.x, 0.7 + Math.max(0, c.pos.y) * 0.5, c.pos.z);
  let eye;
  if (t < 4.3) {
    const a = 0.25 + t * 0.06;
    eye = target.clone().add(new THREE.Vector3(Math.sin(a) * 4.2, 1.6, Math.cos(a) * 4.2));
  } else if (t < 7.6) {
    const a = 0.6 + (t - 4.3) * 0.12;
    eye = target.clone().add(new THREE.Vector3(Math.sin(a) * 3.6, 2.2, Math.cos(a) * 3.6));
  } else if (t < 9.3) {
    // Plan large : on découvre Pucci dans son coin
    eye = new THREE.Vector3(1.6, 2.2, 5.4);
    target.set(-0.8, 0.8, -0.8);
  } else if (t < 11.2) {
    const a = 0.2 + (t - 9.3) * 0.08;
    eye = target.clone().add(new THREE.Vector3(Math.sin(a) * 4.5, 1.5, Math.cos(a) * 4.5));
    target.y += seg(t, 9.6, 10.8) * 1.4;
  } else {
    // Gros plan sur Pucci qui soupire, puis retour sur Kichta
    const k = seg(t, 11.2, 11.6);
    const back = seg(t, 12.3, 12.9);
    const pucciEye = new THREE.Vector3(-1.4, 1.3, 0.6);
    const pucciLook = new THREE.Vector3(-3.1, 0.8, -1.6);
    const kEye = target.clone().add(new THREE.Vector3(1.2, 1.6, 4.6));
    const kLook = target.clone().add(new THREE.Vector3(-0.6, 1.0, 0));
    eye = pucciEye.clone().lerp(kEye, back);
    target.copy(pucciLook.clone().lerp(kLook, back));
    eye.lerp(new THREE.Vector3(1.6, 2.2, 5.4), 1 - k);
  }
  camera.position.copy(eye);
  camera.lookAt(target);
  camera.fov = 45;
  camera.updateProjectionMatrix();
}

const title = document.querySelector("#title");
let simT = 0;
const DT = 1 / FPS;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  while (simT < t) {
    for (const e of events) {
      if (!e.done && simT >= e.t) {
        e.done = true;
        e.fn();
      }
    }
    if (simT > 5.35 && simT < 7.1 && Math.floor(simT * 30) % 6 === 0) kick(PILE_C, 0.55, 0.7);
    stepKibble(simT, DT / 2);
    stepKibble(simT, DT / 2);
    simT += DT;
  }
  uploadKibble(t);
  world.update(DT, t, { playerX: 0, playerY: 0, playerZ: 0, speed: 0, mode: "menu", fly: false });
  const c = choreo(t);
  kichta.position.copy(c.pos);
  kichta.rotation.set(0, c.yaw, 0);
  animateToon(kichta, t, c.pose, { speed: c.speed, flip: c.flip });
  kichta.userData.rig.rotation.z += c.roll;
  if (c.roll > 1) kichta.userData.rig.position.y += 0.45;
  kichta.userData.head.rotation.x -= c.headUp;
  // Pucci : assise sur ses béquilles, elle boude, soupire et secoue la tête
  animateToon(pucci, t, "idle");
  const sigh = Math.max(0, Math.sin((t - 11.3) * 2.2)) * (t > 11.3 && t < 12.7 ? 1 : 0);
  pucci.userData.head.rotation.x = 0.45 - sigh * 0.25;
  pucci.userData.head.rotation.y = Math.sin(t * 1.3) * 0.2 + (t > 11.4 && t < 12.4 ? Math.sin(t * 9) * 0.35 : 0);
  pucci.userData.rig.position.y = -0.02 - sigh * 0.04;
  pucci.userData.tail.forEach((s, i) => (s.rotation.x = i === 0 ? -0.2 : 0.05));
  dropSeeds.forEach((d, i) => {
    d.p = (d.p + DT * 1.6) % 1;
    const y = 2.4 - d.p * 2.2;
    dropPos.set([rainCloud.position.x + d.x, y, rainCloud.position.z + d.z, rainCloud.position.x + d.x, y - 0.16, rainCloud.position.z + d.z], i * 6);
  });
  dropGeo.attributes.position.needsUpdate = true;
  rainCloud.position.y = 2.55 + Math.sin(t * 2) * 0.05;
  updateFireworks(t);
  if (t > 9.8 && Math.floor(t * 30) % 15 === 0) world.confetti(c.pos.x, 3, c.pos.z, 30);
  shot(t, c);
  const show = seg(t, 10.0, 10.6) * (1 - seg(t, 11.1, 11.4)) + seg(t, 12.5, 12.9);
  title.style.opacity = String(show);
  title.style.transform = `translate(-50%, 0) scale(${0.85 + show * 0.15})`;
  world.render();
  return true;
};
window.ready = true;
