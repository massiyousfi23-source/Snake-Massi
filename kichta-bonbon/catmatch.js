// Reconnaissance « Mon chat » : tout se passe sur le téléphone, la photo ne quitte jamais l'appareil.
// 1. Un petit modèle de vision (MobileCLIP S0, 12 Mo) transforme la photo en « empreinte ».
// 2. On compare cette empreinte à celles de descriptions de traits (motif, couleur, poil,
//    oreilles, visage, yeux, race) calculées à l'avance (ai/text.json).
// 3. Chaque chat du catalogue reçoit une note selon ses traits ; on garde les meilleurs.
import { CATS, catAttributes } from "./cats.js?v=b6";

const DIR = new URL("./ai/", import.meta.url).href;
const WEIGHTS = { pattern: 1.2, color: 1.0, fur: 0.7, ears: 0.6, face: 0.6, eye: 0.25, breed: 0.45 };
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

/** Probabilités de chaque valeur d'un groupe de traits. */
function groupProbs(group, emb, scale) {
  const logits = group.labels.map((_, k) => {
    const t = group.emb[k];
    let d = 0;
    for (let i = 0; i < t.length; i += 1) d += t[i] * emb[i];
    return d * scale;
  });
  const m = Math.max(...logits);
  const e = logits.map((x) => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return Object.fromEntries(group.labels.map((l, k) => [l, e[k] / sum]));
}

/** Analyse complète : est-ce un chat ? quels traits ? quels chats du catalogue lui ressemblent ? */
export async function analyse(img, onProgress) {
  const emb = await embedImage(img, onProgress);
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
    return { cat, score };
  }).sort((x, y) => y.score - x.score);
  // Note de ressemblance lisible (0–100 %), relative au meilleur
  const best = ranked[0].score;
  ranked.forEach((r) => (r.match = Math.round(100 * Math.exp((r.score - best) / 4) * Math.min(1, 0.55 + probs.iscat.cat * 0.45))));
  return { isCat: probs.iscat.cat > 0.5, probs, ranked };
}
