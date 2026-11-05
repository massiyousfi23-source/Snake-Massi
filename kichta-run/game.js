// Kichta Run — règles du jeu, commandes et sons.
// Le rendu 3D est dans run3d.js ; les chats sont dans cats.js.
// Les positions restent en pixels comme dans la version 2D :
// x = distance le long de la ruelle, y = hauteur (vers le bas).
import { createRunWorld } from "./run3d.js?v=3d2";
import * as Sfx from "./sfx.js?v=3d2";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#game");
const ui = {
  score: $("#score"),
  kibble: $("#kibble"),
  speed: $("#speed"),
  label: $("#third-label"),
  overlay: $("#overlay"),
  title: $("#title"),
  message: $("#message"),
  action: $("#action"),
  jump: $("#jump"),
  fire: $("#fire"),
  pause: $("#pause"),
  sound: $("#sound"),
  fullscreen: $("#fullscreen"),
  cinematic: $("#cinematic"),
  bossHud: $("#bossHud"),
  bossBanner: $("#bossBanner"),
};

const W = 960;
const H = 430;
const GROUND = 354;
const BOSS_AT = 260;
// En 3D on voit loin dans la ruelle : les obstacles apparaissent plus loin
// (dans la brume) au lieu de surgir au bord de l'écran.
const SPAWN_X = 1700;

const game = {
  mode: "ready",
  score: 0,
  kibble: 0,
  ammo: 0,
  kibbleStreak: 0,
  wallDelay: 0,
  speed: 360,
  nextObs: 1.1,
  nextBrick: 2.2,
  bossTimer: 0,
  shake: 0,
  worldX: 0,
  cat: { x: 118, y: GROUND - 105, w: 126, h: 105, vy: 0, onGround: true, frame: 0, anim: 0 },
  boss: { x: 755, y: GROUND - 150, w: 190, h: 150, hp: 3, flash: 0, dying: 0 },
  obstacles: [],
  bricks: [],
  particles: [],
  shots: [],
};
const { cat, boss, obstacles, bricks, particles, shots } = game;

let sound = true;
let last = 0;
let world3d = null;

const isPlaying = () => game.mode === "run" || game.mode === "boss";
const pad = (value) => Math.floor(value).toString().padStart(5, "0");

// ---------------------------------------------------------------------------
// Déroulement de la partie
// ---------------------------------------------------------------------------

function reset() {
  Object.assign(game, {
    score: 0,
    kibble: 0,
    ammo: 0,
    kibbleStreak: 0,
    wallDelay: 0,
    speed: 360,
    nextObs: 1,
    nextBrick: 1.7,
    bossTimer: 0,
    worldX: 0,
  });
  obstacles.length = 0;
  bricks.length = 0;
  particles.length = 0;
  shots.length = 0;
  Object.assign(cat, { y: GROUND - cat.h, vy: 0, onGround: true, frame: 0 });
  Object.assign(boss, { hp: 3, flash: 0, dying: 0 });
  ui.cinematic.pause();
  ui.cinematic.currentTime = 0;
  ui.cinematic.classList.add("hidden");
  game.mode = "run";
  ui.overlay.classList.add("hidden");
  startMusic("run");
  hud();
}

function hud() {
  ui.score.textContent = pad(game.score);
  ui.kibble.textContent = `${game.kibble % 3} / 3 · 🔫 ${game.ammo}`;
  ui.fire.disabled = game.ammo < 1 || !isPlaying();
  ui.fire.classList.toggle("ready", game.ammo > 0);
  ui.fire.querySelector("span").textContent = game.ammo > 0 ? `TIR ×${game.ammo}` : `ARME ${game.kibble % 3}/3`;
  ui.label.textContent = game.mode === "boss" ? "BOSS" : "VITESSE";
  ui.speed.textContent = game.mode === "boss" ? "PUCCI" : `${(game.speed / 360).toFixed(1)}×`;
}

function show(tag, title, message, button) {
  ui.overlay.querySelector(".eyebrow").textContent = tag;
  ui.title.textContent = title;
  ui.message.textContent = message;
  ui.action.textContent = button;
  ui.overlay.classList.remove("hidden");
}

function jump() {
  Sfx.unlock();
  if (["ready", "over", "won"].includes(game.mode)) {
    reset();
    return;
  }
  if (game.mode === "paused") {
    resume();
    return;
  }
  if (cat.onGround && isPlaying()) {
    cat.vy = -740;
    cat.onGround = false;
    burst(cat.x + 35, GROUND - 5, "#e9d8a0", 7);
    playSfx("jump", 0.55, 1.15);
  }
}

function fire() {
  if (game.ammo < 1 || !isPlaying()) return;
  game.ammo -= 1;
  shots.push({ x: cat.x + 105, y: cat.y + 35, w: 44, h: 18, v: 780, boss: game.mode === "boss" });
  game.shake = 3;
  playSfx("shot", 0.42, 1.25);
  hud();
}

function pause() {
  if (!isPlaying()) return;
  game.mode = "paused";
  show("PAUSE", "Kichta reprend son souffle.", "Appuie sur Continuer ou sur P.", "CONTINUER");
}

function resume() {
  game.mode = game.score >= BOSS_AT ? "boss" : "run";
  ui.overlay.classList.add("hidden");
  last = performance.now();
  hud();
}

function addKibble(x, y) {
  game.kibble += 1;
  game.kibbleStreak += 1;
  if (game.kibble % 3 === 0) game.ammo += 1;
  if (game.kibbleStreak === 4) {
    game.wallDelay = 1.35;
    game.kibbleStreak = 0;
  }
  particles.push({ x, y, vx: 0, vy: -95, r: 10, a: 1.4, type: "kibble" });
  // Plus la série de croquettes est longue, plus le son monte
  playSfx("coin", 0.6, 1 + Math.min(game.kibbleStreak, 6) * 0.07, 0.02);
  hud();
}

function enterBoss() {
  game.mode = "boss";
  obstacles.length = 0;
  bricks.length = 0;
  game.bossTimer = 1.2;
  game.shake = 8;
  startMusic("boss");
  hud();
  particles.push({ x: W / 2, y: 90, vx: 0, vy: 0, r: 1, a: 2.4, type: "bossText" });
}

function gameOver() {
  game.mode = "over";
  cat.frame = 5;
  game.shake = 13;
  playSfx("impact", 0.9);
  playSfx("fall", 0.6, 0.9);
  Sfx.setRunning(false);
  stopMusic();
  show(
    "FIN DE COURSE",
    "Oups… Kichta a été touchée.",
    `Score : ${pad(game.score)} · Croquettes : ${game.kibble} · Armes : ${game.ammo}`,
    "CONTINUER",
  );
}

// Continuer après une défaite : on garde le score et les armes.
function continueRun() {
  obstacles.length = 0;
  bricks.length = 0;
  shots.length = 0;
  Object.assign(cat, { y: GROUND - cat.h, vy: 0, onGround: true, frame: 0 });
  game.mode = game.score >= BOSS_AT ? "boss" : "run";
  game.nextObs = 1.25;
  game.bossTimer = 1.4;
  ui.overlay.classList.add("hidden");
  startMusic(game.mode);
  last = performance.now();
  hud();
}

function bossExplosion(stage) {
  const positions = { 1: [boss.x + 42, boss.y + 125], 2: [boss.x + 150, boss.y + 128], 3: [boss.x + 95, boss.y + 76] };
  const [x, y] = positions[stage];
  particles.push({ x, y, vx: 0, vy: 0, r: stage === 3 ? 110 : 55, a: 1.15, type: "boom", stage });
  burst(x, y, stage === 3 ? "#fff2a1" : "#ff8b3d", stage === 3 ? 70 : 34);
  game.shake = stage === 3 ? 30 : 16;
  if (stage === 3) {
    playSfx("destroy", 0.85, 0.9);
    playSfx("break", 0.8, 0.8);
    painMeow();
  } else {
    playSfx("hurt", 0.85, 0.8);
    playSfx("impact", 0.6, 1.2);
  }
}

function win() {
  game.mode = "bossEnding";
  boss.dying = 1.7;
  obstacles.length = 0;
  shots.length = 0;
  bossExplosion(3);
}

function startCinematic() {
  game.mode = "cinematic";
  stopMusic();
  ui.cinematic.currentTime = 0;
  ui.cinematic.muted = !sound;
  ui.cinematic.classList.remove("hidden");
  ui.overlay.classList.add("hidden");
  ui.bossHud.hidden = true;
  ui.cinematic.play().catch(() => {});
}

// ---------------------------------------------------------------------------
// Apparition des obstacles, des murs et des croquettes
// ---------------------------------------------------------------------------

const OBSTACLE_SIZES = { chair: [66, 82], lamp: [48, 100], vacuum: [68, 64], laundry: [62, 70], toy: [48, 40] };

function spawnObstacle(fromBoss = false) {
  if (!fromBoss && bricks.some((brick) => brick.x > SPAWN_X - 250)) {
    game.nextObs = 0.75;
    return;
  }
  const types = fromBoss ? ["toy", "laundry", "vacuum"] : ["chair", "lamp", "vacuum", "laundry", "toy"];
  const type = types[Math.floor(Math.random() * types.length)];
  const [w, h] = OBSTACLE_SIZES[type];
  obstacles.push({
    x: fromBoss ? boss.x - 15 : SPAWN_X,
    y: GROUND - h,
    w,
    h,
    type,
    fromBoss,
    passed: false,
    v: fromBoss ? -(410 + Math.random() * 90) : 0,
  });
}

function spawnWall() {
  obstacles.push({ x: SPAWN_X + 5, y: GROUND - 158, w: 82, h: 158, type: "wall", fromBoss: false, passed: false, v: 0 });
}

function spawnBrick() {
  if (obstacles.some((obstacle) => !obstacle.fromBoss && obstacle.x > SPAWN_X - 360)) {
    game.nextBrick = 0.8;
    return;
  }
  for (let index = 0; index < 4; index += 1) {
    bricks.push({ x: SPAWN_X + 20 + index * 82, y: GROUND - 120 - (index % 2) * 42, w: 34, h: 26, hit: false, bump: 0 });
  }
  game.nextBrick = 5.5 + Math.random() * 1.8;
}

function burst(x, y, color, count = 10) {
  for (let index = 0; index < count; index += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: -40 - Math.random() * 160,
      r: 2 + Math.random() * 5,
      a: 1,
      type: "dust",
      color,
    });
  }
}

// ---------------------------------------------------------------------------
// Mise à jour à chaque image
// ---------------------------------------------------------------------------

function hit(a, b) {
  return a.x + 25 < b.x + b.w && a.x + a.w - 22 > b.x && a.y + 18 < b.y + b.h && a.y + a.h - 8 > b.y;
}

function updateParticles(dt) {
  for (const particle of particles) {
    if (particle.type !== "bossText" && particle.type !== "boom") {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.type === "kibble" ? 50 * dt : 280 * dt;
    }
    particle.a -= dt;
  }
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    if (particles[index].a <= 0) particles.splice(index, 1);
  }
}

function update(dt) {
  if (!["run", "boss", "bossEnding"].includes(game.mode)) return;
  if (game.mode === "bossEnding") {
    boss.dying -= dt;
    updateParticles(dt);
    if (boss.dying <= 0) startCinematic();
    return;
  }

  game.score += dt * (game.mode === "boss" ? 3 : 10);
  if (game.mode === "run" && game.score >= BOSS_AT) enterBoss();
  game.speed = 360 + Math.min(240, game.score * 0.75);
  game.worldX += game.speed * dt;

  // Saut et animation de course
  cat.vy += 1950 * dt;
  cat.y += cat.vy * dt;
  if (cat.y >= GROUND - cat.h) {
    if (!cat.onGround) {
      burst(cat.x + 35, GROUND - 4, "#eadca9", 8);
      playSfx("land", 0.55);
    }
    cat.y = GROUND - cat.h;
    cat.vy = 0;
    cat.onGround = true;
  }
  cat.anim += dt;
  if (cat.onGround && cat.anim > 0.095) {
    cat.frame = (cat.frame + 1) % 3;
    cat.anim = 0;
  } else if (!cat.onGround) {
    cat.frame = cat.vy < 0 ? 3 : 4;
  }

  // Apparitions
  if (game.wallDelay > 0) {
    game.wallDelay -= dt;
    if (game.wallDelay <= 0) spawnWall();
  }
  if (game.mode === "run") {
    game.nextObs -= dt;
    game.nextBrick -= dt;
    if (game.nextObs <= 0) {
      spawnObstacle();
      game.nextObs = 1.05 + Math.random() * 1.15;
    }
    if (game.nextBrick <= 0) spawnBrick();
  } else {
    game.bossTimer -= dt;
    boss.flash = Math.max(0, boss.flash - dt);
    if (game.bossTimer <= 0) {
      spawnObstacle(true);
      game.bossTimer = 1.05 + Math.random() * 0.55;
    }
  }

  // Croquettes : on les attrape en sautant dedans
  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    brick.x -= game.speed * dt;
    brick.bump = Math.max(0, brick.bump - dt);
    const touching =
      cat.x + cat.w - 22 > brick.x && cat.x + 22 < brick.x + brick.w && cat.y + cat.h - 12 > brick.y && cat.y + 12 < brick.y + brick.h;
    if (!brick.hit && touching) {
      brick.hit = true;
      brick.bump = 0.18;
      addKibble(brick.x + brick.w / 2, brick.y);
      burst(brick.x + brick.w / 2, brick.y, "#f6c753", 8);
    }
    if (brick.x + brick.w < 0) bricks.splice(index, 1);
  }

  // Obstacles : ceux lancés par Pucci rapportent une croquette s'ils sont évités
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index];
    obstacle.x += (obstacle.fromBoss ? obstacle.v : -game.speed) * dt;
    if (obstacle.fromBoss && !obstacle.passed && obstacle.x + obstacle.w < cat.x) {
      obstacle.passed = true;
      addKibble(cat.x + cat.w / 2, cat.y);
    }
    if (obstacle.x + obstacle.w < -30) {
      obstacles.splice(index, 1);
      continue;
    }
    if (hit(cat, obstacle)) {
      gameOver();
      return;
    }
  }

  // Tirs
  for (let index = shots.length - 1; index >= 0; index -= 1) {
    const shot = shots[index];
    shot.x += shot.v * dt;
    burst(shot.x, shot.y + 8, "#ffe369", 1);
    if (game.mode === "boss" && shot.x + shot.w >= boss.x + 25) {
      shots.splice(index, 1);
      boss.hp -= 1;
      boss.flash = 0.3;
      if (boss.hp > 0) bossExplosion(3 - boss.hp);
      else win();
      continue;
    }
    for (let other = obstacles.length - 1; other >= 0; other -= 1) {
      if (!hit(shot, obstacles[other])) continue;
      const target = obstacles[other];
      burst(target.x + target.w / 2, target.y + target.h / 2, "#ffd65a", target.type === "wall" ? 38 : 18);
      if (target.type === "wall") playSfx("break", 0.85);
      else playSfx("hurt", 0.5, 1.3);
      obstacles.splice(other, 1);
      shots.splice(index, 1);
      break;
    }
    if (shot.x > SPAWN_X + 80 && shots[index] === shot) shots.splice(index, 1);
  }
  updateParticles(dt);
  hud();
}

function loop(timestamp) {
  Sfx.setRunning(sound && cat.onGround && isPlaying(), game.speed / 360);
  const dt = Math.min(0.032, (timestamp - last) / 1000 || 0);
  last = timestamp;
  update(dt);
  game.shake *= Math.exp(-9 * dt);
  world3d?.render(game, timestamp, dt);
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Sons
// ---------------------------------------------------------------------------

const tracks = { run: new Audio("assets/audio/run-loop.mp3"), boss: new Audio("assets/audio/boss-loop.mp3") };
Object.values(tracks).forEach((track) => {
  track.loop = true;
  track.preload = "auto";
  track.load();
});
tracks.run.volume = 0.42;
tracks.boss.volume = 0.55;
let activeTrack = null;
function playSfx(name, volume = 0.7, rate = 1, vary = 0.06) {
  if (!sound) return;
  Sfx.play(name, { volume, rate, vary });
}

function startMusic(kind) {
  stopMusic();
  if (!sound || !tracks[kind]) return;
  activeTrack = tracks[kind];
  activeTrack.currentTime = 0;
  activeTrack.play().catch(() => {});
}

function stopMusic() {
  if (!activeTrack) return;
  activeTrack.pause();
  activeTrack = null;
}

function painMeow() {
  if (!sound) return;
  Sfx.play("meow", { volume: 1, rate: 0.7, vary: 0 });
}

// ---------------------------------------------------------------------------
// Plein écran et commandes
// ---------------------------------------------------------------------------

function leavePseudoFullscreen() {
  $(".shell").classList.remove("pseudo-fullscreen");
  document.body.classList.remove("mobile-fullscreen");
  ui.fullscreen.textContent = "⛶";
  resize();
}

async function toggleFullscreen() {
  const shell = $(".shell");
  const mobile = matchMedia("(pointer:coarse)").matches || innerWidth < 800;
  if (shell.classList.contains("pseudo-fullscreen")) {
    leavePseudoFullscreen();
    return;
  }
  if (mobile) {
    shell.classList.add("pseudo-fullscreen");
    document.body.classList.add("mobile-fullscreen");
    ui.fullscreen.textContent = "✕";
    scrollTo(0, 0);
    resize();
    return;
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (shell.requestFullscreen) await shell.requestFullscreen();
    else {
      shell.classList.add("pseudo-fullscreen");
      ui.fullscreen.textContent = "✕";
    }
  } catch {
    shell.classList.add("pseudo-fullscreen");
    ui.fullscreen.textContent = "✕";
  }
  resize();
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  world3d?.resize(bounds.width, bounds.height, Math.min(window.devicePixelRatio || 1, 2));
}

ui.cinematic.addEventListener("ended", () => {
  game.mode = "won";
  show("", "", "", "REJOUER");
});

ui.action.onclick = () => {
  Sfx.unlock();
  sound = true;
  playSfx("click", 0.6);
  ui.sound.textContent = "🔊";
  if (game.mode === "paused") resume();
  else if (game.mode === "over") continueRun();
  else reset();
};
ui.jump.onclick = jump;
ui.fire.onclick = fire;
ui.pause.onclick = () => (game.mode === "paused" ? resume() : pause());
ui.sound.onclick = () => {
  sound = !sound;
  ui.sound.textContent = sound ? "🔊" : "🔇";
  if (sound) startMusic(game.mode === "boss" ? "boss" : "run");
  else stopMusic();
};
ui.fullscreen.onclick = toggleFullscreen;
document.addEventListener("fullscreenchange", () => {
  ui.fullscreen.textContent = document.fullscreenElement ? "✕" : "⛶";
  resize();
});
canvas.addEventListener("pointerdown", jump);
addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp"].includes(event.code)) {
    event.preventDefault();
    jump();
  }
  if (event.code === "KeyF") fire();
  if (event.code === "KeyP") (game.mode === "paused" ? resume : pause)();
  if (event.code === "KeyM") ui.sound.click();
  if (event.code === "KeyX") ui.fullscreen.click();
  if (event.code === "Escape") leavePseudoFullscreen();
});
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

try {
  world3d = createRunWorld({
    canvas,
    world: { W, H, GROUND },
    hud: { boss: ui.bossHud, bossBars: [...ui.bossHud.querySelectorAll("i")], banner: ui.bossBanner },
  });
} catch (error) {
  console.error(error);
  show("3D INDISPONIBLE", "Oups…", "Ton navigateur ne peut pas afficher la 3D (WebGL). Essaie avec Chrome, Safari ou Firefox à jour.", "RÉESSAYER");
  ui.action.onclick = () => window.location.reload();
}
if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
resize();
hud();
requestAnimationFrame(loop);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=3d1").catch(() => {});

// Mode test (ajouter ?debug à l'adresse) : accès à l'état du jeu dans la console.
if (new URLSearchParams(location.search).has("debug")) {
  window.kichtaRun = { game, reset, update, jump, fire, enterBoss, continueRun, spawnWall, spawnBrick, spawnObstacle };
}
