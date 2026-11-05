// Rendu 3D de Snake Massi : plateau, serpent fluide, pomme, caméra derrière
// la tête et mini-carte. La logique du jeu (game.js) reste sur la grille ;
// ce module la traduit en 3D : case (x, y) → X = x, Z = y (centrés).
import * as THREE from "./vendor/three.module.min.js";

const BODY_LIMIT = 2400;
const SAMPLE_STEP = 0.2;

// Ambiance de chaque niveau
const THEMES = {
  classic: {
    sky: 0x06140b,
    tileA: 0x123d1f,
    tileB: 0x0e3219,
    line: 0x2f7a3e,
    wall: 0x9dff6a,
    apple: 0xff4d5e,
    fog: [14, 40],
  },
  kichta: {
    sky: 0x0b0d0c,
    tileA: 0x2a2d2b,
    tileB: 0x202322,
    line: 0x4a504c,
    wall: 0xf2f2ee,
    apple: 0xff4d5e,
    fog: [13, 36],
  },
  pucci: {
    sky: 0x14051a,
    tileA: 0x2a0d33,
    tileB: 0x210a29,
    line: 0x7a2c88,
    wall: 0xff59c7,
    apple: 0xff63c7,
    fog: [13, 38],
  },
  amour: {
    sky: 0x1a0610,
    tileA: 0x3a1022,
    tileB: 0x2f0c1b,
    line: 0x8a2a4c,
    wall: 0xff365d,
    apple: 0xff365d,
    fog: [14, 40],
  },
};

const gradientMap = (() => {
  const data = new Uint8Array([95, 95, 95, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

function toon(color, options = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap, ...options });
}

export function createSnakeWorld({ canvas, mapCanvas, gridSize }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 80);
  const half = gridSize / 2;
  const cellToWorld = (x, y, height = 0, target = new THREE.Vector3()) =>
    target.set(x - half + 0.5, height, y - half + 0.5);

  // Lumières
  const hemisphere = new THREE.HemisphereLight(0xd8ffe0, 0x10301a, 1.4);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-6, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 2, far: 40 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  // Plateau : damier peint dans une texture
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = gridSize * 32;
  tileCanvas.height = gridSize * 32;
  const tileTexture = new THREE.CanvasTexture(tileCanvas);
  tileTexture.colorSpace = THREE.SRGBColorSpace;
  tileTexture.anisotropy = 8;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(gridSize, 0.4, gridSize),
    [toon(0x081008), toon(0x081008), new THREE.MeshToonMaterial({ map: tileTexture, gradientMap }), toon(0x081008), toon(0x081008), toon(0x081008)],
  );
  board.position.y = -0.2;
  board.receiveShadow = true;
  scene.add(board);

  // Sol autour du plateau, très sombre, pour donner de la profondeur
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), toon(0x040904));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.42;
  scene.add(ground);

  // Murs lumineux bas : on voit par-dessus depuis la caméra
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x9dff6a });
  const wallGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x9dff6a,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const walls = new THREE.Group();
  const wallHeight = 0.45;
  for (const [x, z, w, d] of [
    [0, -half - 0.1, gridSize + 0.4, 0.2],
    [0, half + 0.1, gridSize + 0.4, 0.2],
    [-half - 0.1, 0, 0.2, gridSize],
    [half + 0.1, 0, 0.2, gridSize],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMaterial);
    wall.position.set(x, wallHeight / 2, z);
    walls.add(wall);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, wallHeight + 0.5, d + 0.3), wallGlowMaterial);
    glow.position.set(x, wallHeight / 2, z);
    walls.add(glow);
  }
  scene.add(walls);

  // Décor : colonnes de lumière qui flottent autour du plateau
  const pillarGeometry = new THREE.BoxGeometry(0.12, 1, 0.12);
  const pillarMaterial = new THREE.MeshBasicMaterial({
    color: 0x9dff6a,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pillars = new THREE.InstancedMesh(pillarGeometry, pillarMaterial, 48);
  const pillarData = [];
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2 + Math.random() * 0.2;
    const radius = half + 3 + Math.random() * 12;
    const height = 0.4 + Math.random() * 2.4;
    pillarData.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, height, phase: Math.random() * 6 });
  }
  scene.add(pillars);

  // Serpent : une chaîne de sphères le long du chemin, plus la tête
  const bodyMaterial = toon(0xffffff);
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), bodyMaterial, BODY_LIMIT);
  body.castShadow = true;
  body.frustumCulled = false;
  body.count = 0;
  scene.add(body);
  const bodyColor = new THREE.Color();
  const bodyPosition = new THREE.Vector3();
  const bodyScale = new THREE.Vector3();
  const identity = new THREE.Quaternion();

  const head = new THREE.Group();
  const headMaterial = toon(0x7dff6a);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), headMaterial);
  skull.scale.set(0.44, 0.36, 0.5);
  skull.castShadow = true;
  head.add(skull);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), headMaterial);
  snout.scale.set(0.34, 0.24, 0.32);
  snout.position.set(0, -0.04, 0.3);
  head.add(snout);
  const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyePupil = new THREE.MeshBasicMaterial({ color: 0x050805 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), eyeWhite);
    eye.scale.setScalar(0.12);
    eye.position.set(side * 0.2, 0.2, 0.18);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), eyePupil);
    pupil.scale.set(0.45, 0.7, 0.4);
    pupil.position.set(side * 0.1, 0.05, 0.75);
    eye.add(pupil);
    head.add(eye);
  }
  const tongue = new THREE.Group();
  const tongueMaterial = toon(0xff3355);
  const tongueBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.28), tongueMaterial);
  tongueBase.position.z = 0.14;
  tongue.add(tongueBase);
  for (const side of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.12), tongueMaterial);
    fork.position.set(side * 0.03, 0, 0.32);
    fork.rotation.y = side * 0.45;
    tongue.add(fork);
  }
  tongue.position.set(0, -0.08, 0.5);
  head.add(tongue);
  scene.add(head);

  // Pomme
  const apple = new THREE.Group();
  const appleMaterial = toon(0xff4d5e, { emissive: new THREE.Color(0xff4d5e), emissiveIntensity: 0.25 });
  const appleBody = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), appleMaterial);
  appleBody.scale.set(1, 0.9, 1);
  appleBody.castShadow = true;
  apple.add(appleBody);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), toon(0x5a3a20));
  stem.position.y = 0.32;
  apple.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), toon(0xa6ff5c));
  leaf.scale.set(0.12, 0.03, 0.07);
  leaf.position.set(0.1, 0.36, 0);
  leaf.rotation.z = -0.4;
  apple.add(leaf);
  const appleRing = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.48, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
  );
  appleRing.rotation.x = -Math.PI / 2;
  appleRing.position.y = 0.02;
  scene.add(appleRing);
  const appleLight = new THREE.PointLight(0xff4d5e, 3, 4, 1.6);
  scene.add(apple, appleLight);

  // Particules quand le serpent mange
  const sparks = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.08),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    200,
  );
  sparks.frustumCulled = false;
  sparks.count = 0;
  scene.add(sparks);
  let sparkList = [];
  const sparkColor = new THREE.Color();

  // Caméra
  const cameraState = { yaw: 0, position: new THREE.Vector3(0, 18, 14), target: new THREE.Vector3(), ready: false, shake: 0 };
  let themeName = null;
  let viewWidth = 1;
  let viewHeight = 1;

  // Mini-carte
  const map = mapCanvas.getContext("2d");
  let mapSize = 0;
  let mapRatio = 1;

  function paintTiles(theme) {
    const g = tileCanvas.getContext("2d");
    const size = tileCanvas.width / gridSize;
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        g.fillStyle = `#${new THREE.Color((x + y) % 2 ? theme.tileA : theme.tileB).getHexString()}`;
        g.fillRect(x * size, y * size, size, size);
      }
    }
    g.strokeStyle = `#${new THREE.Color(theme.line).getHexString()}`;
    g.globalAlpha = 0.5;
    g.lineWidth = 2;
    for (let index = 0; index <= gridSize; index += 1) {
      g.beginPath();
      g.moveTo(index * size, 0);
      g.lineTo(index * size, tileCanvas.height);
      g.moveTo(0, index * size);
      g.lineTo(tileCanvas.width, index * size);
      g.stroke();
    }
    g.globalAlpha = 1;
    tileTexture.needsUpdate = true;
  }

  function applyTheme(name) {
    if (themeName === name) return;
    themeName = name;
    const theme = THEMES[name] ?? THEMES.classic;
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.sky, theme.fog[0], theme.fog[1]);
    hemisphere.groundColor.set(theme.tileA);
    wallMaterial.color.set(theme.wall);
    wallGlowMaterial.color.set(theme.wall);
    pillarMaterial.color.set(theme.wall);
    appleMaterial.color.set(theme.apple);
    appleMaterial.emissive.set(theme.apple);
    appleRing.material.color.set(theme.apple);
    appleLight.color.set(theme.apple);
    ground.material.color.set(theme.sky).multiplyScalar(0.7);
    paintTiles(theme);
  }

  function resize(width, height, pixelRatio) {
    viewWidth = Math.max(1, width);
    viewHeight = Math.max(1, height);
    renderer.setPixelRatio(Math.min(pixelRatio, quality.ratios[quality.level]));
    quality.deviceRatio = pixelRatio;
    renderer.setSize(viewWidth, viewHeight, false);
    camera.aspect = viewWidth / viewHeight;
    camera.updateProjectionMatrix();
    const bounds = mapCanvas.getBoundingClientRect();
    mapSize = bounds.width || 110;
    mapRatio = Math.min(pixelRatio, 2);
    mapCanvas.width = Math.round(mapSize * mapRatio);
    mapCanvas.height = Math.round(mapSize * mapRatio);
  }

  // Qualité adaptative, comme pour Chat & Souris
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

  // ------------------------------------------------------------------------
  // Chemin du serpent (avec interpolation entre deux pas de grille)
  // ------------------------------------------------------------------------

  const path = [];
  function buildPath(game, progress) {
    path.length = 0;
    const snake = game.snake;
    const previous = game.previousSnake ?? snake;
    const lerpCell = (from, to) => ({ x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress });
    path.push(lerpCell(previous[0] ?? snake[0], snake[0]));
    for (let index = 1; index < snake.length; index += 1) path.push(snake[index]);
    const last = snake.length - 1;
    const tailFrom = previous[last] ?? snake[last];
    if (snake.length > 1) path.push(lerpCell(tailFrom, snake[last]));
    return path;
  }

  function snakeColor(level, index, time, target) {
    if (level === "pucci") return target.setHSL(((time * 55 + index * 24) % 360) / 360, 0.94, 0.62);
    if (level === "kichta") {
      // Noir et blanc, avec des rayures comme le pelage de Kichta
      const stripe = Math.floor(index * 1.4) % 3 === 0;
      return target.setHSL(0.36, 0.05, stripe ? 0.16 : Math.max(0.5, 0.94 - index * 0.012));
    }
    if (level === "amour") return target.setHSL((350 + Math.sin(index * 0.5 + time * 3) * 12) / 360, 0.9, 0.6);
    return target.setHSL((118 + Math.min(index, 16)) / 360, 0.85, Math.max(0.36, 0.62 - index * 0.008));
  }

  function syncSnake(game, level, progress, time) {
    const points = buildPath(game, progress);
    // Longueur totale du chemin
    let count = 0;
    let travelled = 0;
    const total = Math.max(0.001, points.length - 1);
    for (let index = 0; index < points.length - 1 && count < BODY_LIMIT; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length < 1e-4) continue;
      let along = count === 0 ? SAMPLE_STEP * 2 : (SAMPLE_STEP - (travelled % SAMPLE_STEP)) % SAMPLE_STEP;
      for (; along <= length && count < BODY_LIMIT; along += SAMPLE_STEP) {
        const t = along / length;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const distance = travelled + along;
        const segmentIndex = distance;
        const taper = 1 - Math.min(1, distance / Math.max(6, total)) * 0.45;
        const radius = 0.36 * taper;
        const wave = Math.sin(time * 8 - distance * 1.3) * 0.03;
        cellToWorld(x, y, radius + 0.02 + wave, bodyPosition);
        bodyScale.setScalar(radius);
        matrix.compose(bodyPosition, identity, bodyScale);
        body.setMatrixAt(count, matrix);
        body.setColorAt(count, snakeColor(level, segmentIndex, time, bodyColor));
        count += 1;
      }
      travelled += length;
    }
    body.count = count;
    body.instanceMatrix.needsUpdate = true;
    if (body.instanceColor) body.instanceColor.needsUpdate = true;

    // Tête
    const headPoint = points[0];
    cellToWorld(headPoint.x, headPoint.y, 0.38, head.position);
    const direction = game.directions[game.direction];
    const targetYaw = Math.atan2(direction.x, direction.y);
    let diff = targetYaw - head.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    head.rotation.y += diff * Math.min(1, 0.35 + progress);
    headMaterial.color.copy(snakeColor(level, 0, time, bodyColor)).offsetHSL(0, 0, 0.06);
    const dead = game.mode === "game-over";
    if (dead) headMaterial.color.set(Math.floor(time * 8) % 2 ? 0xff3355 : 0xffffff);
    const flick = (time * 1.6) % 1;
    tongue.visible = !dead && flick < 0.22;
    tongue.scale.z = flick < 0.22 ? Math.sin((flick / 0.22) * Math.PI) : 0;
    return targetYaw;
  }

  function syncApple(game, time) {
    const food = game.food;
    apple.visible = Boolean(food);
    appleRing.visible = Boolean(food);
    appleLight.visible = Boolean(food);
    if (!food) return;
    cellToWorld(food.x, food.y, 0.42 + Math.sin(time * 3) * 0.08, apple.position);
    apple.rotation.y = time * 1.4;
    cellToWorld(food.x, food.y, 0.02, appleRing.position);
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    appleRing.scale.setScalar(pulse);
    cellToWorld(food.x, food.y, 0.9, appleLight.position);
  }

  function burst(cell, level) {
    const color = level === "pucci" ? 0xff6cc9 : 0xff6571;
    for (let index = 0; index < 22; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      sparkList.push({
        position: cellToWorld(cell.x, cell.y, 0.45),
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 3, Math.sin(angle) * speed),
        life: 0.7,
        color: index % 3 === 0 ? 0xffffff : index % 3 === 1 ? 0xb8ff6a : color,
      });
    }
  }

  function syncSparks(delta) {
    sparkList = sparkList.filter((spark) => (spark.life -= delta) > 0);
    sparkList.forEach((spark, index) => {
      spark.velocity.y -= 9 * delta;
      spark.position.addScaledVector(spark.velocity, delta);
      bodyScale.setScalar(Math.min(1, spark.life * 2));
      matrix.compose(spark.position, identity, bodyScale);
      sparks.setMatrixAt(index, matrix);
      sparks.setColorAt(index, sparkColor.set(spark.color));
    });
    sparks.count = Math.min(200, sparkList.length);
    sparks.instanceMatrix.needsUpdate = true;
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  }

  function syncPillars(time) {
    pillarData.forEach((pillar, index) => {
      const height = pillar.height * (0.8 + Math.sin(time * 1.2 + pillar.phase) * 0.2);
      bodyPosition.set(pillar.x, height / 2 - 0.4, pillar.z);
      bodyScale.set(1, height, 1);
      matrix.compose(bodyPosition, identity, bodyScale);
      pillars.setMatrixAt(index, matrix);
    });
    pillars.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------------
  // Caméra : derrière la tête quand on joue, vue d'ensemble sinon
  // ------------------------------------------------------------------------

  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();

  function updateCamera(game, headYaw, time, delta) {
    const following = ["playing", "paused", "game-over", "milestone"].includes(game.mode);
    if (following) {
      if (!cameraState.ready) cameraState.yaw = headYaw;
      let diff = headYaw - cameraState.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      cameraState.yaw += diff * (1 - Math.exp(-5.5 * delta));
      const forwardX = Math.sin(cameraState.yaw);
      const forwardZ = Math.cos(cameraState.yaw);
      desired.set(head.position.x - forwardX * 4.6, 5.6, head.position.z - forwardZ * 4.6);
      look.set(head.position.x + forwardX * 3.2, 0, head.position.z + forwardZ * 3.2);
    } else {
      const angle = time * 0.15;
      desired.set(Math.sin(angle) * 15, 15, Math.cos(angle) * 15);
      look.set(0, -1, 0);
    }
    if (!cameraState.ready) {
      cameraState.position.copy(desired);
      cameraState.target.copy(look);
      cameraState.ready = true;
    } else {
      const smoothing = following ? 6 : 1.6;
      cameraState.position.lerp(desired, 1 - Math.exp(-smoothing * delta));
      cameraState.target.lerp(look, 1 - Math.exp(-smoothing * 1.4 * delta));
    }
    camera.position.copy(cameraState.position);
    if (cameraState.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * cameraState.shake;
      camera.position.y += (Math.random() - 0.5) * cameraState.shake;
      cameraState.shake = Math.max(0, cameraState.shake - delta * 1.6);
    }
    camera.lookAt(cameraState.target);
  }

  // ------------------------------------------------------------------------
  // Mini-carte orientée dans le sens du serpent (le haut = devant lui)
  // ------------------------------------------------------------------------

  function drawMap(game, level, progress, time) {
    if (!mapSize) return;
    const ctx = map;
    const size = mapSize;
    const center = size / 2;
    const radius = size / 2 - 2;
    const theme = THEMES[level] ?? THEMES.classic;
    const wallColor = `#${new THREE.Color(theme.wall).getHexString()}`;
    const applyColor = `#${new THREE.Color(theme.apple).getHexString()}`;
    ctx.setTransform(mapRatio, 0, 0, mapRatio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(3, 10, 5, 0.78)";
    ctx.fill();
    ctx.clip();

    const headPoint = path[0] ?? game.snake[0];
    const direction = game.directions[game.direction];
    const angle = Math.atan2(direction.y, direction.x);
    const scale = radius / 15;
    ctx.translate(center, center);
    ctx.rotate(-Math.PI / 2 - angle);
    ctx.scale(scale, scale);
    ctx.translate(-(headPoint.x + 0.5), -(headPoint.y + 0.5));

    ctx.strokeStyle = wallColor;
    ctx.lineWidth = 2.5 / scale;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, gridSize, gridSize);
    ctx.strokeRect(0, 0, gridSize, gridSize);

    const food = game.food;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let index = 1; index < game.snake.length; index += 1) {
      const part = game.snake[index];
      ctx.fillRect(part.x + 0.15, part.y + 0.15, 0.7, 0.7);
    }
    if (food) {
      const pulse = 0.55 + Math.sin(time * 6) * 0.12;
      ctx.beginPath();
      ctx.arc(food.x + 0.5, food.y + 0.5, pulse + 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `${applyColor}55`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(food.x + 0.5, food.y + 0.5, 0.55, 0, Math.PI * 2);
      ctx.fillStyle = applyColor;
      ctx.fill();
    }
    ctx.restore();

    // La tête au centre, pointe vers le haut
    ctx.save();
    ctx.translate(center, center);
    ctx.fillStyle = wallColor;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Pomme hors de la carte : une flèche sur le bord indique sa direction
    if (food) {
      const dx = food.x - headPoint.x;
      const dy = food.y - headPoint.y;
      const distance = Math.hypot(dx, dy);
      if (distance * scale > radius - 6) {
        const local = Math.atan2(dy, dx) - angle - Math.PI / 2;
        ctx.save();
        ctx.translate(center + Math.cos(local) * (radius - 8), center + Math.sin(local) * (radius - 8));
        ctx.rotate(local);
        ctx.fillStyle = applyColor;
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -5);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ------------------------------------------------------------------------

  let lastGame = null;
  let lastScore = 0;
  let lastMode = null;
  let mapClock = 0;

  function render(game, level, progress, timestamp, delta) {
    applyTheme(level);
    const time = timestamp / 1000;
    // Nouvelle partie (ou reprise après une défaite) : la caméra se replace.
    if (game !== lastGame) {
      lastGame = game;
      lastScore = game.score;
      cameraState.ready = false;
    }
    if (game.score > lastScore && game.lastEaten) burst(game.lastEaten, level);
    lastScore = game.score;
    if (game.mode === "game-over" && lastMode === "playing") cameraState.shake = 0.6;
    lastMode = game.mode;

    const headYaw = syncSnake(game, level, progress, time);
    syncApple(game, time);
    syncSparks(delta);
    syncPillars(time);
    updateCamera(game, headYaw, time, delta);
    renderer.render(scene, camera);
    if (game.mode === "playing") adaptQuality(delta);

    mapClock += delta;
    if (mapClock > 1 / 30) {
      mapClock = 0;
      drawMap(game, level, progress, time);
    }
  }

  return { render, resize };
}
