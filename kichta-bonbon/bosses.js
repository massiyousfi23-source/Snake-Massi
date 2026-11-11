// Les méchants des niveaux 3 et 4, en figurines « bonbon » :
// - Rocky, le chien bouledogue qui jette des os en aboyant ;
// - Pikou, le hérisson qui lance ses piques (boss final).
// Les modèles regardent vers +Z.
import * as THREE from "../vendor/three.module.min.js";
import { candy, canvasTexture } from "./toons.js?v=b8";

const SPHERE = new THREE.SphereGeometry(1, 32, 22);
const SMALL = new THREE.SphereGeometry(1, 16, 12);
const CAPSULE = new THREE.CapsuleGeometry(1, 1, 8, 16);
const CONE = new THREE.ConeGeometry(1, 1, 14, 1);

function part(geometry, material, scale, position, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  if (Array.isArray(scale)) m.scale.set(...scale);
  else m.scale.setScalar(scale);
  if (position) m.position.set(...position);
  m.castShadow = shadow;
  return m;
}

function eyeMaterial(iris) {
  const map = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const gr = g.createRadialGradient(cx, cy, 4, cx, cy, 56);
    gr.addColorStop(0, "#120a04");
    gr.addColorStop(0.45, "#120a04");
    gr.addColorStop(0.5, iris);
    gr.addColorStop(1, "#2a1a0a");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, 56, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(cx - 18, cy - 20, 14, 0, Math.PI * 2);
    g.fill();
  });
  return new THREE.MeshPhysicalMaterial({ map, roughness: 0.05, clearcoat: 1 });
}
function addEye(parent, mat, x, y, z, size, turn) {
  const eye = new THREE.Group();
  eye.position.set(x, y, z);
  eye.rotation.y = turn;
  const ball = part(SPHERE, mat, [size * 0.7, size, size], [0, 0, 0], false);
  ball.rotation.y = -Math.PI / 2;
  eye.add(ball);
  parent.add(eye);
  return eye;
}
function brow(parent, mat, x, y, z, angle) {
  const b = part(CAPSULE, mat, [0.022, 0.08, 0.022], [x, y, z], false);
  b.rotation.z = Math.PI / 2 + angle;
  parent.add(b);
  return b;
}

// ---------------------------------------------------------------------------
// Rocky le chien
// ---------------------------------------------------------------------------
export function createDog() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const fur = candy(0xc98a4a);
  const light = candy(0xfff3e2);
  const dark = candy(0x3a2416);
  const red = candy(0xff3d4d);
  const body = new THREE.Group();
  body.position.y = 0.62;
  rig.add(body);
  const torso = part(SPHERE, fur, [0.42, 0.38, 0.55]);
  body.add(torso);
  body.add(part(SPHERE, light, [0.32, 0.3, 0.42], [0, -0.1, 0.06]));
  // Tête carrée de bouledogue
  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.42);
  body.add(head);
  head.add(part(SPHERE, fur, [0.46, 0.4, 0.4]));
  head.add(part(SPHERE, light, [0.3, 0.2, 0.22], [0, -0.1, 0.27]));
  head.add(part(SPHERE, dark, [0.1, 0.07, 0.07], [0, -0.02, 0.47]));
  // Mâchoire qui s'ouvre pour aboyer
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.2, 0.2);
  head.add(jaw);
  jaw.add(part(SPHERE, light, [0.28, 0.1, 0.24], [0, -0.04, 0.08]));
  jaw.add(part(SPHERE, candy(0xb3203a), [0.2, 0.06, 0.18], [0, 0.02, 0.1], false));
  jaw.add(part(SPHERE, candy(0xff7a9a), [0.1, 0.03, 0.12], [0, 0.04, 0.17], false));
  for (const s of [-1, 1]) jaw.add(part(CONE, candy(0xffffff), [0.04, 0.09, 0.04], [s * 0.15, 0.08, 0.22], false));
  const eyeMat = eyeMaterial("#6b3a14");
  const eyes = [addEye(head, eyeMat, -0.17, 0.1, 0.33, 0.1, -0.25), addEye(head, eyeMat, 0.17, 0.1, 0.33, 0.1, 0.25)];
  brow(head, dark, -0.17, 0.23, 0.37, -0.45);
  brow(head, dark, 0.17, 0.23, 0.37, 0.45);
  // Oreilles tombantes
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(s * 0.36, 0.22, 0);
    ear.add(part(SPHERE, dark, [0.1, 0.2, 0.05], [s * 0.04, -0.14, 0]));
    ear.rotation.z = s * 0.4;
    head.add(ear);
    ears.push(ear);
  }
  // Collier à clous
  const collar = part(new THREE.TorusGeometry(0.33, 0.06, 10, 32), red, 1, [0, 0.28, 0.3]);
  collar.rotation.x = Math.PI / 2 - 0.7;
  body.add(collar);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const stud = part(CONE, candy(0xe8eef5, { metalness: 0.8, roughness: 0.2 }), [0.03, 0.08, 0.03], [Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38], false);
    stud.rotation.z = -Math.PI / 2;
    stud.rotation.y = -a;
    const holder = new THREE.Group();
    holder.position.copy(collar.position);
    holder.rotation.x = collar.rotation.x - Math.PI / 2;
    holder.add(stud);
    body.add(holder);
  }
  // Pattes et queue
  const legs = [];
  for (const [x, z, front] of [[-0.24, 0.3, true], [0.24, 0.3, true], [-0.24, -0.32, false], [0.24, -0.32, false]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.48, z);
    leg.add(part(CAPSULE, fur, [0.11, 0.2, 0.11], [0, -0.22, 0]));
    leg.add(part(SPHERE, light, [0.13, 0.08, 0.16], [0, -0.44, 0.04]));
    leg.userData = { front, side: Math.sign(x) };
    rig.add(leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.8, -0.5);
  tail.add(part(CAPSULE, fur, [0.06, 0.12, 0.06], [0, 0.1, 0]));
  rig.add(tail);
  // Étoiles quand il est assommé
  const stars = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const st = part(new THREE.OctahedronGeometry(0.07), candy(0xffe14d, { emissive: 0xffc400, emissiveIntensity: 0.8 }), 1, [Math.cos(i * 1.57) * 0.35, 0, Math.sin(i * 1.57) * 0.35], false);
    stars.add(st);
  }
  stars.position.set(0, 0.42, 0);
  stars.visible = false;
  head.add(stars);
  root.userData = { kind: "dog", rig, body, head, jaw, ears, legs, tail, eyes, stars, flash: [fur] };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return root;
}

/** pose : run, idle, bark, throw, dizzy, buck, tired */
export function animateDog(dog, t, pose = "run", { speed = 1 } = {}) {
  const { rig, body, head, jaw, ears, legs, tail, eyes, stars } = dog.userData;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  const stride = t * 12 * speed;
  legs.forEach((leg) => {
    const { front, side } = leg.userData;
    let a = 0;
    if (pose === "run" || pose === "bark" || pose === "throw") a = Math.sin(stride + (front ? 0 : Math.PI) + (side > 0 ? 0.6 : 0)) * 0.9;
    else if (pose === "buck") a = front ? -0.6 + Math.sin(t * 9) * 0.5 : 0.5;
    else if (pose === "tired") a = front ? -1.45 : 1.45;
    else a = Math.sin(t * 2 + side) * 0.05;
    leg.rotation.x = a;
  });
  let open = 0;
  if (pose === "bark") open = Math.max(0, Math.sin(t * 16)) * 0.55;
  if (pose === "throw") {
    head.rotation.x = -0.5 + Math.sin(t * 10) * 0.2;
    open = 0.35;
  }
  if (pose === "run" || pose === "bark" || pose === "throw") rig.position.y = Math.abs(Math.sin(stride)) * 0.08;
  if (pose === "buck") {
    // Rodéo : il rue et saute dans tous les sens
    const k = t * 4.5;
    rig.rotation.x = Math.sin(k) * 0.45;
    rig.rotation.z = Math.sin(k * 0.5) * 0.15;
    rig.position.y = Math.abs(Math.sin(k)) * 0.45;
    open = Math.max(0, Math.sin(t * 13)) * 0.4;
  }
  if (pose === "tired") {
    rig.position.y = -0.3;
    head.rotation.x = 0.3;
    open = 0.3;
  }
  jaw.rotation.x = open;
  ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 10 + i) * (pose === "idle" ? 0.05 : 0.25)));
  tail.rotation.z = Math.sin(t * 14) * 0.5;
  tail.rotation.x = -0.5;
  stars.visible = pose === "dizzy" || pose === "tired";
  if (pose === "dizzy") head.rotation.z = Math.sin(t * 4) * 0.25;
  stars.rotation.y = t * 4;
  const blink = (t + 1) % 3.1 < 0.12 ? 0.15 : 1;
  eyes.forEach((e) => (e.scale.y = pose === "dizzy" || pose === "tired" ? 0.5 : blink));
}

// ---------------------------------------------------------------------------
// Pikou le hérisson
// ---------------------------------------------------------------------------
export function createHedgehog() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const skin = candy(0x8a5f45);
  const cream = candy(0xf6dcc0);
  const dark = candy(0x22160f);
  const body = new THREE.Group();
  body.position.y = 0.55;
  rig.add(body);
  const back = part(SPHERE, skin, [0.55, 0.5, 0.58]);
  body.add(back);
  body.add(part(SPHERE, cream, [0.42, 0.38, 0.35], [0, -0.08, 0.28]));
  // Museau pointu
  const head = new THREE.Group();
  head.position.set(0, 0.06, 0.42);
  body.add(head);
  const snout = part(CONE, cream, [0.18, 0.4, 0.16], [0, -0.06, 0.18]);
  snout.rotation.x = Math.PI / 2;
  head.add(snout, part(SPHERE, dark, 0.06, [0, -0.06, 0.4]));
  const eyeMat = eyeMaterial("#1a0f08");
  const eyes = [addEye(head, eyeMat, -0.16, 0.12, 0.08, 0.08, -0.35), addEye(head, eyeMat, 0.16, 0.12, 0.08, 0.08, 0.35)];
  const brows = [brow(head, dark, -0.16, 0.24, 0.13, -0.5), brow(head, dark, 0.16, 0.24, 0.13, 0.5)];
  for (const s of [-1, 1]) head.add(part(SPHERE, candy(0xffa8b8), [0.06, 0.035, 0.03], [s * 0.2, -0.04, 0.12], false));
  for (const s of [-1, 1]) body.add(part(SPHERE, skin, [0.08, 0.1, 0.05], [s * 0.3, 0.38, 0.2]));
  // Les piques : chocolat avec la pointe en sucre
  const spikes = new THREE.Group();
  const spikeGeo = new THREE.ConeGeometry(0.05, 0.36, 8);
  spikeGeo.translate(0, 0.18, 0);
  const spikeMats = [candy(0x5a3520), candy(0x7a4a2a)];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 110; i += 1) {
    // Répartition sur l'arrière et le dessus du corps
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(1 - v * 1.25);
    const n = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    if (n.z > 0.45 && n.y < 0.55) continue;
    const pos = new THREE.Vector3(n.x * 0.52, n.y * 0.47, n.z * 0.55);
    const dir = n.clone().add(new THREE.Vector3(0, 0.1, -0.5)).normalize();
    const spike = new THREE.Mesh(spikeGeo, spikeMats[i % 2]);
    spike.position.copy(pos);
    spike.quaternion.setFromUnitVectors(up, dir);
    spike.castShadow = true;
    spike.userData.home = { pos: pos.clone(), quat: spike.quaternion.clone() };
    spikes.add(spike);
  }
  body.add(spikes);
  const legs = [];
  for (const [x, z, front] of [[-0.24, 0.22, true], [0.24, 0.22, true], [-0.24, -0.2, false], [0.24, -0.2, false]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.22, z);
    leg.add(part(CAPSULE, cream, [0.07, 0.08, 0.07], [0, -0.1, 0]));
    leg.add(part(SPHERE, dark, [0.08, 0.05, 0.1], [0, -0.2, 0.03]));
    leg.userData = { front, side: Math.sign(x) };
    rig.add(leg);
    legs.push(leg);
  }
  // Larmes (cinématique)
  const tears = [];
  for (const s of [-1, 1]) {
    const tear = part(SMALL, candy(0x6fd0ff, { transparent: true, opacity: 0.85, roughness: 0.02 }), [0.04, 0.06, 0.04], [s * 0.16, 0.0, 0.14], false);
    tear.visible = false;
    tear.userData.side = s;
    head.add(tear);
    tears.push(tear);
  }
  root.userData = { kind: "hedgehog", rig, body, back, head, eyes, brows, spikes, legs, tears, skin, flash: [skin] };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return root;
}

/** Plus de piques : le hérisson devient tout rose (cinématique). */
export function setBald(hog, bald) {
  hog.userData.skin.color.setHex(bald ? 0xffb3c6 : 0x8a5f45);
}

/** pose : run, idle, throw, hurt, sad */
export function animateHedgehog(hog, t, pose = "idle", { speed = 1 } = {}) {
  const { rig, body, head, eyes, brows, legs, tears } = hog.userData;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  head.rotation.set(0, 0, 0);
  const stride = t * 14 * speed;
  legs.forEach((leg) => {
    const { front, side } = leg.userData;
    leg.rotation.x = pose === "run" || pose === "throw" ? Math.sin(stride + (front ? 0 : Math.PI) + (side > 0 ? 0.5 : 0)) * 1.0 : Math.sin(t * 2 + side) * 0.05;
  });
  if (pose === "run") rig.position.y = Math.abs(Math.sin(stride)) * 0.06;
  if (pose === "throw") {
    // Il se gonfle avant de projeter ses piques
    const puff = 1 + Math.max(0, Math.sin(t * 9)) * 0.12;
    body.scale.set(puff, puff, puff);
  }
  if (pose === "hurt") {
    rig.rotation.z = Math.sin(t * 30) * 0.15;
    rig.position.y = 0.05;
  }
  if (pose === "sad") {
    head.rotation.x = 0.35;
    rig.position.y = -0.04;
  }
  const sadK = pose === "sad" ? 1 : 0;
  brows.forEach((b, i) => (b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * (sadK ? -0.45 : 0.5)));
  tears.forEach((tear, i) => {
    tear.visible = pose === "sad";
    if (tear.visible) {
      const k = (t * 1.3 + i * 0.5) % 1;
      tear.position.set(tear.userData.side * (0.17 + k * 0.03), 0.04 - k * 0.35, 0.13);
      tear.scale.setScalar(0.04 + k * 0.02);
    }
  });
  const blink = (t + 0.5) % 2.9 < 0.12 ? 0.15 : 1;
  eyes.forEach((e) => (e.scale.y = sadK ? 0.75 : blink));
}

// --- Projectiles et accessoires -------------------------------------------------------
export function createBone() {
  const g = new THREE.Group();
  const m = candy(0xfff4e0, { roughness: 0.4 });
  g.add(part(CAPSULE, m, [0.09, 0.42, 0.09], [0, 0, 0]).rotateZ(Math.PI / 2));
  for (const x of [-0.32, 0.32]) for (const y of [-0.08, 0.08]) g.add(part(SMALL, m, 0.12, [x, y, 0]));
  g.scale.setScalar(1.5);
  return g;
}
export function createSpike() {
  const g = new THREE.Group();
  const s = part(CONE, candy(0x5a3520), [0.12, 0.9, 0.12], [0, 0, 0]);
  s.rotation.x = Math.PI / 2;
  g.add(s);
  g.add(part(SMALL, candy(0xfff4e0), 0.06, [0, 0, -0.45]));
  return g;
}
/** Un patin à roulettes (arme secrète de Kichta), à fixer sous chaque patte. */
export function createSkate() {
  const sk = new THREE.Group();
  sk.add(part(new THREE.BoxGeometry(0.17, 0.05, 0.26), candy(0xff3d7a), 1, [0, 0, 0.02]));
  for (const zz of [-0.08, 0.1]) sk.add(part(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), candy(0xffd23f, { emissive: 0xffa000, emissiveIntensity: 0.4 }), 1, [0, -0.04, zz]).rotateZ(Math.PI / 2));
  return sk;
}

// ---------------------------------------------------------------------------
// Chacha la chenille
// ---------------------------------------------------------------------------
export function createCaterpillar() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const green = candy(0x6fd34a);
  const lime = candy(0xb5f06a);
  const yellow = candy(0xffd23f);
  const dark = candy(0x1d2a12);
  const segs = [];
  for (let i = 0; i < 7; i += 1) {
    const seg = new THREE.Group();
    const r = 0.36 - i * 0.025;
    seg.add(part(SPHERE, i % 2 ? lime : green, r, [0, 0, 0]));
    // Points jaunes sur le dos
    for (const s of [-1, 1]) seg.add(part(SMALL, yellow, r * 0.18, [s * r * 0.55, r * 0.7, 0], false));
    // Petites pattes
    for (const s of [-1, 1]) {
      const leg = part(CAPSULE, dark, [0.035, 0.06, 0.035], [s * r * 0.7, -r * 0.75, 0], false);
      leg.userData.side = s;
      seg.add(leg);
    }
    seg.position.set(0, r, -0.12 - i * 0.48);
    rig.add(seg);
    segs.push(seg);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0.35);
  rig.add(head);
  head.add(part(SPHERE, green, [0.42, 0.4, 0.38]));
  const eyeMat = eyeMaterial("#2a6a1a");
  const eyes = [addEye(head, eyeMat, -0.17, 0.08, 0.31, 0.12, -0.3), addEye(head, eyeMat, 0.17, 0.08, 0.31, 0.12, 0.3)];
  const brows = [brow(head, dark, -0.17, 0.25, 0.35, -0.45), brow(head, dark, 0.17, 0.25, 0.35, 0.45)];
  for (const s of [-1, 1]) head.add(part(SPHERE, candy(0xff9bb5), [0.07, 0.04, 0.03], [s * 0.25, -0.1, 0.3], false));
  const mouth = part(new THREE.TorusGeometry(0.07, 0.015, 6, 16, Math.PI), dark, 1, [0, -0.13, 0.37], false);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  const antennae = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(s * 0.14, 0.32, 0.05);
    a.add(part(CAPSULE, dark, [0.02, 0.17, 0.02], [0, 0.17, 0], false));
    a.add(part(SMALL, candy(0xff5fa2), 0.06, [0, 0.38, 0], false));
    a.rotation.z = -s * 0.35;
    head.add(a);
    antennae.push(a);
  }
  const stars = new THREE.Group();
  for (let i = 0; i < 4; i += 1) stars.add(part(new THREE.OctahedronGeometry(0.06), candy(0xffe14d, { emissive: 0xffc400, emissiveIntensity: 0.8 }), 1, [Math.cos(i * 1.57) * 0.32, 0, Math.sin(i * 1.57) * 0.32], false));
  stars.position.y = 0.5;
  stars.visible = false;
  head.add(stars);
  const tears = [];
  for (const s of [-1, 1]) {
    const tear = part(SMALL, candy(0x6fd0ff, { transparent: true, opacity: 0.85, roughness: 0.02 }), [0.04, 0.06, 0.04], [s * 0.17, 0, 0.34], false);
    tear.visible = false;
    tear.userData.side = s;
    head.add(tear);
    tears.push(tear);
  }
  root.userData = { kind: "caterpillar", rig, head, segs, eyes, brows, antennae, stars, tears, flash: [green, lime] };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return root;
}

/** pose : crawl, throw, dizzy, sad, hang (pendue à une ficelle, tête en bas) */
export function animateCaterpillar(cat, t, pose = "crawl", { speed = 1 } = {}) {
  const { rig, head, segs, eyes, antennae, stars, tears, brows } = cat.userData;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  const k = t * 9 * speed;
  segs.forEach((s, i) => {
    const r = 0.36 - i * 0.025;
    // Ondulation de chenille qui avance
    s.position.y = r + (pose === "crawl" || pose === "throw" ? Math.max(0, Math.sin(k - i * 0.9)) * 0.22 : 0);
    s.position.x = pose === "hang" ? Math.sin(t * 3 + i * 0.6) * 0.05 * i : 0;
    s.children.forEach((c) => c.userData.side && (c.rotation.x = Math.sin(k - i) * 0.6));
  });
  head.position.y = 0.62 + (pose === "crawl" ? Math.sin(k) * 0.05 : 0);
  if (pose === "throw") head.rotation.x = -0.5 + Math.sin(t * 10) * 0.15;
  antennae.forEach((a, i) => (a.rotation.x = Math.sin(t * 6 + i) * 0.25));
  stars.visible = pose === "dizzy" || pose === "hang";
  stars.rotation.y = t * 5;
  const sad = pose === "sad" || pose === "hang";
  brows.forEach((b, i) => (b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * (sad ? -0.45 : 0.45)));
  tears.forEach((tear, i) => {
    tear.visible = sad;
    if (tear.visible) {
      const q = (t * 1.3 + i * 0.5) % 1;
      tear.position.set(tear.userData.side * (0.18 + q * 0.03), 0.02 - q * 0.3, 0.34);
    }
  });
  const blink = (t + 0.3) % 3.3 < 0.12 ? 0.15 : 1;
  eyes.forEach((e) => (e.scale.y = pose === "dizzy" ? 0.5 : blink));
}

// ---------------------------------------------------------------------------
// Moumouche la mouche
// ---------------------------------------------------------------------------
export function createFly() {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const shell = candy(0x2a3d52, { metalness: 0.45, roughness: 0.18, clearcoat: 1, sheen: 1, sheenColor: 0x3dffb0 });
  const stripe = candy(0x1a2230, { metalness: 0.3, roughness: 0.25 });
  const body = new THREE.Group();
  body.position.y = 1;
  rig.add(body);
  body.add(part(SPHERE, shell, [0.38, 0.34, 0.36]));
  const abdomen = new THREE.Group();
  abdomen.position.set(0, -0.05, -0.5);
  body.add(abdomen);
  abdomen.add(part(SPHERE, shell, [0.32, 0.28, 0.45]));
  for (let i = 0; i < 3; i += 1) abdomen.add(part(new THREE.TorusGeometry(0.28 - i * 0.04, 0.035, 8, 24), stripe, 1, [0, 0, -0.1 - i * 0.14], false));
  const head = new THREE.Group();
  head.position.set(0, 0.06, 0.38);
  body.add(head);
  head.add(part(SPHERE, shell, [0.3, 0.27, 0.26]));
  // Énormes yeux à facettes
  const facets = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = "#c81e32";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,0,10,.55)";
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < w; x += 10) g.strokeRect(x, y, 10, 10);
    g.fillStyle = "rgba(255,255,255,.95)";
    g.beginPath();
    g.ellipse(w * 0.45, h * 0.35, 16, 12, -0.4, 0, Math.PI * 2);
    g.fill();
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: facets, roughness: 0.1, clearcoat: 1 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = part(SPHERE, eyeMat, [0.2, 0.22, 0.2], [s * 0.2, 0.06, 0.12], false);
    e.rotation.y = s * 0.6 - Math.PI / 2;
    head.add(e);
    eyes.push(e);
  }
  const brows = [brow(head, stripe, -0.2, 0.3, 0.2, -0.5), brow(head, stripe, 0.2, 0.3, 0.2, 0.5)];
  const trunk = part(CAPSULE, stripe, [0.03, 0.08, 0.03], [0, -0.2, 0.2], false);
  trunk.rotation.x = 0.6;
  head.add(trunk, part(SMALL, candy(0xff7aa0), 0.045, [0, -0.29, 0.26], false));
  // Ailes transparentes qui vibrent
  const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.45, roughness: 0.05, iridescence: 1, side: THREE.DoubleSide, depthWrite: false });
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.15, 0.3, -0.05);
    const w = part(SPHERE, wingMat, [0.5, 0.02, 0.22], [s * 0.45, 0, -0.15], false);
    pivot.add(w);
    body.add(pivot);
    wings.push(pivot);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const leg = part(CAPSULE, stripe, [0.025, 0.16, 0.025], [s * 0.25, -0.3, 0.15 - i * 0.18], false);
      leg.rotation.z = s * 0.5;
      body.add(leg);
      legs.push(leg);
    }
  }
  const tears = [];
  for (const s of [-1, 1]) {
    const tear = part(SMALL, candy(0x6fd0ff, { transparent: true, opacity: 0.85, roughness: 0.02 }), [0.035, 0.05, 0.035], [s * 0.2, -0.08, 0.3], false);
    tear.visible = false;
    tear.userData.side = s;
    head.add(tear);
    tears.push(tear);
  }
  root.userData = { kind: "fly", rig, body, head, abdomen, wings, eyes, brows, legs, tears, flash: [shell] };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return root;
}

/** pose : fly, dive, sad (au sol, en pleurs), crawl */
export function animateFly(fly, t, pose = "fly") {
  const { rig, body, head, wings, legs, tears, brows } = fly.userData;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  const flying = pose === "fly" || pose === "dive";
  body.position.y = flying ? 1 + Math.sin(t * 7) * 0.08 : 0.42;
  if (pose === "dive") body.rotation.x = 0.5;
  wings.forEach((w, i) => {
    w.rotation.z = flying ? Math.sin(t * 90 + i * Math.PI) * 0.6 : (i ? -1 : 1) * 0.2;
  });
  legs.forEach((l, i) => (l.rotation.x = pose === "crawl" ? Math.sin(t * 14 + i) * 0.5 : flying ? 0.4 : Math.sin(t * 20 + i) * 0.4));
  head.rotation.x = pose === "sad" ? 0.3 : 0;
  const sad = pose === "sad";
  brows.forEach((b, i) => (b.rotation.z = Math.PI / 2 + (i ? 1 : -1) * (sad ? -0.45 : 0.5)));
  tears.forEach((tear, i) => {
    tear.visible = sad;
    if (tear.visible) {
      const q = (t * 1.4 + i * 0.5) % 1;
      tear.position.set(tear.userData.side * (0.2 + q * 0.03), -0.06 - q * 0.3, 0.3);
    }
  });
}

/** Une pomme qui roule (lancée par Chacha) et un sac-poubelle (lâché par Moumouche). */
export function createApple() {
  const g = new THREE.Group();
  g.add(part(SPHERE, candy(0xff3b3b), [0.42, 0.4, 0.42], [0, 0.42, 0]));
  g.add(part(CAPSULE, candy(0x6b3a1a), [0.03, 0.08, 0.03], [0, 0.88, 0]));
  const leaf = part(SPHERE, candy(0x5ccc3a), [0.12, 0.02, 0.06], [0.1, 0.86, 0]);
  leaf.rotation.z = 0.4;
  g.add(leaf);
  // Petit trou de chenille
  g.add(part(SMALL, candy(0x5a2a10), 0.07, [0.2, 0.55, 0.32], false));
  return g;
}
export function createTrashBag() {
  const g = new THREE.Group();
  const m = candy(0x2a2a36, { roughness: 0.15 });
  g.add(part(SPHERE, m, [0.55, 0.45, 0.5], [0, 0.45, 0]));
  g.add(part(CONE, m, [0.18, 0.3, 0.18], [0, 0.95, 0]));
  g.add(part(new THREE.TorusGeometry(0.1, 0.03, 8, 16), candy(0xffd23f), 1, [0, 0.85, 0], false).rotateX(Math.PI / 2));
  // Une arête de poisson qui dépasse
  const bone = part(CAPSULE, candy(0xfff4e0), [0.02, 0.25, 0.02], [0.25, 0.8, 0.2], false);
  bone.rotation.z = -0.8;
  g.add(bone);
  return g;
}

// Pelote de laine que Pucci fait rouler (phase 1)
let yarnTex = null;
export function createYarn() {
  yarnTex =
    yarnTex ||
    canvasTexture(128, 64, (c, w, h) => {
      c.fillStyle = "#ff7fb5";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#ffc2dc";
      c.lineWidth = 3;
      for (let i = -h; i < w; i += 9) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + h, h);
        c.stroke();
      }
      c.strokeStyle = "#e0559a";
      c.lineWidth = 2;
      for (let i = 0; i < w + h; i += 13) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i - h, h);
        c.stroke();
      }
    });
  const g = new THREE.Group();
  const roll = new THREE.Group();
  roll.position.y = 0.5;
  roll.add(part(SPHERE, candy(0xffffff, { map: yarnTex, roughness: 0.75, clearcoat: 0.1 }), 0.5, [0, 0, 0]));
  g.add(roll);
  // Le bout de fil qui traîne derrière
  const tail = part(CAPSULE, candy(0xff7fb5), [0.035, 0.35, 0.035], [0, 0.05, -0.55], false);
  tail.rotation.x = Math.PI / 2;
  g.add(tail);
  g.userData.roll = roll;
  return g;
}

// Robot aspirateur sur lequel Pucci fonce (phase 3)
export function createVacuumRide() {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(1, 1, 1, 32), candy(0x2a2a36, { metalness: 0.3 }), [1.25, 0.42, 1.25], [0, 0.21, 0]));
  g.add(part(new THREE.CylinderGeometry(1, 1, 1, 32), candy(0x5ad1ff, { emissive: 0x5ad1ff, emissiveIntensity: 0.8 }), [0.45, 0.06, 0.45], [0, 0.44, -0.55], false));
  const light = part(new THREE.BoxGeometry(1, 1, 1), candy(0xff3d4d, { emissive: 0xff3d4d, emissiveIntensity: 1.2 }), [0.8, 0.1, 0.12], [0, 0.26, 1.2], false);
  g.add(light);
  // Brosses latérales qui tournent
  const brushes = [-0.85, 0.85].map((x) => {
    const b = new THREE.Group();
    b.position.set(x, 0.04, 0.85);
    for (let i = 0; i < 3; i += 1) {
      const s = part(CAPSULE, candy(0xffd23f), [0.03, 0.3, 0.03], [0, 0, 0], false);
      s.rotation.set(Math.PI / 2, 0, (i * Math.PI * 2) / 3);
      s.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.2, 0, Math.sin((i * Math.PI * 2) / 3) * 0.2);
      b.add(s);
    }
    g.add(b);
    return b;
  });
  g.userData.light = light;
  g.userData.brushes = brushes;
  return g;
}
