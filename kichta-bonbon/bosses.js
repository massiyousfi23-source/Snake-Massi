// Les méchants des niveaux 3 et 4, en figurines « bonbon » :
// - Rocky, le chien bouledogue qui jette des os en aboyant ;
// - Pikou, le hérisson qui lance ses piques (boss final).
// Les modèles regardent vers +Z.
import * as THREE from "../vendor/three.module.min.js";
import { candy, canvasTexture } from "./toons.js?v=b4";

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
