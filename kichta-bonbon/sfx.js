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
    synthesize();
    Object.entries(MUSIC).forEach(([name, url]) => load(`music:${name}`, url));
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Sons fabriqués directement : crachat de chat, roulement du coffre,
// fanfare de récompense et scintillement.
function synthesize() {
  const sr = ctx.sampleRate;
  const make = (seconds, fn) => {
    const n = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(1, n, sr);
    const d = buffer.getChannelData(0);
    fn(d, n);
    return buffer;
  };
  // Crachat « khhhh ! » : souffle aigu filtré qui monte puis claque
  buffers.hiss = make(1.1, (d, n) => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;
      a = a * 0.55 + white * 0.45;
      b = white - a;
      const env = Math.min(1, t / 0.04) * (t < 0.75 ? 1 - t * 0.5 : Math.max(0, (1.1 - t) / 0.35) * 0.6);
      const spit = t > 0.72 && t < 0.8 ? (Math.random() * 2 - 1) * 1.4 : 0;
      d[i] = (b * 0.9 + a * 0.25) * env * (0.8 + 0.2 * Math.sin(t * 90)) + spit * Math.exp(-(t - 0.72) * 40);
    }
  });
  // Roulement pendant que le coffre tremble
  buffers.rattle = make(0.12, (d, n) => {
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.8 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.6;
    }
  });
  // Fanfare : accord majeur brillant qui s'envole
  buffers.fanfare = make(1.8, (d, n) => {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      let v = 0;
      notes.forEach((f, k) => {
        const start = k * 0.07;
        if (t > start) {
          const tt = t - start;
          v += (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt)) * Math.exp(-tt * 1.6) * 0.16;
        }
      });
      d[i] = v;
    }
  });
  // Scintillement magique
  buffers.sparkle = make(1.2, (d, n) => {
    for (let k = 0; k < 18; k += 1) {
      const f = 1800 + Math.random() * 2600;
      const start = Math.floor(Math.random() * n * 0.7);
      for (let i = start; i < n; i += 1) {
        const tt = (i - start) / sr;
        d[i] += Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 14) * 0.12;
      }
    }
  });
  // Aboiement « ouaf ! » : voix grave qui descend, souffle et deux formants
  buffers.bark = make(0.42, (d, n) => {
    let phase = 0;
    let lp = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const woof = t < 0.2 ? t : t - 0.22;
      const on = t < 0.2 || (t > 0.22 && t < 0.4) ? 1 : 0;
      const f0 = (t < 0.2 ? 330 : 290) * (1 - woof * 1.6);
      phase += (2 * Math.PI * f0) / sr;
      let v = 0;
      for (let h = 1; h <= 9; h += 1) {
        const fh = f0 * h;
        const formant = Math.exp(-(((fh - 650) / 260) ** 2)) + 0.6 * Math.exp(-(((fh - 1350) / 380) ** 2)) + 0.15;
        v += Math.sin(phase * h) * formant / h ** 0.4;
      }
      lp = lp * 0.7 + (Math.random() * 2 - 1) * 0.3;
      const env = on * Math.min(1, woof / 0.012) * Math.exp(-woof * (t < 0.2 ? 11 : 13));
      d[i] = (v * 0.32 + lp * 0.35) * env;
    }
  });
  // Petit cri aigu du hérisson
  buffers.squeak = make(0.35, (d, n) => {
    let phase = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      const f = 1400 + Math.sin(t * 40) * 300 + t * 2200;
      phase += (2 * Math.PI * f) / sr;
      d[i] = (Math.sin(phase) * 0.5 + Math.sin(phase * 2) * 0.15) * Math.min(1, t / 0.01) * Math.exp(-t * 7);
    }
  });
  // Explosion douce de l'ouverture
  buffers.pop = make(0.6, (d, n) => {
    let lp = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / sr;
      lp = lp * 0.9 + (Math.random() * 2 - 1) * 0.1;
      d[i] = lp * 6 * Math.exp(-t * 7) + Math.sin(2 * Math.PI * (90 - t * 60) * t) * Math.exp(-t * 9) * 0.8;
    }
  });
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
