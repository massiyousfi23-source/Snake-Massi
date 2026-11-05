// Effets sonores de Kichta Run avec Web Audio : sons Kenney (licence MIT, voir
// assets/audio/CREDITS.txt), légère variation de hauteur à chaque lecture,
// petite réverbération synthétique et pas de course en boucle.
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

let ctx = null;
let master = null;
let reverb = null;
const buffers = {};
let loading = null;
let steps = null;

function impulse(context, seconds = 1.4, decay = 3.2) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    reverb.connect(wet).connect(master);
    loading = Promise.all(
      Object.entries(FILES).map(([name, url]) =>
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((data) => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)))
          .then((buffer) => {
            buffers[name] = buffer;
          })
          .catch(() => {}),
      ),
    );
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

/** Joue un son. rate : hauteur (1 = normale), vary : variation aléatoire. */
export function play(name, { volume = 0.7, rate = 1, vary = 0.06, wet = true, delay = 0 } = {}) {
  if (!ctx || !buffers[name]) return null;
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

/** Pas de course : boucle légère dont le rythme suit la vitesse. */
export function setRunning(on, speed = 1) {
  if (!ctx || !buffers.steps) return;
  if (on && !steps) {
    const source = ctx.createBufferSource();
    source.buffer = buffers.steps;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    source.connect(gain).connect(master);
    source.start();
    steps = { source, gain };
  }
  if (steps) {
    steps.source.playbackRate.value = 1.25 * speed;
    steps.gain.gain.setTargetAtTime(on ? 0.22 : 0, ctx.currentTime, 0.04);
  }
}

export function stopAll() {
  if (steps) {
    try {
      steps.source.stop();
    } catch {
      // déjà arrêté
    }
    steps = null;
  }
}
