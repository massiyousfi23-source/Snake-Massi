// Kichta Run — course sans fin à trois couloirs dans un monde de bonbons.
// Inspirations : la boucle de Subway Surfers (couloirs, wagons, missions,
// multiplicateur), les blocs « ? » et l'ambiance de Mario, et un boss qui
// revient régulièrement.
import * as THREE from "../vendor/three.module.min.js";
import { createWorld, LANE, BIOMES } from "./world.js?v=b7";
import { createToon, dressToon, animateToon, flashToon, addInjuries, SKINS, OUTFITS, RARITY, SLOT_NAMES, buildItem, candy } from "./toons.js?v=b7";
import { createDog, animateDog, createHedgehog, animateHedgehog, createBone, createSpike, createSkate, createCaterpillar, animateCaterpillar, createFly, animateFly, createApple, createTrashBag } from "./bosses.js?v=b7";
import { installThemes, themeIndex } from "./themes.js?v=b7";
import * as Sfx from "./sfx.js?v=b7";
import { CATS } from "./cats.js?v=b7";

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
  owned: { hat: ["none"], face: ["none"], neck: ["none"], back: ["none"], skin: ["caramel"] },
  wear: { hat: "none", face: "none", neck: "none", back: "none", skin: "caramel" },
  worlds: ["bonbons", "nuages", "chocolat", "glaces"],
  startWorld: "bonbons",
  pending: [],
  upgrades: { magnet: 0, shield: 0, double: 0, balloon: 0, spring: 0 },
  lifetime: {},
  chestDay: "",
  startShield: 0,
  cinematic: false,
  stage: 1,
  cinemas: [],
  sound: true,
  tutorial: false,
  runs: 0,
  hero: { id: "kichta", name: "Kichta" },
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
// Ancienne sauvegarde : Pucci déjà battue = première cinématique débloquée
if (save.cinematic && !save.cinemas.length) save.cinemas.push(1);
// Passage de 4 à 6 niveaux : Pikou devient le niveau 6, Chacha et Moumouche s'intercalent
if (!save.v6) {
  save.v6 = true;
  save.cinemas = save.cinemas.map((n) => (n === 4 ? 6 : n));
  if (save.stage > 4) save.stage = 4;
}
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
  { id: "pucci", stat: "pucci", base: 1, step: 0.5, text: (n) => (n > 1 ? `Bats ${n} boss` : "Bats un boss") },
  { id: "doubles", stat: "doubles", base: 5, step: 5, text: (n) => `Fais ${n} doubles sauts` },
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
// Le héros : Kichta, ou le chat du joueur (écran « Mon chat »)
const heroCat = () => CATS.find((c) => c.id === save.hero?.id) || null;
const heroKey = () => `${save.wear.skin}|${heroCat()?.id || "kichta"}`;
const kichta = createToon("kichta", { skin: save.wear.skin, look: heroCat()?.look });
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
    const gifts = levelRewards(save.level);
    const gift = gifts[0] ? ` · 🎁 ${OUTFITS[gifts[0].slot][gifts[0].id].name} !` : "";
    banner(`NIVEAU ${save.level} !`, `Multiplicateur ×${save.level} · +${reward} croquettes${gift}`);
    Sfx.play("fanfare", { volume: 0.6 });
    if (G.mode === "run") world.confetti(P.x, 2, P.z - 3, 70);
    changed = true;
  }
  if (changed) persist();
}

// ---------------------------------------------------------------------------
// Récompenses : niveaux, coffres, cadeaux secrets
// ---------------------------------------------------------------------------
const ALL_ITEMS = Object.entries(OUTFITS).flatMap(([slot, items]) => Object.entries(items).map(([id, item]) => ({ slot, id, ...item })));
const owns = (slot, id) => save.owned[slot] && save.owned[slot].includes(id);
/** Donne un objet et le met de côté pour la cérémonie d'ouverture. */
function grantItem(slot, id, source) {
  if (!save.owned[slot]) save.owned[slot] = ["none"];
  if (!owns(slot, id)) save.owned[slot].push(id);
  save.pending.push({ slot, id, source });
  persist();
}
function levelRewards(level) {
  const items = ALL_ITEMS.filter((i) => i.unlock === "level" && i.level === level);
  items.forEach((i) => grantItem(i.slot, i.id, "level"));
  // Au-delà des récompenses prévues : un coffre bonus
  if (!items.length && level > 2) save.pending.push({ coins: 150 * level, source: "level" });
  return items;
}
const RARITY_WEIGHT = { commun: 50, rare: 30, epique: 14, legendaire: 5, mythique: 1 };
function rollChestItem() {
  const pool = ALL_ITEMS.filter((i) => i.id !== "none" && (i.unlock === "chest" || i.unlock === "shop") && !owns(i.slot, i.id));
  if (!pool.length) return null;
  let total = pool.reduce((sum, i) => sum + (RARITY_WEIGHT[i.rarity] || 10) * (i.unlock === "chest" ? 2 : 1), 0);
  let r = Math.random() * total;
  for (const i of pool) {
    r -= (RARITY_WEIGHT[i.rarity] || 10) * (i.unlock === "chest" ? 2 : 1);
    if (r <= 0) return i;
  }
  return pool[0];
}
function grantSecret() {
  const item = ALL_ITEMS.find((i) => i.unlock === "secret" && !owns(i.slot, i.id));
  if (item) grantItem(item.slot, item.id, "secret");
  else save.pending.push({ coins: 600, source: "secret" });
  persist();
  banner("🎁 CADEAU SECRET !", "10 glissades dans ce monde : ouvre-le à la fin de la course");
  Sfx.play("sparkle", { volume: 0.8 });
  Sfx.play("fanfare", { volume: 0.5, delay: 0.1 });
  world.confetti(P.x, 2, P.z - 3, 90);
  flash("#ffe14d");
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
  // Le modèle dépend du monde : arbre à chat dans l'appartement, niche au jardin…
  const { key, build } = world.obstacleBuilder(kind);
  const mesh = world.acquire(`obs-${key}-${kind === "wagon" ? Math.floor(Math.random() * 4) : 0}`, build);
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
      // L'avant du wagon (ou de l'arbre à chat, de la niche…) touche le haut de la rampe
      w.z = z - w.len / 2;
      w.mesh.position.z = w.z;
      if (i === 0 && Math.random() < 0.7) {
        // La rampe monte de z + 5 (au sol) jusqu'à l'avant du wagon (z)
        const ramp = addObject("ramp", l, z + 5);
        ramp.mesh.position.z = z;
        coinLine(l, z + 3, 3, 1.6, 2);
        coinLine(l, z - 1, 5, 3.7, 2);
      }
      if (Math.random() < 0.25 && d > 0.25) {
        // Wagon suivant collé derrière : on peut courir de toit en toit
        const w2 = addObject("wagon", l, z - w.len - 1);
        w2.z = z - w.len - 1 - w2.len / 2;
        w2.mesh.position.z = w2.z;
        coinLine(l, z - w.len - 1, 4, 3.7, 1.2);
        length = 14;
      }
    });
    if (Math.random() < 0.5) coinLine(free, z, 6);
    length = Math.max(length, 12);
  } else if (r < 0.8 && d > 0.2) {
    // Quelque chose fonce vers Kichta : wagon, ou dans les mondes des boss
    // un robot aspirateur, une tondeuse, un tronc ou une poubelle qui roule
    const lane = pick(lanes);
    const themed = world.biome.theme;
    const w = addObject(themed ? "rusher" : "wagon", lane, z - 30);
    w.vz = 9 + d * 6;
    w.moving = true;
    lanes.filter((l) => l !== lane).forEach((l) => Math.random() < 0.6 && coinLine(l, z, 5));
    length = 8;
  } else if (r < 0.86 && d > 0.05) {
    // Boule suspendue qui se balance d'un couloir à l'autre : passer au bon moment
    const pend = addObject("pendulum", 0, z);
    pend.phase = Math.random() * Math.PI * 2;
    pend.speed = 2 + d * 0.8;
    coinLine(0, z + 6, 4);
    length = 4;
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
  } else if (P.airJumps < 1 && P.y < 9) {
    // Double saut : salto et miaulement de joie
    P.airJumps += 1;
    P.vy = (POWER.spring > 0 ? 16 : JUMP) * 0.95;
    P.flip = 0.5;
    P.slide = 0;
    statWithMissions("doubles");
    Sfx.play("meow", { volume: 0.75, rate: 1.55, vary: 0.04 });
    Sfx.play("sparkle", { volume: 0.35 });
    world.burst(P.x, P.y + 0.6, P.z, 0xff9ccf, 22, 5);
  }
}
function countSlide() {
  statWithMissions("slides");
  G.worldSlides += 1;
  if (G.worldSlides === 5 && !G.secretGiven) toast("🤫 Psst… continue de glisser !", "power");
  if (G.worldSlides === 10 && !G.secretGiven) {
    G.secretGiven = true;
    grantSecret();
  }
}
function slide() {
  if (!isRunning() || POWER.balloon > 0) return;
  if (P.grounded) {
    if (P.slide <= 0) countSlide();
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
  if (e.repeat) return;
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
// Les 4 niveaux : chacun a son boss et sa cinématique
// ---------------------------------------------------------------------------
const LEVELS = [
  { n: 1, boss: "pucci", theme: "appart", name: "Pucci", short: "PUCCI", hp: 3, title: "PUCCI ATTAQUE !", hint: "Attrape les poissons-fusées 🐟 pour la toucher", win: "PUCCI VAINCUE !", video: "assets/cine-1.mp4", cine: "La fête des croquettes" },
  { n: 2, boss: "pucci2", theme: "appart", name: "Pucci revient", short: "PUCCI", hp: 4, title: "PUCCI REVIENT !", hint: "Elle est furieuse… attrape les poissons 🐟", win: "PUCCI K.-O. !", video: "assets/cine-2.mp4", cine: "La chambre secrète", reward: { slot: "hat", id: "toque" } },
  { n: 3, boss: "dog", theme: "jardin", name: "Rocky le chien", short: "ROCKY", hp: 4, title: "ROCKY LE CHIEN !", hint: "Saute les os 🦴 et attrape les poissons 🐟", win: "ROCKY EST DOMPTÉ !", video: "assets/cine-3.mp4", cine: "Le rodéo", reward: { slot: "hat", id: "sherif" } },
  { n: 4, boss: "caterpillar", theme: "foret2", name: "Chacha la chenille", short: "CHACHA", hp: 4, title: "CHACHA LA CHENILLE !", hint: "Saute les pommes 🍎 et attrape les poissons 🐟", win: "CHACHA EST ATTRAPÉE !", video: "assets/cine-chenille.mp4", cine: "La chenille au bout du fil" },
  { n: 5, boss: "fly", theme: "ruelle", name: "Moumouche la mouche", short: "MOUMOUCHE", hp: 5, title: "MOUMOUCHE LA MOUCHE !", hint: "Évite les sacs-poubelle 🗑️ et attrape les poissons 🐟", win: "MOUMOUCHE EST TOMBÉE !", video: "assets/cine-mouche.mp4", cine: "Moumouche sans ailes" },
  { n: 6, boss: "hedgehog", theme: "foret", name: "Pikou le hérisson", short: "PIKOU", hp: 5, title: "PIKOU, LE BOSS FINAL !", hint: "Esquive 3 piques pour débloquer ton arme secrète", win: "PIKOU EST VAINCU !", video: "assets/cine-4.mp4", cine: "Les brochettes", reward: { slot: "hat", id: "champion" } },
];
const currentLevel = () => LEVELS[Math.min(LEVELS.length, save.stage) - 1];

// Les boss : Pucci sur son nuage (normale et bandée), Rocky et Pikou au sol
const cloud = new THREE.Group();
const cloudMat = candy(0xffffff, { roughness: 0.55, clearcoat: 0.3 });
for (let i = 0; i < 7; i += 1) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.7 + (i % 3) * 0.2, 18, 12), cloudMat);
  s.position.set((i - 3) * 0.55, -0.1 + (i % 2) * 0.15, (i % 3) * 0.3 - 0.3);
  cloud.add(s);
}
const pucci = createToon("pucci");
pucci.scale.setScalar(2.5);
const pucciHurt = addInjuries(createToon("pucci"));
pucciHurt.scale.setScalar(2.5);
const dog = createDog();
dog.scale.setScalar(1.7);
const hog = createHedgehog();
hog.scale.setScalar(1.8);
const chacha = createCaterpillar();
chacha.scale.setScalar(1.6);
const moumouche = createFly();
moumouche.scale.setScalar(1.7);
const boss = new THREE.Group();
boss.add(cloud, pucci, pucciHurt, dog, hog, chacha, moumouche);
boss.visible = false;
world.scene.add(boss);
const BOSS_MODEL = { pucci, pucci2: pucciHurt, dog, hedgehog: hog, caterpillar: chacha, fly: moumouche };
const bossModel = () => BOSS_MODEL[G.boss.kind];
world.OBSTACLES.bone = createBone;
world.OBSTACLES.spike = createSpike;
world.OBSTACLES.apple = createApple;
world.OBSTACLES.bag = createTrashBag;
installThemes(world);

// Patins de Kichta (arme secrète du niveau 4)
const skates = [];
function setSkates(on) {
  if (on && !skates.length) {
    kichta.userData.legs.forEach((leg) => {
      const s = createSkate();
      s.position.set(0, -0.37, 0.03);
      leg.add(s);
      skates.push(s);
    });
  }
  skates.forEach((s) => (s.visible = on));
  G.skates = on;
}

function startBoss() {
  const level = currentLevel();
  const kind = save.stage > LEVELS.length ? pick(LEVELS).boss : level.boss;
  const hard = Math.max(0, save.stage - LEVELS.length) + (save.lifetime.pucci || 0) * 0.15;
  G.boss = {
    kind,
    level: save.stage > LEVELS.length ? LEVELS.find((l) => l.boss === kind) : level,
    hp: (LEVELS.find((l) => l.boss === kind) || level).hp,
    t: 0,
    throwT: 2.4,
    fishT: 1.5,
    x: 0,
    targetX: 0,
    rate: Math.max(0.7, ({ pucci: 1.7, pucci2: 1.3, dog: 1.25, caterpillar: 1.2, fly: 1.0, hedgehog: 1.15 }[kind] || 1.3) - hard * 0.1),
    leaving: 0,
    defeated: false,
    hurt: 0,
    dodged: 0,
  };
  Object.entries(BOSS_MODEL).forEach(([k, m]) => (m.visible = k === kind));
  cloud.visible = kind === "pucci" || kind === "pucci2";
  boss.visible = true;
  boss.rotation.set(0, 0, 0);
  boss.position.set(0, cloud.visible ? 9 : 0, P.z - 40);
  setSkates(false);
  $("#bossBar span").textContent = `${{ pucci: "😾", pucci2: "😾", dog: "🐶", hedgehog: "🦔", caterpillar: "🐛", fly: "🪰" }[kind]} ${G.boss.level.short}`;
  $("#bossBar div").innerHTML = "<i></i>".repeat(G.boss.hp);
  $("#bossBar").classList.remove("hidden");
  updateBossBar();
  banner(G.boss.level.title, G.boss.level.hint);
  // Face à face : Kichta crache, poils hérissés
  G.hissT = 2.8;
  Sfx.play("hiss", { volume: 0.9, rate: 1.05 });
  if (kind === "fly") {
    Sfx.play("buzz", { volume: 0.8, delay: 0.5 });
  } else if (kind === "caterpillar") {
    Sfx.play("squeak", { volume: 0.7, rate: 1.4, delay: 0.6 });
  } else if (kind === "dog") {
    Sfx.play("bark", { volume: 0.9, delay: 0.6 });
    Sfx.play("bark", { volume: 0.9, rate: 0.9, delay: 0.95 });
  } else if (kind === "hedgehog") {
    Sfx.play("squeak", { volume: 0.8, delay: 0.6 });
  } else {
    Sfx.play("hiss", { volume: 0.8, rate: 0.82, delay: 0.7 });
    Sfx.play("meow", { volume: 0.7, rate: 0.85, delay: 1.5 });
  }
  world.shake(0.25);
  Sfx.music("boss");
}
function updateBossBar() {
  [...$("#bossBar").querySelectorAll("i")].forEach((el, i) => el.classList.toggle("off", !G.boss || i >= G.boss.hp));
}
function hurtBoss(target) {
  const b = G.boss;
  if (!b || b.leaving) return;
  b.hp -= 1;
  b.hurt = 0.5;
  updateBossBar();
  world.burst(target.x, target.y, target.z, 0xff5fa2, 40, 9);
  world.shake(0.35);
  Sfx.play("destroy", { volume: 0.7, rate: 1.2 });
  if (b.kind === "dog") Sfx.play("bark", { volume: 0.8, rate: 1.3 });
  else if (b.kind === "hedgehog") Sfx.play("squeak", { volume: 0.8, rate: 0.8 });
  else if (b.kind === "caterpillar") Sfx.play("squeak", { volume: 0.8, rate: 1.5 });
  else if (b.kind === "fly") Sfx.play("buzz", { volume: 0.8, rate: 1.3 });
  else Sfx.play("meow", { volume: 0.7, rate: 1.1 + Math.random() * 0.2 });
  if (b.hp <= 0) endBoss(true);
}
function endBoss(defeated) {
  const b = G.boss;
  if (!b) return;
  b.leaving = 1;
  b.defeated = defeated;
  $("#bossBar").classList.add("hidden");
  G.nextBossAt = G.dist + 1600;
  setSkates(false);
  if (defeated) {
    statWithMissions("pucci");
    const level = b.level;
    const reward = 150 * level.n * Math.max(1, save.level);
    G.score += 1000 * level.n * multiplier();
    G.coins += reward;
    banner(level.win, `+${reward} croquettes · Niveau ${level.n} terminé !`);
    world.confetti(boss.position.x, boss.position.y + 1, boss.position.z, 160);
    world.shake(0.6);
    Sfx.play("destroy", { volume: 0.9 });
    Sfx.play("fanfare", { volume: 0.6, delay: 0.2 });
    for (let i = 0; i < 36; i += 1) addCoin(laneX(pick([-1, 0, 1])), 0.75, P.z - 25 - i * 1.6);
    // Niveau terminé : cinématique, récompense, niveau suivant
    if (!save.cinemas.includes(level.n)) save.cinemas.push(level.n);
    if (level.reward && !owns(level.reward.slot, level.reward.id)) grantItem(level.reward.slot, level.reward.id, "level");
    const finished = save.stage === LEVELS.length;
    if (save.stage <= LEVELS.length && level.n === save.stage) save.stage += 1;
    save.cinematic = true;
    persist();
    clearTimeout(G.cineTimer);
    G.cineTimer = setTimeout(() => G.mode === "run" && playCinematic(level.n, true, finished), 1800);
  } else {
    banner(`${b.level.name} s'enfuit…`, "Il reviendra plus loin !");
  }
  Sfx.music("run");
}
function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  const model = bossModel();
  b.t += dt;
  b.hurt = Math.max(0, b.hurt - dt);
  const flying = b.kind === "pucci" || b.kind === "pucci2" || b.kind === "fly";
  if (b.leaving > 0) {
    b.leaving += dt;
    if (flying || b.defeated) boss.position.y += dt * (b.defeated ? 10 : 6);
    boss.position.z = P.z - 15 - b.leaving * 8;
    boss.rotation.z += dt * (b.defeated ? 12 : 0);
    if (b.kind === "fly") animateFly(model, G.t, b.defeated ? "dive" : "fly");
    else if (b.kind === "caterpillar") animateCaterpillar(model, G.t, b.defeated ? "dizzy" : "crawl");
    else if (flying) animateToon(model, G.t, b.defeated ? "hit" : "win");
    else if (b.kind === "dog") animateDog(model, G.t, b.defeated ? "dizzy" : "run");
    else animateHedgehog(model, G.t, b.defeated ? "hurt" : "run");
    if (b.leaving > 3) {
      boss.visible = false;
      G.boss = null;
    }
    return;
  }
  // Le boss se place devant un couloir et vise Kichta
  if (Math.random() < dt * 0.6) b.targetX = laneX(pick([-1, 0, 1]));
  b.x += (b.targetX - b.x) * Math.min(1, dt * 2.5);
  if (flying) {
    const enterY = Math.max(3.2, 9 - b.t * 4);
    boss.position.set(b.x, enterY + Math.sin(G.t * 2) * 0.25, P.z - 15);
    boss.rotation.set(0, 0, Math.sin(G.t * 1.5) * 0.08);
    if (b.kind === "fly") {
      animateFly(model, G.t, b.throwT < 0.3 ? "dive" : "fly");
      boss.position.y -= 1.4;
      model.userData.flash.forEach((m) => m.emissive && m.emissive.setRGB(b.hurt * 2, b.hurt * 0.4, b.hurt * 0.4));
    } else {
      animateToon(model, G.t, G.hissT > 0.3 ? "hiss" : b.throwT < 0.3 ? "throw" : "idle");
      flashToon(model, b.hurt > 0 ? b.hurt * 3 : 0);
    }
  } else {
    // Rocky et Pikou courent à reculons devant Kichta
    const enterZ = Math.max(0, 1 - b.t / 1.5);
    boss.position.set(b.x, 0, P.z - 14 - enterZ * 26);
    boss.rotation.set(0, 0, 0);
    if (b.kind === "dog") animateDog(model, G.t, b.hurt > 0 ? "dizzy" : b.barkT > 0 ? "bark" : b.throwT < 0.35 ? "throw" : "run", { speed: G.speed / 12 });
    else if (b.kind === "caterpillar") animateCaterpillar(model, G.t, b.hurt > 0 ? "dizzy" : b.throwT < 0.4 ? "throw" : "crawl", { speed: G.speed / 12 });
    else animateHedgehog(model, G.t, b.hurt > 0 ? "hurt" : b.throwT < 0.5 ? "throw" : "run", { speed: G.speed / 12 });
    model.userData.flash.forEach((m) => m.emissive && m.emissive.setRGB(b.hurt * 2, b.hurt * 0.4, b.hurt * 0.4));
  }
  b.barkT = Math.max(0, (b.barkT || 0) - dt);
  if (b.t > 1.5) {
    b.throwT -= dt;
    if (b.throwT <= 0) {
      b.throwT = b.rate * (0.8 + Math.random() * 0.5);
      const target = Math.random() < 0.55 ? P.lane : pick([-1, 0, 1]);
      if (b.kind === "dog") throwBone(target);
      else if (b.kind === "caterpillar") throwApple(target);
      else if (b.kind === "fly") {
        dropBag(target);
        if (Math.random() < 0.35) dropBag(pick([-1, 0, 1].filter((l) => l !== target)));
      }
      else if (b.kind === "hedgehog") throwSpikes();
      else {
        throwBomb(target);
        // Pucci, furieuse, lance parfois deux bombes
        if (b.kind === "pucci2" && Math.random() < 0.45) throwBomb(pick([-1, 0, 1].filter((l) => l !== target)));
      }
    }
    // Poissons-fusées (pas pour Pikou : on le bat avec ses propres piques)
    if (b.kind !== "hedgehog") {
      b.fishT -= dt;
      if (b.fishT <= 0) {
        b.fishT = 2.6 + Math.random() * 1.2;
        const fish = addPower("fish", pick([-1, 0, 1]), P.z - 55, 0.9);
        fish.fish = true;
      }
    }
  }
  if (b.t > (b.kind === "hedgehog" ? 50 : 40)) endBoss(false);
}
function throwBomb(lane) {
  // Lancée par-dessus sa tête : la bombe atterrit devant Kichta
  const landZ = P.z - G.speed * 0.85 - 9;
  const warn = world.acquire("obs-warn", world.OBSTACLES.warn);
  warn.position.set(laneX(lane), 0, landZ);
  const bomb = addObject("bomb", lane, landZ);
  bomb.flying = 0.85;
  bomb.from = boss.position.clone();
  bomb.warn = warn;
  bomb.mesh.position.copy(bomb.from);
}
function throwBone(lane) {
  // Rocky aboie puis lance un os qui retombe sur la piste
  G.boss.barkT = 0.5;
  Sfx.play("bark", { volume: 0.85, rate: 0.95 + Math.random() * 0.2 });
  const landZ = P.z - G.speed * 0.8 - 8;
  const warn = world.acquire("obs-warn", world.OBSTACLES.warn);
  warn.position.set(laneX(lane), 0, landZ);
  const bone = addObject("bone", lane, landZ);
  bone.flying = 0.8;
  bone.from = boss.position.clone().add(new THREE.Vector3(0, 1.6, 0));
  bone.warn = warn;
  bone.mesh.position.copy(bone.from);
}
function throwApple(lane) {
  // Chacha fait rouler une pomme croquée vers Kichta
  const apple = addObject("apple", lane, boss.position.z + 1);
  apple.vz = 11;
  apple.rolling = true;
  Sfx.play("squeak", { volume: 0.45, rate: 1.6 });
}
function dropBag(lane) {
  // Moumouche lâche un sac-poubelle qui tombe sur la piste
  const landZ = P.z - G.speed * 0.85 - 9;
  const warn = world.acquire("obs-warn", world.OBSTACLES.warn);
  warn.position.set(laneX(lane), 0, landZ);
  const bag = addObject("bag", lane, landZ);
  bag.flying = 0.85;
  bag.from = boss.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  bag.warn = warn;
  bag.mesh.position.copy(bag.from);
  Sfx.play("buzz", { volume: 0.5, rate: 0.9 + Math.random() * 0.3 });
}
function throwSpikes() {
  // Pikou se gonfle et projette 1 à 3 piques au ras du sol
  const n = Math.random() < 0.35 ? 2 : 1;
  const lanes = shuffle([-1, 0, 1]);
  if (Math.random() < 0.6) lanes.unshift(P.lane);
  const used = [...new Set(lanes)].slice(0, n);
  used.forEach((lane) => {
    const sp = addObject("spike", lane, boss.position.z + 1);
    sp.vz = 16;
    sp.spike = true;
    sp.mesh.position.y = 0.75;
  });
  Sfx.play("shot", { volume: 0.4, rate: 0.8 });
  Sfx.play("squeak", { volume: 0.5, rate: 1.2 });
}
function unlockSkates() {
  setSkates(true);
  banner("ARME SECRÈTE : LES PATINS ! 🛼", "Fonce sur les piques pour les renvoyer à Pikou !");
  Sfx.play("fanfare", { volume: 0.7 });
  Sfx.play("sparkle", { volume: 0.6 });
  flash("#ffd23f");
  world.confetti(P.x, 1.5, P.z - 2, 60);
}
// ---------------------------------------------------------------------------
// Coup final au ralenti : la caméra fait le tour de Kichta, qui lance le
// projectile avec un sourire narquois, puis le temps repart et le boss tombe.
// ---------------------------------------------------------------------------
const FIN_HOLD = 2.7; // durée du ralenti (secondes réelles)
const FIN_OUT = 0.5; // retour à la vitesse normale
const finLook = new THREE.Vector3();
const finPos = new THREE.Vector3();
const finBase = new THREE.Vector3();
/** Le prochain projectile sera-t-il celui qui achève le boss ? */
function isFinalBlow() {
  return !!G.boss && !G.boss.leaving && G.boss.hp - G.rockets.length <= 1;
}
function startFinisher(rocket) {
  rocket.final = true;
  // Le projectile part de la patte levée de Kichta (un peu sur le côté, pour ne pas cacher son visage)
  rocket.from.set(P.x - 0.45, P.y + 0.75, P.z - 0.8);
  rocket.mesh.position.copy(rocket.from);
  rocket.scale0 = rocket.mesh.scale.x;
  rocket.mesh.scale.setScalar(rocket.scale0 * 0.6);
  G.fin = { t: 0, rocket };
  P.flip = 0;
  world.muteBursts(true);
  world.softGlare(true);
  P.invuln = Math.max(P.invuln, FIN_HOLD + FIN_OUT + 0.8);
  document.body.classList.add("finisher");
  Sfx.slowMotion(true);
  Sfx.play("slowmo", { volume: 0.95, vary: 0 });
  Sfx.play("attack", { volume: 0.5, rate: 0.55, vary: 0, delay: 1.9 });
}
function stopFinisher() {
  if (!G.fin) return;
  G.fin = null;
  world.muteBursts(false);
  world.softGlare(false);
  G.objects.forEach((o) => {
    if (o.finHidden) (o.mesh.visible = true), (o.finHidden = false);
  });
  document.body.classList.remove("finisher");
  Sfx.slowMotion(false);
}
/** Vitesse du temps du jeu pendant le coup final (1 = normal). */
function finisherTimeScale(dt) {
  const f = G.fin;
  f.t += dt;
  if (f.t >= FIN_HOLD + FIN_OUT) {
    stopFinisher();
    return 1;
  }
  if (f.t < 0.2) return 1 - (f.t / 0.2) * 0.96;
  if (f.t < FIN_HOLD) return 0.04;
  world.muteBursts(false);
  return 0.04 + ((f.t - FIN_HOLD) / FIN_OUT) * 0.96;
}
/** Caméra du ralenti : un tour complet autour de Kichta, en passant tout près de son visage. */
function finisherCamera() {
  const f = G.fin;
  const cam = world.camera;
  // Les obstacles tout proches gêneraient la caméra : on les cache le temps du tour
  G.objects.forEach((o) => {
    const near = o.mesh.position.z > P.z - 9 && o.mesh.position.z < P.z + 5;
    if (near && o.mesh.visible && f.t < FIN_HOLD) (o.mesh.visible = false), (o.finHidden = true);
  });
  const u = Math.min(1, f.t / FIN_HOLD);
  const e = u * u * (3 - 2 * u);
  const ang = e * Math.PI * 2; // 0 : derrière elle ; π : face à son visage
  const face = Math.max(0, Math.cos(ang - Math.PI)) ** 1.5;
  const R = 4.2 - face * 1.6;
  finPos.set(P.x + Math.sin(ang) * R, P.y + 1.15 + (1 - face) * 0.85, P.z - 0.2 + Math.cos(ang) * R);
  finLook.set(P.x, P.y + 0.8, P.z - 0.25).lerp(f.rocket.mesh.position, 0.25 * (1 - face));
  // Fondu avec la caméra de course au début et à la fin
  const inK = Math.min(1, f.t / 0.3);
  const outK = f.t > FIN_HOLD ? Math.max(0, 1 - (f.t - FIN_HOLD) / (FIN_OUT * 0.9)) : 1;
  let w = Math.min(inK, outK);
  w = w * w * (3 - 2 * w);
  finBase.set(P.x * 0.56, 1 + Math.max(0, P.y) * 0.6, P.z - 8);
  cam.position.lerp(finPos, w);
  cam.lookAt(finBase.lerp(finLook, w));
  cam.fov += ((innerWidth < innerHeight ? 58 : 46) - cam.fov) * w;
  cam.updateProjectionMatrix();
}

// Une pique renvoyée par Kichta sur ses patins
function returnSpike(o) {
  removeObject(o);
  const final = isFinalBlow();
  P.flip = 0.5;
  P.vy = Math.max(P.vy, 7);
  P.grounded = false;
  Sfx.play("attack", { volume: 0.6, rate: 0.9 });
  Sfx.play("meow", { volume: 0.6, rate: 1.6 });
  world.burst(P.x, P.y + 0.8, P.z, 0xffd23f, 20, 5);
  const mesh = world.acquire("obs-spike-0", createSpike);
  mesh.position.set(P.x, P.y + 1, P.z - 0.5);
  G.rockets.push({ mesh, t: 0, from: mesh.position.clone(), spike: true });
  if (final) startFinisher(G.rockets[G.rockets.length - 1]);
  else toast("Renvoyée ! 🛼", "power");
}
function launchRocket() {
  const final = isFinalBlow();
  const mesh = world.makePower("fish");
  mesh.position.set(P.x, P.y + 1, P.z);
  G.rockets.push({ mesh, t: 0, from: mesh.position.clone() });
  if (final) startFinisher(G.rockets[G.rockets.length - 1]);
  Sfx.play("shot", { volume: 0.5, rate: 1.1 });
}
function updateRockets(dt) {
  for (let i = G.rockets.length - 1; i >= 0; i -= 1) {
    const r = G.rockets[i];
    // Coup final : le projectile quitte lentement la patte de Kichta pendant le tour de caméra
    if (r.final && G.fin && G.fin.t < FIN_HOLD) r.t = 0.07 * (G.fin.t / FIN_HOLD);
    else r.t += dt / (r.spike ? 0.4 : 0.55);
    const target = boss.position.clone().add(new THREE.Vector3(0, G.boss && (G.boss.kind === "dog" || G.boss.kind === "hedgehog") ? 0.9 : 1, 0));
    const pos = r.from.clone().lerp(target, Math.min(1, r.t));
    pos.y += Math.sin(Math.min(1, r.t) * Math.PI) * (r.spike ? 1 : 2.5);
    r.mesh.position.copy(pos);
    r.mesh.lookAt(target);
    if (r.spike) r.mesh.rotateY(Math.PI);
    // Pendant le ralenti, peu d'étincelles (sinon elles s'accumulent devant la caméra)
    world.burst(pos.x, pos.y, pos.z, r.spike ? 0xffd23f : 0xff8a3d, 2, 1.5);
    if (r.t >= 1) {
      world.release(r.mesh);
      G.rockets.splice(i, 1);
      if (r.scale0) r.mesh.scale.setScalar(r.scale0);
      if (r.final) {
        // Impact du coup final
        Sfx.play("finalHit", { volume: 1, vary: 0 });
        flash("#ffffff");
        world.shake(0.9);
        world.burst(target.x, target.y, target.z, 0xffd23f, 80, 12);
      }
      hurtBoss(target);
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

// Monde affiché dans le menu : celui du prochain boss
function menuBiome() {
  return save.stage <= LEVELS.length ? Math.max(0, themeIndex(currentLevel().theme)) : 0;
}

// Mondes possédés, en commençant par le monde choisi dans la boutique
function worldRotation() {
  const owned = BIOMES.map((b, i) => ({ b, i })).filter(({ b }) => save.worlds.includes(b.id));
  const start = Math.max(0, owned.findIndex(({ b }) => b.id === save.startWorld));
  return owned.slice(start).concat(owned.slice(0, start)).map(({ i }) => i);
}

function startRun() {
  stopFinisher();
  clearTimeout(G.cineTimer);
  Sfx.unlock();
  Sfx.play("click", { volume: 0.5 });
  clearTrack();
  world.clearDecor(0);
  // En campagne, la course se déroule dans le monde du boss du niveau
  const theme = save.stage <= LEVELS.length ? themeIndex(currentLevel().theme) : -1;
  G.worldOrder = theme >= 0 ? [theme] : worldRotation();
  Object.assign(G, { mode: "run", dist: 0, score: 0, coins: 0, speed: 14, nextRowZ: -35, nextPowerAt: 200 + Math.random() * 150, nextBossAt: 1300, biome: 0, revives: 0, stats: {}, boss: null, coinStreak: 0, worldSlides: 0, secretGiven: false, hissT: 0 });
  Object.assign(P, { lane: 0, x: 0, y: 0, vy: 0, z: 0, grounded: true, slide: 0, invuln: 0, squash: 0, fromLane: 0, lastLaneT: -9, airJumps: 0, flip: 0 });
  Object.keys(POWER).forEach((k) => (POWER[k] = 0));
  if (save.startShield > 0) {
    save.startShield -= 1;
    POWER.shield = duration("shield");
    toast("🫧 Bouclier de départ !", "power");
  }
  boss.visible = false;
  world.setBiome(G.worldOrder[0], true);
  save.runs += 1;
  persist();
  show("hud");
  $("#controls").classList.remove("hidden");
  $("#bossBar").classList.add("hidden");
  setSkates(false);
  if (save.stage <= LEVELS.length) setTimeout(() => G.mode === "run" && banner(`NIVEAU ${save.stage}`, `Boss : ${currentLevel().name}`), 400);
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
  $("#giftsBtn").classList.toggle("hidden", !save.pending.length);
  $("#giftsCount").textContent = save.pending.length;
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
  stopFinisher();
  clearTimeout(G.cineTimer);
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
  world.setBiome(menuBiome(), true);
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
  const step = Math.floor(G.dist / 750) % G.worldOrder.length;
  if (step !== G.biome) {
    G.biome = step;
    const biome = G.worldOrder[step];
    world.setBiome(biome);
    banner(`${BIOMES[biome].icon || "🍭"} ${BIOMES[biome].name}`, "Nouveau monde !");
    Sfx.play("coin", { rate: 0.5, volume: 0.5 });
    // Le compteur du cadeau secret repart à zéro dans chaque monde
    G.worldSlides = 0;
    G.secretGiven = false;
  }
  G.hissT = Math.max(0, (G.hissT || 0) - dt);
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
          countSlide();
        }
      }
      P.y = ground;
      P.vy = 0;
      P.grounded = true;
      P.airJumps = 0;
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
      // Ce qui roule tourne sur lui-même
      if (o.rolling) o.mesh.rotation.x += o.vz * dt * 1.6;
      if (o.mesh.userData.roll) o.mesh.userData.roll.rotation.x += o.vz * dt * 2.5;
    }
    if (o.kind === "pendulum") {
      // La boule va d'un couloir à l'autre au bout de son fil
      const { ball, rope, top } = o.mesh.userData;
      o.ballX = Math.sin(o.phase + G.t * o.speed) * LANE * 1.15;
      ball.position.set(o.ballX, 1.0, 0);
      ball.rotation.z = -o.ballX * 0.3;
      const dy = top - 1.0;
      rope.position.set(o.ballX / 2, 1.0 + dy / 2, 0);
      rope.scale.y = Math.hypot(o.ballX, dy);
      rope.rotation.z = Math.atan2(o.ballX, dy);
    }
    if ((o.kind === "bomb" || o.kind === "bone" || o.kind === "bag") && o.flying > 0) {
      o.flying -= dt;
      const k = 1 - Math.max(0, o.flying) / 0.85;
      const to = new THREE.Vector3(laneX(o.lane), o.kind === "bone" ? 0.16 : 0, o.z);
      o.mesh.position.lerpVectors(o.from, to, k);
      o.mesh.position.y += Math.sin(k * Math.PI) * 4;
      o.mesh.rotation.x += dt * 8;
      if (o.flying <= 0) {
        o.mesh.position.copy(to);
        o.mesh.rotation.set(0, 0, 0);
        world.release(o.warn);
        o.warn = null;
        world.burst(to.x, 0.3, to.z, o.kind === "bone" ? 0xffffff : 0xff7fae, 12, 4);
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
      // Pique esquivée : au bout de 3, Kichta débloque ses patins
      if (o.spike && G.boss && !G.skates) {
        G.boss.dodged += 1;
        if (G.boss.dodged < 3) toast(`Pique esquivée ${G.boss.dodged}/3`, "near");
        else unlockSkates();
      }
      if (["barrier", "high", "wagon", "bomb", "bone", "spike", "rusher", "apple", "bag"].includes(o.kind) && o.lane === P.fromLane && o.lane !== P.lane && G.t - P.lastLaneT < 0.45) {
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
    if (o.kind === "pendulum") {
      if (zOverlap(pz0, pz1, o.z - 0.55, o.z + 0.55) && Math.abs(P.x - o.ballX) < 1.0 && P.y < 1.5) crash(o);
      continue;
    }
    if (dx > 1.0) continue;
    if (o.kind === "spike") {
      if (zOverlap(pz0, pz1, o.z - 0.5, o.z + 0.5) && P.y < 1.2) {
        if (G.skates) returnSpike(o);
        else crash(o);
      }
    } else if (["barrier", "rusher", "apple"].includes(o.kind) || (["bomb", "bone", "bag"].includes(o.kind) && !(o.flying > 0))) {
      const h = { bomb: 0.9, bone: 0.7, bag: 0.95, rusher: 0.75, apple: 0.85 }[o.kind] || 1.0;
      if (zOverlap(pz0, pz1, o.z - 0.35, o.z + 0.35) && P.y < h) crash(o);
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
  // Coup final : le temps du jeu ralentit (la caméra, elle, garde le temps réel)
  const realDt = dt;
  if (G.fin && G.mode === "run") dt *= finisherTimeScale(realDt);
  else if (G.fin && G.mode !== "pause") stopFinisher();
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
  const inMenu = G.mode === "menu" || G.mode === "reveal";
  const pose =
    G.mode === "reveal" ? (reveal.happy ? "win" : "idle") : inMenu ? "idle" : G.mode === "dying" || G.mode === "over" ? "hit" : POWER.balloon > 0 ? "fly" : P.slide > 0 ? "slide" : !P.grounded ? (P.vy > 0 ? "jump" : "fall") : "run";
  kichta.position.set(P.x + (G.mode === "reveal" ? -1.15 : 0), P.y, P.z);
  kichta.rotation.y = inMenu ? Math.sin(G.t * 0.6) * 0.35 : Math.PI;
  P.flip = Math.max(0, (P.flip || 0) - dt);
  const flipK = P.flip > 0 ? 1 - P.flip / 0.5 : 0;
  // Poils hérissés face à Pucci
  const bristle = Math.min(1, (G.hissT || 0) / 0.6);
  kichta.userData.bristle += (bristle - kichta.userData.bristle) * Math.min(1, dt * 10);
  pucci.userData.bristle = pucciHurt.userData.bristle = kichta.userData.bristle;
  if (G.fin) {
    // Pose de lancer, l'air sûre d'elle
    const smug = Math.min(1, G.fin.t / 0.45) * (G.fin.t > FIN_HOLD ? Math.max(0, 1 - (G.fin.t - FIN_HOLD) / FIN_OUT) : 1);
    animateToon(kichta, G.t, G.fin.t < FIN_HOLD + 0.2 ? "throw" : pose, { speed: G.speed / 14, smug });
  } else animateToon(kichta, G.t, pose, { speed: G.speed / 14, lean: (laneX(P.lane) - P.x) * 0.12, squash: P.squash, flip: flipK * flipK * (3 - 2 * flipK) });
  if (G.mode === "reveal") updateReveal(dt);
  balloons.visible = POWER.balloon > 0;
  shieldBubble.visible = POWER.shield > 0;
  shieldBubble.material.opacity = 0.22 + Math.sin(G.t * 6) * 0.06 + (POWER.shield > 0 && POWER.shield < 2 ? Math.sin(G.t * 25) * 0.15 : 0);
  magnetRing.visible = POWER.magnet > 0;
  magnetRing.rotation.z += dt * 4;
  kichta.visible = !!G.fin || !(P.invuln > 0 && G.mode === "run" && Math.floor(G.t * 14) % 2 === 0);

  if (G.mode !== "pause") {
    world.update(dt, G.t, { playerX: P.x, playerY: P.y, playerZ: P.z, speed: G.mode === "run" && !G.fin ? G.speed : 0, mode: inMenu ? "menu" : G.mode, fly: POWER.balloon > 0 });
    Sfx.setRunning(G.mode === "run" && P.grounded && P.slide <= 0 && !G.fin, G.speed / 16);
  }
  if (G.fin) finisherCamera();
  if (G.mode === "reveal") {
    // Caméra de la cérémonie : Kichta à côté du coffre
    const portrait = innerWidth < innerHeight;
    world.camera.position.set(0.1, portrait ? 2.4 : 2.1, portrait ? 6.2 : 5.4);
    world.camera.lookAt(0.1, portrait ? 1.5 : 1.1, 0.6);
    world.camera.fov = portrait ? 62 : 52;
    world.camera.updateProjectionMatrix();
  }
  if (draw) world.render();
  if (G.mode === "run" || G.mode === "dying") updateHud();
  if (G.mode === "run") updateTutorial(dt);
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
const screens = ["menu", "shop", "missions", "chest", "pause", "over", "hud", "reveal", "cinema", "mycat"];
function show(name) {
  const keepHud = ["hud", "pause", "over"].includes(name);
  screens.forEach((s) => $(`#${s}`).classList.toggle("hidden", !(s === name || (s === "hud" && keepHud))));
}
let hudScore = -1;
function updateHud() {
  const tag = save.stage > LEVELS.length ? "∞" : `NIV ${save.stage}`;
  if ($("#stageTag").textContent !== tag) $("#stageTag").textContent = tag;
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
  const gifts = save.pending.length + (save.chestDay === today() ? 0 : 1);
  $("#chestBadge").textContent = gifts > 1 ? String(gifts) : "!";
  $("#chestBadge").classList.toggle("hidden", gifts === 0);
  $("#cinemaBtn").classList.toggle("locked", !save.cinemas.length);
  $("#stageLabel").textContent = save.stage > LEVELS.length ? "Mode infini 🏆" : `Niveau ${save.stage} · ${currentLevel().name}`;
  $("#soundBtn").textContent = save.sound ? "🔊" : "🔇";
  $("#mycatBadge").classList.toggle("hidden", !!save.mycatSeen);
}

// --- Boutique ---------------------------------------------------------------------
const UPGRADE_COST = [150, 350, 700, 1200, 2000];
let shopTab = "skin";
const TABS = { skin: "Pelages", hat: "Chapeaux", face: "Visage", neck: "Cou", back: "Dos", vintage: "Vintage", worlds: "Mondes", upgrades: "Bonus" };
function itemCard(slot, id, item) {
  const owned = owns(slot, id);
  const worn = save.wear[slot] === id;
  const rarity = RARITY[item.rarity] || RARITY.commun;
  const hidden = item.unlock === "secret" && !owned;
  let label;
  let disabled = false;
  let action = `data-item="${id}" data-slot="${slot}"`;
  if (worn) {
    label = "PORTÉ";
    disabled = true;
  } else if (owned) label = "PORTER";
  else if (item.unlock === "shop") {
    label = `<i class="coin"></i>${item.price}`;
    disabled = save.coins < item.price;
  } else {
    label = item.unlock === "level" ? `🔒 Rang ${item.level}` : item.unlock === "boss" ? `🏆 Boss niv. ${item.stage}` : item.unlock === "chest" ? "🎁 Coffres" : "🤫 Secret";
    disabled = true;
    action = "";
  }
  return `<div class="item ${worn ? "worn" : ""} ${owned ? "" : "locked"}" style="--r:${rarity.color}"><em class="rar">${hidden ? "???" : rarity.name}</em><div class="icon">${hidden ? "❓" : item.icon || "✨"}</div><b>${hidden ? "Objet secret" : item.name}</b>${item.vintage ? '<small class="vint">Vintage</small>' : `<small>${SLOT_NAMES[slot]}</small>`}<button ${action} ${disabled ? "disabled" : ""}>${label}</button></div>`;
}
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
  } else if (shopTab === "worlds") {
    items = BIOMES.filter((b) => !b.theme).map((b) => {
      const owned = save.worlds.includes(b.id);
      const start = save.startWorld === b.id;
      const sky = `#${b.skyTop.toString(16).padStart(6, "0")}`;
      const ground = `#${b.ground.toString(16).padStart(6, "0")}`;
      const label = start ? "DÉPART ✔" : owned ? "PARTIR D'ICI" : `<i class="coin"></i>${b.price}`;
      return `<div class="item world ${start ? "worn" : ""}"><div class="icon"><span class="world-swatch" style="--a:${sky};--b:${b.track};--c:${ground}">${b.icon || "🍭"}</span></div><b>${b.name}</b><small>${owned ? "Dans tes mondes" : "Nouveau monde"}</small><button data-world="${b.id}" ${start || (!owned && save.coins < b.price) ? "disabled" : ""}>${label}</button></div>`;
    });
  } else if (shopTab === "skin") {
    items = Object.entries(SKINS).map(([k, item]) => {
      const owned = owns("skin", k);
      const worn = save.wear.skin === k;
      const label = worn ? "PORTÉ" : owned ? "PORTER" : `<i class="coin"></i>${item.price}`;
      return `<div class="item ${worn ? "worn" : ""}"><div class="icon"><span class="swatch" style="--a:${item.base};--b:${item.stripe}"></span></div><b>${item.name}</b><small>Pelage</small><button data-item="${k}" data-slot="skin" ${worn || (!owned && save.coins < item.price) ? "disabled" : ""}>${label}</button></div>`;
    });
    if (heroCat()) items.unshift(`<p class="note" style="grid-column:1/-1">Les pelages habillent Kichta. Ton chat ${save.hero.name} garde sa propre robe (écran 📸 Mon chat).</p>`);
  } else if (shopTab === "vintage") {
    items = ALL_ITEMS.filter((i) => i.vintage).map((i) => itemCard(i.slot, i.id, i));
  } else {
    items = Object.entries(OUTFITS[shopTab]).map(([id, item]) => itemCard(shopTab, id, item));
  }
  $("#shopGrid").innerHTML = items.join("");
  refreshMenu();
}
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
  } else if (btn.dataset.world) {
    const b = BIOMES.find((x) => x.id === btn.dataset.world);
    if (!save.worlds.includes(b.id)) {
      if (save.coins < b.price) return;
      save.coins -= b.price;
      save.worlds.push(b.id);
      Sfx.play("fanfare", { volume: 0.5 });
      world.confetti(0, 1.5, -0.5, 60);
    } else Sfx.play("click", { volume: 0.5 });
    save.startWorld = b.id;
    world.setBiome(BIOMES.indexOf(b));
  } else {
    const k = btn.dataset.item;
    const slot = btn.dataset.slot;
    const item = slot === "skin" ? SKINS[k] : OUTFITS[slot][k];
    if (!owns(slot, k)) {
      if (save.coins < item.price) return;
      save.coins -= item.price;
      save.owned[slot].push(k);
      Sfx.play("coin", { rate: 0.7, volume: 0.6 });
      world.confetti(0, 1.5, -0.5, 50);
    } else Sfx.play("click", { volume: 0.5 });
    save.wear[slot] = k;
    applyLook();
  }
  persist();
  renderShop();
});
function applyLook() {
  if (kichta.userData.skin !== heroKey()) {
    // Nouveau pelage ou nouveau chat : on reconstruit le héros
    const fresh = createToon("kichta", { skin: save.wear.skin, look: heroCat()?.look });
    world.scene.remove(kichta);
    kichta.clear();
    fresh.children.slice().forEach((c) => kichta.add(c));
    kichta.userData = fresh.userData;
    kichta.add(balloons, shieldBubble, magnetRing);
    world.scene.add(kichta);
    kichta.userData.skin = heroKey();
  }
  dressToon(kichta, save.wear);
  kichta.traverse((o) => o.isMesh && o !== shieldBubble && (o.castShadow = true));
}
kichta.userData.skin = heroKey();

// --- Coffres : cérémonie d'ouverture façon jeu vidéo --------------------------------------
const CHEST_LOOK = {
  daily: { body: 0xff5fa2, trim: 0xffc425, title: "Coffre du jour" },
  level: { body: 0x45b8ff, trim: 0xffc425, title: "Récompense de niveau" },
  secret: { body: 0x7b3dff, trim: 0x7dffd9, title: "Cadeau secret" },
};
function buildChest(kind) {
  const look = CHEST_LOOK[kind] || CHEST_LOOK.daily;
  const g = new THREE.Group();
  const bodyMat = candy(look.body, { emissive: look.body, emissiveIntensity: 0 });
  const trim = candy(look.trim, { metalness: 0.7, roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.9), bodyMat);
  body.position.y = 0.36;
  g.add(body);
  for (const x of [-0.42, 0.42]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.74, 0.93), trim);
    band.position.set(x, 0.36, 0);
    g.add(band);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 0.94), trim).translateY(0.7));
  // Couvercle bombé, articulé à l'arrière
  const lid = new THREE.Group();
  lid.position.set(0, 0.72, -0.45);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 28, 1, false, 0, Math.PI), bodyMat);
  top.rotation.z = Math.PI / 2;
  top.position.z = 0.45;
  lid.add(top);
  for (const x of [-0.42, 0.42]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.14, 28, 1, false, 0, Math.PI), trim);
    b.rotation.z = Math.PI / 2;
    b.position.set(x, 0, 0.45);
    lid.add(b);
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.08), trim);
  lock.position.set(0, 0, 0.92);
  lid.add(lock);
  lid.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12), candy(0x221a2a)).rotateX(Math.PI / 2).translateY(0.02).translateZ(0.96));
  g.add(lid);
  // Lumière qui s'échappe de l'intérieur
  const light = new THREE.PointLight(0xfff2b0, 0, 6, 1.5);
  light.position.set(0, 1, 0.2);
  g.add(light);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.32, 6, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 3.6;
  beam.castShadow = false;
  g.add(beam);
  g.traverse((o) => o.isMesh && o !== beam && (o.castShadow = true));
  g.userData = { lid, bodyMat, light, beam, lock };
  return g;
}
const reveal = { t: 0, cur: null, chest: null, item: null, opened: false, happy: false, card: false, nextShake: 0 };
function startReveal() {
  if (!save.pending.length) return;
  clearInterval(G.reviveTimer);
  if (G.mode !== "menu") toMenu();
  G.mode = "reveal";
  show("reveal");
  nextReveal();
}
function nextReveal() {
  cleanupReveal();
  const cur = save.pending.shift();
  persist();
  if (!cur) {
    endReveal();
    return;
  }
  const kind = cur.source === "secret" ? "secret" : cur.source === "level" ? "level" : "daily";
  Object.assign(reveal, { t: 0, cur, opened: false, happy: false, card: false, nextShake: 0.55, kind });
  reveal.chest = buildChest(kind);
  reveal.chest.position.set(0.95, 4, 0.9);
  reveal.chest.rotation.y = 0;
  world.scene.add(reveal.chest);
  $("#revealTitle").textContent = CHEST_LOOK[kind].title;
  $("#revealHint").classList.remove("hidden");
  $("#revealCard").classList.add("hidden");
}
function rarityOf(cur) {
  if (!cur.slot) return RARITY.commun;
  return RARITY[OUTFITS[cur.slot][cur.id].rarity] || RARITY.commun;
}
function openRevealChest() {
  const { chest, cur } = reveal;
  reveal.opened = true;
  const rarity = rarityOf(cur);
  chest.userData.beam.material.color.set(rarity.color);
  chest.userData.light.color.set(rarity.color);
  Sfx.play("pop", { volume: 0.9 });
  Sfx.play("fanfare", { volume: 0.7, delay: 0.05 });
  Sfx.play("sparkle", { volume: 0.6, delay: 0.15 });
  world.confetti(chest.position.x, 1.2, chest.position.z, 140);
  world.burst(chest.position.x, 0.9, chest.position.z, new THREE.Color(rarity.color).getHex(), 60, 8);
  world.shake(0.25);
  flash(rarity.color);
  if (cur.coins) save.coins += cur.coins;
  // Objet qui sort du coffre
  let item;
  if (cur.slot) {
    item = buildItem(cur.slot, cur.id);
    item.scale.setScalar(3);
  } else {
    item = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 24), candy(0xffc21a, { metalness: 0.75, roughness: 0.18 }));
      c.position.set((i % 3 - 1) * 0.1, i * 0.075, (i % 2) * 0.05);
      item.add(c);
    }
  }
  item.position.set(chest.position.x, 0.8, chest.position.z);
  world.scene.add(item);
  reveal.item = item;
  persist();
}
function showRevealCard() {
  const { cur } = reveal;
  reveal.card = true;
  reveal.happy = true;
  const rarity = rarityOf(cur);
  const card = $("#revealCard");
  card.style.setProperty("--r", rarity.color);
  $("#revealRarity").textContent = cur.slot ? rarity.name : "Croquettes";
  $("#revealName").textContent = cur.slot ? OUTFITS[cur.slot][cur.id].name : `+${cur.coins} croquettes`;
  $("#revealExtra").textContent = cur.slot ? `${SLOT_NAMES[cur.slot]}${cur.coins ? ` · +${cur.coins} croquettes` : ""}` : "Pour la boutique !";
  $("#revealWear").classList.toggle("hidden", !cur.slot);
  $("#revealHint").classList.add("hidden");
  card.classList.remove("hidden");
  Sfx.play("coin", { rate: 0.7, volume: 0.5 });
  refreshMenu();
}
function updateReveal(dt) {
  const { chest, item } = reveal;
  if (!chest) return;
  reveal.t += dt;
  const t = reveal.t;
  const d = chest.userData;
  if (!reveal.opened) {
    // Le coffre tombe, rebondit, puis tremble de plus en plus fort
    const fall = Math.min(1, t / 0.45);
    chest.position.y = t < 0.45 ? 4 * (1 - fall * fall) : Math.abs(Math.sin((t - 0.45) * 9)) * 0.25 * Math.exp(-(t - 0.45) * 6);
    if (t > 0.45 && t < 0.5) Sfx.play("land", { volume: 0.5, rate: 0.8 });
    const shakes = [0.7, 1.25, 1.7];
    let amp = 0;
    shakes.forEach((s, i) => {
      if (t > s && t < s + 0.32) amp = 0.06 + i * 0.07;
    });
    if (t > 2.0) amp = 0.25;
    chest.rotation.z = Math.sin(t * 55) * amp;
    chest.position.x = Math.sin(t * 47) * amp * 0.4;
    d.lid.rotation.x = -Math.abs(Math.sin(t * 30)) * amp * 0.8;
    const glow = Math.min(1, Math.max(0, (t - 0.6) / 1.6));
    d.bodyMat.emissiveIntensity = glow * 0.35;
    d.light.intensity = glow * 3;
    if (amp > 0 && t > reveal.nextShake) {
      reveal.nextShake = t + 0.09;
      Sfx.play("rattle", { volume: 0.5 + amp, rate: 0.8 + amp * 2 });
      world.burst(chest.position.x, 0.75, chest.position.z, 0xffffff, 3, 2.5);
    }
    if (t > 2.25) {
      chest.scale.set(1.18, 0.8, 1.18);
      if (t > 2.35) {
        chest.scale.set(1, 1, 1);
        chest.rotation.z = 0;
        openRevealChest();
      }
    }
  } else {
    const k = t - 2.35;
    d.lid.rotation.x = Math.max(-2.1, d.lid.rotation.x - dt * 14);
    d.beam.material.opacity = Math.min(0.16, k * 0.5) * (0.85 + Math.sin(t * 8) * 0.15);
    d.beam.scale.set(1 + Math.sin(t * 3) * 0.05, Math.min(1, k * 3), 1 + Math.sin(t * 3) * 0.05);
    d.beam.rotation.y += dt;
    d.light.intensity = 1.5;
    if (item) {
      const rise = Math.min(1, k / 0.9);
      item.position.y = 0.8 + (1 - (1 - rise) ** 3) * 1.25 + Math.sin(t * 2.5) * 0.06;
      item.rotation.y += dt * (3 - rise * 2);
      if (Math.random() < 0.3) world.burst(item.position.x, item.position.y, item.position.z, 0xffffff, 1, 1.5);
    }
    if (k > 1 && !reveal.card) showRevealCard();
  }
}
function cleanupReveal() {
  if (reveal.chest) world.scene.remove(reveal.chest);
  if (reveal.item) world.scene.remove(reveal.item);
  reveal.chest = null;
  reveal.item = null;
}
function endReveal() {
  cleanupReveal();
  G.mode = "menu";
  show("menu");
  applyLook();
  refreshMenu();
}
// Toucher l'écran pendant que le coffre tremble l'ouvre tout de suite
$("#reveal").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  if (!reveal.opened && reveal.t > 0.5 && reveal.t < 2.0) reveal.t = 2.0;
});
$("#revealOk").addEventListener("click", () => {
  Sfx.play("click", { volume: 0.4 });
  nextReveal();
});
$("#revealWear").addEventListener("click", () => {
  const { cur } = reveal;
  if (cur && cur.slot) {
    save.wear[cur.slot] = cur.id;
    persist();
    applyLook();
    Sfx.play("coin", { rate: 0.9, volume: 0.5 });
    world.confetti(0, 1.5, 0, 50);
  }
  nextReveal();
});

// Coffre du jour : croquettes + un objet tiré au sort selon sa rareté
function openChestScreen() {
  if (save.pending.length) {
    startReveal();
    return;
  }
  if (save.chestDay !== today()) {
    save.chestDay = today();
    const coins = 60 + Math.floor(Math.random() * 7) * 40;
    const item = rollChestItem();
    if (item) {
      grantItem(item.slot, item.id, "daily");
      save.pending[save.pending.length - 1].coins = coins;
    } else save.pending.push({ coins: coins * 2, source: "daily" });
    if (Math.random() < 0.3) save.startShield += 1;
    persist();
    startReveal();
    return;
  }
  $("#chestIcon").className = "";
  $("#chestText").textContent = "Reviens demain pour un nouveau coffre 🎁";
  $("#chestOpen").classList.add("hidden");
  show("chest");
}
$("#chestOpen").onclick = openChestScreen;

// --- Cinématique -------------------------------------------------------------------------
const video = $("#cinematic");
function playCinematic(n = 1, fromRun = false, finished = false) {
  const level = LEVELS[n - 1];
  if (!level || (!save.cinemas.includes(n) && !fromRun)) {
    toast("Termine ce niveau pour débloquer sa cinématique !", "near");
    return;
  }
  const src = `${level.video}?v=b7`;
  if (!video.src.endsWith(src)) {
    video.src = src;
    video.load();
  }
  video.dataset.finished = finished ? "1" : "";
  show(fromRun ? "hud" : "menu");
  G.prevMode = G.mode;
  G.mode = "cinema";
  Sfx.music(null);
  Sfx.setRunning(false);
  video.currentTime = 0;
  video.classList.remove("hidden");
  $("#skipVideo").classList.remove("hidden");
  video.dataset.fromRun = fromRun ? "1" : "";
  // Les téléphones peuvent refuser une vidéo avec le son lancée automatiquement :
  // on essaie avec le son, puis sans le son, puis on affiche un bouton « Regarder ».
  video.muted = !save.sound;
  video.play().catch(() => {
    video.muted = true;
    video.play()
      .then(() => save.sound && $("#videoSound").classList.remove("hidden"))
      .catch(() => $("#videoPlay").classList.remove("hidden"));
  });
}
// Au premier toucher, on « réveille » la vidéo pour que le téléphone accepte
// de la lancer toute seule plus tard (règle de Safari sur iPhone).
let videoPrimed = false;
function primeVideo() {
  if (videoPrimed) return;
  videoPrimed = true;
  video.preload = "auto";
  video.muted = true;
  video.play().then(() => {
    video.pause();
    video.currentTime = 0;
  }).catch(() => {
    videoPrimed = false;
  });
}
addEventListener("pointerdown", () => G.mode !== "cinema" && primeVideo(), { passive: true });
$("#videoSound").addEventListener("click", () => {
  video.muted = false;
  $("#videoSound").classList.add("hidden");
});
$("#videoPlay").addEventListener("click", () => {
  video.muted = !save.sound;
  video.play().catch(() => {});
  $("#videoPlay").classList.add("hidden");
});
function endCinematic() {
  video.pause();
  $("#videoSound").classList.add("hidden");
  $("#videoPlay").classList.add("hidden");
  video.classList.add("hidden");
  $("#skipVideo").classList.add("hidden");
  if (video.dataset.fromRun) {
    G.mode = "run";
    P.invuln = Math.max(P.invuln, 2);
    Sfx.music("run");
    if (video.dataset.finished) banner("🏆 TU AS FINI LE JEU !", "Mode infini : les boss reviennent, encore plus forts");
    else if (save.stage <= LEVELS.length) setTimeout(() => G.mode === "run" && banner(`NIVEAU ${save.stage}`, `Prochain boss : ${currentLevel().name}`), 600);
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
click("#cinemaBtn", () => {
  renderCinema();
  show("cinema");
});
function renderCinema() {
  $("#cinemaList").innerHTML = LEVELS.map((l) => {
    const open = save.cinemas.includes(l.n);
    return `<li class="${open ? "" : "locked"}"><span>${open ? "🎬" : "🔒"}</span><div><p>Niveau ${l.n} · ${open ? l.cine : "???"}</p><small>${open ? `Après la victoire contre ${l.name}` : `Bats ${l.name} pour la débloquer`}</small></div><button data-cine="${l.n}" class="soft" ${open ? "" : "disabled"}>▶</button></li>`;
  }).join("");
}
$("#cinemaList").addEventListener("click", (e) => {
  const n = Number(e.target.closest("button")?.dataset.cine);
  if (!n) return;
  Sfx.play("click", { volume: 0.4 });
  playCinematic(n, false);
});
document.querySelectorAll(".back").forEach((b) =>
  b.addEventListener("click", () => {
    Sfx.play("click", { volume: 0.4 });
    show("menu");
    refreshMenu();
  }),
);
// --- Mon chat : la photo du joueur → la figurine qui lui ressemble le plus ---------------------
const catThumb = (id) => `assets/cats/${id}.webp?v=b7`;
const ALL_CATS = [{ id: "kichta", name: "Kichta", look: null }, ...CATS];
let mycatPick = null;
function catCard(cat, extra = "") {
  return `<button class="cat-card ${mycatPick === cat.id ? "on" : ""}" data-cat="${cat.id}"><img src="${catThumb(cat.id)}" alt="" loading="lazy">${cat.name}${extra}</button>`;
}
function renderMycatGrid() {
  $("#mycatGrid").innerHTML = ALL_CATS.map((c) => catCard(c)).join("");
}
function openMycat() {
  mycatPick = save.hero?.id || "kichta";
  $("#mycatHome").classList.remove("hidden");
  $("#mycatWork").classList.add("hidden");
  $("#mycatResult").classList.add("hidden");
  $("#mycatAll").open = false;
  $("#mycatMine").classList.add("hidden");
  renderMycatGrid();
  save.mycatSeen = true;
  persist();
  refreshMenu();
  show("mycat");
}
function showMycatChoice(title, list) {
  $("#mycatTitle").textContent = title;
  $("#mycatTop").innerHTML = list.map(({ cat, match }) => catCard(cat, match ? `<small class="pct">${match} %</small>` : "")).join("");
  $("#mycatName").value = save.hero?.id !== "kichta" ? save.hero?.name || "" : "";
  $("#mycatResult").classList.remove("hidden");
  renderMycatGrid();
}
async function analysePhoto(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  $("#mycatPhoto").src = url;
  $("#mycatHome").classList.add("hidden");
  $("#mycatResult").classList.add("hidden");
  $("#mycatWork").classList.remove("hidden");
  const status = $("#mycatStatus");
  const bar = $("#mycatBar");
  status.textContent = "Préparation de l'IA…";
  bar.style.width = "4%";
  try {
    await img.decode();
    const CatMatch = await import("./catmatch.js?v=b7");
    const res = await CatMatch.analyse(img, (k) => {
      status.textContent = `Préparation de l'IA… ${Math.round(k * 100)} %`;
      bar.style.width = `${4 + k * 80}%`;
    });
    bar.style.width = "100%";
    $("#mycatWork").classList.add("hidden");
    const top = res.ranked.slice(0, 3);
    mycatPick = top[0].cat.id;
    $("#mycatMine").src = url;
    $("#mycatMine").classList.remove("hidden");
    showMycatChoice(res.isCat ? "Ton chat ressemble à…" : "Hmm, je ne vois pas bien de chat… Voici mes idées :", top);
    Sfx.play("sparkle", { volume: 0.5 });
  } catch (err) {
    console.error(err);
    status.textContent = "Oups, l'analyse n'a pas marché. Vérifie ta connexion la première fois, puis réessaie.";
    $("#mycatHome").classList.remove("hidden");
  }
}
$("#mycatFile").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) analysePhoto(file);
});
$("#mycat").addEventListener("click", (e) => {
  const card = e.target.closest(".cat-card");
  if (!card) return;
  Sfx.play("click", { volume: 0.4 });
  mycatPick = card.dataset.cat;
  if ($("#mycatResult").classList.contains("hidden") || !$(`#mycatTop [data-cat="${mycatPick}"]`)) {
    showMycatChoice("Ton choix :", [{ cat: ALL_CATS.find((c) => c.id === mycatPick) }]);
    $("#mycatResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("#mycat .cat-card").forEach((c) => c.classList.toggle("on", c.dataset.cat === mycatPick));
});
click("#mycatOk", () => {
  const cat = ALL_CATS.find((c) => c.id === mycatPick) || ALL_CATS[0];
  const name = $("#mycatName").value.trim().slice(0, 14) || cat.name;
  save.hero = { id: cat.id, name: cat.id === "kichta" && !$("#mycatName").value.trim() ? "Kichta" : name };
  persist();
  applyLook();
  refreshMenu();
  toast(`${save.hero.name} est prêt${cat.id === "kichta" ? "e" : ""} à courir ! 🐾`, "power");
  Sfx.play("fanfare", { volume: 0.6 });
  show("menu");
});
click("#mycatBtn", openMycat);

click("#pauseBtn", pauseGame);
click("#resumeBtn", resumeGame);
click("#quitBtn", toMenu);
$("#againBtn").addEventListener("click", startRun);
click("#menuBtn", toMenu);
$("#reviveBtn").addEventListener("click", revive);
click("#giftsBtn", startReveal);
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
world.setBiome(menuBiome(), true);
world.clearDecor(0);
Sfx.setEnabled(save.sound);
// La musique démarre au premier toucher (règle des navigateurs)
// Le son se déverrouille au tout premier toucher, où que ce soit sur l'écran
for (const type of ["pointerdown", "touchend", "keydown"]) {
  addEventListener(type, () => {
    Sfx.unlock();
    if (G.mode === "menu") Sfx.music("menu");
  }, { passive: true, capture: true });
}
refreshMenu();
show("menu");
requestAnimationFrame(loop);
if ("serviceWorker" in navigator && !location.search.includes("debug")) navigator.serviceWorker.register("sw.js").catch(() => {});

// Mode test (?debug)
if (location.search.includes("debug")) {
  window.kichta = { G, P, POWER, save, tick, themeIndex, menuBiome, LANE, laneX, addObject, addPower, coinLine, boss, startReveal, applyLook, BIOMES, pucci, LEVELS, endBoss, hurtBoss, startRun, moveLane, jump, slide, startBoss, activatePower, world, toMenu, gameOver, persist, launchRocket, isFinalBlow };
}
