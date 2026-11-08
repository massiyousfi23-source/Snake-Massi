// Cinématique du niveau 4 (fin du jeu) : Kichta arrache les piques de Pikou,
// en fait des brochettes de pâtée et les savoure devant le hérisson désemparé.
import * as THREE from "../../vendor/three.module.min.js";
import { createWorld } from "../world.js?v=b7";
import { createToon, dressToon, animateToon, candy } from "../toons.js?v=b7";
import { createHedgehog, animateHedgehog, createSkate } from "../bosses.js?v=b7";
import { texts, seg, lerp, FPS, W, H, makePateeChunk } from "./cine-kit.js?v=b7";

const world = createWorld(document.querySelector("#scene"));
world.setQuality(0);
world.resize(W, H);
world.setBiome(0, true);
world.clearDecor(0);
const { scene, camera } = world;
const ui = texts();

// --- Pikou ---------------------------------------------------------------------------------
const hog = createHedgehog();
hog.scale.setScalar(1.7);
hog.position.set(-1.5, 0, -1.4);
hog.rotation.y = 0.65;
scene.add(hog);
const spikes = [...hog.userData.spikes.children];
const skinFrom = new THREE.Color(0x8a5f45);
const skinTo = new THREE.Color(0xffb3c6);

// --- Kichta, couronnée et en patins -------------------------------------------------------------
const kichta = createToon("kichta");
dressToon(kichta, { hat: "champion" });
kichta.userData.legs.forEach((leg) => {
  const s = createSkate();
  s.position.set(0, -0.37, 0.03);
  leg.add(s);
});
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);

// --- Le barbecue en bonbon -------------------------------------------------------------------
const grill = new THREE.Group();
grill.position.set(1.7, 0, -0.6);
scene.add(grill);
grill.add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.7, 28), candy(0xff5fa2)).translateY(0.35));
grill.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 32), candy(0xffffff)).rotateX(Math.PI / 2).translateZ(-0.72));
for (let i = 0; i < 3; i += 1) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), candy(0xffffff));
  const a = (i / 3) * Math.PI * 2;
  leg.position.set(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
  grill.add(leg);
}
const coals = [];
for (let i = 0; i < 12; i += 1) {
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: 0xff5a1f, emissiveIntensity: 1.6 }));
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * 0.45;
  c.position.set(Math.cos(a) * r, 0.72, Math.sin(a) * r);
  grill.add(c);
  coals.push(c);
}
for (let i = -3; i <= 3; i += 1) grill.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3, 6), candy(0xdfe4ec, { metalness: 0.8 })).rotateZ(Math.PI / 2).translateX(0.82).translateZ(i * 0.17));
const fire = new THREE.PointLight(0xff8a3d, 0, 3, 1.5);
fire.position.set(0, 1, 0);
grill.add(fire);

// Brochettes : une pique de Pikou + des morceaux de pâtée
const spikeGeo = spikes[0].geometry;
function makeSkewer() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(spikeGeo, candy(0x5a3520));
  stick.scale.set(1.6, 2.6, 1.6);
  g.add(stick);
  const chunks = [];
  for (let i = 0; i < 4; i += 1) {
    const c = makePateeChunk(candy, 0.075);
    c.position.y = 0.16 + i * 0.16;
    g.add(c);
    chunks.push(c);
  }
  g.userData.chunks = chunks;
  return g;
}
const skewers = [0, 1, 2].map((i) => {
  const s = makeSkewer();
  s.position.set(grill.position.x - 0.4 + i * 0.4, 0.95, grill.position.z);
  s.rotation.set(Math.PI / 2, 0, 0.1);
  s.visible = false;
  scene.add(s);
  return s;
});
// La brochette que Kichta mange
const held = makeSkewer();
held.visible = false;
const rightFront = kichta.userData.legs.find((l) => l.userData.front && l.userData.side > 0);
rightFront.add(held);
held.position.set(0, -0.32, 0.08);
held.rotation.set(-0.6, 0, 0);
held.scale.setScalar(0.85);

// --- Piques arrachées : elles volent vers un tas --------------------------------------------------
const PILE = new THREE.Vector3(-2.6, 0, 0.4);
const flying = [];
const pileGroup = new THREE.Group();
scene.add(pileGroup);
const pluckStart = 1.9;
const pluckEnd = 5.9;
const pluckTime = spikes.map((_, i) => pluckStart + (i / spikes.length) * (pluckEnd - pluckStart));
let plucked = 0;
function pluck(spike, time) {
  spike.updateWorldMatrix(true, false);
  const from = new THREE.Vector3().setFromMatrixPosition(spike.matrixWorld);
  spike.visible = false;
  const m = new THREE.Mesh(spikeGeo, spike.material);
  m.scale.setScalar(1.7);
  m.position.copy(from);
  scene.add(m);
  const to = PILE.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.5));
  flying.push({ m, from, to, start: time, spin: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9) });
  world.burst(from.x, from.y, from.z, 0xffffff, 3, 2);
}

const DT = 1 / FPS;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  world.update(DT, t, { playerX: 0, playerY: 0, playerZ: 0, speed: 0, mode: "menu", fly: false });

  // Arracher les piques une à une
  while (plucked < spikes.length && t >= pluckTime[plucked]) {
    pluck(spikes[plucked], pluckTime[plucked]);
    plucked += 1;
  }
  for (let i = flying.length - 1; i >= 0; i -= 1) {
    const f = flying[i];
    const k = Math.min(1, (t - f.start) / 0.55);
    f.m.position.lerpVectors(f.from, f.to, k);
    f.m.position.y += Math.sin(k * Math.PI) * 1.2;
    f.m.rotation.set(f.spin.x * k, f.spin.y * k, f.spin.z * k);
    if (k >= 1) {
      f.m.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.5, Math.random() * 6, 0);
      flying.splice(i, 1);
    }
  }
  const bald = plucked / spikes.length;
  hog.userData.skin.color.lerpColors(skinFrom, skinTo, bald);
  let hogPose = "hurt";
  if (t > 6) hogPose = "sad";
  animateHedgehog(hog, t, hogPose);
  if (hogPose === "hurt") hog.userData.rig.rotation.z *= 0.4 + (t > pluckStart ? 0.8 : 0);

  // --- Kichta ----------------------------------------------------------------------------------
  let pose = "idle";
  const pos = new THREE.Vector3();
  let yaw = 0;
  if (t < 1.8) {
    // Elle arrive en glissant sur ses patins
    const k = seg(t, 0, 1.6);
    pos.set(lerp(3.4, -0.05, k), 0, lerp(1.6, -0.55, k));
    yaw = -2.0;
    pose = "slide";
    if (t > 1.3) pose = "idle";
    if (Math.floor(t * 30) % 3 === 0 && t < 1.6) world.burst(pos.x, 0.05, pos.z, 0xffd23f, 3, 1.5);
  } else if (t < 6.1) {
    pos.set(-0.05, 0, -0.55);
    yaw = -2.0;
    pose = "throw";
  } else if (t < 8.4) {
    // Elle prépare les brochettes au barbecue
    const k = seg(t, 6.1, 6.9);
    pos.set(lerp(-0.05, 1.7, k), 0, lerp(-0.55, 0.55, k));
    yaw = lerp(-2.0, Math.PI, k);
    pose = k < 1 ? "run" : "idle";
  } else {
    // Elle se régale devant Pikou
    pos.set(0.6, 0, 0.1);
    yaw = 0.25;
    pose = "idle";
  }
  kichta.position.copy(pos);
  kichta.rotation.set(0, yaw, 0);
  animateToon(kichta, t, pose, { speed: 1 });
  // Brochettes sur le grill puis dans la patte
  skewers.forEach((s, i) => {
    s.visible = t > 6.3 && !(i === 1 && t > 8.4);
    s.rotation.y = t * 1.5 + i;
  });
  fire.intensity = t > 6 ? 3 + Math.sin(t * 20) * 0.6 : 0;
  coals.forEach((c, i) => (c.material.emissiveIntensity = 1.2 + Math.sin(t * 9 + i) * 0.5));
  if (t > 6.3 && frame % 2 === 0) world.burst(grill.position.x + (Math.random() - 0.5) * 0.8, 1.1, grill.position.z + (Math.random() - 0.5) * 0.5, Math.random() < 0.3 ? 0xff8a3d : 0xd8d0e0, 2, 0.8);
  held.visible = t > 8.4;
  if (held.visible) {
    rightFront.rotation.x = -1.7 + Math.sin(t * 6) * 0.1;
    const bites = Math.min(4, Math.floor((t - 8.9) / 0.7) + 1);
    held.userData.chunks.forEach((c, i) => (c.visible = i >= Math.max(0, bites)));
    const biting = (t - 8.9) % 0.7 < 0.2 && t > 8.9 && t < 11.7;
    kichta.userData.head.rotation.x += biting ? 0.35 : 0;
    if (biting && frame % 2 === 0) world.burst(pos.x + 0.2, 1.1, pos.z + 0.3, 0x8a4a2a, 4, 1.8);
    if (t > 10.5 && frame % 6 === 0) world.burst(pos.x, 1.7, pos.z, 0xff5fa2, 3, 0.8);
  }
  if (t > 11.8 && frame % 10 === 0) world.confetti(0, 3, -1, 40);

  // --- Caméra --------------------------------------------------------------------------------------
  let eye;
  let look;
  if (t < 1.9) {
    eye = new THREE.Vector3(2.6, 2.1, 4.6);
    look = new THREE.Vector3(-0.4, 0.8, -1);
  } else if (t < 6.1) {
    const a = (t - 1.9) * 0.05;
    eye = new THREE.Vector3(-0.9 + Math.sin(-0.15 + a) * 4.2, 2.0, -1 + Math.cos(-0.15 + a) * 4.2);
    look = new THREE.Vector3(-0.7, 0.9, -0.9);
  } else if (t < 8.4) {
    eye = new THREE.Vector3(2.4, 2, 2.9);
    look = new THREE.Vector3(1.6, 0.9, -0.4);
  } else {
    const d = seg(t, 8.4, 13);
    eye = new THREE.Vector3(lerp(1.9, 1.3, d), lerp(1.9, 2.3, d), lerp(3.4, 4.4, d));
    look = new THREE.Vector3(-0.4, 0.95, -0.5);
  }
  camera.position.copy(eye);
  camera.lookAt(look);
  camera.fov = 48;
  camera.updateProjectionMatrix();

  ui.caption(t < 6.1 ? "Une… deux… cent dix piques !" : t < 8.4 ? "Brochettes de pâtée au barbecue !" : "Miam ! Pauvre Pikou…", seg(t, 2.4, 2.8) * (1 - seg(t, 11.4, 11.8)));
  ui.title("FIN !<small>Kichta, championne du monde sucré</small>", seg(t, 11.9, 12.5));
  world.render();
  return true;
};
window.ready = true;
