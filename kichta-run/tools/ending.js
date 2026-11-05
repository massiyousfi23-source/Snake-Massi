// Cinématique de fin de Kichta Run, rendue image par image (voir render-ending.cjs).
// Kichta fête sa victoire au milieu d'une pluie de croquettes.
import * as THREE from "../../vendor/three.module.min.js";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment } from "../../vendor/three.addons.min.js";
import { animateCat, createCat } from "../cats.js?v=3d3";

const W = 1280;
const H = 720;
const FPS = 30;
export const DURATION = 13;

// Hasard reproductible : la vidéo est identique à chaque rendu
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

function canvasTexture(w, h, paint) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const night = new THREE.Color(0x151a36);
scene.background = night;
scene.fog = new THREE.Fog(night, 7, 22);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.3;
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 80);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.88));
composer.addPass(new OutputPass());

// --- Lumières -----------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x9aaeff, 0x2a2030, 1.2));
const moonLight = new THREE.DirectionalLight(0xcfd8ff, 1.4);
moonLight.position.set(-4, 8, -5);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 25 });
scene.add(moonLight);
const warm = new THREE.SpotLight(0xffc27a, 40, 9, 0.55, 0.6, 1.6);
warm.position.set(1.6, 3.4, 1.2);
warm.target.position.set(0, 0, 0);
warm.castShadow = true;
warm.shadow.mapSize.set(1024, 1024);
scene.add(warm, warm.target);
const glow = new THREE.PointLight(0xffb85c, 1.6, 3.5, 1.5);
glow.position.set(0, 0.25, 0);
scene.add(glow);

// --- Décor : pavés mouillés, façades aux fenêtres allumées, lune -------------
const cobble = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = "#3a3340";
  g.fillRect(0, 0, w, h);
  const size = 32;
  for (let y = 0; y < h; y += size) {
    const off = (y / size) % 2 ? size / 2 : 0;
    for (let x = -size; x < w + size; x += size) {
      const s = 70 + Math.floor(rand() * 30);
      g.fillStyle = `rgb(${s - 8},${s - 14},${s})`;
      g.beginPath();
      g.roundRect(x + off + 2, y + 2, size - 4, size - 4, 7);
      g.fill();
    }
  }
});
cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping;
cobble.repeat.set(8, 8);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: cobble, roughness: 0.3, metalness: 0.2 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function facade(base) {
  const glowC = document.createElement("canvas");
  glowC.width = 256;
  glowC.height = 512;
  const gg = glowC.getContext("2d");
  gg.fillStyle = "#000";
  gg.fillRect(0, 0, 256, 512);
  const map = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,.12)";
    for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 2);
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = 26 + col * 76;
        const y = 30 + row * 78;
        const lit = rand() > 0.4;
        g.fillStyle = "#1c1a24";
        g.fillRect(x - 4, y - 4, 52, 62);
        g.fillStyle = lit ? (rand() > 0.5 ? "#ffd27a" : "#ffb35c") : "#2b3550";
        g.fillRect(x, y, 44, 54);
        if (lit) {
          gg.fillStyle = g.fillStyle;
          gg.fillRect(x, y, 44, 54);
        }
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(x + 20, y, 4, 54);
        g.fillRect(x, y + 25, 44, 4);
      }
    }
  });
  const emissiveMap = new THREE.CanvasTexture(glowC);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.85 });
}
const colors = ["#5b4a6b", "#6b4a4a", "#4a5b6b", "#6b5d4a", "#4f6b5a"];
for (let i = 0; i < 14; i += 1) {
  const a = (i / 14) * Math.PI * 2;
  const r = 6 + rand() * 1.5;
  const h = 4 + rand() * 5;
  const b = new THREE.Mesh(new THREE.BoxGeometry(3, h, 2.4), facade(colors[i % colors.length]));
  b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
  b.lookAt(0, h / 2, 0);
  b.receiveShadow = true;
  scene.add(b);
}
const moon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c4).multiplyScalar(1.5), fog: false }));
moon.position.set(-5, 9, -16);
scene.add(moon);

// --- Kichta ---------------------------------------------------------------------
const kichta = createCat("kichta", { fur: 16 });
kichta.scale.multiplyScalar(1.0);
kichta.traverse((o) => {
  if (o.isMesh && !o.userData.isFurShell) o.castShadow = true;
});
scene.add(kichta);

// --- Croquettes -------------------------------------------------------------------
function kibbleGeometry() {
  const g = new THREE.IcosahedronGeometry(0.035, 1);
  g.scale(1, 0.55, 0.9);
  return g;
}
const kibbleMaterial = new THREE.MeshStandardMaterial({ color: 0xc8762f, roughness: 0.5, emissive: 0x7a3a10, emissiveIntensity: 0.35 });
const PILE = 1400;
const RAIN = 1600;
const N = PILE + RAIN;
const kibbles = new THREE.InstancedMesh(kibbleGeometry(), kibbleMaterial, N);
kibbles.castShadow = true;
kibbles.receiveShadow = true;
kibbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(kibbles);
const shades = [0xb5652a, 0xd48a3e, 0xc87436, 0xe0a04f, 0x9c5523];
const K = [];
const color = new THREE.Color();
for (let i = 0; i < N; i += 1) {
  const pile = i < PILE;
  let p;
  if (pile) {
    // Gros tas de croquettes en dôme
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.85;
    p = new THREE.Vector3(Math.cos(a) * r + 0.1, 0.02 + (1 - (r / 0.85) ** 2) * 0.28 * rand() ** 0.3, Math.sin(a) * r - 0.2);
  } else {
    p = new THREE.Vector3((rand() - 0.5) * 4.5, 3 + rand() * 6, (rand() - 0.5) * 4.5 - 0.2);
  }
  K.push({
    p,
    v: new THREE.Vector3(0, pile ? 0 : -rand() * 0.6, 0),
    rot: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
    spin: new THREE.Vector3((rand() - 0.5) * 8, (rand() - 0.5) * 8, (rand() - 0.5) * 8),
    start: pile ? 0 : rand() * 7.5,
    rest: pile,
  });
  kibbles.setColorAt(i, color.setHex(shades[i % shades.length]));
}
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);

function kick(center, radius, power, dir = null) {
  for (const k of K) {
    const d = k.p.clone().sub(center);
    const dist = d.length();
    if (dist > radius) continue;
    const f = (1 - dist / radius) * power;
    d.y = 0;
    d.normalize();
    if (dir) d.lerp(dir, 0.7).normalize();
    k.v.add(new THREE.Vector3(d.x * f, f * (1.2 + rand()), d.z * f));
    k.spin.set((rand() - 0.5) * 20, (rand() - 0.5) * 20, (rand() - 0.5) * 20);
    k.rest = false;
  }
}

function stepKibble(t, dt) {
  for (const k of K) {
    if (t < k.start) continue;
    if (k.rest) continue;
    k.v.y -= 9.8 * dt;
    k.p.addScaledVector(k.v, dt);
    k.rot.x += k.spin.x * dt;
    k.rot.y += k.spin.y * dt;
    k.rot.z += k.spin.z * dt;
    if (k.p.y < 0.018) {
      k.p.y = 0.018;
      if (Math.abs(k.v.y) < 0.6) {
        k.v.set(0, 0, 0);
        k.spin.set(0, 0, 0);
        k.rest = true;
      } else {
        k.v.y *= -0.35;
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
    const hidden = t < k.start;
    tmpQ.setFromEuler(k.rot);
    tmpM.compose(hidden ? new THREE.Vector3(0, -5, 0) : k.p, tmpQ, one);
    kibbles.setMatrixAt(i, tmpM);
  }
  kibbles.instanceMatrix.needsUpdate = true;
}

// --- Feux d'artifice ---------------------------------------------------------------
const FW = 1800;
const fwPos = new Float32Array(FW * 3);
const fwCol = new Float32Array(FW * 3);
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute("position", new THREE.BufferAttribute(fwPos, 3));
fwGeo.setAttribute("color", new THREE.BufferAttribute(fwCol, 3));
const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
fireworks.frustumCulled = false;
scene.add(fireworks);
const bursts = [
  { t: 9.6, c: new THREE.Vector3(-4.6, 2.6, -0.6), col: [3, 2.2, 0.6] },
  { t: 10.3, c: new THREE.Vector3(-5.0, 3.2, 1.8), col: [2.6, 0.8, 2.4] },
  { t: 11.0, c: new THREE.Vector3(-5.4, 3.6, 0.5), col: [0.9, 2.6, 1.2] },
  { t: 11.6, c: new THREE.Vector3(-4.8, 2.9, 2.6), col: [3, 1.2, 0.5] },
  { t: 12.2, c: new THREE.Vector3(-5.2, 3.4, -1.2), col: [1.2, 1.8, 3] },
];
const fwDirs = [];
for (let i = 0; i < FW; i += 1) {
  const u = rand() * 2 - 1;
  const a = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  fwDirs.push(new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s).multiplyScalar(1.6 + rand() * 0.8));
}
function updateFireworks(t) {
  const per = FW / bursts.length;
  for (let i = 0; i < FW; i += 1) {
    const b = bursts[Math.floor(i / per)];
    const age = t - b.t;
    const j = i * 3;
    if (age < 0 || age > 1.8) {
      fwPos[j + 1] = -50;
      continue;
    }
    const d = fwDirs[i];
    fwPos[j] = b.c.x + d.x * age;
    fwPos[j + 1] = b.c.y + d.y * age - 1.2 * age * age;
    fwPos[j + 2] = b.c.z + d.z * age;
    const fade = Math.max(0, 1 - age / 1.8);
    fwCol[j] = b.col[0] * fade;
    fwCol[j + 1] = b.col[1] * fade;
    fwCol[j + 2] = b.col[2] * fade;
  }
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.color.needsUpdate = true;
}

// --- Chorégraphie de Kichta ---------------------------------------------------------
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const seg = (t, a, b) => ease((t - a) / (b - a));
const PILE_C = new THREE.Vector3(0.1, 0, -0.2);

const faceYaw = (t) => {
  const a = 0.35 + t * 0.12;
  return Math.atan2(-Math.cos(a), Math.sin(a));
};

function choreography(t) {
  // Renvoie position, cap (yaw), roulis, pose, options
  let pos = new THREE.Vector3(0.95, 0, 0.75);
  let yaw = faceYaw(t) + 0.35;
  let roll = 0;
  let pose = "idle";
  let opts = { speed: 1 };
  let headUp = 0;
  if (t < 1.8) {
    headUp = seg(t, 0.2, 1.0) * 0.5;
  } else if (t < 4.4) {
    // Trois petits bonds de joie en tournant sur elle-même
    const k = (t - 1.8) / 2.6;
    const hop = (k * 3) % 1;
    pos.y = Math.sin(hop * Math.PI) * 0.32;
    yaw += Math.floor(k * 3) * 2.1 + ease(hop) * 2.1;
    pose = hop < 0.5 ? "jump" : "fall";
    headUp = 0.25;
  } else if (t < 5.25) {
    // Elle s'élance et plonge dans le tas
    const k = seg(t, 4.4, 5.25);
    pos = new THREE.Vector3(0.95, 0, 0.75).lerp(PILE_C, k);
    pos.y = Math.sin(k * Math.PI) * 0.45;
    yaw = Math.atan2(-(PILE_C.z - 0.75), PILE_C.x - 0.95);
    pose = k < 0.45 ? "run" : "jump";
    opts.speed = 1.4;
  } else if (t < 7.1) {
    // Roule sur le dos dans les croquettes, pattes en l'air
    pos = PILE_C.clone();
    pos.y = 0.12;
    yaw = 0.8 + Math.sin((t - 5.25) * 3) * 0.35;
    roll = seg(t, 5.25, 5.6) * Math.PI * 0.92 + Math.sin((t - 5.25) * 9) * 0.18;
    pose = "run";
    opts.speed = 1.6;
  } else if (t < 7.6) {
    pos = PILE_C.clone();
    yaw = 0.8;
    roll = (1 - seg(t, 7.1, 7.6)) * Math.PI * 0.92;
    pose = "idle";
  } else if (t < 9.4) {
    // Tape dans les croquettes avec la patte
    pos = PILE_C.clone();
    yaw = faceYaw(t) + 0.45 + Math.sin((t - 7.6) * 2.2) * 0.4;
    pose = "idle";
    const s1 = Math.max(0, 1 - Math.abs(t - 8.0) / 0.25);
    const s2 = Math.max(0, 1 - Math.abs(t - 8.8) / 0.25);
    opts.swat = Math.max(s1, s2);
  } else if (t < 10.4) {
    // Court après sa queue
    pos = PILE_C.clone().add(new THREE.Vector3(0.35, 0, 0.35));
    const k = (t - 9.4) / 1.0;
    yaw = 0.8 + k * Math.PI * 4;
    pos.x += Math.sin(k * Math.PI * 4) * 0.12;
    pos.z += Math.cos(k * Math.PI * 4) * 0.12;
    pose = "run";
    opts.speed = 1.5;
  } else {
    // Fière, face à la caméra, sous les feux d'artifice
    pos = PILE_C.clone().add(new THREE.Vector3(0.35, 0, 0.35));
    yaw = faceYaw(t) + 0.2;
    pose = "idle";
    headUp = 0.18;
  }
  return { pos, yaw, roll, pose, opts, headUp };
}

const events = [
  { t: 5.25, done: false, fn: () => kick(PILE_C, 0.9, 2.6) },
  { t: 8.0, done: false, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.25, 0, 0.2)), 0.45, 2.2, new THREE.Vector3(1, 0, 0.3)) },
  { t: 8.8, done: false, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.3, 0, 0.1)), 0.45, 2.2, new THREE.Vector3(0.4, 0, 1)) },
  { t: 9.6, done: false, fn: () => kick(PILE_C.clone().add(new THREE.Vector3(0.35, 0, 0.35)), 0.5, 1.4) },
];

function updateCamera(t, target) {
  const a = 0.35 + t * 0.12;
  const r = 2.5 - seg(t, 9.5, 13) * 0.55;
  const h = 1.05 - seg(t, 9.5, 13) * 0.25;
  camera.position.set(target.x + Math.sin(a) * r, h, target.z + Math.cos(a) * r);
  const look = target.clone().add(new THREE.Vector3(0, 0.35 + seg(t, 9.6, 11) * 0.5, 0));
  camera.lookAt(look);
}

const title = document.querySelector("#title");
let simT = 0;
const DT = 1 / FPS;

window.renderFrame = (frame) => {
  const t = frame / FPS;
  // Simulation des croquettes à pas fixes jusqu'au temps demandé
  while (simT < t) {
    for (const e of events) {
      if (!e.done && simT >= e.t) {
        e.done = true;
        e.fn();
      }
    }
    // Pendant la roulade, Kichta pousse doucement les croquettes autour d'elle
    if (simT > 5.4 && simT < 7.1 && Math.floor(simT * 30) % 6 === 0) kick(PILE_C, 0.4, 0.5);
    stepKibble(simT, DT / 2);
    stepKibble(simT, DT / 2);
    simT += DT;
  }
  uploadKibble(t);
  const c = choreography(t);
  kichta.position.copy(c.pos);
  kichta.rotation.set(0, c.yaw, 0);
  const rig = kichta.userData.rig;
  animateCat(kichta, t, c.pose, c.opts);
  rig.rotation.z += c.roll;
  if (c.roll > 1) rig.position.y += 0.32;
  kichta.userData.head.rotation.x -= c.headUp;
  glow.position.set(c.pos.x, 0.9, c.pos.z);
  updateFireworks(t);
  updateCamera(t, new THREE.Vector3(c.pos.x, 0, c.pos.z));
  const show = seg(t, 10.2, 10.9);
  title.style.opacity = String(show);
  title.style.transform = `translate(-50%, 0) scale(${0.85 + show * 0.15})`;
  composer.render();
  return true;
};

window.ready = true;
