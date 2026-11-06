// Sons et musique de Kichta Run avec Web Audio.
// Effets : sons Kenney (licence MIT, voir assets/audio/CREDITS.txt), légère
// variation de hauteur à chaque lecture et petite réverbération.
// Musique : boucles originales (menu, course, boss) lues sans coupure.
const FILES = {
  jump: "assets/audio/k-jump.mp3",
  land: "assets/audio/k-land.mp3",
  coin: "assets/audio/k-coin.mp3",
  break: "assets/audio/k-break.mp3",
  shot: "assets/audio/k-blaster.mp3",
  impact: "assets/audio/k-impact.mp3",
  hurt: "assets/audio/k-hurt.mp3",
  destroy: "assets/audio/k-destroy.mp3",
  steps: "assets/audio/k-steps.mp3",
  click: "assets/audio/k-click.mp3",
  attack: "assets/audio/k-attack.mp3",
  fall: "assets/audio/k-fall.mp3",
  meow: "assets/audio/pucci-meow.mp3",
};
const MUSIC = {
  menu: "assets/audio/candy-menu.mp3",
  run: "assets/audio/candy-run.mp3",
  boss: "assets/audio/candy-boss.mp3",
};

let ctx = null;
let master = null;
let musicBus = null;
let reverb = null;
let enabled = true;
const buffers = {};
let steps = null;
let current = null;
let wanted = null;

function impulse(context, seconds = 1.2, decay = 3.4) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function load(name, url) {
  return fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)))
    .then((buffer) => {
      buffers[name] = buffer;
      if (name === `music:${wanted}`) music(wanted);
    })
    .catch(() => {});
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    reverb.connect(wet).connect(master);
    Object.entries(FILES).forEach(([name, url]) => load(name, url));
    Object.entries(MUSIC).forEach(([name, url]) => load(`music:${name}`, url));
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

export function setEnabled(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
}

/** Joue un son. rate : hauteur (1 = normale), vary : variation aléatoire. */
export function play(name, { volume = 0.7, rate = 1, vary = 0.05, wet = true, delay = 0 } = {}) {
  if (!ctx || !enabled || !buffers[name]) return null;
  const source = ctx.createBufferSource();
  source.buffer = buffers[name];
  source.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * vary);
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(master);
  if (wet) gain.connect(reverb);
  source.start(ctx.currentTime + delay);
  return source;
}

/** Change de musique avec un fondu (null = silence). */
export function music(name) {
  wanted = name;
  if (!ctx) return;
  if (current && current.name === name) return;
  if (current) {
    const old = current;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    setTimeout(() => {
      try {
        old.source.stop();
      } catch {
        // déjà arrêtée
      }
    }, 1500);
    current = null;
  }
  const buffer = name && buffers[`music:${name}`];
  if (!buffer) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(name === "menu" ? 0.8 : 1, ctx.currentTime, 0.3);
  source.connect(gain).connect(musicBus);
  source.start();
  current = { name, source, gain };
}

/** Pas de course : boucle légère dont le rythme suit la vitesse. */
export function setRunning(on, speed = 1) {
  if (!ctx || !buffers.steps) return;
  if (on && !steps) {
    const source = ctx.createBufferSource();
    source.buffer = buffers.steps;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(master);
    source.start();
    steps = { source, gain };
  }
  if (steps) {
    steps.source.playbackRate.value = 1.2 * speed;
    steps.gain.gain.setTargetAtTime(on ? 0.12 : 0, ctx.currentTime, 0.05);
  }
}
