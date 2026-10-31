// Kichta et Pucci en 3D, modélisés d'après les photos des vrais chats.
// - Kichta : tigrée brune à rayures, menton et museau clairs, tour du nez
//   fauve, nez rose orangé, grands yeux vert-jaune, queue annelée au bout noir.
// - Pucci : noir et blanc, liseré blanc entre les yeux, museau et plastron
//   blancs, petite tache noire sous la bouche, nez rose taché de noir, pattes
//   blanches, collier rose avec une médaille ronde noire.
// Les modèles regardent vers +Z ; on les tourne dans la scène.
import * as THREE from "../vendor/three.module.min.js";

const gradientMap = (() => {
  const data = new Uint8Array([92, 92, 92, 255, 178, 178, 178, 255, 255, 255, 255, 255]);
  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

export function toon(color, options = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...options });
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x15101c, side: THREE.BackSide });

function outline(mesh, scale) {
  const shell = new THREE.Mesh(mesh.geometry, OUTLINE);
  shell.scale.setScalar(scale);
  shell.userData.isOutline = true;
  mesh.add(shell);
  return mesh;
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const GEO = {
  sphere: new THREE.SphereGeometry(1, 28, 18),
  small: new THREE.SphereGeometry(1, 14, 10),
  // Sphère couchée : l'axe suit la colonne vertébrale.
  spine: new THREE.SphereGeometry(1, 32, 20).rotateX(Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  leg: new THREE.CapsuleGeometry(0.045, 0.19, 4, 12),
};

function part(geometry, material, scale, position, { shadow = true, line = 0 } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  if (Array.isArray(scale)) mesh.scale.set(...scale);
  else mesh.scale.setScalar(scale);
  if (position) mesh.position.set(...position);
  mesh.castShadow = shadow;
  if (line) outline(mesh, line);
  return mesh;
}

// Bruit léger pour donner un aspect « poils » aux textures peintes.
function speckle(g, w, h, colors, count) {
  for (let index = 0; index < count; index += 1) {
    g.fillStyle = colors[index % colors.length];
    const x = Math.random() * w;
    const y = Math.random() * h;
    g.fillRect(x, y, 1 + Math.random() * 2, 3 + Math.random() * 5);
  }
}

// ---------------------------------------------------------------------------
// Textures de pelage
// ---------------------------------------------------------------------------
// Corps (sphère couchée) : x = tour du corps (ventre à 25 %, dos à 75 %),
// y = le long de la colonne.

function kichtaBody() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#8a6e51";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ["#a88a66", "#6e5640", "#b39674"], 2600);
    const spine = g.createLinearGradient(w * 0.58, 0, w * 0.92, 0);
    spine.addColorStop(0, "rgba(40,28,20,0)");
    spine.addColorStop(0.5, "rgba(40,28,20,.75)");
    spine.addColorStop(1, "rgba(40,28,20,0)");
    g.fillStyle = spine;
    g.fillRect(0, 0, w, h);
    // Rayures « maquereau » : fines, nombreuses, ondulées
    g.strokeStyle = "#2a1f17";
    g.lineCap = "round";
    for (let y = 8; y < h; y += 22) {
      g.lineWidth = 6 + ((y * 13) % 5);
      g.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const wave = Math.sin(x * 0.045 + y * 0.7) * 6 + Math.sin(x * 0.13 + y) * 3;
        if (x === 0) g.moveTo(x, y + wave);
        else g.lineTo(x, y + wave);
      }
      g.stroke();
    }
    const belly = g.createLinearGradient(w * 0.25 - 95, 0, w * 0.25 + 95, 0);
    belly.addColorStop(0, "rgba(190,160,122,0)");
    belly.addColorStop(0.35, "rgba(190,160,122,.92)");
    belly.addColorStop(0.65, "rgba(190,160,122,.92)");
    belly.addColorStop(1, "rgba(190,160,122,0)");
    g.fillStyle = belly;
    g.fillRect(0, 0, w, h);
  });
}

function pucciBody() {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#141218";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ["#22202a", "#0b0a0e"], 1600);
    // Ventre blanc large, comme sur la photo où elle est couchée sur le dos
    const belly = g.createLinearGradient(w * 0.25 - 130, 0, w * 0.25 + 130, 0);
    belly.addColorStop(0, "rgba(244,241,234,0)");
    belly.addColorStop(0.22, "rgba(244,241,234,1)");
    belly.addColorStop(0.78, "rgba(244,241,234,1)");
    belly.addColorStop(1, "rgba(244,241,234,0)");
    g.fillStyle = belly;
    g.fillRect(0, 0, w, h * 0.75);
    // Tache blanche sur le flanc
    g.fillStyle = "rgba(244,241,234,.95)";
    g.beginPath();
    g.ellipse(w * 0.06, h * 0.42, 34, 60, 0.3, 0, Math.PI * 2);
    g.fill();
  });
}

// Tête : la face regarde vers x = 25 % de la texture, le haut en haut.
function kichtaHead() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = "#8d7256";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ["#a98b68", "#6a523d"], 1400);
    const face = w * 0.25;
    g.strokeStyle = "#2a1f17";
    g.lineCap = "round";
    // Le « M » du front
    g.lineWidth = 7;
    for (const [x, len] of [[-30, 70], [-12, 85], [12, 85], [30, 70]]) {
      g.beginPath();
      g.moveTo(face + x, 20);
      g.lineTo(face + x * 0.55, 20 + len);
      g.stroke();
    }
    // Rayures du crâne et de la nuque
    g.lineWidth = 8;
    for (let x = face + 80; x < face + 420; x += 26) {
      g.beginPath();
      g.moveTo(x % w, 6);
      g.lineTo((x + 10) % w, 120);
      g.stroke();
    }
    // Traits des joues qui partent du coin des yeux
    g.lineWidth = 5;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(face + side * 46, 120);
      g.quadraticCurveTo(face + side * 70, 132, face + side * 92, 128);
      g.stroke();
      g.beginPath();
      g.moveTo(face + side * 52, 150);
      g.lineTo(face + side * 88, 160);
      g.stroke();
    }
    // Tour du nez fauve et menton clair
    const tan = g.createRadialGradient(face, 170, 6, face, 170, 60);
    tan.addColorStop(0, "rgba(201,146,104,.95)");
    tan.addColorStop(1, "rgba(201,146,104,0)");
    g.fillStyle = tan;
    g.fillRect(0, 0, w, h);
    const chin = g.createRadialGradient(face, h, 10, face, h, 70);
    chin.addColorStop(0, "rgba(236,226,208,1)");
    chin.addColorStop(1, "rgba(236,226,208,0)");
    g.fillStyle = chin;
    g.fillRect(0, 0, w, h);
  });
}

function pucciHead() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = "#141218";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, ["#22202a", "#0b0a0e"], 900);
    const face = w * 0.25;
    // Liseré blanc : fin entre les yeux, très large sur le museau et le menton
    g.fillStyle = "#f4f1ea";
    g.beginPath();
    g.moveTo(face - 5, 55);
    g.lineTo(face + 5, 55);
    g.quadraticCurveTo(face + 18, 130, face + 82, h);
    g.lineTo(face - 82, h);
    g.quadraticCurveTo(face - 18, 130, face - 5, 55);
    g.closePath();
    g.fill();
  });
}

// Patte (capsule) : y = le long de la patte, bas de la patte en bas.
function legTexture(kind) {
  return canvasTexture(64, 128, (g, w, h) => {
    if (kind === "kichta") {
      g.fillStyle = "#866a4e";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#2a1f17";
      for (let y = 16; y < h - 10; y += 22) g.fillRect(0, y, w, 7);
    } else {
      // Patte noire avec une chaussette blanche
      g.fillStyle = "#141218";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f4f1ea";
      g.fillRect(0, h * 0.58, w, h);
    }
  });
}

const LOOKS = {
  kichta: {
    body: kichtaBody,
    head: kichtaHead,
    chest: 0x9a7d5e,
    hip: 0x7d6349,
    muzzle: 0xe9ddc8,
    paw: 0x6e5741,
    eye: 0xb4ba62,
    nose: 0xd98a72,
    earOuter: 0x7d6349,
    earInner: 0xd9a08a,
    tail: [0x8a6e51, 0x2a1f17],
    tailTip: 0x1f1712,
    scale: 1,
  },
  pucci: {
    body: pucciBody,
    head: pucciHead,
    chest: 0xf4f1ea,
    hip: 0x141218,
    muzzle: 0xf4f1ea,
    paw: 0xf4f1ea,
    eye: 0xd6cf4a,
    nose: 0xeaa3a3,
    earOuter: 0x141218,
    earInner: 0xc98d8d,
    tail: [0x141218, 0x141218],
    tailTip: 0x141218,
    scale: 1.08,
  },
};

// ---------------------------------------------------------------------------

export function createCat(kind) {
  const look = LOOKS[kind];
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const bodyMaterial = toon(0xffffff, { map: look.body() });
  const headMaterial = toon(0xffffff, { map: look.head() });
  const legMaterial = toon(0xffffff, { map: legTexture(kind) });
  const chestMaterial = toon(look.chest);
  const hipMaterial = toon(look.hip);
  const muzzleMaterial = toon(look.muzzle);
  const pawMaterial = toon(look.paw);
  const earOuterMaterial = toon(look.earOuter);
  const earInnerMaterial = toon(look.earInner);
  const noseMaterial = toon(look.nose);
  const eyeMaterial = toon(look.eye, { emissive: new THREE.Color(look.eye), emissiveIntensity: 0.18 });
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x07060a });
  const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const darkMaterial = toon(0x141218);

  // Corps
  const torso = new THREE.Group();
  torso.position.y = 0.34;
  rig.add(torso);
  const width = kind === "pucci" ? 0.21 : 0.185;
  torso.add(part(GEO.spine, bodyMaterial, [width, 0.17, 0.36], [0, 0, 0], { line: 1.05 }));
  torso.add(part(GEO.sphere, chestMaterial, [0.15, 0.16, 0.14], [0, -0.01, 0.23]));
  torso.add(part(GEO.sphere, hipMaterial, [width * 0.86, 0.15, 0.15], [0, 0.03, -0.22]));

  // Tête
  const head = new THREE.Group();
  head.position.set(0, 0.17, 0.34);
  torso.add(head);
  head.add(part(GEO.sphere, headMaterial, [0.15, 0.136, 0.14], [0, 0, 0], { line: 1.06 }));
  for (const side of [-1, 1]) {
    // Joues et museau
    head.add(part(GEO.sphere, muzzleMaterial, [0.05, 0.042, 0.045], [side * 0.033, -0.052, 0.112]));
    // Yeux : grands, en amande, avec la pupille verticale et un reflet
    const eye = part(GEO.small, eyeMaterial, [0.036, 0.034, 0.02], [side * 0.058, 0.024, 0.116], { shadow: false });
    eye.rotation.set(0, side * 0.35, side * -0.18);
    eye.add(part(GEO.small, pupilMaterial, [0.3, 0.86, 0.5], [0, 0, 0.62], { shadow: false }));
    eye.add(part(GEO.small, whiteMaterial, [0.15, 0.15, 0.2], [0.3, 0.38, 0.8], { shadow: false }));
    const rim = part(GEO.small, pupilMaterial, [1.12, 1.1, 0.7], [0, 0, -0.15], { shadow: false });
    eye.add(rim);
    head.add(eye);
    // Oreilles pointues
    const ear = new THREE.Group();
    ear.position.set(side * 0.085, 0.105, -0.01);
    ear.rotation.set(-0.12, side * -0.3, side * -0.3);
    ear.add(part(GEO.cone, earOuterMaterial, [0.06, 0.12, 0.03], [0, 0.045, 0], { line: 1.12 }));
    ear.add(part(GEO.cone, earInnerMaterial, [0.038, 0.08, 0.012], [0, 0.034, 0.017], { shadow: false }));
    head.add(ear);
    // Moustaches blanches, longues
    for (const tilt of [-0.14, 0, 0.12]) {
      const whisker = part(GEO.box, whiteMaterial, [0.15, 0.0025, 0.0025], [side * 0.12, -0.055, 0.11], { shadow: false });
      whisker.rotation.set(0, side * -0.25, side * tilt);
      head.add(whisker);
    }
  }
  // Nez
  const nose = part(GEO.sphere, noseMaterial, [0.024, 0.017, 0.017], [0, -0.022, 0.148], { shadow: false });
  head.add(nose);
  // Menton
  head.add(part(GEO.sphere, muzzleMaterial, [0.038, 0.026, 0.032], [0, -0.088, 0.088]));

  if (kind === "pucci") {
    // Tache noire sur le nez rose, et petite « barbichette » noire sous la bouche
    head.add(part(GEO.small, darkMaterial, [0.012, 0.008, 0.008], [-0.008, -0.014, 0.162], { shadow: false }));
    head.add(part(GEO.sphere, darkMaterial, [0.03, 0.022, 0.016], [0, -0.092, 0.112], { shadow: false }));
    // Collier rose et médaille ronde noire au centre blanc
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 28), toon(0xf2a0b8));
    collar.position.set(0, 0.12, 0.33);
    collar.rotation.x = Math.PI / 2 - 0.9;
    torso.add(collar);
    const tag = new THREE.Group();
    tag.position.set(0, 0.05, 0.42);
    tag.rotation.x = -0.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 20), darkMaterial);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), toon(0xf2f2f2));
    disc.position.z = 0.003;
    tag.add(ring, disc);
    torso.add(tag);
  }

  // Pattes (avant à z > 0)
  const legs = [];
  [
    { x: -0.1, z: 0.22, front: true, side: -1 },
    { x: 0.1, z: 0.22, front: true, side: 1 },
    { x: -0.1, z: -0.23, front: false, side: -1 },
    { x: 0.1, z: -0.23, front: false, side: 1 },
  ].forEach((layout) => {
    const leg = new THREE.Group();
    leg.position.set(layout.x, 0.3, layout.z);
    const upper = new THREE.Mesh(GEO.leg, legMaterial);
    upper.position.y = -0.13;
    upper.castShadow = true;
    outline(upper, 1.12);
    leg.add(upper);
    leg.add(part(GEO.sphere, pawMaterial, [0.053, 0.037, 0.07], [0, -0.265, 0.018], { line: 1.1 }));
    leg.userData = layout;
    rig.add(leg);
    legs.push(leg);
  });

  // Queue : chaîne de segments, annelée pour Kichta
  const tail = [];
  let parent = new THREE.Group();
  parent.position.set(0, 0.4, -0.33);
  rig.add(parent);
  const count = 11;
  for (let index = 0; index < count; index += 1) {
    const segment = index === 0 ? parent : new THREE.Group();
    if (index > 0) {
      segment.position.z = -0.064;
      parent.add(segment);
    }
    const radius = (kind === "pucci" ? 0.04 : 0.033) - index * 0.0015;
    const color = index >= count - 2 ? look.tailTip : look.tail[index % 2];
    segment.add(part(GEO.small, toon(color), [radius, radius, 0.05], [0, 0, -0.03]));
    tail.push(segment);
    parent = segment;
  }

  root.scale.setScalar(look.scale);
  root.userData = { rig, torso, head, legs, tail, kind, flashMaterials: [bodyMaterial, headMaterial] };
  return root;
}

// pose : "run" (galop), "jump", "fall", "hurt", "idle"
export function animateCat(cat, time, pose = "run", { speed = 1, swat = 0 } = {}) {
  const { rig, torso, head, legs, tail } = cat.userData;
  const stride = time * 15 * speed;
  rig.rotation.set(0, 0, 0);
  rig.position.set(0, 0, 0);

  legs.forEach((leg) => {
    const { front, side } = leg.userData;
    let angle = 0;
    if (pose === "run") {
      // Galop : les pattes avant puis arrière, légèrement décalées
      const phase = (front ? 0 : Math.PI) + (side > 0 ? 0.45 : 0);
      angle = Math.sin(stride + phase) * 0.95;
    } else if (pose === "jump") {
      angle = front ? -1.05 : 0.95;
    } else if (pose === "fall") {
      angle = front ? -0.35 : 0.5;
    } else if (pose === "hurt") {
      angle = Math.sin(time * 30 + side) * 0.3;
    } else {
      angle = Math.sin(time * 2 + side) * 0.05;
    }
    if (swat > 0 && front && side > 0) angle = -2 * swat;
    leg.rotation.x = angle;
  });

  if (pose === "run") {
    rig.position.y = Math.abs(Math.sin(stride)) * 0.05;
    torso.rotation.x = Math.sin(stride) * 0.09;
    head.rotation.x = -Math.sin(stride) * 0.08;
  } else if (pose === "jump") {
    torso.rotation.x = -0.25;
    head.rotation.x = 0.15;
  } else if (pose === "fall") {
    torso.rotation.x = 0.18;
    head.rotation.x = -0.1;
  } else if (pose === "hurt") {
    rig.rotation.z = 1.35;
    rig.position.y = 0.14;
    torso.rotation.x = 0;
    head.rotation.x = 0.3;
  } else {
    torso.rotation.x = Math.sin(time * 1.6) * 0.02;
    head.rotation.x = Math.sin(time * 1.1) * 0.05;
  }
  head.rotation.y = pose === "idle" ? Math.sin(time * 0.8) * 0.25 : 0;

  tail.forEach((segment, index) => {
    const lift = pose === "run" ? 0.12 : pose === "jump" ? -0.05 : 0.5;
    segment.rotation.x = index === 0 ? lift + 0.1 : 0.1 + Math.sin(time * 6 - index * 0.5) * 0.04;
    segment.rotation.y = Math.sin(time * (pose === "run" ? 9 : 3) - index * 0.55) * 0.14;
  });
}
