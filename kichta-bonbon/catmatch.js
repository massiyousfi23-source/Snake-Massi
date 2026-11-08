// Reconnaissance « Mon chat » : tout se passe sur le téléphone, la photo ne quitte jamais l'appareil.
// 1. Un petit modèle de vision (MobileCLIP S0, 12 Mo) transforme la photo en « empreinte ».
// 2. On compare cette empreinte à celles de descriptions de traits (motif, couleur, poil,
//    oreilles, visage, yeux, race) calculées à l'avance (ai/text.json).
// 3. Chaque chat du catalogue reçoit une note selon ses traits ; on garde les meilleurs.
import { CATS, catAttributes } from "./cats.js?v=b6";
import { normalizeLook } from "./toons.js?v=b6";

const DIR = new URL("./ai/", import.meta.url).href;
// Poids réglés sur 168 photos étiquetées (Oxford-IIIT Pet) et 45 photos de Wikimedia Commons
const WEIGHTS = { pattern: 0.6, color: 0.3, fur: 0.7, ears: 0.2, face: 0.2, eye: 0.15, breed: 0.5 };
const PIXEL_WEIGHT = 1.0; // poids des vraies couleurs mesurées sur la photo
let enginePromise = null;

/** Télécharge un fichier en signalant la progression (0 → 1). */
async function fetchBytes(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body || !total) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const out = new Uint8Array(total);
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.set(value, got);
    got += value.length;
    onProgress?.(got / total);
  }
  return out;
}

/** Charge le moteur et le modèle (une seule fois). */
export function loadEngine(onProgress) {
  if (!enginePromise) {
    enginePromise = (async () => {
      const ort = await import(DIR + "ort.wasm.min.mjs");
      ort.env.wasm.wasmPaths = DIR;
      ort.env.wasm.numThreads = 1;
      const [model, text] = await Promise.all([fetchBytes(DIR + "vision.onnx", onProgress), fetch(DIR + "text.json").then((r) => r.json())]);
      const session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return { ort, session, text };
    })();
    enginePromise.catch(() => (enginePromise = null));
  }
  return enginePromise;
}

/** Image → tenseur [1, 3, S, S] (recadrage carré : centre ou image entière avec marges). */
function toTensor(ort, img, cfg, mode) {
  const S = cfg.size;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (mode === "center") {
    const side = Math.min(w, h);
    g.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, S, S);
  } else {
    // Image entière, posée sur un fond gris moyen
    g.fillStyle = "rgb(124,116,104)";
    g.fillRect(0, 0, S, S);
    const k = S / Math.max(w, h);
    g.drawImage(img, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k);
  }
  const px = g.getImageData(0, 0, S, S).data;
  const data = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i += 1) {
    for (let ch = 0; ch < 3; ch += 1) data[ch * S * S + i] = (px[i * 4 + ch] / 255 - cfg.mean[ch]) / cfg.std[ch];
  }
  return new ort.Tensor("float32", data, [1, 3, S, S]);
}

function normalize(v) {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Array.from(v, (x) => x / n);
}

/** Empreinte de la photo (moyenne de deux cadrages pour plus de robustesse). */
export async function embedImage(img, onProgress) {
  const { ort, session, text } = await loadEngine(onProgress);
  const cfg = text.config;
  const out = [];
  for (const mode of ["center", "full"]) {
    const feeds = { [session.inputNames[0]]: toTensor(ort, img, cfg, mode) };
    const res = await session.run(feeds);
    const emb = res[cfg.output] || res[session.outputNames[0]];
    out.push(normalize(emb.data));
  }
  return normalize(out[0].map((x, i) => x + out[1][i]));
}

/** Probabilités de chaque valeur d'un groupe de traits (biais du modèle retirés). */
function groupProbs(group, emb, scale) {
  const logits = group.labels.map((_, k) => {
    const t = group.emb[k];
    let d = 0;
    for (let i = 0; i < t.length; i += 1) d += t[i] * emb[i];
    return (d - (group.bias?.[k] || 0)) * scale;
  });
  const m = Math.max(...logits);
  const e = logits.map((x) => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return Object.fromEntries(group.labels.map((l, k) => [l, e[k] / sum]));
}

// --- Couleurs réelles de la photo ----------------------------------------------------------------
function toLab(r, g, b) {
  const f = (c) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const R = f(r);
  const G = f(g);
  const B = f(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(y) - 16, 500 * (h(x) - h(y)), 200 * (h(y) - h(z))];
}
const hexLab = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return toLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
};
function labDist(a, b) {
  // La luminosité compte moins (l'éclairage des photos varie beaucoup)
  return Math.sqrt(0.45 * (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}
/** Palette de la photo : 4 couleurs dominantes, en privilégiant le centre (là où est le chat). */
export function photoPalette(img) {
  const S = 72;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const side = Math.min(w, h) * 0.9;
  g.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, S, S);
  const px = g.getImageData(0, 0, S, S).data;
  const pts = [];
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4;
      const dx = (x - S / 2) / (S / 2);
      const dy = (y - S * 0.55) / (S / 2);
      const wgt = Math.exp(-(dx * dx + dy * dy) * 1.6);
      pts.push({ lab: toLab(px[i], px[i + 1], px[i + 2]), w: wgt });
    }
  }
  // k-moyennes pondérées, départ déterministe (sombre, moyen, clair, saturé)
  const sorted = [...pts].sort((a, b) => a.lab[0] - b.lab[0]);
  let cent = [0.1, 0.4, 0.7, 0.95].map((q) => sorted[Math.floor(q * (sorted.length - 1))].lab.slice());
  const sat = pts.reduce((best, p) => (Math.hypot(p.lab[1], p.lab[2]) > Math.hypot(best.lab[1], best.lab[2]) ? p : best), pts[0]);
  cent[2] = sat.lab.slice();
  let assign = [];
  for (let it = 0; it < 10; it += 1) {
    assign = pts.map((p) => {
      let bi = 0;
      let bd = Infinity;
      cent.forEach((cc, k) => {
        const d = labDist(p.lab, cc);
        if (d < bd) (bd = d), (bi = k);
      });
      return bi;
    });
    cent = cent.map((cc, k) => {
      const acc = [0, 0, 0];
      let ws = 0;
      pts.forEach((p, i) => {
        if (assign[i] !== k) return;
        acc[0] += p.lab[0] * p.w;
        acc[1] += p.lab[1] * p.w;
        acc[2] += p.lab[2] * p.w;
        ws += p.w;
      });
      return ws ? acc.map((v) => v / ws) : cc;
    });
  }
  const weights = cent.map(() => 0);
  pts.forEach((p, i) => (weights[assign[i]] += p.w));
  const total = weights.reduce((a, b) => a + b, 0);
  return cent.map((lab, k) => ({ lab, w: weights[k] / total })).filter((p) => p.w > 0.03);
}
/** Couleurs attendues d'un chat du catalogue, avec la part de surface de chacune. */
const paletteCache = new Map();
function catPalette(cat) {
  if (paletteCache.has(cat.id)) return paletteCache.get(cat.id);
  const L = normalizeLook(cat.look);
  const W = "#f4f1ec";
  const p = L.pattern;
  const wv = L.white;
  let list;
  if (wv === "all") list = [[W, 1]];
  else if (p === "point") list = [[L.light, 0.6], [L.stripe, 0.4]];
  else if (p === "calico") list = [[W, 0.4], [L.base, 0.3], [L.patch, 0.3]];
  else if (p === "tortie") list = [[L.base, 0.55], [L.patch, 0.45]];
  else if (p === "torbie") list = [[L.base, 0.4], [L.stripe, 0.2], [L.patch, 0.4]];
  else if (p === "smoke") list = [[L.base, 0.7], [L.light, 0.3]];
  else if (["mackerel", "classic", "spotted", "rosette", "ticked"].includes(p)) list = [[L.base, 0.55], [L.stripe, 0.3], [L.light, 0.15]];
  else list = [[L.base, 0.85], [L.muzzle, 0.15]];
  const white = { tuxedo: 0.4, bicolor: 0.5, van: 0.6, harlequin: 0.65, locket: 0.05, mitts: 0.08, gloves: 0.1 }[wv] || 0;
  if (white && p !== "calico") list = [...list.map(([c, k]) => [c, k * (1 - white)]), [W, white]];
  const pal = list.map(([hex, w]) => ({ lab: hexLab(hex), w }));
  paletteCache.set(cat.id, pal);
  return pal;
}
/** Écart entre deux palettes (0 = identiques), dans les deux sens. */
function paletteDistance(a, b) {
  const one = (x, y) => x.reduce((s, p) => s + p.w * Math.min(...y.map((q) => labDist(p.lab, q.lab))), 0);
  return (one(a, b) + one(b, a)) / 2;
}

/** Analyse complète : est-ce un chat ? quels traits ? quels chats du catalogue lui ressemblent ? */
export async function analyse(img, onProgress) {
  const emb = await embedImage(img, onProgress);
  const palette = photoPalette(img);
  const { text } = await loadEngine();
  const scale = text.config.scale;
  const probs = Object.fromEntries(Object.entries(text.groups).map(([k, g]) => [k, groupProbs(g, emb, scale)]));
  const ranked = CATS.map((cat) => {
    const a = catAttributes(cat);
    let score = 0;
    for (const [k, w] of Object.entries(WEIGHTS)) {
      const key = k === "breed" ? a.breed || "domestic" : a[k];
      const p = probs[k]?.[key];
      if (p !== undefined) score += w * Math.log(p + 1e-4);
    }
    const dist = paletteDistance(palette, catPalette(cat));
    score -= PIXEL_WEIGHT * (dist / 12);
    return { cat, score, dist };
  }).sort((x, y) => y.score - x.score);
  // Note de ressemblance lisible (0–100 %), relative au meilleur
  const best = ranked[0].score;
  ranked.forEach((r) => (r.match = Math.round(100 * Math.exp((r.score - best) / 4) * Math.min(1, 0.55 + probs.iscat.cat * 0.45))));
  return { isCat: probs.iscat.cat > 0.5, probs, ranked, palette, emb };
}
