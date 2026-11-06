// Kichta Run — course sans fin à trois couloirs dans un monde de bonbons.
// Inspirations : la boucle de Subway Surfers (couloirs, wagons, missions,
// multiplicateur), les blocs « ? » et l'ambiance de Mario, et un boss qui
// revient régulièrement.
import * as THREE from "../vendor/three.module.min.js";
import { createWorld, LANE, BIOMES } from "./world.js?v=b1";
import { createToon, dressToon, animateToon, flashToon, SKINS, OUTFITS, candy } from "./toons.js?v=b1";
import * as Sfx from "./sfx.js?v=b1";

const $ = (s) => document.querySelector(s);
const canvas = $("#game");

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------
const SAVE_KEY = "kichtaRun.bonbon.v1";
const DEFAULT_SAVE = {
  coins: 0,
  best: 0,
  level: 1,
  missions: [],
  owned: { hat: ["none"], face: ["none"], back: ["none"], skin: ["caramel"] },
  wear: { hat: "none", face: "none", back: "none", skin: "caramel" },
  upgrades: { magnet: 0, shield: 0, double: 0, balloon: 0, spring: 0 },
  lifetime: {},
  chestDay: "",
  startShield: 0,
  cinematic: false,
  sound: true,
  tutorial: false,
  runs: 0,
};
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_SAVE), ...data, owned: { ...DEFAULT_SAVE.owned, ...data.owned }, wear: { ...DEFAULT_SAVE.wear, ...data.wear }, upgrades: { ...DEFAULT_SAVE.upgrades, ...data.upgrades } };
    }
  } catch {
    // stockage indisponible : on joue sans sauvegarde
  }
  return structuredClone(DEFAULT_SAVE);
}
const save = loadSave();
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignoré
  }
}

// ---------------------------------------------------------------------------
// Missions : en terminer trois fait monter de niveau (multiplicateur +1)
// ---------------------------------------------------------------------------
const MISSION_TYPES = [
  { id: "coinsRun", stat: "coins", run: true, base: 60, step: 40, text: (n) => `Ramasse ${n} croquettes en une course` },
  { id: "distRun", stat: "dist", run: true, base: 600, step: 400, text: (n) => `Cours ${n} m en une course` },
  { id: "scoreRun", stat: "score", run: true, base: 3000, step: 3500, text: (n) => `Fais un score de ${n} en une course` },
  { id: "jumps", stat: "jumps", base: 25, step: 20, text: (n) => `Saute ${n} fois` },
  { id: "lanes", stat: "lanes", base: 40, step: 30, text: (n) => `Change de couloir ${n} fois` },
  { id: "slides", stat: "slides", base: 8, step: 6, text: (n) => `Glisse ${n} fois` },
  { id: "powers", stat: "powers", base: 3, step: 2, text: (n) => `Attrape ${n} bonus` },
  { id: "blocks", stat: "blocks", base: 3, step: 3, text: (n) => `Tape ${n} blocs « ? »` },
  { id: "wagons", stat: "wagons", base: 3, step: 3, text: (n) => `Cours sur le toit de ${n} wagons` },
  { id: "near", stat: "near", base: 4, step: 4, text: (n) => `Fais ${n} esquives de justesse` },
  { id: "pucci", stat: "pucci", base: 1, step: 0.5, text: (n) => `Bats Pucci ${n} fois` },
];
function roundGoal(n) {
  if (n >= 1000) return Math.round(n / 500) * 500;
  if (n >= 100) return Math.round(n / 10) * 10;
  return Math.max(1, Math.round(n));
}
function newMissions() {
  const pool = MISSION_TYPES.filter((t) => !(t.id === "pucci" && save.level < 2));
  const chosen = [];
  while (chosen.length < 3) {
    const t = pool[Math.floor(Math.random() * pool.length)];
    if (!chosen.some((c) => c.id === t.id)) chosen.push(t);
  }
  save.missions = chosen.map((t) => ({ id: t.id, goal: roundGoal(t.base + t.step * (save.level - 1)), progress: 0, done: false }));
  persist();
}
if (!save.missions.length) newMissions();
const missionType = (m) => MISSION_TYPES.find((t) => t.id === m.id);

// ---------------------------------------------------------------------------
// Monde et personnages
// ---------------------------------------------------------------------------
const world = createWorld(canvas);
const kichta = createToon("kichta", { skin: save.wear.skin });
dressToon(kichta, save.wear);
world.scene.add(kichta);
kichta.traverse((o) => o.isMesh && (o.castShadow = true));

// Ballons pour le bonus « vol »
const balloons = new THREE.Group();
[0xff5fa2, 0x5ad1ff, 0xffd23f, 0x7dff9a].forEach((c, i) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), candy(c, { roughness: 0.12 }));
  b.scale.y = 1.2;
  b.position.set((i - 1.5) * 0.45, 2.7 + (i % 2) * 0.35, 0);
  balloons.add(b);
  balloons.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.1, 0), b.position]), new THREE.LineBasicMaterial({ color: 0xffffff })));
});
balloons.visible = false;
kichta.add(balloons);
// Bulle du bouclier
const shieldBubble = new THREE.Mesh(
  new THREE.SphereGeometry(1.15, 32, 20),
  candy(0x7fe3ff, { transparent: true, opacity: 0.3, roughness: 0.02, depthWrite: false, emissive: 0x3fb8ff, emissiveIntensity: 0.25 }),
);
shieldBubble.position.y = 0.75;
shieldBubble.visible = false;
kichta.add(shieldBubble);
// Aimant : halo doré
const magnetRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, 0.3) }));
magnetRing.rotation.x = Math.PI / 2;
magnetRing.position.y = 0.1;
magnetRing.visible = false;
kichta.add(magnetRing);

// Pucci sur son nuage
const boss = new THREE.Group();
const pucci = createToon("pucci");
pucci.scale.setScalar(2.5);
pucci.rotation.y = 0;
boss.add(pucci);
const cloudMat = candy(0xffffff, { roughness: 0.55, clearcoat: 0.3 });
for (let i = 0; i < 7; i += 1) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 + (i % 3) * 0.2, 18, 12), cloudMat);
  s.position.set((i - 3) * 0.55, -0.1 + (i % 2) * 0.15, (i % 3) * 0.3 - 0.3);
  boss.add(s);
}
boss.visible = false;
world.scene.add(boss);

// ---------------------------------------------------------------------------
// État de la partie
// ---------------------------------------------------------------------------
const GRAVITY = 34;
const JUMP = 12;
const G = {
  mode: "menu",
  t: 0,
  dist: 0,
  score: 0,
  coins: 0,
  speed: 14,
  objects: [],
  coinsList: [],
  nextRowZ: -40,
  nextPowerAt: 250,
  nextBossAt: 1300,
  biome: 0,
  revives: 0,
  coinStreak: 0,
  lastCoinT: 0,
  dyingT: 0,
  stats: {},
  boss: null,
  rockets: [],
  flyCoinT: 0,
  flyLane: 0,
};
const P = { lane: 0, x: 0, y: 0, vy: 0, z: 0, grounded: true, slide: 0, ground: 0, onWagon: false, lastLaneT: -9, fromLane: 0, invuln: 0, squash: 0, coyote: 0, queuedSlide: false, airJumps: 0 };
const POWER = { magnet: 0, double: 0, balloon: 0, spring: 0, shield: 0 };
const POWER_INFO = {
  magnet: { icon: "🧲", name: "Aimant", base: 9, per: 2.5 },
  double: { icon: "⭐", name: "Score ×2", base: 10, per: 2.5 },
  balloon: { icon: "🎈", name: "Ballons", base: 6, per: 1.5 },
  spring: { icon: "🦘", name: "Super saut", base: 9, per: 2 },
  shield: { icon: "🫧", name: "Bouclier", base: 20, per: 5 },
};
const duration = (type) => POWER_INFO[type].base + POWER_INFO[type].per * save.upgrades[type];
const multiplier = () => save.level * (POWER.double > 0 ? 2 : 1);
const isRunning = () => G.mode === "run";

function stat(name, amount = 1) {
  G.stats[name] = (G.stats[name] || 0) + amount;
  save.lifetime[name] = (save.lifetime[name] || 0) + amount;
  checkMissions();
}
function setRunStat(name, value) {
  G.stats[name] = value;
  checkMissions();
}

function checkMissions() {
  let changed = false;
  for (const m of save.missions) {
    if (m.done) continue;
    const t = missionType(m);
    if (!t) continue;
    const value = t.run ? G.stats[t.stat] || 0 : (m.progress || 0) + 0;
    if (t.run) m.progress = Math.max(m.progress, Math.floor(value));
    if (m.progress >= m.goal) {
      m.done = true;
      changed = true;
      toast(`✔ Mission : ${t.text(m.goal)}`, "mission");
      Sfx.play("coin", { rate: 0.75, volume: 0.6 });
    }
  }
  if (save.missions.every((m) => m.done)) {
    save.level += 1;
    const reward = 100 * save.level;
    save.coins += reward;
    newMissions();
    banner(`NIVEAU ${save.level} !`, `Multiplicateur ×${save.level} · +${reward} croquettes`);
    Sfx.play("destroy", { rate: 1.4, volume: 0.5 });
    changed = true;
  }
  if (changed) persist();
}
// Les missions cumulées avancent avec les compteurs
const CUMULATIVE = new Set(MISSION_TYPES.filter((t) => !t.run).map((t) => t.stat));
const _stat = stat;
function statWithMissions(name, amount = 1) {
  if (CUMULATIVE.has(name)) {
    for (const m of save.missions) {
      const t = missionType(m);
      if (t && t.stat === name && !m.done) m.progress += amount;
    }
  }
  _stat(name, amount);
}

// ---------------------------------------------------------------------------
// Génération de la piste
// ---------------------------------------------------------------------------
const laneX = (l) => l * LANE;
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function addObject(kind, lane, z, extra = {}) {
  const build = world.OBSTACLES[kind];
  const mesh = world.acquire(`obs-${kind}-${kind === "wagon" ? Math.floor(Math.random() * 4) : 0}`, build);
  const o = { kind, lane, z, mesh, passed: false, vz: 0, ...extra };
  if (kind === "wagon") {
    o.len = mesh.userData.length;
    o.top = 2.95;
  } else if (kind === "ramp") {
    o.len = mesh.userData.length;
    o.top = 2.95;
  } else if (kind === "block") {
    o.y = 3.1;
    o.used = false;
    mesh.userData.cube.material.color.setHex(0xffffff);
    mesh.userData.cube.material.map = mesh.userData.tex;
    mesh.userData.cube.material.emissiveIntensity = 0.15;
    mesh.userData.cube.material.needsUpdate = true;
  }
  mesh.position.set(laneX(lane), o.y || 0, z);
  mesh.rotation.set(0, 0, 0);
  G.objects.push(o);
  return o;
}
function addPower(type, lane, z, y = 1) {
  const mesh = world.makePower(type);
  mesh.position.set(laneX(lane), y, z);
  const o = { kind: "power", power: type, lane, z, y, mesh, passed: false };
  G.objects.push(o);
  return o;
}
function addCoin(x, y, z) {
  const slot = world.coinAlloc();
  if (slot < 0) return;
  G.coinsList.push({ x, y, z, slot, magnet: false, spin: Math.random() * 6 });
}
function coinLine(lane, z, n = 6, y = 0.75, gap = 2.4) {
  for (let i = 0; i < n; i += 1) addCoin(laneX(lane), y, z - i * gap);
}
// Arc de croquettes qui suit la courbe d'un saut
function coinArc(lane, z) {
  const v = JUMP;
  for (let i = 0; i < 7; i += 1) {
    const t = (i / 6) * ((2 * v) / GRAVITY);
    const y = 0.75 + v * t - 0.5 * GRAVITY * t * t;
    addCoin(laneX(lane), y, z + 4 - t * G.speed);
  }
}

function spawnRow(z) {
  const d = Math.min(1, G.dist / 2600);
  const lanes = [-1, 0, 1];
  let length = 0;
  if (G.boss) {
    // Pendant le boss : surtout des croquettes, et des poissons-fusées
    coinLine(pick(lanes), z, 5);
    if (Math.random() < 0.3) addObject("barrier", pick(lanes), z - 6);
    return 6;
  }
  if (G.dist + (P.z - z) > G.nextPowerAt) {
    G.nextPowerAt += 320 + Math.random() * 260;
    const lane = pick(lanes);
    const types = ["magnet", "magnet", "double", "balloon", "spring", "shield"];
    addPower(pick(types), lane, z);
    lanes.filter((l) => l !== lane).forEach((l) => Math.random() < 0.5 && coinLine(l, z, 5));
    return 4;
  }
  const r = Math.random();
  if (r < 0.1) {
    // Ligne de croquettes en zigzag
    let lane = pick(lanes);
    for (let i = 0; i < 12; i += 1) {
      if (i % 4 === 3) lane = Math.max(-1, Math.min(1, lane + pick([-1, 1])));
      addCoin(laneX(lane), 0.75, z - i * 2.2);
    }
    length = 24;
  } else if (r < 0.32) {
    const free = pick(lanes);
    const blocked = shuffle(lanes.filter((l) => l !== free)).slice(0, Math.random() < 0.35 + d * 0.45 ? 2 : 1);
    blocked.forEach((l) => addObject("barrier", l, z));
    if (Math.random() < 0.5) coinArc(blocked[0], z);
    else coinLine(free, z + 3, 6);
  } else if (r < 0.4) {
    lanes.forEach((l) => addObject("barrier", l, z));
    coinArc(pick(lanes), z);
  } else if (r < 0.52) {
    const free = pick(lanes);
    const blocked = shuffle(lanes.filter((l) => l !== free)).slice(0, Math.random() < 0.3 + d * 0.4 ? 2 : 1);
    blocked.forEach((l) => addObject("high", l, z));
    coinLine(free, z + 4, 6);
    if (Math.random() < 0.5) coinLine(blocked[0], z + 1.5, 2, 0.45, 1.6);
  } else if (r < 0.74) {
    // Wagons : un ou deux, parfois avec une rampe pour monter dessus
    const free = pick(lanes);
    const used = shuffle(lanes.filter((l) => l !== free)).slice(0, Math.random() < 0.55 ? 2 : 1);
    used.forEach((l, i) => {
      const w = addObject("wagon", l, z - 4.5);
      if (i === 0 && Math.random() < 0.7) {
        // La rampe monte de z + 5 (au sol) jusqu'à l'avant du wagon (z)
        const ramp = addObject("ramp", l, z + 5);
        ramp.mesh.position.z = z;
        coinLine(l, z + 3, 3, 1.6, 2);
        coinLine(l, z - 1, 5, 3.7, 2);
      }
      if (Math.random() < 0.25 && d > 0.25) {
        // Wagon suivant collé derrière : on peut courir de toit en toit
        addObject("wagon", l, z - 14.5);
        coinLine(l, z - 11, 4, 3.7, 2);
        length = 14;
      }
    });
    if (Math.random() < 0.5) coinLine(free, z, 6);
    length = Math.max(length, 12);
  } else if (r < 0.8 && d > 0.2) {
    // Wagon qui fonce vers Kichta
    const lane = pick(lanes);
    const w = addObject("wagon", lane, z - 30);
    w.vz = 9 + d * 6;
    w.moving = true;
    lanes.filter((l) => l !== lane).forEach((l) => Math.random() < 0.6 && coinLine(l, z, 5));
    length = 8;
  } else if (r < 0.9) {
    // Blocs « ? » à taper en sautant
    const ls = shuffle(lanes).slice(0, 1 + Math.floor(Math.random() * 3));
    ls.forEach((l) => addObject("block", l, z));
    coinLine(pick(lanes), z + 6, 4);
  } else {
    const order = shuffle(lanes);
    addObject("barrier", order[0], z);
    addObject("high", order[1], z - 0.5);
    coinLine(order[2], z + 3, 6);
  }
  return length;
}

function rowGap() {
  return 9 + G.speed * 0.5;
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------
function moveLane(dir) {
  if (!isRunning()) return;
  const lane = Math.max(-1, Math.min(1, P.lane + dir));
  if (lane === P.lane) {
    world.shake(0.15);
    return;
  }
  P.fromLane = P.lane;
  P.lane = lane;
  P.lastLaneT = G.t;
  statWithMissions("lanes");
  Sfx.play("attack", { volume: 0.12, rate: 1.7, wet: false });
}
function jump() {
  if (G.mode === "menu") return;
  if (!isRunning()) return;
  if (POWER.balloon > 0) return;
  if (P.grounded || P.coyote > 0) {
    P.vy = POWER.spring > 0 ? 18 : JUMP;
    P.grounded = false;
    P.coyote = 0;
    P.slide = 0;
    statWithMissions("jumps");
    Sfx.play("jump", { volume: 0.5, rate: POWER.spring > 0 ? 0.85 : 1.15 });
    world.burst(P.x, 0.1, P.z, 0xffffff, 8, 3);
  }
}
function slide() {
  if (!isRunning() || POWER.balloon > 0) return;
  if (P.grounded) {
    if (P.slide <= 0) statWithMissions("slides");
    P.slide = 0.75;
    Sfx.play("fall", { volume: 0.25, rate: 2, wet: false });
  } else {
    P.vy = Math.min(P.vy, -24);
    P.queuedSlide = true;
  }
}

function bindButton(el, fn) {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    Sfx.unlock();
    fn();
    el.classList.add("pressed");
  });
  const up = () => el.classList.remove("pressed");
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}
bindButton($("#btnLeft"), () => moveLane(-1));
bindButton($("#btnRight"), () => moveLane(1));
bindButton($("#btnJump"), jump);

// Glisser le doigt sur l'écran
let touch = null;
canvas.addEventListener("pointerdown", (e) => {
  Sfx.unlock();
  touch = { x: e.clientX, y: e.clientY, used: false };
});
canvas.addEventListener("pointermove", (e) => {
  if (!touch || touch.used) return;
  const dx = e.clientX - touch.x;
  const dy = e.clientY - touch.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  touch.used = true;
  if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  else slide();
});
canvas.addEventListener("pointerup", () => {
  if (touch && !touch.used) jump();
  touch = null;
});
addEventListener("keydown", (e) => {
  const k = e.code;
  if (["ArrowLeft", "KeyA", "KeyQ"].includes(k)) moveLane(-1);
  else if (["ArrowRight", "KeyD"].includes(k)) moveLane(1);
  else if (["ArrowUp", "KeyW", "KeyZ", "Space"].includes(k)) {
    e.preventDefault();
    if (G.mode === "menu") startRun();
    else jump();
  } else if (["ArrowDown", "KeyS"].includes(k)) {
    e.preventDefault();
    slide();
  } else if (k === "KeyP" || k === "Escape") {
    if (G.mode === "run") pauseGame();
    else if (G.mode === "pause") resumeGame();
  }
  Sfx.unlock();
});

// ---------------------------------------------------------------------------
// Bonus
// ---------------------------------------------------------------------------
function activatePower(type) {
  statWithMissions("powers");
  POWER[type] = duration(type);
  flash(type === "shield" ? "#7fe3ff" : type === "double" ? "#ffd23f" : "#ffffff");
  Sfx.play("coin", { rate: 0.6, volume: 0.7 });
  Sfx.play("click", { rate: 0.8, volume: 0.5 });
  toast(`${POWER_INFO[type].icon} ${POWER_INFO[type].name} !`, "power");
  if (type === "balloon") {
    P.vy = 0;
    P.slide = 0;
    G.flyCoinT = 0;
    G.flyLane = P.lane;
  }
}

// ---------------------------------------------------------------------------
// Boss : Pucci revient régulièrement sur son nuage
// ---------------------------------------------------------------------------
function startBoss() {
  const level = (save.lifetime.pucci || 0) + 1;
  G.boss = { hp: 3, t: 0, throwT: 2.2, fishT: 1.5, x: 0, targetX: 0, rate: Math.max(0.75, 1.7 - level * 0.12), leaving: 0, defeated: false, hurt: 0 };
  boss.visible = true;
  boss.position.set(0, 9, P.z - 40);
  $("#bossBar").classList.remove("hidden");
  updateBossBar();
  banner("PUCCI ATTAQUE !", "Attrape les poissons-fusées 🐟 pour la toucher");
  Sfx.play("meow", { volume: 0.9, rate: 0.9 });
  Sfx.music("boss");
}
function updateBossBar() {
  [...$("#bossBar").querySelectorAll("i")].forEach((el, i) => el.classList.toggle("off", !G.boss || i >= G.boss.hp));
}
function endBoss(defeated) {
  const b = G.boss;
  if (!b) return;
  b.leaving = 1;
  b.defeated = defeated;
  $("#bossBar").classList.add("hidden");
  G.nextBossAt = G.dist + 2000;
  if (defeated) {
    statWithMissions("pucci");
    const reward = 150 * save.level;
    G.score += 1000 * multiplier();
    banner("PUCCI VAINCUE !", `+${reward} croquettes · +${1000 * multiplier()} points`);
    G.coins += reward;
    world.confetti(boss.position.x, boss.position.y, boss.position.z, 160);
    world.shake(0.6);
    Sfx.play("destroy", { volume: 0.9 });
    Sfx.play("meow", { volume: 1, rate: 0.68, delay: 0.1 });
    // Pluie de croquettes devant Kichta
    for (let i = 0; i < 36; i += 1) addCoin(laneX(pick([-1, 0, 1])), 0.75, P.z - 25 - i * 1.6);
    if (!save.cinematic) {
      save.cinematic = true;
      persist();
      setTimeout(() => G.mode === "run" && playCinematic(true), 1600);
    }
  } else {
    banner("Pucci s'enfuit…", "Elle reviendra !");
  }
  Sfx.music("run");
}
function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  b.t += dt;
  b.hurt = Math.max(0, b.hurt - dt);
  if (b.leaving > 0) {
    b.leaving += dt;
    boss.position.y += dt * (b.defeated ? 10 : 6);
    boss.position.z = P.z - 15 - b.leaving * 8;
    boss.rotation.z += dt * (b.defeated ? 12 : 0);
    animateToon(pucci, G.t, b.defeated ? "hit" : "win");
    if (b.leaving > 3) {
      boss.visible = false;
      G.boss = null;
    }
    return;
  }
  // Pucci se place au-dessus d'un couloir et vise Kichta
  if (Math.random() < dt * 0.6) b.targetX = laneX(pick([-1, 0, 1]));
  b.x += (b.targetX - b.x) * Math.min(1, dt * 2.5);
  const enterY = Math.max(3.2, 9 - b.t * 4);
  boss.position.set(b.x, enterY + Math.sin(G.t * 2) * 0.25, P.z - 15);
  boss.rotation.set(0, 0, Math.sin(G.t * 1.5) * 0.08);
  animateToon(pucci, G.t, b.throwT < 0.3 ? "throw" : "idle");
  flashToon(pucci, b.hurt > 0 ? b.hurt * 3 : 0);
  if (b.t > 1.5) {
    b.throwT -= dt;
    if (b.throwT <= 0) {
      b.throwT = b.rate * (0.8 + Math.random() * 0.5);
      throwBomb(Math.random() < 0.55 ? P.lane : pick([-1, 0, 1]));
    }
    b.fishT -= dt;
    if (b.fishT <= 0) {
      b.fishT = 2.6 + Math.random() * 1.2;
      const lane = pick([-1, 0, 1]);
      const fish = addPower("fish", lane, P.z - 55, 0.9);
      fish.fish = true;
    }
  }
  if (b.t > 38) endBoss(false);
}
function throwBomb(lane) {
  // Elle lance par-dessus sa tête : la bombe atterrit devant Kichta
  const landZ = P.z - G.speed * 0.85 - 9;
  const warn = world.acquire("obs-warn", world.OBSTACLES.warn);
  warn.position.set(laneX(lane), 0, landZ);
  const bomb = addObject("bomb", lane, landZ);
  bomb.flying = 0.85;
  bomb.from = boss.position.clone();
  bomb.warn = warn;
  bomb.mesh.position.copy(bomb.from);
}
function launchRocket() {
  const mesh = world.makePower("fish");
  mesh.position.set(P.x, P.y + 1, P.z);
  G.rockets.push({ mesh, t: 0, from: mesh.position.clone() });
  Sfx.play("shot", { volume: 0.5, rate: 1.1 });
}
function updateRockets(dt) {
  for (let i = G.rockets.length - 1; i >= 0; i -= 1) {
    const r = G.rockets[i];
    r.t += dt / 0.55;
    const target = boss.position.clone().add(new THREE.Vector3(0, 1, 0));
    const pos = r.from.clone().lerp(target, Math.min(1, r.t));
    pos.y += Math.sin(Math.min(1, r.t) * Math.PI) * 2.5;
    r.mesh.position.copy(pos);
    r.mesh.lookAt(target);
    world.burst(pos.x, pos.y, pos.z, 0xff8a3d, 2, 1.5);
    if (r.t >= 1) {
      world.release(r.mesh);
      G.rockets.splice(i, 1);
      if (G.boss && !G.boss.leaving) {
        G.boss.hp -= 1;
        G.boss.hurt = 0.5;
        updateBossBar();
        world.burst(target.x, target.y, target.z, 0xff5fa2, 40, 9);
        world.shake(0.35);
        Sfx.play("destroy", { volume: 0.7, rate: 1.2 });
        Sfx.play("meow", { volume: 0.7, rate: 1.1 + Math.random() * 0.2 });
        if (G.boss.hp <= 0) endBoss(true);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Déroulement d'une course
// ---------------------------------------------------------------------------
function clearTrack() {
  G.objects.forEach((o) => {
    world.release(o.mesh);
    if (o.warn) world.release(o.warn);
  });
  G.objects.length = 0;
  G.coinsList.forEach((c) => world.coinFreeSlot(c.slot));
  G.coinsList.length = 0;
  G.rockets.forEach((r) => world.release(r.mesh));
  G.rockets.length = 0;
}

function startRun() {
  Sfx.unlock();
  Sfx.play("click", { volume: 0.5 });
  clearTrack();
  world.clearDecor(0);
  Object.assign(G, { mode: "run", dist: 0, score: 0, coins: 0, speed: 14, nextRowZ: -35, nextPowerAt: 200 + Math.random() * 150, nextBossAt: 1300, biome: 0, revives: 0, stats: {}, boss: null, coinStreak: 0 });
  Object.assign(P, { lane: 0, x: 0, y: 0, vy: 0, z: 0, grounded: true, slide: 0, invuln: 0, squash: 0, fromLane: 0, lastLaneT: -9 });
  Object.keys(POWER).forEach((k) => (POWER[k] = 0));
  if (save.startShield > 0) {
    save.startShield -= 1;
    POWER.shield = duration("shield");
    toast("🫧 Bouclier de départ !", "power");
  }
  boss.visible = false;
  world.setBiome(0, true);
  save.runs += 1;
  persist();
  show("hud");
  $("#controls").classList.remove("hidden");
  $("#bossBar").classList.add("hidden");
  Sfx.music("run");
  if (!save.tutorial) startTutorial();
}

function crash(obj) {
  if (P.invuln > 0) return;
  if (POWER.shield > 0) {
    POWER.shield = 0;
    P.invuln = 1.2;
    if (obj) removeObject(obj);
    world.burst(P.x, 1, P.z, 0x7fe3ff, 40, 8);
    world.shake(0.4);
    Sfx.play("break", { volume: 0.8 });
    toast("Bouclier éclaté !", "power");
    return;
  }
  G.mode = "dying";
  G.dyingT = 0;
  world.shake(0.8);
  world.burst(P.x, 1, P.z, 0xffffff, 30, 7);
  Sfx.play("impact", { volume: 0.9 });
  Sfx.play("hurt", { volume: 0.6, delay: 0.05 });
  Sfx.setRunning(false);
  Sfx.music(null);
  $("#controls").classList.add("hidden");
}

function removeObject(o) {
  const i = G.objects.indexOf(o);
  if (i >= 0) G.objects.splice(i, 1);
  world.release(o.mesh);
  if (o.warn) world.release(o.warn);
}

function gameOver() {
  G.mode = "over";
  $("#controls").classList.add("hidden");
  const score = Math.floor(G.score);
  const newBest = score > save.best;
  if (newBest) save.best = score;
  save.coins += G.coins;
  persist();
  $("#overScore").textContent = score.toLocaleString("fr-FR");
  $("#overBest").textContent = save.best.toLocaleString("fr-FR");
  $("#overCoins").textContent = `+${G.coins}`;
  $("#newBest").classList.toggle("hidden", !newBest);
  $("#overTitle").textContent = newBest ? "Record battu !" : pick(["Aïe !", "Oups !", "Ouille !", "Presque !"]);
  if (newBest) {
    world.confetti(P.x, 2, P.z - 2, 120);
    Sfx.play("coin", { rate: 0.5, volume: 0.8 });
  }
  renderMissionList($("#overMissions"));
  // Continuer contre des croquettes, quelques secondes seulement
  const cost = 50 * 2 ** G.revives;
  const btn = $("#reviveBtn");
  $("#reviveCost").textContent = cost;
  btn.disabled = save.coins < cost;
  btn.classList.toggle("hidden", G.revives >= 3);
  let left = 6;
  $("#reviveTimer").style.setProperty("--p", "1");
  clearInterval(G.reviveTimer);
  G.reviveTimer = setInterval(() => {
    left -= 0.1;
    $("#reviveTimer").style.setProperty("--p", String(Math.max(0, left / 6)));
    if (left <= 0) {
      clearInterval(G.reviveTimer);
      btn.classList.add("hidden");
    }
  }, 100);
  show("over");
  refreshMenu();
}

function revive() {
  const cost = 50 * 2 ** G.revives;
  if (save.coins < cost) return;
  clearInterval(G.reviveTimer);
  // Les croquettes déjà gagnées pendant la course restent acquises
  save.coins -= cost;
  save.coins -= G.coins;
  persist();
  G.revives += 1;
  // On dégage la piste devant Kichta
  for (const o of [...G.objects]) if (o.z > P.z - 40 && o.kind !== "power") removeObject(o);
  P.invuln = 2.5;
  P.y = Math.max(P.y, 0);
  P.vy = 0;
  G.mode = "run";
  show("hud");
  $("#controls").classList.remove("hidden");
  Sfx.music(G.boss ? "boss" : "run");
  toast("C'est reparti !", "power");
}

function pauseGame() {
  if (G.mode !== "run") return;
  G.mode = "pause";
  Sfx.setRunning(false);
  Sfx.music(null);
  show("pause");
}
function resumeGame() {
  if (G.mode !== "pause") return;
  G.mode = "run";
  show("hud");
  $("#controls").classList.remove("hidden");
  Sfx.music(G.boss ? "boss" : "run");
}
function toMenu() {
  clearInterval(G.reviveTimer);
  clearTrack();
  boss.visible = false;
  G.boss = null;
  G.mode = "menu";
  P.x = 0;
  P.y = 0;
  P.z = 0;
  P.lane = 0;
  world.clearDecor(0);
  world.setBiome(0, true);
  $("#controls").classList.add("hidden");
  show("menu");
  refreshMenu();
  Sfx.music("menu");
}

// ---------------------------------------------------------------------------
// Boucle de jeu
// ---------------------------------------------------------------------------
function zOverlap(a0, a1, b0, b1) {
  return a0 < b1 && b0 < a1;
}

function updateRun(dt) {
  G.speed = Math.min(33, 14 + G.dist * 0.0045);
  const sp = G.speed * (G.mode === "dying" ? 0 : 1);
  P.z -= sp * dt;
  G.dist += sp * dt;
  G.score += sp * dt * multiplier() * 0.5;
  setRunStat("dist", G.dist);
  setRunStat("score", G.score);
  setRunStat("coins", G.coins);

  // Changement de monde
  const biome = Math.floor(G.dist / 750) % BIOMES.length;
  if (biome !== G.biome) {
    G.biome = biome;
    world.setBiome(biome);
    banner(BIOMES[biome].name, "Nouveau monde !");
    Sfx.play("coin", { rate: 0.5, volume: 0.5 });
  }
  if (!G.boss && G.dist > G.nextBossAt) startBoss();

  // Nouvelles rangées devant
  while (G.nextRowZ > P.z - 120) {
    const extra = spawnRow(G.nextRowZ);
    G.nextRowZ -= rowGap() + extra;
  }

  // Bonus en cours
  for (const k of Object.keys(POWER)) {
    if (POWER[k] > 0) {
      POWER[k] -= dt;
      if (POWER[k] <= 0) {
        POWER[k] = 0;
        if (k === "balloon") {
          P.invuln = Math.max(P.invuln, 1.5);
          P.vy = 0;
        }
      }
    }
  }
  P.invuln = Math.max(0, P.invuln - dt);

  // Déplacement latéral
  const targetX = laneX(P.lane);
  P.x += (targetX - P.x) * Math.min(1, dt * 15);
  const midLane = Math.abs(P.x - targetX) > 0.4;

  // Sol : piste, rampes et toits des wagons
  let ground = 0;
  let onWagon = false;
  for (const o of G.objects) {
    if (o.kind !== "wagon" && o.kind !== "ramp") continue;
    if (Math.abs(P.x - laneX(o.lane)) > 1.05) continue;
    if (o.kind === "ramp") {
      const z1 = o.z;
      const z0 = o.z - o.len;
      if (P.z <= z1 && P.z >= z0) {
        const h = (o.top * (z1 - P.z)) / o.len;
        if (P.y >= h - 0.9) ground = Math.max(ground, h);
      }
    } else {
      const z0 = o.z - o.len / 2;
      const z1 = o.z + o.len / 2;
      if (P.z + 0.3 > z0 && P.z - 0.3 < z1 && P.y >= o.top - 0.6) {
        ground = Math.max(ground, o.top);
        onWagon = true;
      }
    }
  }
  if (onWagon && !P.onWagon && P.grounded) statWithMissions("wagons");
  P.onWagon = onWagon;
  P.ground = ground;

  // Vertical
  if (POWER.balloon > 0) {
    P.y += (7 - P.y) * Math.min(1, dt * 3);
    P.vy = 0;
    P.grounded = false;
    // Croquettes dans le ciel
    G.flyCoinT -= dt;
    if (G.flyCoinT <= 0) {
      G.flyCoinT = 0.11;
      if (Math.random() < 0.12) G.flyLane = Math.max(-1, Math.min(1, G.flyLane + pick([-1, 1])));
      addCoin(laneX(G.flyLane), 7.3, P.z - 60);
    }
  } else {
    const wasGrounded = P.grounded;
    P.vy -= GRAVITY * dt;
    P.y += P.vy * dt;
    if (P.y <= ground) {
      if (!wasGrounded && P.vy < -3) {
        P.squash = 1;
        Sfx.play("land", { volume: 0.3, rate: 1.2 });
        world.burst(P.x, ground + 0.05, P.z, 0xffffff, 6, 2.5);
        if (P.queuedSlide) {
          P.queuedSlide = false;
          P.slide = 0.75;
          statWithMissions("slides");
        }
      }
      P.y = ground;
      P.vy = 0;
      P.grounded = true;
      P.coyote = 0.1;
    } else {
      if (P.grounded) P.coyote = 0.1;
      P.grounded = false;
      P.coyote = Math.max(0, P.coyote - dt);
    }
  }
  P.slide = Math.max(0, P.slide - dt);
  P.squash = Math.max(0, P.squash - dt * 5);

  // Objets
  const pz0 = P.z - 0.35;
  const pz1 = P.z + 0.35;
  for (let i = G.objects.length - 1; i >= 0; i -= 1) {
    const o = G.objects[i];
    if (o.vz) {
      o.z += o.vz * dt;
      o.mesh.position.z = o.z;
    }
    if (o.kind === "bomb" && o.flying > 0) {
      o.flying -= dt;
      const k = 1 - Math.max(0, o.flying) / 0.85;
      const to = new THREE.Vector3(laneX(o.lane), 0, o.z);
      o.mesh.position.lerpVectors(o.from, to, k);
      o.mesh.position.y += Math.sin(k * Math.PI) * 4;
      o.mesh.rotation.x += dt * 8;
      if (o.flying <= 0) {
        o.mesh.position.copy(to);
        o.mesh.rotation.set(0, 0, 0);
        world.release(o.warn);
        o.warn = null;
        world.burst(to.x, 0.3, to.z, 0xff7fae, 12, 4);
        Sfx.play("impact", { volume: 0.25, rate: 1.4 });
      }
    }
    if (o.kind === "bomb") o.mesh.userData.spark.scale.setScalar(0.7 + Math.random() * 0.8);
    if (o.kind === "block") o.mesh.userData.cube.rotation.y = 0;
    if (o.kind === "power") {
      o.mesh.rotation.y += dt * 2.5;
      o.mesh.position.y = o.y + Math.sin(G.t * 4 + o.z) * 0.15;
    }
    // Retirer ce qui est passé derrière la caméra
    if (o.z - (o.len || 1) / 2 > P.z + 12) {
      removeObject(o);
      continue;
    }
    if (G.mode !== "run") continue;
    const dx = Math.abs(P.x - laneX(o.lane));
    // Esquive de justesse : l'objet passe dans le couloir qu'on vient de quitter
    if (!o.passed && o.z - (o.len || 0.6) / 2 > P.z + 0.4) {
      o.passed = true;
      if (["barrier", "high", "wagon", "bomb"].includes(o.kind) && o.lane === P.fromLane && o.lane !== P.lane && G.t - P.lastLaneT < 0.45) {
        statWithMissions("near");
        G.score += 50 * multiplier();
        toast("Esquive de justesse ! +" + 50 * multiplier(), "near");
        Sfx.play("attack", { volume: 0.3, rate: 1.25 });
      }
    }
    if (POWER.balloon > 0 && P.y > 3.5 && o.kind !== "power") continue;
    if (o.kind === "power") {
      if (dx < 1.1 && Math.abs(P.z - o.z) < 1.2 && Math.abs(P.y + 0.7 - o.mesh.position.y) < 1.6) {
        removeObject(o);
        if (o.power === "fish") launchRocket();
        else activatePower(o.power);
      }
      continue;
    }
    if (dx > 1.0) continue;
    if (o.kind === "barrier" || (o.kind === "bomb" && !(o.flying > 0))) {
      if (zOverlap(pz0, pz1, o.z - 0.3, o.z + 0.3) && P.y < (o.kind === "bomb" ? 0.9 : 1.0)) crash(o);
    } else if (o.kind === "high") {
      if (zOverlap(pz0, pz1, o.z - 0.35, o.z + 0.35) && P.slide <= 0 && P.y < 2.5) crash(o);
    } else if (o.kind === "wagon") {
      const z0 = o.z - o.len / 2;
      const z1 = o.z + o.len / 2;
      if (zOverlap(pz0, pz1, z0, z1) && P.y < o.top - 0.6) {
        const front = P.z - 0.35 > z1 - 1.2;
        if (!front && midLane) {
          // Choc sur le côté : Kichta rebondit dans son couloir
          P.lane = P.fromLane;
          world.shake(0.3);
          Sfx.play("hurt", { volume: 0.4, rate: 1.3 });
          toast("Ouille !", "near");
        } else crash(o);
      }
    } else if (o.kind === "block" && !o.used) {
      const head = P.y + 1.35;
      if (zOverlap(pz0, pz1, o.z - 0.7, o.z + 0.7) && P.vy > 0 && head > o.y - 0.55 && head < o.y + 0.4) {
        hitBlock(o);
        P.vy = -2;
      }
    }
  }
}

function hitBlock(o) {
  o.used = true;
  statWithMissions("blocks");
  const cube = o.mesh.userData.cube;
  cube.material = cube.material.clone();
  cube.material.map = null;
  cube.material.color.setHex(0xb0793f);
  cube.material.emissiveIntensity = 0;
  o.bump = 0.25;
  Sfx.play("break", { volume: 0.6, rate: 1.6 });
  if (Math.random() < 0.3) {
    activatePower(pick(["magnet", "double", "spring", "shield", "balloon"]));
  } else {
    const n = 8;
    G.coins += n;
    G.score += n * 10 * multiplier();
    toast(`+${n} 🐾`, "coin");
    for (let i = 0; i < n; i += 1) Sfx.play("coin", { volume: 0.3, rate: 1.2 + i * 0.05, delay: i * 0.05 });
  }
  world.burst(laneX(o.lane), o.y, o.z, 0xffd23f, 26, 6);
}

function updateCoins(dt) {
  const magnet = POWER.magnet > 0;
  for (let i = G.coinsList.length - 1; i >= 0; i -= 1) {
    const c = G.coinsList[i];
    c.spin += dt * 4;
    if (c.z > P.z + 6) {
      world.coinFreeSlot(c.slot);
      G.coinsList.splice(i, 1);
      continue;
    }
    if (G.mode === "run") {
      const dz = c.z - P.z;
      if (magnet && dz > -16 && dz < 2) c.magnet = true;
      if (c.magnet) {
        const k = Math.min(1, dt * 12);
        c.x += (P.x - c.x) * k;
        c.y += (P.y + 0.8 - c.y) * k;
        c.z += (P.z - c.z) * k;
      }
      if (Math.abs(c.x - P.x) < 0.95 && Math.abs(c.z - P.z) < 0.9 && Math.abs(c.y - (P.y + 0.7)) < 1.15) {
        world.coinFreeSlot(c.slot);
        G.coinsList.splice(i, 1);
        collectCoin(c);
        continue;
      }
    }
    world.coinSet(c.slot, c.x, c.y + Math.sin(G.t * 3 + c.z) * 0.06, c.z, c.spin);
  }
}
function collectCoin(c) {
  G.coins += 1;
  G.score += 5 * multiplier();
  G.coinStreak = G.t - G.lastCoinT < 0.45 ? G.coinStreak + 1 : 0;
  G.lastCoinT = G.t;
  Sfx.play("coin", { volume: 0.32, rate: 1 + Math.min(0.7, G.coinStreak * 0.035), vary: 0.01, wet: false });
  world.burst(c.x, c.y, c.z, 0xffd23f, 4, 2.5);
  coinPulse();
}

let frames = 0;
let slowTime = 0;
let qualityCheck = 0;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  tick(dt, true);
  requestAnimationFrame(loop);
}

function tick(dt, draw) {
  // Qualité adaptative : si le téléphone peine, on allège le rendu
  if (draw && !window.kichtaNoAdapt) {
  frames += 1;
  qualityCheck += dt;
  if (dt > 1 / 40) slowTime += dt;
  if (qualityCheck > 2.5) {
    if (slowTime / qualityCheck > 0.5 && world.quality < 3) world.setQuality(world.quality + 1);
    qualityCheck = 0;
    slowTime = 0;
  }
  }
  if (G.mode !== "pause" && G.mode !== "cinema") {
    G.t += dt;
    if (G.mode === "run" || G.mode === "dying") {
      updateRun(dt);
      updateBoss(dt);
      updateRockets(dt);
      if (G.mode === "dying") {
        G.dyingT += dt;
        if (G.dyingT > 1.3) gameOver();
      }
    }
    updateCoins(dt);
  }
  // Kichta
  const pose =
    G.mode === "menu" ? "idle" : G.mode === "dying" || G.mode === "over" ? "hit" : POWER.balloon > 0 ? "fly" : P.slide > 0 ? "slide" : !P.grounded ? (P.vy > 0 ? "jump" : "fall") : "run";
  kichta.position.set(P.x, P.y, P.z);
  kichta.rotation.y = G.mode === "menu" ? Math.sin(G.t * 0.6) * 0.35 : Math.PI;
  animateToon(kichta, G.t, pose, { speed: G.speed / 14, lean: (laneX(P.lane) - P.x) * 0.12, squash: P.squash });
  balloons.visible = POWER.balloon > 0;
  shieldBubble.visible = POWER.shield > 0;
  shieldBubble.material.opacity = 0.22 + Math.sin(G.t * 6) * 0.06 + (POWER.shield > 0 && POWER.shield < 2 ? Math.sin(G.t * 25) * 0.15 : 0);
  magnetRing.visible = POWER.magnet > 0;
  magnetRing.rotation.z += dt * 4;
  kichta.visible = !(P.invuln > 0 && G.mode === "run" && Math.floor(G.t * 14) % 2 === 0);

  if (G.mode !== "pause") {
    world.update(dt, G.t, { playerX: P.x, playerY: P.y, playerZ: P.z, speed: G.mode === "run" ? G.speed : 0, mode: G.mode, fly: POWER.balloon > 0 });
    Sfx.setRunning(G.mode === "run" && P.grounded && P.slide <= 0, G.speed / 16);
  }
  if (draw) world.render();
  if (G.mode === "run" || G.mode === "dying") updateHud();
  if (G.mode === "run") updateTutorial(dt);
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
const screens = ["menu", "shop", "missions", "chest", "pause", "over", "hud"];
function show(name) {
  const keepHud = ["hud", "pause", "over"].includes(name);
  screens.forEach((s) => $(`#${s}`).classList.toggle("hidden", !(s === name || (s === "hud" && keepHud))));
}
let hudScore = -1;
function updateHud() {
  const s = Math.floor(G.score);
  if (s !== hudScore) {
    $("#score").textContent = s.toLocaleString("fr-FR");
    hudScore = s;
  }
  $("#coins").textContent = G.coins;
  const m = multiplier();
  const multEl = $("#mult");
  multEl.textContent = `×${m}`;
  multEl.classList.toggle("hot", POWER.double > 0);
  // Barres des bonus
  const html = Object.keys(POWER)
    .filter((k) => POWER[k] > 0)
    .map((k) => `<div class="power"><span>${POWER_INFO[k].icon}</span><i style="--p:${Math.min(1, POWER[k] / duration(k))}"></i></div>`)
    .join("");
  const box = $("#powers");
  if (box.dataset.html !== html) {
    box.innerHTML = html;
    box.dataset.html = html;
  }
}
function coinPulse() {
  const el = $(".coin-box");
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}
function toast(text, kind = "") {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 1700);
}
function banner(title, sub) {
  const el = $("#banner");
  el.innerHTML = `<strong>${title}</strong><span>${sub}</span>`;
  el.classList.remove("hidden", "go");
  void el.offsetWidth;
  el.classList.add("go");
  clearTimeout(banner.timer);
  banner.timer = setTimeout(() => el.classList.add("hidden"), 2600);
}
function flash(color) {
  const el = $("#flash");
  el.style.background = color;
  el.classList.remove("go");
  void el.offsetWidth;
  el.classList.add("go");
}

// Tutoriel de la première course
let tutoStep = 0;
let tutoT = 0;
const TUTO = [
  { text: "◀ ▶ Change de couloir", done: () => (G.stats.lanes || 0) >= 2 },
  { text: "▲ Saute par-dessus les barrières", done: () => (G.stats.jumps || 0) >= 1 },
  { text: "Glisse le doigt vers le bas pour passer sous les barres ▼", done: () => (G.stats.slides || 0) >= 1 || tutoT > 9 },
  { text: "Attrape les croquettes d'or 🐾 et tape les blocs « ? »", done: () => tutoT > 5 },
];
function startTutorial() {
  tutoStep = 0;
  tutoT = 0;
  $("#tuto").classList.remove("hidden");
  $("#tuto").textContent = TUTO[0].text;
}
function updateTutorial(dt) {
  if (save.tutorial || tutoStep >= TUTO.length) return;
  tutoT += dt;
  if (TUTO[tutoStep].done()) {
    tutoStep += 1;
    tutoT = 0;
    if (tutoStep >= TUTO.length) {
      save.tutorial = true;
      persist();
      $("#tuto").classList.add("hidden");
    } else $("#tuto").textContent = TUTO[tutoStep].text;
  }
}

function renderMissionList(ul) {
  ul.innerHTML = save.missions
    .map((m) => {
      const t = missionType(m);
      const p = Math.min(1, m.progress / m.goal);
      return `<li class="${m.done ? "done" : ""}"><span>${m.done ? "✔" : "🎯"}</span><div><p>${t.text(m.goal)}</p><i style="--p:${p}"></i><small>${Math.min(m.progress, m.goal)} / ${m.goal}</small></div></li>`;
    })
    .join("");
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function refreshMenu() {
  document.querySelectorAll(".coinsTotal").forEach((el) => (el.textContent = save.coins.toLocaleString("fr-FR")));
  $("#bestMenu").textContent = save.best.toLocaleString("fr-FR");
  $("#levelBadge").textContent = `×${save.level}`;
  $("#chestBadge").classList.toggle("hidden", save.chestDay === today());
  $("#cinemaBtn").classList.toggle("locked", !save.cinematic);
  $("#soundBtn").textContent = save.sound ? "🔊" : "🔇";
}

// --- Boutique ---------------------------------------------------------------------
const UPGRADE_COST = [150, 350, 700, 1200, 2000];
let shopTab = "skin";
const TABS = { skin: "Pelages", hat: "Chapeaux", face: "Lunettes", back: "Dos", upgrades: "Bonus" };
function renderShop() {
  $("#shopTabs").innerHTML = Object.entries(TABS)
    .map(([k, v]) => `<button data-tab="${k}" class="${k === shopTab ? "on" : ""}">${v}</button>`)
    .join("");
  let items = [];
  if (shopTab === "upgrades") {
    items = Object.entries(POWER_INFO).map(([k, info]) => {
      const lvl = save.upgrades[k];
      const max = lvl >= 5;
      return `<div class="item"><div class="icon">${info.icon}</div><b>${info.name}</b><small>${Math.round(duration(k))} s</small><div class="dots">${"●".repeat(lvl)}${"○".repeat(5 - lvl)}</div><button data-up="${k}" ${max || save.coins < UPGRADE_COST[lvl] ? "disabled" : ""}>${max ? "MAX" : `<i class="coin"></i>${UPGRADE_COST[lvl]}`}</button></div>`;
    });
  } else {
    const catalog = shopTab === "skin" ? SKINS : OUTFITS[shopTab];
    items = Object.entries(catalog).map(([k, item]) => {
      const owned = save.owned[shopTab].includes(k);
      const worn = save.wear[shopTab] === k;
      const icon = shopTab === "skin" ? `<span class="swatch" style="--a:${item.base};--b:${item.stripe}"></span>` : ICONS[k] || "✨";
      const label = worn ? "PORTÉ" : owned ? "PORTER" : `<i class="coin"></i>${item.price}`;
      return `<div class="item ${worn ? "worn" : ""}"><div class="icon">${icon}</div><b>${item.name}</b><button data-item="${k}" ${worn || (!owned && save.coins < item.price) ? "disabled" : ""}>${label}</button></div>`;
    });
  }
  $("#shopGrid").innerHTML = items.join("");
  refreshMenu();
}
const ICONS = { none: "🚫", noeud: "🎀", casquette: "🧢", couronne: "👑", sorcier: "🎩", casque: "🎧", soleil: "🕶️", coeur: "😍", cape: "🦸", ailes: "🧚", fusee: "🚀" };
$("#shopTabs").addEventListener("click", (e) => {
  const tab = e.target.closest("button")?.dataset.tab;
  if (!tab) return;
  shopTab = tab;
  Sfx.play("click", { volume: 0.4 });
  renderShop();
});
$("#shopGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || btn.disabled) return;
  if (btn.dataset.up) {
    const k = btn.dataset.up;
    const cost = UPGRADE_COST[save.upgrades[k]];
    if (save.coins < cost) return;
    save.coins -= cost;
    save.upgrades[k] += 1;
    Sfx.play("coin", { rate: 0.7, volume: 0.6 });
  } else {
    const k = btn.dataset.item;
    const catalog = shopTab === "skin" ? SKINS : OUTFITS[shopTab];
    if (!save.owned[shopTab].includes(k)) {
      if (save.coins < catalog[k].price) return;
      save.coins -= catalog[k].price;
      save.owned[shopTab].push(k);
      Sfx.play("coin", { rate: 0.7, volume: 0.6 });
      world.confetti(0, 1.5, -0.5, 50);
    } else Sfx.play("click", { volume: 0.5 });
    save.wear[shopTab] = k;
    applyLook();
  }
  persist();
  renderShop();
});
function applyLook() {
  if (kichta.userData.skin !== save.wear.skin) {
    // Nouveau pelage : on reconstruit Kichta
    const fresh = createToon("kichta", { skin: save.wear.skin });
    world.scene.remove(kichta);
    kichta.clear();
    fresh.children.slice().forEach((c) => kichta.add(c));
    kichta.userData = fresh.userData;
    kichta.add(balloons, shieldBubble, magnetRing);
    world.scene.add(kichta);
    kichta.userData.skin = save.wear.skin;
  }
  dressToon(kichta, save.wear);
  kichta.traverse((o) => o.isMesh && o !== shieldBubble && (o.castShadow = true));
}
kichta.userData.skin = save.wear.skin;

// --- Coffre du jour --------------------------------------------------------------------
function openChestScreen() {
  const ready = save.chestDay !== today();
  $("#chestIcon").className = ready ? "ready" : "";
  $("#chestText").textContent = ready ? "Un coffre plein de surprises t'attend !" : "Reviens demain pour un nouveau coffre 🎁";
  $("#chestOpen").classList.toggle("hidden", !ready);
  show("chest");
}
$("#chestOpen").onclick = () => {
  if (save.chestDay === today()) return;
  save.chestDay = today();
  const coins = 60 + Math.floor(Math.random() * 7) * 40;
  save.coins += coins;
  let text = `+${coins} croquettes !`;
  if (Math.random() < 0.35) {
    save.startShield += 1;
    text += " Et un bouclier de départ 🫧 !";
  }
  persist();
  $("#chestIcon").className = "open";
  $("#chestText").textContent = text;
  $("#chestOpen").classList.add("hidden");
  world.confetti(0, 1.5, -0.5, 90);
  Sfx.play("destroy", { rate: 1.5, volume: 0.5 });
  Sfx.play("coin", { rate: 0.8, volume: 0.6, delay: 0.15 });
  refreshMenu();
};

// --- Cinématique -------------------------------------------------------------------------
const video = $("#cinematic");
function playCinematic(fromRun = false) {
  if (!save.cinematic) {
    toast("Bats Pucci pour débloquer la cinématique !", "near");
    return;
  }
  G.prevMode = G.mode;
  G.mode = "cinema";
  Sfx.music(null);
  Sfx.setRunning(false);
  video.muted = !save.sound;
  video.currentTime = 0;
  video.classList.remove("hidden");
  $("#skipVideo").classList.remove("hidden");
  video.play().catch(() => {});
  video.dataset.fromRun = fromRun ? "1" : "";
}
function endCinematic() {
  video.pause();
  video.classList.add("hidden");
  $("#skipVideo").classList.add("hidden");
  if (video.dataset.fromRun) {
    G.mode = "run";
    P.invuln = Math.max(P.invuln, 2);
    Sfx.music("run");
  } else {
    G.mode = "menu";
    Sfx.music("menu");
  }
}
video.addEventListener("ended", endCinematic);
$("#skipVideo").onclick = endCinematic;

// --- Boutons ---------------------------------------------------------------------------
const click = (sel, fn) =>
  $(sel).addEventListener("click", (e) => {
    e.preventDefault();
    Sfx.unlock();
    Sfx.play("click", { volume: 0.4 });
    fn();
  });
$("#playBtn").addEventListener("click", startRun);
click("#shopBtn", () => {
  renderShop();
  show("shop");
});
click("#missionsBtn", () => {
  $("#lvl").textContent = save.level;
  $("#lvlMult").textContent = `×${save.level}`;
  renderMissionList($("#missionList"));
  show("missions");
});
click("#chestBtn", openChestScreen);
click("#cinemaBtn", () => playCinematic(false));
document.querySelectorAll(".back").forEach((b) =>
  b.addEventListener("click", () => {
    Sfx.play("click", { volume: 0.4 });
    show("menu");
    refreshMenu();
  }),
);
click("#pauseBtn", pauseGame);
click("#resumeBtn", resumeGame);
click("#quitBtn", toMenu);
$("#againBtn").addEventListener("click", startRun);
click("#menuBtn", toMenu);
$("#reviveBtn").addEventListener("click", revive);
click("#soundBtn", () => {
  save.sound = !save.sound;
  Sfx.setEnabled(save.sound);
  persist();
  refreshMenu();
  if (save.sound) Sfx.music("menu");
});
click("#fsBtn", () => {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen?.();
  else el.requestFullscreen?.().catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame();
    Sfx.music(null);
  }
});

function resize() {
  world.resize(innerWidth, innerHeight);
}
addEventListener("resize", resize);
if (matchMedia("(pointer:coarse)").matches) world.setQuality(1);
resize();
Sfx.setEnabled(save.sound);
// La musique démarre au premier toucher (règle des navigateurs)
addEventListener("pointerdown", () => G.mode === "menu" && Sfx.music("menu"), { once: true });
refreshMenu();
show("menu");
requestAnimationFrame(loop);
if ("serviceWorker" in navigator && !location.search.includes("debug")) navigator.serviceWorker.register("sw.js").catch(() => {});

// Mode test (?debug)
if (location.search.includes("debug")) {
  window.kichta = { G, P, POWER, save, tick, LANE, laneX, addObject, addPower, coinLine, boss, startRun, moveLane, jump, slide, startBoss, activatePower, world, toMenu, gameOver, persist };
}
