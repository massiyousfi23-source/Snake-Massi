// Cinématique du niveau 5 : Kichta arrache les ailes de Moumouche la mouche
// et joue avec elle au sol, pendant que la mouche pleure.
import * as THREE from "../../vendor/three.module.min.js";
import { createWorld } from "../world.js?v=b6";
import { installThemes, themeIndex } from "../themes.js?v=b6";
import { createToon, dressToon, animateToon } from "../toons.js?v=b6";
import { createFly, animateFly } from "../bosses.js?v=b6";
import { texts, seg, lerp, FPS, W, H } from "./cine-kit.js?v=b6";

const world = createWorld(document.querySelector("#scene"));
installThemes(world);
world.setQuality(0);
world.resize(W, H);
world.setBiome(themeIndex("ruelle"), true);
world.clearDecor(0);
const { scene, camera } = world;
const ui = texts();
// Un réverbère qui éclaire la scène
const lamp = new THREE.PointLight(0xffd59a, 12, 12, 1.4);
lamp.position.set(-2.2, 4.5, -0.4);
scene.add(lamp);
const lampPost = world.DECOR.reverbere();
lampPost.position.set(-3.1, 0, -0.8);
scene.add(lampPost);
const can = world.DECOR.poubelle();
can.position.set(2.6, 0, -1.6);
scene.add(can);
const bags = world.DECOR.sacs();
bags.position.set(-2.8, 0, -2);
scene.add(bags);

const fly = createFly();
fly.scale.setScalar(1.15);
scene.add(fly);
const kichta = createToon("kichta");
dressToon(kichta, { hat: "champion" });
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);

// Positions successives de la mouche, frappée par Kichta
const hits = [4.9, 6.0, 7.1, 8.1, 9.1, 10.1];
const spots = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-1.1, 0, 0.5),
  new THREE.Vector3(-0.3, 0, 1.4),
  new THREE.Vector3(0.9, 0, 0.8),
  new THREE.Vector3(1.2, 0, -0.4),
  new THREE.Vector3(0.2, 0, -0.7),
  new THREE.Vector3(-0.2, 0, 0.3),
];
function flyAt(t) {
  let i = 0;
  while (i < hits.length && t >= hits[i]) i += 1;
  if (i === 0) return { pos: spots[0].clone(), hop: 0, roll: 0 };
  const k = Math.min(1, (t - hits[i - 1]) / 0.55);
  const pos = spots[i - 1].clone().lerp(spots[i], 1 - (1 - k) ** 2);
  return { pos, hop: Math.sin(k * Math.PI) * 0.6, roll: (1 - k) * 6 + (i % 2 ? Math.PI : 0) * (k > 0.9 ? 1 : 0) };
}

// Ailes arrachées : elles s'envolent en tourbillonnant
const torn = [];
function tearWing(i) {
  const pivot = fly.userData.wings[i];
  scene.attach(pivot);
  torn.push({ obj: pivot, v: new THREE.Vector3((i ? 1 : -1) * 1.2, 2.2, 0.4), spin: (i ? 1 : -1) * 4 });
  const p = new THREE.Vector3();
  pivot.getWorldPosition(p);
  world.burst(p.x, p.y, p.z, 0xdff6ff, 24, 3);
  world.shake(0.15);
}
let wingsTorn = 0;
const DT = 1 / FPS;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  world.update(DT, t, { playerX: 0, playerY: 0, playerZ: 0, speed: 0, mode: "menu", fly: false });
  if (wingsTorn === 0 && t >= 2.6) tearWing((wingsTorn += 1) - 1);
  if (wingsTorn === 1 && t >= 3.6) tearWing((wingsTorn += 1) - 1);
  torn.forEach((w) => {
    w.v.y -= 1.6 * DT;
    w.v.multiplyScalar(0.985);
    w.obj.position.addScaledVector(w.v, DT);
    w.obj.position.y = Math.max(0.05, w.obj.position.y);
    w.obj.rotation.z += w.spin * DT;
    w.obj.rotation.x += w.spin * 0.6 * DT;
  });

  // La mouche
  const f = flyAt(t);
  fly.position.copy(f.pos);
  // Sur le dos (une fois sur deux) : on la remonte pour qu'elle ne passe pas sous le sol
  const onBack = f.roll > 3;
  fly.position.y = f.hop + (onBack ? 0.62 : 0);
  fly.rotation.set(0, 0.6, Math.sin(f.roll) * 0.4 + (onBack ? Math.PI * 0.85 : 0));
  animateFly(fly, t, t < 2.4 ? "crawl" : "sad");
  fly.userData.body.position.y = 0.42;
  if (t > 4.8 && t < 11 && frame % 20 === 0) world.burst(f.pos.x, 0.9, f.pos.z, 0x6fd0ff, 4, 1.2);

  // Kichta
  let pose = "idle";
  let yaw = 0;
  const pos = new THREE.Vector3();
  const target = f.pos.clone();
  if (t < 2.2) {
    const k = seg(t, 0, 2);
    pos.set(lerp(3.5, 0.85, k), 0, lerp(-2.8, -0.7, k));
    pose = k < 1 ? "run" : "idle";
  } else if (t < 4.6) {
    pos.set(0.85, 0, -0.7);
    pose = Math.abs(t - 2.55) < 0.2 || Math.abs(t - 3.55) < 0.2 ? "throw" : "idle";
  } else if (t < 11) {
    // Elle suit la mouche et la tape comme un jouet
    const prev = flyAt(t - 0.35).pos;
    pos.copy(prev).add(new THREE.Vector3(0.8, 0, -0.75));
    const hitting = hits.some((h) => t > h - 0.2 && t < h + 0.1);
    const pounce = hits.findIndex((h) => t > h - 0.55 && t < h - 0.2);
    pose = hitting ? "throw" : pounce >= 0 ? "jump" : "idle";
    if (pounce >= 0) pos.y = Math.sin(((t - (hits[pounce] - 0.55)) / 0.35) * Math.PI) * 0.4;
  } else {
    // Patte posée sur la mouche, très fière
    pos.copy(spots[6]).add(new THREE.Vector3(0.7, 0, -0.5));
    pose = "throw";
  }
  kichta.position.copy(pos);
  yaw = Math.atan2(target.x - pos.x, target.z - pos.z);
  kichta.rotation.set(0, yaw, 0);
  animateToon(kichta, t, pose);
  if (t > 11) {
    const leg = kichta.userData.legs.find((l) => l.userData.front && l.userData.side > 0);
    leg.rotation.x = -1.1;
  }

  // Caméra
  let eye;
  let look;
  if (t < 4.6) {
    const d = seg(t, 0, 4.6);
    eye = new THREE.Vector3(lerp(2.2, 1.0, d), lerp(2.3, 1.7, d), lerp(5.4, 3.6, d));
    look = new THREE.Vector3(0.4, 0.8, 0.2);
  } else if (t < 11) {
    const a = (t - 4.6) * 0.1;
    eye = new THREE.Vector3(0.2 + Math.sin(0.4 + a) * 4.6, 2.3, 0.4 + Math.cos(0.4 + a) * 4.6);
    look = f.pos.clone().add(new THREE.Vector3(0.4, 0.6, 0.3));
  } else {
    const d = seg(t, 11, 13);
    eye = new THREE.Vector3(lerp(1.6, 1.2, d), lerp(1.6, 2.1, d), lerp(3.4, 4.2, d));
    look = new THREE.Vector3(0.2, 0.6, 0.4);
  }
  camera.position.copy(eye);
  camera.lookAt(look);
  camera.fov = 48;
  camera.updateProjectionMatrix();

  ui.caption(t < 4.6 ? "Crac ! Crac ! Plus d'ailes !" : "Bzz… snif… snif…", seg(t, 2.7, 3) * (1 - seg(t, 4.3, 4.6)) + seg(t, 6.5, 6.8) * (1 - seg(t, 9.6, 10)));
  ui.title("MOUMOUCHE SANS AILES<small>Bzz… snif !</small>", seg(t, 11.2, 11.8));
  world.render();
  return true;
};
window.ready = true;
