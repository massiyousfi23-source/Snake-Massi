// Rendu 3D de Kichta Run : une ruelle de nuit vue de derrière Kichta.
// La logique (game.js) garde ses coordonnées 2D en pixels :
// x (vers la droite) devient la profondeur devant Kichta (-Z), y (vers le bas)
// devient la hauteur. 100 pixels = 1 unité 3D.
import * as THREE from "../vendor/three.module.min.js";
import { animateCat, createCat, toon } from "./cats.js?v=3d3";
import { setFurQuality } from "./furshell.js?v=3d3";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment } from "../vendor/three.addons.min.js";

const U = 100;

function canvasTexture(width, height, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// ---------------------------------------------------------------------------
// Textures du décor
// ---------------------------------------------------------------------------

function cobbleTexture() {
  const texture = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#3a3340";
    g.fillRect(0, 0, w, h);
    const size = 32;
    for (let y = 0; y < h; y += size) {
      const offset = (y / size) % 2 ? size / 2 : 0;
      for (let x = -size; x < w + size; x += size) {
        const shade = 70 + Math.floor(Math.random() * 30);
        g.fillStyle = `rgb(${shade - 8},${shade - 14},${shade})`;
        g.beginPath();
        g.roundRect(x + offset + 2, y + 2, size - 4, size - 4, 7);
        g.fill();
      }
    }
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function facadeTexture(base, seed) {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256;
  glowCanvas.height = 512;
  const glow = glowCanvas.getContext("2d");
  glow.fillStyle = "#000";
  glow.fillRect(0, 0, 256, 512);
  const texture = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // Briques discrètes
    g.fillStyle = "rgba(0,0,0,.12)";
    for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 2);
    const cols = 3;
    const rows = 6;
    let random = seed;
    const next = () => {
      random = (random * 9301 + 49297) % 233280;
      return random / 233280;
    };
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = 26 + col * 76;
        const y = 30 + row * 78;
        const lit = next() > 0.45;
        g.fillStyle = "#1c1a24";
        g.fillRect(x - 4, y - 4, 52, 62);
        g.fillStyle = lit ? (next() > 0.5 ? "#ffd27a" : "#ffb35c") : "#2b3550";
        g.fillRect(x, y, 44, 54);
        if (lit) {
          glow.fillStyle = g.fillStyle;
          glow.fillRect(x, y, 44, 54);
          glow.fillStyle = "rgba(0,0,0,.6)";
          glow.fillRect(x + 20, y, 4, 54);
          glow.fillRect(x, y + 25, 44, 4);
        }
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(x + 20, y, 4, 54);
        g.fillRect(x, y + 25, 44, 4);
        if (lit && next() > 0.6) {
          // Silhouette d'un chat à la fenêtre
          g.fillStyle = "#1c1a24";
          g.beginPath();
          g.ellipse(x + 12, y + 46, 8, 7, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.moveTo(x + 6, y + 40);
          g.lineTo(x + 8, y + 33);
          g.lineTo(x + 11, y + 39);
          g.moveTo(x + 13, y + 39);
          g.lineTo(x + 16, y + 33);
          g.lineTo(x + 18, y + 40);
          g.fill();
        }
      }
    }
  });
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.glow = glowTexture;
  return texture;
}

function signTexture(text, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = "#120d1c";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.font = "900 64px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

function wallTexture() {
  return canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = "#9a6a48";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#4d3021";
    g.lineWidth = 6;
    for (let y = 0; y < h; y += 52) {
      for (let x = -((y / 52) % 2) * 38; x < w; x += 76) g.strokeRect(x, y, 76, 52);
    }
    g.fillStyle = "#ffdd64";
    g.strokeStyle = "#3a1c0e";
    g.lineWidth = 8;
    g.font = "900 66px sans-serif";
    g.textAlign = "center";
    g.strokeText("TIRE !", w / 2, h * 0.5);
    g.fillText("TIRE !", w / 2, h * 0.5);
  });
}

// ---------------------------------------------------------------------------
// Obstacles 3D (dimensions reprises de la version 2D)
// ---------------------------------------------------------------------------

function addBox(group, material, sx, sy, sz, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, material, rt, rb, height, x, y, z, segments = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, height, segments), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

const sharedWallTexture = wallTexture();

const OBSTACLES = {
  chair: () => {
    const g = new THREE.Group();
    const wood = toon(0x8b5338);
    const dark = toon(0x5b3425);
    addBox(g, wood, 0.6, 0.07, 0.6, 0, 0.45, 0);
    for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25]) addBox(g, dark, 0.06, 0.45, 0.06, x, 0.22, z);
    addBox(g, wood, 0.6, 0.4, 0.07, 0, 0.66, -0.27);
    return g;
  },
  lamp: () => {
    const g = new THREE.Group();
    addCylinder(g, toon(0x6b5844), 0.18, 0.2, 0.06, 0, 0.03, 0);
    addCylinder(g, toon(0x6b5844), 0.03, 0.03, 0.7, 0, 0.38, 0, 8);
    const shade = addCylinder(g, toon(0xe8c067, { emissive: new THREE.Color(0xffcf70), emissiveIntensity: 0.6 }), 0.14, 0.24, 0.3, 0, 0.84, 0);
    shade.castShadow = false;
    return g;
  },
  vacuum: () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), toon(0x56759b));
    body.scale.set(0.3, 0.24, 0.32);
    body.position.y = 0.28;
    body.castShadow = true;
    g.add(body);
    addBox(g, toon(0x243a51), 0.55, 0.1, 0.5, 0, 0.06, 0);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 20, Math.PI), toon(0x859eb9));
    hose.position.set(0, 0.4, -0.1);
    hose.rotation.y = Math.PI / 2;
    g.add(hose);
    return g;
  },
  laundry: () => {
    const g = new THREE.Group();
    addBox(g, toon(0xd9c2a1), 0.62, 0.55, 0.55, 0, 0.28, 0);
    for (const [x, z, color] of [[-0.12, 0.05, 0xe56875], [0.14, -0.05, 0x61a8d1], [0, 0.12, 0xffd34e]]) {
      const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), toon(color));
      cloth.position.set(x, 0.6, z);
      cloth.scale.y = 0.6;
      cloth.castShadow = true;
      g.add(cloth);
    }
    return g;
  },
  toy: () => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), toon(0xe65f64));
    ball.position.y = 0.2;
    ball.castShadow = true;
    g.add(ball);
    for (const x of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(x, 0.26, 0.16);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0x25242b }));
      pupil.position.z = 0.04;
      eye.add(pupil);
      g.add(eye);
    }
    return g;
  },
  wall: () => {
    const g = new THREE.Group();
    const face = new THREE.MeshStandardMaterial({ map: sharedWallTexture, roughness: 0.9 });
    const side = toon(0x7d5238);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.58, 0.82), [side, side, side, side, face, face]);
    mesh.position.y = 0.79;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
  },
};

// ---------------------------------------------------------------------------

export function createRunWorld({ canvas, world, hud }) {
  const { W, H, GROUND } = world;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  const nightColor = new THREE.Color(0x141a33);
  const bossColor = new THREE.Color(0x2a1238);
  scene.background = nightColor.clone();
  scene.fog = new THREE.Fog(nightColor.clone(), 11, 30);
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 80);
  // Reflets doux : environnement d'intérieur pré-calculé, très atténué la nuit
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  // Halo lumineux autour des lampes, fenêtres, enseignes et tirs
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(960, 540), 0.42, 0.4, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let bloomOn = true;

  // Lumières de nuit
  const hemisphere = new THREE.HemisphereLight(0x8ea4ff, 0x2a2030, 1.5);
  scene.add(hemisphere);
  const moonLight = new THREE.DirectionalLight(0xcfd8ff, 1.6);
  moonLight.position.set(-4, 9, -6);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  Object.assign(moonLight.shadow.camera, { left: -6, right: 6, top: 6, bottom: -10, near: 1, far: 30 });
  moonLight.shadow.bias = -0.0008;
  moonLight.target.position.set(0, 0, -2);
  scene.add(moonLight, moonLight.target);
  const catGlow = new THREE.PointLight(0xffc98a, 6, 6, 1.6);
  scene.add(catGlow);

  // Lune et étoiles au bout de la ruelle
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c4).multiplyScalar(1.3), fog: false }));
  moon.position.set(-4, 13, -60);
  scene.add(moon);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: 0.12, fog: false, depthWrite: false }),
  );
  halo.position.copy(moon.position).add(new THREE.Vector3(0, 0, -1));
  scene.add(halo);
  const starPositions = [];
  for (let index = 0; index < 260; index += 1) {
    starPositions.push((Math.random() - 0.5) * 80, 8 + Math.random() * 30, -30 - Math.random() * 40);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, fog: false }),
  );
  scene.add(stars);

  // Route pavée qui défile
  const cobble = cobbleTexture();
  cobble.repeat.set(2, 30);
  // Pavés mouillés : rugosité faible pour refléter les lumières
  const road = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 48), new THREE.MeshStandardMaterial({ map: cobble, roughness: 0.34, metalness: 0.2 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -18);
  road.receiveShadow = true;
  scene.add(road);
  const sidewalkMaterial = toon(0x4a4152);
  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 48), sidewalkMaterial);
    sidewalk.position.set(side * 2.3, 0.06, -18);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 48), toon(0xc48f58));
    curb.position.set(side * 1.62, 0.07, -18);
    scene.add(curb);
  }

  // Immeubles des deux côtés, recyclés à mesure que la ruelle défile
  const facadeColors = ["#5b4a6b", "#6b4a4a", "#4a5b6b", "#6b5d4a", "#4f6b5a", "#5a4f7a"];
  const facades = facadeColors.map((color, index) => facadeTexture(color, index * 97 + 13));
  const signs = [
    signTexture("CROQUETTES", "#ffd34e"),
    signTexture("KICHTA", "#91ff65"),
    signTexture("CHAT NOIR", "#ff59c7"),
    signTexture("PÂTÉE 24/7", "#44e5e7"),
  ];
  const buildings = [];
  let buildingCursor = { left: -6, right: -6 };
  function placeBuilding(building, side) {
    const depth = 2.6 + Math.random() * 2.4;
    const height = 4 + Math.random() * 6;
    building.mesh.scale.set(3, height, depth);
    building.mesh.position.y = height / 2;
    const facade = facades[Math.floor(Math.random() * facades.length)];
    for (const i of [0, 1, 4, 5]) {
      building.mesh.material[i].map = facade;
      building.mesh.material[i].emissiveMap = facade.userData.glow;
    }
    building.track = buildingCursor[side] + depth / 2;
    building.depth = depth;
    buildingCursor[side] += depth + 0.15;
    building.sign.visible = Math.random() > 0.55;
    if (building.sign.visible) {
      building.sign.material.map = signs[Math.floor(Math.random() * signs.length)];
      building.sign.material.needsUpdate = true;
      building.sign.position.y = 2.2 + Math.random() * 1.2;
    }
  }
  for (const side of ["left", "right"]) {
    for (let index = 0; index < 13; index += 1) {
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0.75 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [material, material, toon(0x221c2a), toon(0x221c2a), material, material]);
      mesh.receiveShadow = true;
      const group = new THREE.Group();
      group.add(mesh);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) }));
      sign.rotation.y = side === "left" ? Math.PI / 2 : -Math.PI / 2;
      sign.position.x = side === "left" ? 1.52 : -1.52;
      group.add(sign);
      group.position.x = side === "left" ? -4.5 : 4.5;
      scene.add(group);
      const building = { group, mesh, sign, side, track: 0, depth: 3 };
      placeBuilding(building, side);
      buildings.push(building);
    }
  }

  // Lampadaires
  const lamps = [];
  const poleMaterial = toon(0x2a2633);
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2a0).multiplyScalar(2.5) });
  const coneMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd58a,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let index = 0; index < 10; index += 1) {
    const side = index % 2 ? 1 : -1;
    const lamp = new THREE.Group();
    addCylinder(lamp, poleMaterial, 0.05, 0.07, 3, 0, 1.5, 0, 8);
    addBox(lamp, poleMaterial, 0.7, 0.06, 0.06, -side * 0.32, 2.98, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), bulbMaterial);
    bulb.position.set(-side * 0.62, 2.9, 0);
    lamp.add(bulb);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.9, 20, 1, true), coneMaterial);
    cone.position.set(-side * 0.62, 1.45, 0);
    lamp.add(cone);
    lamp.position.x = side * 2.4;
    lamp.userData.track = index * 4;
    scene.add(lamp);
    lamps.push(lamp);
  }

  // Personnages
  const kichta = createCat("kichta");
  kichta.scale.setScalar(1.6);
  kichta.rotation.y = Math.PI;
  scene.add(kichta);
  const pucci = createCat("pucci");
  pucci.scale.setScalar(3);
  pucci.visible = false;
  scene.add(pucci);

  // Obstacles, croquettes et tirs
  const obstacleMeshes = new Map();
  const kibbleGeometry = new THREE.OctahedronGeometry(0.16, 0);
  const kibbleMaterial = new THREE.MeshStandardMaterial({ color: 0xd98b43, roughness: 0.42, metalness: 0.1, emissive: 0xffa040, emissiveIntensity: 0.55 });
  const brickMeshes = new Map();
  const shotMeshes = new Map();
  const shotGeometry = new THREE.ConeGeometry(0.1, 0.45, 10).rotateX(-Math.PI / 2);
  const shotMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe051).multiplyScalar(3) });
  const bossShotMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff694f).multiplyScalar(3) });

  // Particules
  const dustMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 500);
  dustMesh.frustumCulled = false;
  dustMesh.count = 0;
  scene.add(dustMesh);
  const kibbleFx = new THREE.InstancedMesh(kibbleGeometry, kibbleMaterial, 40);
  kibbleFx.frustumCulled = false;
  kibbleFx.count = 0;
  scene.add(kibbleFx);
  const booms = [];
  for (let index = 0; index < 6; index += 1) {
    const boom = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    boom.visible = false;
    scene.add(boom);
    booms.push(boom);
  }
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const color = new THREE.Color();

  // Caméra
  const cameraState = { position: new THREE.Vector3(2.5, 2, 3), target: new THREE.Vector3(0, 0.6, 0), ready: false };
  let viewWidth = 1;
  let viewHeight = 1;
  let shakeLevel = 0;
  let lastBossThrow = -10;
  const seenBossObjects = new WeakSet();

  // Pluie fine : segments qui tombent devant la caméra et brillent sous les lampes
  const RAIN = 900;
  const rainPositions = new Float32Array(RAIN * 6);
  const rainSeeds = [];
  for (let i = 0; i < RAIN; i += 1) {
    rainSeeds.push({ x: (Math.random() - 0.5) * 9, y: Math.random() * 7, z: 3 - Math.random() * 22, v: 7 + Math.random() * 3 });
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(
    rainGeometry,
    new THREE.LineBasicMaterial({ color: 0xb7c6ff, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  rain.frustumCulled = false;
  scene.add(rain);
  function updateRain(delta, run) {
    if (!rain.visible) return;
    for (let i = 0; i < RAIN; i += 1) {
      const d = rainSeeds[i];
      d.y -= d.v * delta;
      d.z += run * delta;
      if (d.y < 0 || d.z > 4) {
        d.y = 5 + Math.random() * 2;
        d.z = 3 - Math.random() * 22;
        d.x = (Math.random() - 0.5) * 9;
      }
      const j = i * 6;
      rainPositions[j] = d.x;
      rainPositions[j + 1] = d.y;
      rainPositions[j + 2] = d.z;
      rainPositions[j + 3] = d.x - 0.01;
      rainPositions[j + 4] = d.y + 0.22;
      rainPositions[j + 5] = d.z - run * 0.02;
    }
    rainGeometry.attributes.position.needsUpdate = true;
  }

  // Conversions
  const catCenterX = (game) => game.cat.x + game.cat.w / 2;
  const depthOf = (game, x, width = 0) => -((x + width / 2 - catCenterX(game)) / U);
  const heightOf = (y) => (GROUND - y) / U;

  // Qualité adaptative
  const quality = { level: 0, ratios: [1.75, 1.25, 1, 0.8], frames: 0, slow: 0, deviceRatio: 1 };
  function adaptQuality(delta) {
    if (quality.level >= quality.ratios.length - 1) return;
    quality.frames += 1;
    if (delta > 1 / 40) quality.slow += 1;
    if (quality.frames < 90) return;
    if (quality.slow > 45) {
      quality.level += 1;
      renderer.setPixelRatio(Math.min(quality.deviceRatio, quality.ratios[quality.level]));
      renderer.setSize(viewWidth, viewHeight, false);
      composer.setPixelRatio(Math.min(quality.deviceRatio, quality.ratios[quality.level]));
      composer.setSize(viewWidth, viewHeight);
      if (quality.level >= 1) {
        setFurQuality(kichta, 2);
        setFurQuality(pucci, 2);
      }
      if (quality.level >= 2) bloomOn = false;
      if (quality.level >= 3) {
        setFurQuality(kichta, 4);
        setFurQuality(pucci, 4);
        rain.visible = false;
      }
      if (quality.level >= 2) {
        renderer.shadowMap.enabled = false;
        scene.traverse((object) => {
          if (object.material && !Array.isArray(object.material)) object.material.needsUpdate = true;
        });
      }
    }
    quality.frames = 0;
    quality.slow = 0;
  }

  function resize(width, height, pixelRatio) {
    viewWidth = Math.max(1, width);
    viewHeight = Math.max(1, height);
    quality.deviceRatio = pixelRatio;
    renderer.setPixelRatio(Math.min(pixelRatio, quality.ratios[quality.level]));
    renderer.setSize(viewWidth, viewHeight, false);
    composer.setPixelRatio(Math.min(pixelRatio, quality.ratios[quality.level]));
    composer.setSize(viewWidth, viewHeight);
    camera.aspect = viewWidth / viewHeight;
    camera.fov = camera.aspect < 1 ? 70 : 58;
    camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------------

  function syncScenery(game, time) {
    const travelled = game.worldX / U;
    cobble.offset.y = travelled / (48 / 30);
    buildings.forEach((building) => {
      let z = -(building.track - travelled);
      if (z - building.depth / 2 > 6) {
        // L'immeuble est passé derrière la caméra : on le replace au bout.
        placeBuilding(building, building.side);
        z = -(building.track - travelled);
      }
      building.group.position.z = z;
    });
    lamps.forEach((lamp) => {
      let z = -(lamp.userData.track - travelled);
      if (z > 6) {
        lamp.userData.track += 40;
        z = -(lamp.userData.track - travelled);
      }
      lamp.position.z = z;
    });
    const boss = ["boss", "bossEnding"].includes(game.mode) ? 1 : 0;
    scene.userData.bossBlend = THREE.MathUtils.damp(scene.userData.bossBlend ?? 0, boss, 2, 1 / 60);
    const blend = scene.userData.bossBlend;
    scene.background.copy(nightColor).lerp(bossColor, blend);
    scene.fog.color.copy(scene.background);
    hemisphere.color.setHex(0x8ea4ff).lerp(new THREE.Color(0xd08aff), blend);
    stars.rotation.z = Math.sin(time * 0.05) * 0.02;
  }

  function syncKichta(game, time) {
    const cat = game.cat;
    const height = heightOf(cat.y + cat.h);
    kichta.position.set(0, height, 0);
    let pose = "run";
    if (game.mode === "over" || cat.frame === 5) pose = "hurt";
    else if (["ready", "won", "cinematic"].includes(game.mode)) pose = "idle";
    else if (!cat.onGround) pose = cat.vy < 0 ? "jump" : "fall";
    else if (game.mode === "paused") pose = "idle";
    const speedFactor = game.speed / 360;
    animateCat(kichta, time, pose, { speed: speedFactor });
    kichta.rotation.y = pose === "idle" && game.mode !== "paused" ? Math.PI + Math.sin(time * 0.4) * 0.15 : Math.PI;
    catGlow.position.set(0.6, height + 1.6, 0.8);
  }

  function obstacleMesh(obstacle) {
    let mesh = obstacleMeshes.get(obstacle);
    if (!mesh) {
      mesh = (OBSTACLES[obstacle.type] ?? OBSTACLES.toy)();
      scene.add(mesh);
      obstacleMeshes.set(obstacle, mesh);
    }
    return mesh;
  }

  function syncObstacles(game, time) {
    const alive = new Set(game.obstacles);
    for (const [obstacle, mesh] of obstacleMeshes) {
      if (alive.has(obstacle)) continue;
      scene.remove(mesh);
      obstacleMeshes.delete(obstacle);
    }
    game.obstacles.forEach((obstacle) => {
      const mesh = obstacleMesh(obstacle);
      const z = depthOf(game, obstacle.x, obstacle.w);
      mesh.position.set(0, heightOf(obstacle.y + obstacle.h), z);
      if (obstacle.fromBoss) {
        // Objets lancés par Pucci : ils tournoient en arrivant
        if (!seenBossObjects.has(obstacle)) {
          seenBossObjects.add(obstacle);
          lastBossThrow = time;
        }
        mesh.rotation.y = time * 6;
        mesh.position.y += Math.abs(Math.sin(time * 9)) * 0.12;
      } else {
        mesh.rotation.y = obstacle.type === "wall" ? 0 : Math.PI;
      }
      mesh.visible = z < 1.6;
    });
  }

  function syncBricks(game, time) {
    const alive = new Set(game.bricks);
    for (const [brick, mesh] of brickMeshes) {
      if (alive.has(brick) && !brick.hit) continue;
      scene.remove(mesh);
      brickMeshes.delete(brick);
    }
    game.bricks.forEach((brick) => {
      if (brick.hit) return;
      let mesh = brickMeshes.get(brick);
      if (!mesh) {
        mesh = new THREE.Mesh(kibbleGeometry, kibbleMaterial);
        mesh.scale.set(1.3, 1, 1.3);
        mesh.castShadow = true;
        scene.add(mesh);
        brickMeshes.set(brick, mesh);
      }
      mesh.position.set(0, heightOf(brick.y + brick.h / 2) + Math.sin(time * 4 + brick.x) * 0.05, depthOf(game, brick.x, brick.w));
      mesh.rotation.set(time * 1.3, time * 2.2 + brick.x, 0);
    });
  }

  function syncShots(game) {
    const alive = new Set(game.shots);
    for (const [shot, mesh] of shotMeshes) {
      if (alive.has(shot)) continue;
      scene.remove(mesh);
      shotMeshes.delete(shot);
    }
    game.shots.forEach((shot) => {
      let mesh = shotMeshes.get(shot);
      if (!mesh) {
        mesh = new THREE.Mesh(shotGeometry, shot.boss ? bossShotMaterial : shotMaterial);
        const glow = new THREE.PointLight(shot.boss ? 0xff694f : 0xffe051, 4, 3, 2);
        mesh.add(glow);
        scene.add(mesh);
        shotMeshes.set(shot, mesh);
      }
      mesh.position.set(0, heightOf(shot.y + shot.h / 2), depthOf(game, shot.x, shot.w));
    });
  }

  function syncBoss(game, time) {
    const boss = game.boss;
    const active = ["boss", "bossEnding"].includes(game.mode);
    pucci.visible = active && (boss.hp > 0 || boss.dying > 0.4);
    hud.boss.hidden = !(game.mode === "boss");
    if (!active) return;
    const z = depthOf(game, boss.x, boss.w);
    const dying = game.mode === "bossEnding";
    pucci.position.set(0, Math.abs(Math.sin(time * 3)) * 0.1, z);
    pucci.rotation.set(0, 0, 0);
    // Plus Pucci est touchée, plus elle penche
    pucci.rotation.z = (3 - boss.hp) * 0.08 * Math.sin(time * 4);
    if (dying) {
      const k = 1 - Math.max(0, boss.dying) / 1.7;
      pucci.rotation.y = k * 12;
      pucci.scale.setScalar(3 * (1 - k * 0.8));
      pucci.position.y = k * 1.5;
    } else {
      pucci.scale.setScalar(3);
    }
    const swat = time - lastBossThrow < 0.35 ? Math.sin(((time - lastBossThrow) / 0.35) * Math.PI) : 0;
    animateCat(pucci, time, "idle", { swat });
    // Éclair rouge quand un missile la touche
    pucci.userData.flashMaterials.forEach((material) => {
      material.emissive.setHex(0xff3030);
      material.emissiveIntensity = boss.flash > 0 ? 0.4 + Math.random() * 0.5 : 0;
    });
    hud.bossBars.forEach((bar, index) => bar.classList.toggle("is-empty", index >= boss.hp));
  }

  function syncParticles(game, time) {
    let dustCount = 0;
    let kibbleCount = 0;
    let boomIndex = 0;
    let bannerAlpha = 0;
    game.particles.forEach((particle) => {
      const z = depthOf(game, particle.x);
      const y = heightOf(particle.y);
      const alpha = Math.max(0, Math.min(1, particle.a));
      if (particle.type === "dust" && dustCount < 500) {
        position.set(Math.sin(particle.x * 13.7) * 0.4, Math.max(0.03, y), z);
        euler.set(time * 3 + particle.x, time * 2, 0);
        quaternion.setFromEuler(euler);
        const size = (particle.r / U) * 1.6 * alpha;
        scale.set(size, size, size);
        matrix.compose(position, quaternion, scale);
        dustMesh.setMatrixAt(dustCount, matrix);
        dustMesh.setColorAt(dustCount, color.set(particle.color));
        dustCount += 1;
      } else if (particle.type === "kibble" && kibbleCount < 40) {
        position.set(0, y, z);
        euler.set(time * 5, time * 4, 0);
        quaternion.setFromEuler(euler);
        scale.setScalar(Math.min(1, alpha));
        matrix.compose(position, quaternion, scale);
        kibbleFx.setMatrixAt(kibbleCount, matrix);
        kibbleCount += 1;
      } else if (particle.type === "boom" && boomIndex < booms.length) {
        const boom = booms[boomIndex];
        boomIndex += 1;
        const k = 1 - particle.a / 1.15;
        boom.visible = true;
        boom.position.set((particle.x - (game.boss.x + game.boss.w / 2)) / U * 0.6, y, z);
        boom.scale.setScalar((particle.r / U) * (0.4 + k * 1.4));
        boom.material.opacity = Math.max(0, 1 - k);
        boom.material.color.setHex(particle.stage === 3 ? 0xfff2a1 : 0xff8b3d);
      } else if (particle.type === "bossText") {
        bannerAlpha = Math.max(bannerAlpha, alpha);
      }
    });
    for (let index = boomIndex; index < booms.length; index += 1) booms[index].visible = false;
    dustMesh.count = dustCount;
    dustMesh.instanceMatrix.needsUpdate = true;
    if (dustMesh.instanceColor) dustMesh.instanceColor.needsUpdate = true;
    kibbleFx.count = kibbleCount;
    kibbleFx.instanceMatrix.needsUpdate = true;
    hud.banner.hidden = bannerAlpha <= 0.01;
    hud.banner.style.opacity = bannerAlpha;
  }

  // ------------------------------------------------------------------------
  // Caméra : derrière Kichta pendant la course, de face sur les écrans d'accueil
  // ------------------------------------------------------------------------

  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();

  function updateCamera(game, time, delta) {
    const running = ["run", "boss", "bossEnding", "paused", "over"].includes(game.mode);
    const catHeight = kichta.position.y;
    if (running) {
      desired.set(0.95, 1.85 + catHeight * 0.35, 3.4);
      look.set(0, 0.75 + catHeight * 0.4, -5.5);
      if (game.mode === "bossEnding") {
        desired.set(1.6, 2.2, 2.2);
        look.set(0, 1.4, depthOf(game, game.boss.x, game.boss.w));
      }
    } else {
      // Accueil et fin : on tourne doucement autour de Kichta, vue de face
      const angle = 0.5 + Math.sin(time * 0.3) * 0.35;
      desired.set(Math.sin(angle) * 3, 1.2, -Math.cos(angle) * 3);
      look.set(0, 0.5, 0);
    }
    if (!cameraState.ready) {
      cameraState.position.copy(desired);
      cameraState.target.copy(look);
      cameraState.ready = true;
    }
    const smoothing = running ? 6 : 2.5;
    cameraState.position.lerp(desired, 1 - Math.exp(-smoothing * delta));
    cameraState.target.lerp(look, 1 - Math.exp(-smoothing * 1.3 * delta));
    camera.position.copy(cameraState.position);
    if (shakeLevel > 0.01) {
      camera.position.x += (Math.random() - 0.5) * shakeLevel * 0.02;
      camera.position.y += (Math.random() - 0.5) * shakeLevel * 0.02;
    }
    camera.lookAt(cameraState.target);
  }

  // ------------------------------------------------------------------------

  let lastMode = null;

  function render(game, timestamp, delta) {
    const time = timestamp / 1000;
    if (lastMode !== game.mode && (game.mode === "run" || lastMode === null)) {
      if (lastMode === null || lastMode === "ready" || lastMode === "won") cameraState.ready = false;
    }
    lastMode = game.mode;
    shakeLevel = game.shake;
    syncScenery(game, time);
    syncKichta(game, time);
    syncObstacles(game, time);
    syncBricks(game, time);
    syncShots(game);
    syncBoss(game, time);
    syncParticles(game, time);
    updateCamera(game, time, delta);
    updateRain(delta, game.speed / U);
    if (bloomOn) composer.render(delta);
    else renderer.render(scene, camera);
    if (["run", "boss"].includes(game.mode)) adaptQuality(delta);
  }

  return { render, resize };
}
