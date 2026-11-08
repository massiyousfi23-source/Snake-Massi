// Cinématique du niveau 3 : Kichta grimpe sur Rocky le chien et fait du rodéo.
import * as THREE from "../../vendor/three.module.min.js";
import { createWorld, BIOMES } from "../world.js?v=b5";
import { createToon, dressToon, animateToon, candy } from "../toons.js?v=b5";
import { createDog, animateDog } from "../bosses.js?v=b5";
import { texts, seg, lerp, FPS, W, H } from "./cine-kit.js?v=b5";

const world = createWorld(document.querySelector("#scene"));
world.setQuality(0);
world.resize(W, H);
world.setBiome(Math.max(0, BIOMES.findIndex((b) => b.id === "plage")), true);
world.clearDecor(0);
const { scene, camera } = world;
const ui = texts();

// Arène : barrières en sucre d'orge en cercle
const CENTER = new THREE.Vector3(0, 0, -2.5);
for (let i = 0; i < 16; i += 1) {
  const a = (i / 16) * Math.PI * 2;
  const fence = world.OBSTACLES.barrier();
  fence.position.set(CENTER.x + Math.cos(a) * 5.2, 0, CENTER.z + Math.sin(a) * 5.2);
  fence.rotation.y = -a + Math.PI / 2;
  fence.traverse((o) => o.isMesh && (o.castShadow = true));
  scene.add(fence);
}
// Tonneaux de bonbons autour de l'arène
for (let i = 0; i < 6; i += 1) {
  const a = (i / 6) * Math.PI * 2 + 0.3;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.9, 20), candy([0xff5fa2, 0x5ad1ff, 0xffd23f][i % 3]));
  barrel.position.set(CENTER.x + Math.cos(a) * 6.3, 0.45, CENTER.z + Math.sin(a) * 6.3);
  barrel.castShadow = true;
  scene.add(barrel);
}

const dog = createDog();
dog.scale.setScalar(1.6);
scene.add(dog);
const kichta = createToon("kichta");
dressToon(kichta, { hat: "sherif", neck: "bandana" });
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);
let riding = false;

const DT = 1 / FPS;
let lastHop = 0;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  world.update(DT, t, { playerX: 0, playerY: 0, playerZ: 0, speed: 0, mode: "menu", fly: false });

  // --- Rocky ---------------------------------------------------------------------------
  let dogPose = "dizzy";
  const dogPos = CENTER.clone().add(new THREE.Vector3(0, 0, 1));
  let dogYaw = 0.3;
  if (t >= 3.0 && t < 10.3) {
    // Il rue et tourne en rond dans l'arène
    const k = (t - 3.0) * 0.85;
    dogPos.set(CENTER.x + Math.sin(k) * 2.4, 0, CENTER.z + Math.cos(k) * 2.4);
    dogYaw = k + Math.PI / 2 + Math.sin(t * 7) * 0.35;
    dogPose = "buck";
  } else if (t >= 10.3) {
    const k = (10.3 - 3.0) * 0.85;
    dogPos.set(CENTER.x + Math.sin(k) * 2.4, 0, CENTER.z + Math.cos(k) * 2.4);
    dogYaw = k + Math.PI / 2;
    dogPose = "tired";
  } else if (t > 2.6) {
    dogPose = "bark";
  }
  dog.position.copy(dogPos);
  dog.rotation.set(0, dogYaw, 0);
  animateDog(dog, t, dogPose, { speed: 1.2 });
  // Poussière à chaque saut
  if (dogPose === "buck") {
    const hop = Math.abs(Math.sin((t) * 4.5));
    if (hop < 0.12 && t - lastHop > 0.2) {
      lastHop = t;
      world.burst(dogPos.x, 0.1, dogPos.z, 0xe8c48a, 26, 4);
    }
  }

  // --- Kichta ---------------------------------------------------------------------------
  if (t < 2.2) {
    const w = seg(t, 0.2, 2.0);
    kichta.position.set(lerp(-3.4, -1.5, w), 0, lerp(1.8, -0.8, w));
    kichta.rotation.set(0, 2.5, 0);
    animateToon(kichta, t, w < 1 ? "run" : "idle", { speed: 0.9 });
  } else if (t < 3.0) {
    // Elle saute sur le dos de Rocky
    const j = seg(t, 2.2, 3.0);
    const start = new THREE.Vector3(-1.5, 0, -0.8);
    const seat = new THREE.Vector3(0, 1.65, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), dogYaw).add(dogPos);
    kichta.position.lerpVectors(start, seat, j);
    kichta.position.y += Math.sin(j * Math.PI) * 1.4;
    kichta.rotation.set(0, lerp(2.5, dogYaw, j), 0);
    animateToon(kichta, t, j < 0.5 ? "jump" : "fall", { flip: j });
  } else {
    if (!riding) {
      // Elle est en selle : on l'attache au dos du chien
      riding = true;
      dog.userData.rig.add(kichta);
      kichta.scale.setScalar(1 / 1.6);
      kichta.position.set(0, 0.98, -0.05);
      kichta.rotation.set(0, 0, 0);
      world.burst(dogPos.x, 1.6, dogPos.z, 0xffd23f, 30, 5);
    }
    if (t < 10.3) {
      // Une patte en l'air comme une vraie cow-girl
      animateToon(kichta, t, "throw", { speed: 1 });
      kichta.userData.rig.rotation.x -= dog.userData.rig.rotation.x * 0.7;
      kichta.userData.rig.rotation.z += Math.sin(t * 6) * 0.15;
    } else {
      kichta.position.y = 0.98 + seg(t, 10.3, 10.7) * 0.1;
      animateToon(kichta, t, "win", { speed: 1 });
      kichta.userData.rig.position.y *= 0.4;
    }
  }

  // --- Caméra -----------------------------------------------------------------------------
  const target = dogPos.clone().add(new THREE.Vector3(0, 1.6, 0));
  let eye;
  if (t < 3) {
    eye = new THREE.Vector3(1.2, 2.6, 6.2);
    target.lerp(new THREE.Vector3(-1, 1, -0.5), 0.45);
  } else if (t < 10.3) {
    const a = 0.7 + (t - 3) * 0.32;
    const r = 8.2 - Math.sin((t - 3) * 0.5) * 1.2;
    eye = new THREE.Vector3(CENTER.x + Math.sin(a) * r, 3 + Math.sin(t) * 0.3, CENTER.z + Math.cos(a) * r);
    target.lerp(CENTER.clone().add(new THREE.Vector3(0, 1.6, 0)), 0.35);
  } else {
    const a = 0.7 + (10.3 - 3) * 0.32 + (t - 10.3) * 0.1;
    eye = dogPos.clone().add(new THREE.Vector3(Math.sin(a) * 5, 2.4, Math.cos(a) * 5));
  }
  camera.position.copy(eye);
  camera.lookAt(target);
  camera.fov = 48;
  camera.updateProjectionMatrix();

  ui.caption("YEE-HAW !", seg(t, 4, 4.3) * (1 - seg(t, 6.5, 6.9)) + seg(t, 8, 8.3) * (1 - seg(t, 9.6, 10)));
  ui.title("LE RODÉO<small>Rocky est dompté !</small>", seg(t, 10.9, 11.5));
  world.render();
  return true;
};
window.ready = true;
