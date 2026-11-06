// Kichta et Pucci en figurines « bonbon » : formes rondes, gros yeux brillants,
// vernis épais. Leurs marques restent fidèles aux photos :
// - Kichta : tigrée caramel à rayures chocolat, « M » sur le front, menton et
//   museau clairs, yeux vert olive, nez rose orangé, queue annelée au bout noir.
// - Pucci : réglisse noire et guimauve blanche, fin liseré blanc entre les yeux,
//   tache noire au menton, nez rose taché de noir, collier rose et médaille ronde.
// Les modèles regardent vers +Z.
import * as THREE from "../vendor/three.module.min.js";

export function candy(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ...options,
  });
}

export function canvasTexture(width, height, paint, repeat = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ---------------------------------------------------------------------------
// Pelages : on peut changer les couleurs de Kichta dans la boutique
// ---------------------------------------------------------------------------
export const SKINS = {
  caramel: { name: "Caramel", base: "#d98a3d", light: "#f6dfbf", stripe: "#5b2f14", nose: "#f28c7a", eye: "#a9b23a", price: 0 },
  fraise: { name: "Fraise", base: "#ff8fb4", light: "#fff0f5", stripe: "#d63c74", nose: "#ff5d8f", eye: "#5bc0ff", price: 600 },
  menthe: { name: "Menthe", base: "#7fe0c2", light: "#effff9", stripe: "#1f8f74", nose: "#ff8aa8", eye: "#ffcf3d", price: 800 },
  myrtille: { name: "Myrtille", base: "#8f8cff", light: "#f0efff", stripe: "#3a2f9e", nose: "#ff9ccf", eye: "#7dffb3", price: 1000 },
  or: { name: "Or massif", base: "#ffcc33", light: "#fff6cf", stripe: "#c47a00", nose: "#ff8f5d", eye: "#3dd6ff", price: 2500 },
};

const GEO = {
  sphere: new THREE.SphereGeometry(1, 40, 28),
  small: new THREE.SphereGeometry(1, 20, 14),
  capsule: new THREE.CapsuleGeometry(1, 1, 8, 18),
  cone: new THREE.ConeGeometry(1, 1, 24, 1),
  disc: new THREE.CircleGeometry(1, 32),
  torus: new THREE.TorusGeometry(1, 0.22, 14, 40),
};

function mesh(geometry, material, scale, position, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  if (Array.isArray(scale)) m.scale.set(...scale);
  else m.scale.setScalar(scale);
  if (position) m.position.set(...position);
  m.castShadow = shadow;
  return m;
}

// Œil façon dessin animé : iris coloré, grosse pupille, deux reflets.
function eyeTexture(iris) {
  // Texture enroulée autour d'une sphère : l'iris occupe le centre (vers l'avant)
  return canvasTexture(1024, 512, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    const R = 118;
    const grad = g.createRadialGradient(cx, cy, 8, cx, cy, R);
    grad.addColorStop(0, "#140d05");
    grad.addColorStop(0.42, "#140d05");
    grad.addColorStop(0.47, iris);
    grad.addColorStop(0.86, iris);
    grad.addColorStop(1, "#2c1e0a");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.96)";
    g.beginPath();
    g.ellipse(cx - 38, cy - 42, 30, 25, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cx + 38, cy + 36, 13, 0, Math.PI * 2);
    g.fill();
  });
}

// Tête : la face (+Z) est à 25 % de la largeur de la texture.
function kichtaHeadTexture(skin) {
  return canvasTexture(512, 256, (g, w, h) => {
    const face = w * 0.25;
    g.fillStyle = skin.base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = skin.stripe;
    g.lineCap = "round";
    // Le « M » du front
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(face - 38, 70);
    g.lineTo(face - 22, 30);
    g.lineTo(face, 62);
    g.lineTo(face + 22, 30);
    g.lineTo(face + 38, 70);
    g.stroke();
    // Rayures du crâne et de la nuque
    g.lineWidth = 12;
    for (let x = face + 70; x < face + 440; x += 34) {
      g.beginPath();
      g.moveTo(x % w, 0);
      g.quadraticCurveTo((x + 12) % w, 50, (x + 4) % w, 118);
      g.stroke();
    }
    // Traits des joues
    g.lineWidth = 7;
    for (const side of [-1, 1]) {
      for (const dy of [0, 20]) {
        g.beginPath();
        g.moveTo(face + side * 70, 128 + dy);
        g.lineTo(face + side * 104, 124 + dy * 1.3);
        g.stroke();
      }
    }
    // Museau et menton clairs
    const chin = g.createRadialGradient(face, h * 0.78, 10, face, h * 0.78, 78);
    chin.addColorStop(0, skin.light);
    chin.addColorStop(0.75, skin.light);
    chin.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = chin;
    g.fillRect(0, 0, w, h);
  });
}

function kichtaBodyTexture(skin) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = skin.base;
    g.fillRect(0, 0, w, h);
    // Rayures « maquereau » ondulées sur le dos et les flancs
    g.strokeStyle = skin.stripe;
    g.lineCap = "round";
    for (let x = 18; x < w; x += 38) {
      g.lineWidth = 13;
      g.beginPath();
      for (let y = 0; y <= h; y += 8) {
        const px = x + Math.sin(y * 0.05 + x) * 7;
        if (y === 0) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.stroke();
    }
    // Ventre clair (côté -Y de la sphère, en bas de la texture)
    const belly = g.createLinearGradient(0, h * 0.62, 0, h);
    belly.addColorStop(0, "rgba(0,0,0,0)");
    belly.addColorStop(0.35, skin.light);
    belly.addColorStop(1, skin.light);
    g.fillStyle = belly;
    g.fillRect(0, 0, w, h);
  });
}

function pucciHeadTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    const face = w * 0.25;
    g.fillStyle = "#1d1822";
    g.fillRect(0, 0, w, h);
    // Liseré blanc : fin entre les yeux, très large sur le museau
    g.fillStyle = "#fffaf3";
    g.beginPath();
    g.moveTo(face - 6, 40);
    g.lineTo(face + 6, 40);
    g.quadraticCurveTo(face + 14, 120, face + 90, h);
    g.lineTo(face - 90, h);
    g.quadraticCurveTo(face - 14, 120, face - 6, 40);
    g.fill();
  });
}

// ---------------------------------------------------------------------------
// Tenues de la boutique
// ---------------------------------------------------------------------------
export const OUTFITS = {
  hat: {
    none: { name: "Aucun", price: 0 },
    noeud: { name: "Nœud rose", price: 120 },
    casquette: { name: "Casquette", price: 200 },
    couronne: { name: "Couronne", price: 450 },
    sorcier: { name: "Chapeau de magicien", price: 700 },
    casque: { name: "Casque audio", price: 900 },
  },
  face: {
    none: { name: "Aucune", price: 0 },
    soleil: { name: "Lunettes de soleil", price: 250 },
    coeur: { name: "Lunettes cœur", price: 400 },
  },
  back: {
    none: { name: "Rien", price: 0 },
    cape: { name: "Cape de héros", price: 650 },
    ailes: { name: "Ailes de fée", price: 1200 },
    fusee: { name: "Sac fusée", price: 1800 },
  },
};

function buildHat(kind) {
  const g = new THREE.Group();
  if (kind === "noeud") {
    const m = candy(0xff5fa2);
    g.add(mesh(GEO.sphere, m, [0.16, 0.11, 0.06], [-0.15, 0, 0]), mesh(GEO.sphere, m, [0.16, 0.11, 0.06], [0.15, 0, 0]), mesh(GEO.sphere, m, 0.07));
    g.position.set(0.18, 0.36, 0.05);
    g.rotation.z = -0.3;
  } else if (kind === "casquette") {
    const m = candy(0x2f7bff);
    const cap = mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m, [0.36, 0.26, 0.36]);
    const brim = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), candy(0xffd23f), [1, 1, 1], [0, 0.01, 0.3]);
    brim.scale.set(1, 1, 0.8);
    g.add(cap, brim);
    g.position.set(0, 0.3, -0.02);
    g.rotation.x = -0.15;
  } else if (kind === "couronne") {
    const gold = candy(0xffc425, { metalness: 0.6, roughness: 0.2 });
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 24, 1, true), gold));
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const spike = mesh(GEO.cone, gold, [0.05, 0.14, 0.05], [Math.cos(a) * 0.22, 0.12, Math.sin(a) * 0.22]);
      const gem = mesh(GEO.small, candy([0xff3d6e, 0x3dd6ff, 0x7dff6a][i % 3]), 0.035, [Math.cos(a) * 0.235, 0.02, Math.sin(a) * 0.235]);
      g.add(spike, gem);
    }
    g.position.set(0, 0.42, 0);
  } else if (kind === "sorcier") {
    const m = candy(0x7b3dff);
    g.add(mesh(GEO.cone, m, [0.26, 0.6, 0.26], [0, 0.3, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32), m));
    const star = mesh(GEO.small, candy(0xffe14d, { emissive: 0xffc400, emissiveIntensity: 0.6 }), 0.07, [0, 0.35, 0.17]);
    g.add(star);
    g.position.set(0, 0.36, -0.02);
    g.rotation.x = -0.12;
    g.rotation.z = 0.12;
  } else if (kind === "casque") {
    const m = candy(0xff3d6e);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 12, 40, Math.PI), candy(0x222233));
    band.position.y = 0.02;
    g.add(band);
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24), m, 1, [s * 0.4, 0.02, 0]).rotateZ(Math.PI / 2));
    g.position.set(0, 0.1, 0);
  }
  return g;
}

function buildFace(kind) {
  const g = new THREE.Group();
  if (kind === "soleil" || kind === "coeur") {
    const lens = kind === "soleil" ? candy(0x111118, { roughness: 0.05 }) : candy(0xff3d7a, { roughness: 0.1, transparent: true, opacity: 0.9 });
    const frame = candy(kind === "soleil" ? 0x222222 : 0xffffff);
    for (const s of [-1, 1]) {
      let l;
      if (kind === "coeur") {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.08);
        shape.bezierCurveTo(-0.16, 0.02, -0.08, 0.14, 0, 0.06);
        shape.bezierCurveTo(0.08, 0.14, 0.16, 0.02, 0, -0.08);
        l = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), lens);
        l.scale.setScalar(1.3);
      } else {
        l = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 24), lens).rotateX(Math.PI / 2);
      }
      l.position.set(s * 0.15, 0, 0);
      g.add(l);
    }
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.025, 0.025), frame, 1, [0, 0.03, 0]));
    g.position.set(0, 0.06, 0.4);
  }
  return g;
}

function buildBack(kind) {
  const g = new THREE.Group();
  if (kind === "cape") {
    const geo = new THREE.PlaneGeometry(0.7, 0.75, 6, 8);
    geo.translate(0, -0.37, 0);
    const cape = new THREE.Mesh(geo, candy(0xff2d4a, { side: THREE.DoubleSide }));
    cape.castShadow = true;
    cape.userData.wave = geo;
    cape.userData.base = geo.attributes.position.array.slice();
    g.add(cape);
    g.position.set(0, 0.72, 0.05);
    g.rotation.x = -1.2;
    g.userData.cape = cape;
  } else if (kind === "ailes") {
    const m = candy(0xbff3ff, { transparent: true, opacity: 0.75, transmission: 0, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const wing = mesh(GEO.sphere, m, [0.32, 0.03, 0.2], [s * 0.3, 0, 0]);
      wing.rotation.z = s * 0.5;
      const small = mesh(GEO.sphere, m, [0.2, 0.03, 0.14], [s * 0.24, -0.12, -0.1]);
      small.rotation.z = s * 0.2;
      g.add(wing, small);
    }
    g.position.set(0, 0.78, 0.05);
    g.userData.wings = true;
  } else if (kind === "fusee") {
    const m = candy(0xdfe4ec, { metalness: 0.5, roughness: 0.2 });
    for (const s of [-1, 1]) {
      g.add(mesh(GEO.capsule, m, [0.09, 0.14, 0.09], [s * 0.12, 0, 0]));
      g.add(mesh(GEO.cone, candy(0xff3d3d), [0.09, 0.12, 0.09], [s * 0.12, 0.2, 0]));
      const flame = mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.2, 0.3) }), [0.06, 0.2, 0.06], [s * 0.12, -0.22, 0], false);
      flame.rotation.x = Math.PI;
      flame.userData.flame = true;
      g.add(flame);
    }
    g.position.set(0, 0.74, -0.05);
    g.rotation.x = 0.35;
    g.userData.rocket = true;
  }
  return g;
}

// ---------------------------------------------------------------------------
// Construction des personnages
// ---------------------------------------------------------------------------

export function createToon(kind = "kichta", { skin = "caramel" } = {}) {
  const pucci = kind === "pucci";
  const s = pucci ? null : SKINS[skin] || SKINS.caramel;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const headMat = candy(0xffffff, { map: pucci ? pucciHeadTexture() : kichtaHeadTexture(s) });
  const bodyMat = candy(0xffffff, { map: pucci ? null : kichtaBodyTexture(s), color: pucci ? 0x1d1822 : 0xffffff });
  const baseMat = candy(pucci ? 0x1d1822 : s.base);
  const lightMat = candy(pucci ? 0xfffaf3 : s.light);
  const stripeMat = candy(pucci ? 0x1d1822 : s.stripe);
  const pinkMat = candy(pucci ? 0xff9fb5 : s.nose);
  const innerEar = candy(pucci ? 0xffb3c4 : 0xffb6a0);
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTexture(pucci ? "#d9d23a" : s.eye), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 });

  // Corps : petit et rond
  const body = new THREE.Group();
  body.position.y = 0.5;
  rig.add(body);
  const torso = mesh(GEO.sphere, bodyMat, [0.34, 0.31, 0.44]);
  torso.rotation.y = Math.PI / 2;
  body.add(torso);
  // Plastron clair
  body.add(mesh(GEO.sphere, lightMat, [0.25, 0.25, 0.2], [0, -0.04, 0.26]));
  if (pucci) body.add(mesh(GEO.sphere, lightMat, [0.3, 0.2, 0.36], [0, -0.13, 0]));

  // Tête : grosse, comme une figurine
  const head = new THREE.Group();
  head.position.set(0, 0.44, 0.3);
  body.add(head);
  head.add(mesh(GEO.sphere, headMat, [0.43, 0.39, 0.4]));
  // Joues rebondies et museau clair
  for (const side of [-1, 1]) head.add(mesh(GEO.sphere, lightMat, [0.12, 0.1, 0.1], [side * 0.09, -0.15, 0.31]));
  head.add(mesh(GEO.sphere, lightMat, [0.1, 0.07, 0.08], [0, -0.23, 0.27]));
  if (pucci) head.add(mesh(GEO.small, stripeMat, [0.06, 0.04, 0.03], [0, -0.26, 0.31]));
  // Nez
  const nose = mesh(GEO.sphere, pinkMat, [0.055, 0.04, 0.04], [0, -0.07, 0.39]);
  head.add(nose);
  if (pucci) head.add(mesh(GEO.small, stripeMat, [0.022, 0.018, 0.012], [-0.022, -0.065, 0.425]));
  // Yeux
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.16, 0.04, 0.4);
    eye.rotation.y = side * 0.28;
    const ball = mesh(GEO.sphere, eyeMat, [0.075, pucci ? 0.11 : 0.14, 0.12], [0, 0, 0], false);
    ball.rotation.y = -Math.PI / 2;
    eye.add(ball);
    head.add(eye);
    eyes.push(eye);
    if (pucci) {
      // Sourcils froncés de méchante
      const brow = mesh(GEO.capsule, stripeMat, [0.025, 0.11, 0.025], [side * 0.16, 0.2, 0.36], false);
      brow.rotation.z = Math.PI / 2 + side * 0.45;
      head.add(brow);
    }
  }
  // Oreilles larges (comme sur les photos de Kichta)
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.25, 0.3, -0.02);
    ear.rotation.set(-0.1, side * -0.35, side * -0.38);
    ear.add(mesh(GEO.cone, pucci ? baseMat : stripeMat, [0.16, 0.3, 0.07], [0, 0.1, 0]));
    ear.add(mesh(GEO.cone, innerEar, [0.1, 0.2, 0.03], [0, 0.07, 0.04], false));
    head.add(ear);
  }
  // Moustaches
  const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    for (const tilt of [-0.12, 0.08]) {
      const w = mesh(GEO.capsule, whiskerMat, [0.006, 0.14, 0.006], [side * 0.26, -0.13, 0.3], false);
      w.rotation.z = Math.PI / 2 + side * tilt;
      w.rotation.y = side * -0.3;
      head.add(w);
    }
  }
  // Sourire
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI), stripeMat);
  smile.position.set(0, -0.15, 0.38);
  smile.rotation.z = Math.PI;
  head.add(smile);

  if (pucci) {
    const collar = new THREE.Mesh(GEO.torus, candy(0xff7fae));
    collar.scale.set(0.27, 0.27, 0.27);
    collar.position.set(0, 0.2, 0.24);
    collar.rotation.x = Math.PI / 2 - 0.6;
    body.add(collar);
    const tag = new THREE.Group();
    tag.position.set(0, 0.08, 0.47);
    tag.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24), candy(0x111111)).rotateX(Math.PI / 2));
    tag.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 20), candy(0xffffff)).rotateX(Math.PI / 2));
    body.add(tag);
  }

  // Pattes courtes
  const legs = [];
  for (const [x, z, front] of [[-0.17, 0.24, true], [0.17, 0.24, true], [-0.17, -0.22, false], [0.17, -0.22, false]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.36, z);
    leg.add(mesh(GEO.capsule, pucci ? baseMat : baseMat, [0.09, 0.14, 0.09], [0, -0.14, 0]));
    leg.add(mesh(GEO.sphere, lightMat, [0.11, 0.08, 0.13], [0, -0.3, 0.03]));
    if (!pucci) leg.add(mesh(GEO.torus, stripeMat, [0.09, 0.09, 0.09], [0, -0.12, 0]).rotateX(Math.PI / 2));
    leg.userData = { front, side: Math.sign(x) };
    rig.add(leg);
    legs.push(leg);
  }

  // Queue annelée, au bout noir
  const tail = [];
  let parent = rig;
  const tailBase = new THREE.Group();
  tailBase.position.set(0, 0.6, -0.4);
  rig.add(tailBase);
  parent = tailBase;
  for (let i = 0; i < 9; i += 1) {
    const seg = i === 0 ? tailBase : new THREE.Group();
    if (i > 0) {
      seg.position.y = 0.1;
      parent.add(seg);
    }
    const r = (pucci ? 0.09 : 0.08) - i * 0.004;
    const mat = pucci ? baseMat : i >= 7 ? stripeMat : i % 2 ? stripeMat : baseMat;
    seg.add(mesh(GEO.sphere, mat, [r, 0.08, r], [0, 0.05, 0]));
    tail.push(seg);
    parent = seg;
  }

  // Accessoires
  const slots = { hat: new THREE.Group(), face: new THREE.Group(), back: new THREE.Group() };
  head.add(slots.hat, slots.face);
  rig.add(slots.back);

  root.userData = { rig, body, head, legs, tail, eyes, slots, kind, flash: [bodyMat, headMat, baseMat], outfit: {} };
  return root;
}

export function dressToon(toon, { hat = "none", face = "none", back = "none" } = {}) {
  const { slots, outfit } = toon.userData;
  const set = (slot, kind, build) => {
    if (outfit[slot] === kind) return;
    outfit[slot] = kind;
    slots[slot].clear();
    if (kind !== "none") slots[slot].add(build(kind));
  };
  set("hat", hat, buildHat);
  set("face", face, buildFace);
  set("back", back, buildBack);
}

/**
 * pose : run, jump, fall, slide, idle, hit, fly, win, throw
 */
export function animateToon(toon, t, pose = "run", { speed = 1, lean = 0, squash = 0 } = {}) {
  const { rig, body, head, legs, tail, eyes, slots } = toon.userData;
  const stride = t * 13 * speed;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  rig.scale.set(1, 1, 1);
  body.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);

  legs.forEach((leg) => {
    const { front, side } = leg.userData;
    let a = 0;
    if (pose === "run") a = Math.sin(stride + (front ? 0 : Math.PI) + (side > 0 ? 0.5 : 0)) * 1.0;
    else if (pose === "jump") a = front ? -1.2 : 1.0;
    else if (pose === "fall") a = front ? -0.5 : 0.6;
    else if (pose === "slide") a = front ? -1.45 : 1.45;
    else if (pose === "fly") a = Math.sin(t * 6 + side) * 0.35 + (front ? -0.4 : 0.4);
    else if (pose === "hit") a = Math.sin(t * 25 + side) * 0.6;
    else if (pose === "win") a = front ? -1.3 + Math.sin(t * 14) * 0.4 : 0.3;
    else if (pose === "throw") a = front && side > 0 ? -2.2 + Math.sin(t * 10) * 0.5 : 0;
    else a = Math.sin(t * 2 + side) * 0.05;
    leg.rotation.x = a;
  });

  if (pose === "run") {
    rig.position.y = Math.abs(Math.sin(stride)) * 0.1;
    body.rotation.x = Math.sin(stride * 2) * 0.05;
    head.rotation.x = -Math.sin(stride * 2) * 0.06;
  } else if (pose === "jump") {
    body.rotation.x = -0.3;
    head.rotation.x = 0.2;
  } else if (pose === "fall") {
    body.rotation.x = 0.2;
  } else if (pose === "slide") {
    rig.scale.set(1.12, 0.62, 1.1);
    rig.position.y = -0.05;
    head.rotation.x = -0.3;
  } else if (pose === "hit") {
    rig.rotation.z = 1.4;
    rig.position.y = 0.25;
  } else if (pose === "win") {
    rig.position.y = Math.abs(Math.sin(t * 7)) * 0.4;
    head.rotation.z = Math.sin(t * 7) * 0.2;
  } else if (pose === "fly") {
    body.rotation.x = -0.15;
    rig.position.y = Math.sin(t * 3) * 0.08;
  } else {
    body.rotation.x = Math.sin(t * 1.6) * 0.02;
    head.rotation.y = Math.sin(t * 0.7) * 0.3;
    head.rotation.x = Math.sin(t * 1.1) * 0.06;
  }
  rig.rotation.z += lean;
  if (squash) rig.scale.multiply(new THREE.Vector3(1 + squash * 0.25, 1 - squash * 0.3, 1 + squash * 0.25));

  // Clignement des yeux
  const blink = (t + 2) % 3.7 < 0.12 ? 0.15 : 1;
  eyes.forEach((e) => (e.scale.y = blink));

  tail.forEach((seg, i) => {
    const wave = pose === "run" ? 9 : 3.5;
    seg.rotation.x = i === 0 ? (pose === "slide" ? -1.2 : -0.9) : 0.18 + Math.sin(t * wave - i * 0.6) * 0.06;
    seg.rotation.z = Math.sin(t * wave * 0.7 - i * 0.5) * 0.16;
  });

  // Accessoires animés
  slots.back.children.forEach((g) => {
    if (g.userData.cape) {
      const cape = g.userData.cape;
      const pos = cape.userData.wave.attributes.position;
      const base = cape.userData.base;
      for (let i = 0; i < pos.count; i += 1) {
        const y = base[i * 3 + 1];
        pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 12 + y * 8) * 0.06 * -y;
      }
      pos.needsUpdate = true;
      g.rotation.x = pose === "run" || pose === "fly" ? -1.25 - Math.sin(t * 8) * 0.08 : -0.3;
    }
    if (g.userData.wings) g.children.forEach((w, i) => (w.rotation.y = Math.sin(t * 20) * 0.5 * (i < 2 ? 1 : -1)));
    if (g.userData.rocket) g.children.forEach((c) => c.userData.flame && c.scale.set(0.06, 0.15 + Math.random() * 0.15, 0.06));
  });
}

export function flashToon(toon, amount) {
  for (const m of toon.userData.flash) {
    m.emissive = m.emissive || new THREE.Color();
    m.emissive.setRGB(amount, amount * 0.25, amount * 0.25);
  }
}
