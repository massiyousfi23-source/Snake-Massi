// Cinématique du niveau 2 : Kichta découvre une chambre secrète remplie de pâtée.
import * as THREE from "../../vendor/three.module.min.js";
import { createToon, dressToon, animateToon, candy, canvasTexture } from "../toons.js?v=b5";
import { createStage, createSparks, texts, makeCan, makePateeChunk, seg, lerp, FPS } from "./cine-kit.js?v=b5";

const stage = createStage(document.querySelector("#scene"), { background: 0x2a1838 });
const { scene, camera } = stage;
const sparks = createSparks(scene);
const ui = texts();

// --- Lumières : couloir bleuté, chambre dorée -----------------------------------------
scene.add(new THREE.HemisphereLight(0xfff0f8, 0x8a5a7a, 0.55));
const roomLight = new THREE.PointLight(0xffd9a0, 0, 16, 1.2);
roomLight.position.set(0, 4, -3);
scene.add(roomLight);
const spot = new THREE.SpotLight(0xfff0c0, 0, 12, 0.45, 0.5, 1.2);
spot.position.set(0, 5.5, -3);
spot.target.position.set(0, 0, -4.5);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
scene.add(spot, spot.target);
const corridorLight = new THREE.DirectionalLight(0xb8c8ff, 1.2);
corridorLight.position.set(3, 6, 10);
corridorLight.castShadow = true;
Object.assign(corridorLight.shadow.camera, { left: -6, right: 6, top: 8, bottom: -8 });
scene.add(corridorLight);

// --- Décor ---------------------------------------------------------------------------------
const tile = canvasTexture(256, 256, (g, w) => {
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
    g.fillStyle = (x + y) % 2 ? "#ffe3ef" : "#ffb8d6";
    g.fillRect((x * w) / 4, (y * w) / 4, w / 4, w / 4);
  }
}, true);
tile.repeat.set(6, 10);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), candy(0xffffff, { map: tile, roughness: 0.25 }));
floor.rotation.x = -Math.PI / 2;
floor.position.z = 0;
floor.receiveShadow = true;
scene.add(floor);
const paper = canvasTexture(256, 256, (g, w) => {
  g.fillStyle = "#ffd1e6";
  g.fillRect(0, 0, w, w);
  g.fillStyle = "#ffeef6";
  for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, w);
  g.font = "26px serif";
  for (let i = 0; i < 6; i += 1) g.fillText("🐾", (i * 71) % w, 30 + ((i * 97) % (w - 30)));
}, true);
paper.repeat.set(3, 2);
const wallMat = candy(0xffffff, { map: paper, roughness: 0.6, clearcoat: 0.2 });
// Chambre : z de -8 à 2.5
for (const [w, h, x, y, z, ry] of [[10, 5, 0, 2.5, -8, 0], [10.5, 5, -5, 2.5, -2.75, Math.PI / 2], [10.5, 5, 5, 2.5, -2.75, -Math.PI / 2]]) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  wall.position.set(x, y, z);
  wall.rotation.y = ry;
  wall.receiveShadow = true;
  scene.add(wall);
}
// Mur avec la porte secrète (z = 2.5), vu du couloir
const frontMat = candy(0x7b3dff, { roughness: 0.4 });
for (const [w, x] of [[4.1, -2.95], [4.1, 2.95]]) {
  const part = new THREE.Mesh(new THREE.BoxGeometry(w, 5, 0.3), frontMat);
  part.position.set(x, 2.5, 2.5);
  part.receiveShadow = true;
  scene.add(part);
}
scene.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.3), frontMat).translateY(3.85).translateZ(2.5));
const gold = candy(0xffc425, { metalness: 0.8, roughness: 0.15 });
for (const x of [-0.95, 0.95]) scene.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 0.4), gold).translateX(x).translateY(1.4).translateZ(2.5));
scene.add(new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.16, 0.4), gold).translateY(2.75).translateZ(2.5));
// La porte, avec une empreinte de patte lumineuse
const doorPivot = new THREE.Group();
doorPivot.position.set(-0.88, 0, 2.55);
scene.add(doorPivot);
const pawTex = canvasTexture(256, 256, (g, w) => {
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.ellipse(128, 160, 52, 44, 0, 0, Math.PI * 2);
  g.fill();
  for (const [x, y] of [[62, 92], [104, 58], [152, 58], [194, 92]]) {
    g.beginPath();
    g.ellipse(x, y, 22, 28, 0, 0, Math.PI * 2);
    g.fill();
  }
});
const door = new THREE.Mesh(new THREE.BoxGeometry(1.76, 2.66, 0.12), candy(0xff5fa2));
door.position.set(0.88, 1.33, 0);
door.castShadow = true;
doorPivot.add(door);
const pawGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, map: pawTex, transparent: true, emissive: 0xffd23f, emissiveMap: pawTex, emissiveIntensity: 0.5 });
const paw = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), pawGlow);
paw.position.set(0.88, 1.4, 0.07);
doorPivot.add(paw);
// Lumière qui sort de la porte
const beam = new THREE.Mesh(
  new THREE.PlaneGeometry(1.8, 2.7),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
);
beam.position.set(0, 1.35, 2.4);
scene.add(beam);
// Couloir : murs sombres
const corridorMat = candy(0x4a2a6a, { roughness: 0.6 });
for (const x of [-2.6, 2.6]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 9), corridorMat);
  w.position.set(x, 2.5, 7);
  w.receiveShadow = true;
  scene.add(w);
}

// Étagères pleines de boîtes de pâtée
const shelfMat = candy(0xffffff, { roughness: 0.4 });
for (const side of [-1, 1]) {
  for (let level = 0; level < 3; level += 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 7.5), shelfMat);
    shelf.position.set(side * 4.6, 0.9 + level * 1.15, -3.6);
    shelf.receiveShadow = true;
    scene.add(shelf);
    for (let i = 0; i < 14; i += 1) {
      const can = makeCan(candy);
      can.position.set(side * 4.55, 0.9 + level * 1.15 + 0.19, -7 + i * 0.5);
      can.rotation.y = -side * Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      scene.add(can);
    }
  }
}
// Pyramides de boîtes au sol
for (const [cx, cz] of [[-2.9, -6.5], [2.9, -6.5], [-3.2, -1.2], [3.2, -1.2]]) {
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i <= 2 - row; i += 1) {
      const can = makeCan(candy);
      can.position.set(cx + (i - (2 - row) / 2) * 0.46, 0.15 + row * 0.31, cz);
      can.rotation.y = Math.random();
      scene.add(can);
    }
  }
}
// Le piédestal et la gamelle géante de pâtée
const pedestal = new THREE.Group();
pedestal.position.set(0, 0, -4.5);
scene.add(pedestal);
pedestal.add(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.8, 40), candy(0xffc425, { metalness: 0.6, roughness: 0.2 })).translateY(0.4));
pedestal.add(new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.06, 10, 48), candy(0xff5fa2)).rotateX(Math.PI / 2).translateZ(-0.8));
const bowl = new THREE.Group();
bowl.position.set(0.5, 0.8, 0.12);
bowl.scale.setScalar(0.62);
pedestal.add(bowl);
const bowlShape = [new THREE.Vector2(0, 0), new THREE.Vector2(0.55, 0), new THREE.Vector2(0.7, 0.32), new THREE.Vector2(0.66, 0.34), new THREE.Vector2(0.5, 0.06), new THREE.Vector2(0, 0.06)];
bowl.add(new THREE.Mesh(new THREE.LatheGeometry(bowlShape, 40), candy(0xff7fb5, { side: THREE.DoubleSide })));
const mound = new THREE.Group();
mound.position.y = 0.12;
bowl.add(mound);
mound.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), candy(0x8a4a2a, { roughness: 0.45, clearcoat: 0.6 })));
for (let i = 0; i < 16; i += 1) {
  const c = makePateeChunk(candy, 0.09);
  const a = (i / 16) * Math.PI * 2;
  c.position.set(Math.cos(a) * 0.3 * Math.random(), 0.25 + Math.random() * 0.15, Math.sin(a) * 0.3 * Math.random());
  mound.add(c);
}
pedestal.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));

// --- Kichta ------------------------------------------------------------------------------
const kichta = createToon("kichta");
dressToon(kichta, {});
kichta.traverse((o) => o.isMesh && (o.castShadow = true));
scene.add(kichta);
const torso = kichta.userData.body.children[0];
const torsoScale = torso.scale.clone();

// --- Mise en scène -----------------------------------------------------------------------------
const pedTop = 0.8;
function shot(t) {
  const k = { pos: new THREE.Vector3(), yaw: Math.PI, pose: "idle", headX: 0, roll: 0, flip: 0 };
  if (t < 2.3) {
    // Elle avance dans le couloir et renifle la porte
    const w = seg(t, 0, 1.7);
    k.pos.set(0, 0, lerp(7, 3.4, w));
    k.pose = w < 1 ? "run" : "idle";
    k.headX = t > 1.7 ? 0.25 + Math.sin(t * 18) * 0.08 : 0;
  } else if (t < 3.1) {
    k.pos.set(0, 0, 3.4);
    k.pose = "win";
  } else if (t < 5.4) {
    // Elle fonce vers la gamelle et saute sur le piédestal
    const r = seg(t, 3.1, 4.8);
    k.pos.set(0.1, 0, lerp(3.4, -3.6, r));
    k.pose = "run";
    if (t > 4.6) {
      const j = seg(t, 4.6, 5.4);
      k.pos.set(lerp(0.1, -0.35, j), Math.sin(j * Math.PI) * 1.4 + pedTop * j, lerp(-3.4, -4.4, j));
      k.pose = j < 0.5 ? "jump" : "fall";
      k.flip = j;
    }
  } else if (t < 10.2) {
    // Elle dévore la pâtée
    k.pos.set(-0.35, pedTop, -4.4);
    k.yaw = Math.PI * 0.55 + Math.PI;
    k.yaw = 1.55;
    k.pose = "idle";
    const nom = Math.sin((t - 5.4) * 9);
    k.headX = 0.75 + nom * 0.25;
  } else {
    // Ventre plein, sur le dos, toute contente
    k.pos.set(-0.45, pedTop, -4.3);
    k.yaw = 0.4;
    k.pose = "idle";
    k.roll = seg(t, 10.2, 10.7) * Math.PI * 0.92;
  }
  return k;
}

const DT = 1 / FPS;
let toqueOn = false;
window.renderFrame = (frame) => {
  const t = frame / FPS;
  const k = shot(t);
  kichta.position.copy(k.pos);
  kichta.rotation.set(0, k.yaw, 0);
  animateToon(kichta, t, k.pose, { speed: 1.3, flip: k.flip });
  kichta.userData.head.rotation.x += k.headX;
  if (k.roll) {
    kichta.userData.rig.rotation.z += k.roll;
    kichta.userData.rig.position.y += 0.55 * seg(t, 10.2, 10.7);
    kichta.userData.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 3 + i) * 0.3));
  }
  // Le ventre s'arrondit pendant le festin
  const belly = 1 + seg(t, 5.6, 10) * 0.38;
  torso.scale.set(torsoScale.x * belly, torsoScale.y * (1 + (belly - 1) * 0.5), torsoScale.z * belly);
  // La pâtée diminue
  const eaten = seg(t, 5.6, 10);
  mound.scale.set(1 - eaten * 0.3, Math.max(0.05, 1 - eaten * 0.95), 1 - eaten * 0.3);
  if (t > 5.6 && t < 10 && frame % 4 === 0) sparks.burst(-0.1 + Math.random() * 0.3, 1.35, -4.3, 0x8a4a2a, 3, 1.4, 5, 0.6);
  // Toque de chef qui apparaît à la fin
  if (t > 11 && !toqueOn) {
    toqueOn = true;
    dressToon(kichta, { hat: "toque" });
    kichta.userData.slots.hat.traverse((o) => o.isMesh && (o.castShadow = true));
    const p = new THREE.Vector3();
    kichta.userData.head.getWorldPosition(p);
    sparks.burst(p.x, p.y + 0.4, p.z, 0xffffff, 60, 3, 1, 1.4);
  }
  // Porte qui s'ouvre et lumière qui inonde la pièce
  const open = seg(t, 2.1, 3.0);
  doorPivot.rotation.y = -open * 1.9;
  pawGlow.emissiveIntensity = 0.5 + Math.max(0, Math.sin(t * 6)) * (t < 2.3 ? 1.2 : 0.3) * seg(t, 1.5, 2);
  beam.material.opacity = open * (t < 4 ? 0.35 : 0.08);
  roomLight.intensity = open * 5;
  spot.intensity = open * 14;
  if (t > 2.3 && t < 3.3 && frame % 2 === 0) sparks.burst((Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 2.2, 2.3, 0xffe9a0, 6, 1.6, -0.4, 1.2);
  // Cœurs de lumière qui flottent dans la chambre
  if (t > 3 && frame % 3 === 0) sparks.burst((Math.random() - 0.5) * 8, 0.2, -7 + Math.random() * 8, Math.random() < 0.5 ? 0xff9ccf : 0xffe066, 1, 0.3, -0.35, 4);
  if (t > 10.5 && frame % 5 === 0) sparks.burst(-0.45, 1.6, -4.3, 0xff5fa2, 4, 0.6, -0.8, 2);
  sparks.update(DT);

  // Caméra
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  if (t < 2.9) {
    eye.set(1.6, 1.5, lerp(9.5, 7.2, seg(t, 0, 2.9)));
    look.set(0, 1.1, 2.5);
  } else if (t < 5.5) {
    const d = seg(t, 2.9, 5.2);
    eye.set(lerp(1.6, 1.8, d), lerp(1.5, 2.4, d), lerp(7.2, 0.6, d));
    look.set(0, lerp(1.1, 1.0, d), lerp(2.5, -4.5, d));
  } else if (t < 10.2) {
    const a = (t - 5.5) * 0.12;
    eye.set(-0.1 + Math.sin(0.9 + a) * 3.1, 2.0, -4.4 + Math.cos(0.9 + a) * 3.1);
    look.set(-0.1, 1.15, -4.4);
  } else {
    const d = seg(t, 10.2, 13);
    eye.set(lerp(1.6, 2.2, d), lerp(2.2, 2.8, d), lerp(-2.4, -0.6, d));
    look.set(-0.3, 1.1, -4.4);
  }
  camera.position.copy(eye);
  camera.lookAt(look);
  camera.fov = 48;
  camera.updateProjectionMatrix();

  ui.caption("Miam… miam… miam !", seg(t, 6, 6.4) * (1 - seg(t, 9.6, 10)));
  ui.title("LA CHAMBRE SECRÈTE<small>De la pâtée à volonté !</small>", seg(t, 11.2, 11.8));
  stage.render();
  return true;
};
window.ready = true;
