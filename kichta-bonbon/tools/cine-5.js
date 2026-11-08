// Cinématique du niveau 4 : Chacha la chenille est attachée à une ficelle,
// et Kichta la tape avec sa patte pour la faire valser dans tous les sens.
import * as THREE from "../../vendor/three.module.min.js";
import { createWorld } from "../world.js?v=b7";
import { installThemes, themeIndex } from "../themes.js?v=b7";
import { createToon, dressToon, animateToon, candy } from "../toons.js?v=b7";
import { createCaterpillar, animateCaterpillar } from "../bosses.js?v=b7";
import { texts, seg, lerp, FPS, W, H } from "./cine-kit.js?v=b7";

const world = createWorld(document.querySelector("#scene"));
installThemes(world);
world.setQuality(0);
world.resize(W, H);
world.setBiome(themeIndex("foret2"), true);
world.clearDecor(0);
const { scene, camera } = world;
const ui = texts();

// La grosse branche entre deux arbres
const wood = candy(0xa8693a, { roughness: 0.5 });
const leaves = candy(0x5ccc3a);
for (const x of [-4.8, 4.8]) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 6.2, 18), wood);
  trunk.position.set(x, 3.1, -1);
  trunk.castShadow = true;
  scene.add(trunk);
  for (const [dx, dy, r] of [[0, 6.6, 1.6], [0.9, 6, 1.1], [-0.9, 6.2, 1.2]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), leaves);
    b.position.set(x + dx, dy, -1);
    b.castShadow = true;
    scene.add(b);
  }
}
const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 9.8, 16), wood);
branch.rotation.z = Math.PI / 2;
branch.position.set(0, 5.4, -1);
branch.castShadow = true;
scene.add(branch);
for (let i = 0; i < 10; i += 1) {
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), leaves);
  l.position.set(-4 + i * 0.9, 5.7 + (i % 2) * 0.2, -1 + (i % 3 - 1) * 0.3);
  l.scale.set(1, 0.6, 1);
  scene.add(l);
}

// Chacha pendue par la queue au bout de sa ficelle
const PIVOT = new THREE.Vector3(0.2, 5.25, -1);
const holder = new THREE.Group();
holder.position.copy(PIVOT);
scene.add(holder);
const STRING = 1.45;
const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, STRING, 6), candy(0xffffff));
rope.position.y = -STRING / 2;
holder.add(rope);
holder.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), candy(0xff5fa2)).translateY(-STRING));
const chacha = createCaterpillar();
const S = 0.72;
chacha.scale.setScalar(S);
chacha.rotation.x = Math.PI / 2;
chacha.position.y = -STRING - 3.0 * S;
holder.add(chacha);

const kichta = createToon("kichta");
dressToon(kichta, { hat: "champion" });
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);

// Pendule amorti : chaque coup de patte relance Chacha
let theta = 0.08;
let omega = 0;
let spin = 0;
let spinV = 0;
const swats = [2.5, 3.5, 4.3, 5.4, 6.1, 7.2, 8.0, 8.8, 9.5, 10.2];
let nextSwat = 0;
const DT = 1 / FPS;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  world.update(DT, t, { playerX: 0, playerY: 0, playerZ: 0, speed: 0, mode: "menu", fly: false });

  // Coups de patte : de plus en plus forts, et parfois Chacha tourne sur elle-même
  if (nextSwat < swats.length && t >= swats[nextSwat]) {
    const dir = nextSwat % 2 ? -1 : 1;
    omega += dir * (1.4 + nextSwat * 0.12);
    if (nextSwat % 3 === 2) spinV += 9;
    const p = new THREE.Vector3();
    chacha.userData.head.getWorldPosition(p);
    world.burst(p.x, p.y, p.z, 0xffffff, 18, 4);
    world.shake(0.15);
    nextSwat += 1;
  }
  const sub = 4;
  for (let i = 0; i < sub; i += 1) {
    const dt = DT / sub;
    omega += (-(9.8 / 3.2) * Math.sin(theta) - 0.35 * omega) * dt;
    theta += omega * dt;
    spinV *= 1 - 0.8 * dt;
    spin += spinV * dt;
  }
  holder.rotation.set(0, spin, theta);
  animateCaterpillar(chacha, t, t > 11 ? "hang" : "sad");
  chacha.userData.head.rotation.x = -1.35 + Math.sin(t * 4) * 0.1;
  chacha.userData.stars.visible = t > 6;

  // Kichta : elle arrive, regarde, puis tape
  const swatNow = swats.some((s) => t > s - 0.18 && t < s + 0.12);
  const jumpSwat = Math.abs(t - 7.2) < 0.45;
  let pose = "idle";
  const pos = new THREE.Vector3(0.3, 0, -1.95);
  let yaw = 0.1;
  if (t < 2) {
    const k = seg(t, 0, 1.7);
    pos.set(lerp(3.6, 0.3, k), 0, lerp(-3.2, -1.95, k));
    yaw = -1.2;
    pose = k < 1 ? "run" : "idle";
  } else if (t < 11) {
    pose = swatNow ? "throw" : "idle";
    if (jumpSwat) {
      const k = seg(t, 6.75, 7.65);
      pos.y = Math.sin(k * Math.PI) * 1.2;
      pose = "jump";
    }
  } else {
    pose = "win";
    yaw = 0.3;
  }
  kichta.position.copy(pos);
  kichta.rotation.set(0, yaw, 0);
  animateToon(kichta, t, pose, { flip: jumpSwat ? seg(t, 6.75, 7.65) : 0 });
  if (t > 2 && t < 11) kichta.userData.head.rotation.x -= 0.45;

  // Caméra
  let eye;
  let look;
  if (t < 2.2) {
    eye = new THREE.Vector3(2.4, 2.4, 5.6);
    look = new THREE.Vector3(0.6, 2.0, -1.2);
  } else if (t < 11) {
    const a = (t - 2.2) * 0.07;
    eye = new THREE.Vector3(0.3 + Math.sin(0.15 + a) * 5.2, 2.1 + Math.sin(t * 0.6) * 0.2, -1.2 + Math.cos(0.15 + a) * 5.2);
    look = new THREE.Vector3(0.3, 1.7, -1.3);
  } else {
    const d = seg(t, 11, 13);
    eye = new THREE.Vector3(lerp(1.2, 0.8, d), lerp(2.0, 2.4, d), lerp(4.0, 5.2, d));
    look = new THREE.Vector3(0.3, 1.6, -1.3);
  }
  camera.position.copy(eye);
  camera.lookAt(look);
  camera.fov = 48;
  camera.updateProjectionMatrix();

  ui.caption("Paf ! … Et paf ! …", seg(t, 2.6, 3) * (1 - seg(t, 6, 6.3)) + seg(t, 8, 8.3) * (1 - seg(t, 10.6, 11)));
  ui.title("LA CHENILLE AU BOUT DU FIL<small>Chacha a le tournis !</small>", seg(t, 11.2, 11.8));
  world.render();
  return true;
};
window.ready = true;
