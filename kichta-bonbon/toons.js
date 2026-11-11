// Kichta et Pucci en figurines « bonbon » : formes rondes, gros yeux brillants,
// vernis épais. Leurs marques restent fidèles aux photos :
// - Kichta : tigrée caramel à rayures chocolat, « M » sur le front, menton et
//   museau clairs, yeux vert olive, nez rose orangé, queue annelée au bout noir.
// - Pucci : réglisse noire et guimauve blanche, fin liseré blanc entre les yeux,
//   tache noire au menton, nez rose taché de noir, collier rose et médaille ronde.
// Les modèles regardent vers +Z.
import * as THREE from "../vendor/three.module.min.js";

export function candy(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    ...options,
  });
}

export function canvasTexture(width, height, paint, repeat = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ---------------------------------------------------------------------------
// Pelages : on peut changer les couleurs de Kichta dans la boutique
// ---------------------------------------------------------------------------
export const SKINS = {
  caramel: { name: "Caramel", base: "#d98a3d", light: "#f6dfbf", stripe: "#5b2f14", nose: "#f28c7a", eye: "#a9b23a", price: 0 },
  fraise: { name: "Fraise", base: "#ff8fb4", light: "#fff0f5", stripe: "#d63c74", nose: "#ff5d8f", eye: "#5bc0ff", price: 600 },
  menthe: { name: "Menthe", base: "#7fe0c2", light: "#effff9", stripe: "#1f8f74", nose: "#ff8aa8", eye: "#ffcf3d", price: 800 },
  myrtille: { name: "Myrtille", base: "#8f8cff", light: "#f0efff", stripe: "#3a2f9e", nose: "#ff9ccf", eye: "#7dffb3", price: 1000 },
  or: { name: "Or massif", base: "#ffcc33", light: "#fff6cf", stripe: "#c47a00", nose: "#ff8f5d", eye: "#3dd6ff", price: 2500 },
};

const GEO = {
  sphere: new THREE.SphereGeometry(1, 40, 28),
  small: new THREE.SphereGeometry(1, 20, 14),
  capsule: new THREE.CapsuleGeometry(1, 1, 8, 18),
  cone: new THREE.ConeGeometry(1, 1, 24, 1),
  disc: new THREE.CircleGeometry(1, 32),
  torus: new THREE.TorusGeometry(1, 0.22, 14, 40),
};

function mesh(geometry, material, scale, position, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  if (Array.isArray(scale)) m.scale.set(...scale);
  else m.scale.setScalar(scale);
  if (position) m.position.set(...position);
  m.castShadow = shadow;
  return m;
}

// Œil façon dessin animé : iris coloré, grosse pupille, deux reflets.
function eyeTexture(iris) {
  // Texture enroulée autour d'une sphère : l'iris occupe le centre (vers l'avant)
  return canvasTexture(1024, 512, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    const R = 118;
    const grad = g.createRadialGradient(cx, cy, 8, cx, cy, R);
    grad.addColorStop(0, "#140d05");
    grad.addColorStop(0.42, "#140d05");
    grad.addColorStop(0.47, iris);
    grad.addColorStop(0.86, iris);
    grad.addColorStop(1, "#2c1e0a");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.96)";
    g.beginPath();
    g.ellipse(cx - 38, cy - 42, 30, 25, -0.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cx + 38, cy + 36, 13, 0, Math.PI * 2);
    g.fill();
  });
}

// Tête : la face (+Z) est à 25 % de la largeur de la texture.
function kichtaHeadTexture(skin) {
  return canvasTexture(512, 256, (g, w, h) => {
    const face = w * 0.25;
    g.fillStyle = skin.base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = skin.stripe;
    g.lineCap = "round";
    // Le « M » du front
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(face - 38, 70);
    g.lineTo(face - 22, 30);
    g.lineTo(face, 62);
    g.lineTo(face + 22, 30);
    g.lineTo(face + 38, 70);
    g.stroke();
    // Rayures du crâne et de la nuque
    g.lineWidth = 12;
    for (let x = face + 70; x < face + 440; x += 34) {
      g.beginPath();
      g.moveTo(x % w, 0);
      g.quadraticCurveTo((x + 12) % w, 50, (x + 4) % w, 118);
      g.stroke();
    }
    // Traits des joues
    g.lineWidth = 7;
    for (const side of [-1, 1]) {
      for (const dy of [0, 20]) {
        g.beginPath();
        g.moveTo(face + side * 70, 128 + dy);
        g.lineTo(face + side * 104, 124 + dy * 1.3);
        g.stroke();
      }
    }
    // Museau et menton clairs
    const chin = g.createRadialGradient(face, h * 0.78, 10, face, h * 0.78, 78);
    chin.addColorStop(0, skin.light);
    chin.addColorStop(0.75, skin.light);
    chin.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = chin;
    g.fillRect(0, 0, w, h);
  });
}

function kichtaBodyTexture(skin) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = skin.base;
    g.fillRect(0, 0, w, h);
    // Rayures « maquereau » ondulées sur le dos et les flancs
    g.strokeStyle = skin.stripe;
    g.lineCap = "round";
    for (let x = 18; x < w; x += 38) {
      g.lineWidth = 13;
      g.beginPath();
      for (let y = 0; y <= h; y += 8) {
        const px = x + Math.sin(y * 0.05 + x) * 7;
        if (y === 0) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.stroke();
    }
    // Ventre clair (côté -Y de la sphère, en bas de la texture)
    const belly = g.createLinearGradient(0, h * 0.62, 0, h);
    belly.addColorStop(0, "rgba(0,0,0,0)");
    belly.addColorStop(0.35, skin.light);
    belly.addColorStop(1, skin.light);
    g.fillStyle = belly;
    g.fillRect(0, 0, w, h);
  });
}

function pucciHeadTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    const face = w * 0.25;
    g.fillStyle = "#1d1822";
    g.fillRect(0, 0, w, h);
    // Liseré blanc : fin entre les yeux, très large sur le museau
    g.fillStyle = "#fffaf3";
    g.beginPath();
    g.moveTo(face - 6, 40);
    g.lineTo(face + 6, 40);
    g.quadraticCurveTo(face + 14, 120, face + 90, h);
    g.lineTo(face - 90, h);
    g.quadraticCurveTo(face - 14, 120, face - 6, 40);
    g.fill();
  });
}


// ---------------------------------------------------------------------------
// Chats personnalisés (« Mon chat ») : une robe décrite par un « look »
// (voir cats.js), peinte sur la tête et le corps.
// ---------------------------------------------------------------------------
const WHITE = "#fbf8f3";
const TABBY = ["mackerel", "classic", "spotted", "rosette", "ticked"];
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function mixColor(a, b, k) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
}
/** Complète un look : couleurs de chaque partie du corps selon la robe. */
export function normalizeLook(look) {
  const L = { pattern: "solid", white: "none", fur: "short", ears: "normal", face: "normal", body: "normal", nose: "#f2a0a0", eye: "#e8b52a", ...look };
  L.base = L.base || "#8a8a8a";
  L.stripe = L.stripe || mixColor(L.base, "#1a1210", 0.6);
  L.light = L.light || mixColor(L.base, "#ffffff", 0.45);
  L.patch = L.patch || "#e8863a";
  L.seed = L.seed || hashString(JSON.stringify([L.base, L.stripe, L.pattern, L.white, L.patch]));
  const tabby = TABBY.includes(L.pattern);
  const point = L.pattern === "point";
  const w = L.white;
  const whiteFace = ["tuxedo", "bicolor", "van", "harlequin", "all"].includes(w);
  const whitePaws = whiteFace || w === "mitts" || w === "gloves";
  L.muzzle = point ? L.stripe : whiteFace ? WHITE : tabby ? L.light : mixColor(L.base, "#ffffff", 0.16);
  L.chest = w !== "none" && w !== "mitts" && w !== "gloves" ? WHITE : point || tabby ? L.light : mixColor(L.base, "#ffffff", 0.1);
  L.paw = whitePaws ? WHITE : point ? L.stripe : tabby ? L.light : L.base;
  L.leg = w === "van" || w === "harlequin" || w === "all" ? WHITE : point ? L.stripe : L.base;
  L.legRing = tabby && !["van", "harlequin", "all"].includes(w) ? L.stripe : null;
  L.ear = w === "all" ? WHITE : point || tabby ? L.stripe : L.pattern === "calico" ? L.patch : L.base;
  if (L.fur === "hairless") {
    L.muzzle = mixColor(L.base, "#ffffff", 0.2);
    L.paw = L.base;
  }
  return L;
}

function paintMarkings(g, w, h, L, area, r) {
  const { pattern } = L;
  g.strokeStyle = L.stripe;
  g.fillStyle = L.stripe;
  g.lineCap = "round";
  if (pattern === "mackerel") {
    for (let x = 18; x < w; x += 36) {
      if (area === "body" && (x < 40 || x > w - 40)) continue;
      g.lineWidth = 11 + r() * 4;
      g.beginPath();
      for (let y = 0; y <= h * 0.78; y += 8) {
        const px = x + Math.sin(y * 0.05 + x) * 7;
        if (y === 0) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.stroke();
    }
  } else if (pattern === "classic") {
    for (const cx of [w * 0.25, w * 0.75]) {
      g.lineWidth = 16;
      g.beginPath();
      g.ellipse(cx, h * 0.44, 62, 46, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(cx, h * 0.44, 22, 16, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 12;
      g.beginPath();
      g.arc(cx, h * 0.44, 96, -2.6, -0.5);
      g.stroke();
    }
    g.lineWidth = 14;
    for (const x of [w * 0.47, w * 0.53]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h * 0.3);
      g.stroke();
    }
  } else if (pattern === "spotted" || pattern === "rosette") {
    for (let i = 0; i < 70; i += 1) {
      const x = r() * w;
      const y = 6 + r() * h * 0.66;
      const rx = 8 + r() * 9;
      const ry = 6 + r() * 6;
      g.fillStyle = L.stripe;
      g.beginPath();
      g.ellipse(x, y, rx, ry, r() * 3, 0, Math.PI * 2);
      g.fill();
      if (pattern === "rosette") {
        g.fillStyle = mixColor(L.base, L.stripe, 0.35);
        g.beginPath();
        g.ellipse(x, y, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (pattern === "ticked") {
    for (let i = 0; i < 2600; i += 1) {
      g.globalAlpha = 0.25;
      g.fillRect(r() * w, r() * h * 0.8, 2, 3);
    }
    g.globalAlpha = 1;
    const grd = g.createLinearGradient(0, 0, 0, h * 0.25);
    grd.addColorStop(0, L.stripe);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h * 0.25);
  } else if (pattern === "smoke") {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.55, "rgba(0,0,0,0)");
    grd.addColorStop(1, L.light);
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  } else if (pattern === "tortie" || pattern === "calico" || pattern === "torbie") {
    const big = pattern === "calico";
    const n = big ? 9 : 60;
    for (let i = 0; i < n; i += 1) {
      g.fillStyle = i % 3 === 2 && !big ? mixColor(L.patch, "#ffffff", 0.25) : L.patch;
      g.beginPath();
      const x = r() * w;
      const y = r() * h * 0.85;
      const rad = big ? 34 + r() * 30 : 8 + r() * 16;
      for (let k = 0; k <= 12; k += 1) {
        const a = (k / 12) * Math.PI * 2;
        const rr = rad * (0.7 + r() * 0.5);
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
      }
      g.fill();
    }
    if (pattern === "torbie") {
      g.globalAlpha = 0.55;
      paintMarkings(g, w, h, { ...L, pattern: "mackerel" }, area, r);
      g.globalAlpha = 1;
    }
  }
}

function lookHeadTexture(L) {
  return canvasTexture(512, 256, (g, w, h) => {
    const r = rng(L.seed);
    const face = w * 0.25;
    g.fillStyle = L.pattern === "point" ? L.light : L.base;
    g.fillRect(0, 0, w, h);
    const tabby = TABBY.includes(L.pattern) || L.pattern === "torbie";
    if (L.pattern === "tortie" || L.pattern === "calico" || L.pattern === "torbie") {
      // Visage partagé en deux couleurs, très typique des écailles de tortue
      g.fillStyle = L.patch;
      g.fillRect(face, 0, w * 0.32, h);
      paintMarkings(g, w, h, L, "head", r);
    } else if (!tabby) paintMarkings(g, w, h, L, "head", r);
    if (tabby) {
      g.strokeStyle = L.stripe;
      g.lineCap = "round";
      g.lineWidth = 9;
      g.beginPath();
      g.moveTo(face - 38, 70);
      g.lineTo(face - 22, 30);
      g.lineTo(face, 62);
      g.lineTo(face + 22, 30);
      g.lineTo(face + 38, 70);
      g.stroke();
      if (L.pattern === "spotted" || L.pattern === "rosette") paintMarkings(g, w, h * 0.5, L, "head", r);
      else if (L.pattern !== "ticked") {
        g.lineWidth = 12;
        for (let x = face + 70; x < face + 440; x += 34) {
          g.beginPath();
          g.moveTo(x % w, 0);
          g.quadraticCurveTo((x + 12) % w, 50, (x + 4) % w, 118);
          g.stroke();
        }
      }
      g.lineWidth = 7;
      for (const side of [-1, 1]) {
        for (const dy of [0, 20]) {
          g.beginPath();
          g.moveTo(face + side * 70, 128 + dy);
          g.lineTo(face + side * 104, 124 + dy * 1.3);
          g.stroke();
        }
      }
    }
    if (L.fur === "hairless") {
      g.strokeStyle = mixColor(L.base, "#5a2a2a", 0.25);
      g.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        g.beginPath();
        g.moveTo(face - 40, 30 + i * 9);
        g.quadraticCurveTo(face, 24 + i * 9, face + 40, 30 + i * 9);
        g.stroke();
      }
    }
    // Zones blanches du visage
    const wv = L.white;
    g.fillStyle = WHITE;
    if (wv === "tuxedo" || wv === "bicolor" || wv === "calico" || L.pattern === "calico") {
      const top = wv === "tuxedo" ? 40 : 18;
      const spread = wv === "tuxedo" ? 90 : 120;
      g.beginPath();
      g.moveTo(face - 7, top);
      g.lineTo(face + 7, top);
      g.quadraticCurveTo(face + 16, 120, face + spread, h);
      g.lineTo(face - spread, h);
      g.quadraticCurveTo(face - 16, 120, face - 7, top);
      g.fill();
    } else if (wv === "van" || wv === "harlequin" || wv === "all") {
      g.fillRect(0, wv === "all" ? 0 : h * 0.3, w, h);
      if (wv !== "all") {
        // Calotte colorée entre les oreilles, coupée par une liste blanche
        g.fillRect(face - 12, 0, 24, h);
      }
    }
    // Masque des colourpoints
    if (L.pattern === "point") {
      const m = g.createRadialGradient(face, h * 0.62, 14, face, h * 0.6, 110);
      m.addColorStop(0, L.stripe);
      m.addColorStop(0.55, L.stripe);
      m.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = m;
      g.fillRect(0, 0, w, h);
      if (wv === "gloves" || wv === "mitts") {
        g.fillStyle = WHITE;
        g.beginPath();
        g.ellipse(face, h, 60, 34, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Menton et museau clairs
    if (tabby || L.pattern === "solid" || L.pattern === "smoke") {
      const chin = g.createRadialGradient(face, h * 0.8, 8, face, h * 0.8, 70);
      chin.addColorStop(0, L.muzzle);
      chin.addColorStop(0.7, L.muzzle);
      chin.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = chin;
      g.fillRect(0, 0, w, h);
    }
  });
}

function lookBodyTexture(L) {
  return canvasTexture(512, 256, (g, w, h) => {
    const r = rng(L.seed + 7);
    const point = L.pattern === "point";
    g.fillStyle = point ? L.light : L.base;
    g.fillRect(0, 0, w, h);
    if (point) {
      // Corps clair qui fonce un peu vers l'arrière
      const back = g.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 200);
      back.addColorStop(0, mixColor(L.light, L.stripe, 0.35));
      back.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = back;
      g.fillRect(0, 0, w, h);
    } else paintMarkings(g, w, h, L, "body", r);
    const tabby = TABBY.includes(L.pattern);
    if (tabby || point || L.pattern === "solid" || L.pattern === "smoke") {
      const belly = g.createLinearGradient(0, h * 0.62, 0, h);
      belly.addColorStop(0, "rgba(0,0,0,0)");
      belly.addColorStop(0.4, L.chest);
      belly.addColorStop(1, L.chest);
      g.fillStyle = belly;
      g.fillRect(0, 0, w, h);
    }
    // Blanc du corps
    g.fillStyle = WHITE;
    const blob = (x, y, rad) => {
      g.beginPath();
      for (let k = 0; k <= 14; k += 1) {
        const a = (k / 14) * Math.PI * 2;
        const rr = rad * (0.75 + r() * 0.4);
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
      }
      g.fill();
    };
    const wv = L.white;
    if (wv === "locket") blob(6, h * 0.62, 26), blob(w - 6, h * 0.62, 26);
    if (wv === "tuxedo") {
      g.fillRect(0, h * 0.68, w, h);
      g.fillRect(0, h * 0.35, 54, h);
      g.fillRect(w - 54, h * 0.35, 54, h);
    }
    if (wv === "bicolor" || L.pattern === "calico") {
      g.fillRect(0, h * 0.52, w, h);
      g.fillRect(0, h * 0.2, 80, h);
      g.fillRect(w - 80, h * 0.2, 80, h);
    }
    if (wv === "van" || wv === "harlequin" || wv === "all") {
      g.fillRect(0, 0, w, h);
      if (wv === "harlequin") {
        g.fillStyle = L.base;
        blob(w * 0.3, h * 0.25, 46);
        blob(w * 0.62, h * 0.18, 40);
        if (L.patch && L.pattern === "tortie") {
          g.fillStyle = L.patch;
          blob(w * 0.8, h * 0.3, 30);
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Tenues
// unlock : shop (boutique), level (récompense de niveau), chest (coffres),
//          secret (cadeau secret : 10 glissades dans un même monde)
// rareté : commun, rare, epique, legendaire, mythique
// ---------------------------------------------------------------------------
export const RARITY = {
  commun: { name: "Commun", color: "#8fd8ff" },
  rare: { name: "Rare", color: "#4d8bff" },
  epique: { name: "Épique", color: "#b45cff" },
  legendaire: { name: "Légendaire", color: "#ffb020" },
  mythique: { name: "Mythique", color: "#ff4fa0" },
};
export const OUTFITS = {
  hat: {
    none: { name: "Aucun", price: 0, icon: "🚫", unlock: "shop", rarity: "commun" },
    noeud: { name: "Nœud rose", price: 120, icon: "🎀", unlock: "shop", rarity: "commun" },
    casquette: { name: "Casquette", price: 200, icon: "🧢", unlock: "shop", rarity: "commun" },
    sorcier: { name: "Chapeau de magicien", price: 700, icon: "🎩", unlock: "shop", rarity: "epique" },
    casque: { name: "Casque audio", price: 900, icon: "🎧", unlock: "shop", rarity: "rare" },
    // Vintage
    beret: { name: "Béret parisien", price: 300, icon: "🇫🇷", unlock: "shop", rarity: "rare", vintage: true },
    canotier: { name: "Canotier en paille", price: 400, icon: "👒", unlock: "shop", rarity: "rare", vintage: true },
    melon: { name: "Chapeau melon", price: 500, icon: "🎩", unlock: "shop", rarity: "rare", vintage: true },
    hautforme: { name: "Haut-de-forme 1900", price: 650, icon: "🎩", unlock: "shop", rarity: "epique", vintage: true },
    // Récompenses de niveau : de plus en plus stylées
    bonnet: { name: "Bonnet à pompon", icon: "🧶", unlock: "level", level: 2, rarity: "commun" },
    cowboy: { name: "Chapeau de cowboy", icon: "🤠", unlock: "level", level: 4, rarity: "rare" },
    pirate: { name: "Tricorne de pirate", icon: "🏴‍☠️", unlock: "level", level: 6, rarity: "epique" },
    hautdore: { name: "Haut-de-forme doré", icon: "✨", unlock: "level", level: 7, rarity: "epique" },
    couronne: { name: "Couronne royale", icon: "👑", unlock: "level", level: 8, rarity: "legendaire" },
    diamants: { name: "Couronne de diamants", icon: "💎", unlock: "level", level: 10, rarity: "legendaire" },
    aureole: { name: "Auréole arc-en-ciel", icon: "🌈", unlock: "level", level: 12, rarity: "mythique" },
    // Récompenses des boss
    toque: { name: "Toque de chef pâtée", icon: "👨‍🍳", unlock: "boss", stage: 2, rarity: "epique" },
    sherif: { name: "Chapeau de shérif", icon: "🤠", unlock: "boss", stage: 3, rarity: "legendaire" },
    champion: { name: "Couronne de championne", icon: "🏆", unlock: "boss", stage: 4, rarity: "mythique" },
    // Coffres
    noel: { name: "Bonnet de Noël", icon: "🎅", unlock: "chest", rarity: "rare" },
    // Événement de Noël
    renne: { name: "Bois de renne", icon: "🦌", unlock: "event", rarity: "legendaire" },
    lapin: { name: "Oreilles de lapin", icon: "🐰", unlock: "chest", rarity: "rare" },
    licorne: { name: "Corne de licorne", icon: "🦄", unlock: "chest", rarity: "epique" },
    // Secrets
    donut: { name: "Chapeau donut", icon: "🍩", unlock: "secret", rarity: "epique" },
    fleurs: { name: "Couronne de fleurs", icon: "🌸", unlock: "secret", rarity: "legendaire" },
  },
  face: {
    none: { name: "Aucune", price: 0, icon: "🚫", unlock: "shop", rarity: "commun" },
    soleil: { name: "Lunettes de soleil", price: 250, icon: "🕶️", unlock: "shop", rarity: "commun" },
    coeur: { name: "Lunettes cœur", price: 400, icon: "😍", unlock: "shop", rarity: "rare" },
    moustache: { name: "Moustache à guidon", price: 250, icon: "🥸", unlock: "shop", rarity: "commun", vintage: true },
    monocle: { name: "Monocle", price: 350, icon: "🧐", unlock: "shop", rarity: "rare", vintage: true },
    aviateur: { name: "Lunettes d'aviateur", price: 450, icon: "🥽", unlock: "shop", rarity: "rare", vintage: true },
    etoiles: { name: "Lunettes étoiles", icon: "🌟", unlock: "level", level: 5, rarity: "rare" },
    lunettes3d: { name: "Lunettes 3D", icon: "🎞️", unlock: "secret", rarity: "epique" },
  },
  neck: {
    none: { name: "Rien", price: 0, icon: "🚫", unlock: "shop", rarity: "commun" },
    noeudpap: { name: "Nœud papillon", price: 200, icon: "🎀", unlock: "shop", rarity: "commun", vintage: true },
    foulard: { name: "Foulard d'aviateur", price: 300, icon: "🧣", unlock: "shop", rarity: "rare", vintage: true },
    bandana: { name: "Bandana", icon: "🔴", unlock: "level", level: 3, rarity: "commun" },
    echarpe: { name: "Écharpe rayée", icon: "🧣", unlock: "chest", rarity: "commun" },
    grelot: { name: "Collier à grelot", icon: "🔔", unlock: "chest", rarity: "commun" },
  },
  back: {
    none: { name: "Rien", price: 0, icon: "🚫", unlock: "shop", rarity: "commun" },
    cape: { name: "Cape de héros", price: 650, icon: "🦸", unlock: "shop", rarity: "rare" },
    ailes: { name: "Ailes de fée", price: 1200, icon: "🧚", unlock: "shop", rarity: "epique" },
    fusee: { name: "Sac fusée", price: 1800, icon: "🚀", unlock: "shop", rarity: "epique" },
    royale: { name: "Cape royale", icon: "👑", unlock: "level", level: 9, rarity: "legendaire" },
  },
};
export const SLOT_NAMES = { hat: "Chapeau", face: "Visage", neck: "Cou", back: "Dos" };

function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}
function hatTexture(paint, w = 256, h = 128) {
  return canvasTexture(w, h, paint, true);
}
function brimmedHat(g, { crown, brim, band, crownH = 0.26, crownR = 0.22, brimR = 0.42, taper = 0.95 }) {
  g.add(mesh(new THREE.CylinderGeometry(crownR * taper, crownR, crownH, 32), crown, 1, [0, crownH / 2, 0]));
  g.add(mesh(new THREE.CylinderGeometry(crownR * taper, crownR * taper, 0.02, 32), crown, 1, [0, crownH, 0]));
  g.add(mesh(new THREE.CylinderGeometry(brimR, brimR, 0.025, 40), brim));
  if (band) g.add(mesh(new THREE.CylinderGeometry(crownR * 1.01, crownR * 1.01, 0.06, 32, 1, true), band, 1, [0, 0.05, 0]));
}
function star(r1, r2, depth, material) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? r2 : r1;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 2 }), material);
}

function buildHat(kind) {
  const g = new THREE.Group();
  g.position.set(0, 0.34, -0.02);
  if (kind === "noeud") {
    const m = candy(0xff5fa2);
    g.add(mesh(GEO.sphere, m, [0.16, 0.11, 0.06], [-0.15, 0, 0]), mesh(GEO.sphere, m, [0.16, 0.11, 0.06], [0.15, 0, 0]), mesh(GEO.sphere, m, 0.07));
    g.position.set(0.18, 0.36, 0.05);
    g.rotation.z = -0.3;
  } else if (kind === "casquette") {
    const m = candy(0x2f7bff);
    g.add(mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m, [0.36, 0.26, 0.36]));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), candy(0xffd23f), [1, 1, 0.8], [0, 0.01, 0.3]));
    g.position.set(0, 0.3, -0.02);
    g.rotation.x = -0.15;
  } else if (kind === "couronne" || kind === "diamants") {
    const gold = candy(kind === "diamants" ? 0xe9f6ff : 0xffc425, { metalness: 0.7, roughness: 0.15 });
    const n = kind === "diamants" ? 8 : 6;
    g.add(mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 32, 1, true), gold));
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      g.add(mesh(GEO.cone, gold, [0.05, kind === "diamants" ? 0.2 : 0.14, 0.05], [Math.cos(a) * 0.22, 0.13, Math.sin(a) * 0.22]));
      const gemMat = kind === "diamants" ? candy(0xffffff, { roughness: 0, emissive: 0x9ee8ff, emissiveIntensity: 0.6, ior: 2.4 }) : candy([0xff3d6e, 0x3dd6ff, 0x7dff6a][i % 3]);
      const gem = new THREE.Mesh(kind === "diamants" ? new THREE.OctahedronGeometry(0.045) : GEO.small, gemMat);
      if (kind !== "diamants") gem.scale.setScalar(0.035);
      gem.position.set(Math.cos(a) * 0.235, 0.02, Math.sin(a) * 0.235);
      g.add(gem);
    }
    if (kind === "diamants") {
      const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), candy(0xff4fa0, { roughness: 0, emissive: 0xff4fa0, emissiveIntensity: 0.5 }));
      big.position.set(0, 0.32, 0);
      big.userData.spin = true;
      g.add(big);
    }
    g.position.set(0, 0.42, 0);
  } else if (kind === "sorcier") {
    const m = candy(0x7b3dff);
    g.add(mesh(GEO.cone, m, [0.26, 0.6, 0.26], [0, 0.3, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 32), m));
    g.add(mesh(GEO.small, candy(0xffe14d, { emissive: 0xffc400, emissiveIntensity: 0.6 }), 0.07, [0, 0.35, 0.17]));
    g.position.set(0, 0.36, -0.02);
    g.rotation.set(-0.12, 0, 0.12);
  } else if (kind === "casque") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 12, 40, Math.PI), candy(0x222233));
    band.position.y = 0.02;
    g.add(band);
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24), candy(0xff3d6e), 1, [s * 0.4, 0.02, 0]).rotateZ(Math.PI / 2));
    g.position.set(0, 0.1, 0);
  } else if (kind === "bonnet" || kind === "noel") {
    const knit = hatTexture((c, W, H) => {
      c.fillStyle = kind === "noel" ? "#e8203a" : "#3d8bff";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(255,255,255,.25)";
      c.lineWidth = 3;
      for (let x = 0; x < W; x += 12) {
        c.beginPath();
        for (let y = 0; y < H; y += 8) c.lineTo(x + (y % 16 ? 4 : 0), y);
        c.stroke();
      }
    });
    knit.repeat.set(3, 1);
    const m = candy(0xffffff, { map: knit, roughness: 0.7, clearcoat: 0.2 });
    const white = candy(0xffffff, { roughness: 0.8, clearcoat: 0.1 });
    if (kind === "noel") {
      const cone = mesh(GEO.cone, m, [0.3, 0.55, 0.3], [0, 0.27, 0]);
      cone.rotation.z = -0.35;
      g.add(cone);
      g.add(mesh(GEO.sphere, white, 0.09, [0.2, 0.5, 0]));
    } else {
      g.add(mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m, [0.38, 0.36, 0.38]));
      g.add(mesh(GEO.sphere, white, 0.1, [0, 0.38, 0]));
    }
    g.add(mesh(GEO.torus, white, [0.36, 0.36, 0.5], [0, 0.02, 0]).rotateX(Math.PI / 2));
    g.position.set(0, 0.28, -0.02);
  } else if (kind === "renne") {
    // Bois de renne en velours, avec un petit grelot doré au milieu
    const wood = candy(0x8a5a2a, { roughness: 0.6, clearcoat: 0.3 });
    for (const side of [-1, 1]) {
      const antler = new THREE.Group();
      const main = mesh(GEO.capsule, wood, [0.045, 0.2, 0.045], [0, 0.2, 0]);
      antler.add(main);
      [[0.13, 0.5], [0.22, 0.75]].forEach(([y, a]) => {
        const tine = mesh(GEO.capsule, wood, [0.035, 0.09, 0.035], [side * 0.07, y + 0.05, 0]);
        tine.rotation.z = -side * a;
        antler.add(tine);
      });
      antler.position.set(side * 0.17, 0, 0);
      antler.rotation.z = -side * 0.35;
      g.add(antler);
    }
    g.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 30), candy(0xe8203a), [1, 1, 1], [0, 0.0, 0]).rotateX(Math.PI / 2));
    g.add(mesh(GEO.sphere, candy(0xffc425, { metalness: 0.8, roughness: 0.15 }), 0.06, [0, 0.03, 0.22]));
    g.position.set(0, 0.3, -0.02);
  } else if (kind === "cowboy") {
    const leather = candy(0x9a5a2a, { roughness: 0.55, clearcoat: 0.4 });
    g.add(mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), leather, [0.27, 0.28, 0.24]));
    const brim = mesh(new THREE.TorusGeometry(0.35, 0.09, 10, 40), leather, [1, 1, 0.35]);
    brim.rotation.x = Math.PI / 2;
    g.add(brim, mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 40), leather));
    g.add(mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.05, 32, 1, true), candy(0x3a2010), 1, [0, 0.04, 0]));
    g.add(at(star(0.05, 0.022, 0.01, candy(0xffd23f, { metalness: 0.8 })), 0, 0.06, 0.27));
    g.position.set(0, 0.32, -0.02);
    g.rotation.x = -0.1;
  } else if (kind === "pirate") {
    const black = candy(0x18141c, { roughness: 0.4 });
    const hat = mesh(GEO.sphere, black, [0.48, 0.2, 0.3], [0, 0.08, 0]);
    g.add(hat, mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 40), candy(0xffc425, { metalness: 0.7 }), [1.15, 0.72, 1], [0, 0.02, 0]).rotateX(Math.PI / 2));
    const skull = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.2),
      new THREE.MeshStandardMaterial({
        transparent: true,
        map: canvasTexture(128, 128, (c) => {
          c.font = "100px serif";
          c.textAlign = "center";
          c.fillStyle = "#fff";
          c.fillText("☠", 64, 100);
        }),
      }),
    );
    skull.position.set(0, 0.12, 0.3);
    g.add(skull);
    g.add(mesh(GEO.sphere, candy(0xff3d6e), [0.05, 0.12, 0.02], [0.3, 0.14, 0.12]));
    g.position.set(0, 0.32, -0.02);
  } else if (kind === "hautforme" || kind === "hautdore") {
    const gold = kind === "hautdore";
    const crown = candy(gold ? 0xffc425 : 0x15121a, gold ? { metalness: 0.75, roughness: 0.15 } : { roughness: 0.3 });
    brimmedHat(g, { crown, brim: crown, band: candy(gold ? 0x7b3dff : 0x8a1a2a), crownH: 0.42, crownR: 0.2, brimR: 0.36, taper: 1.06 });
    if (gold) g.add(at(star(0.06, 0.03, 0.015, candy(0xffffff, { emissive: 0xfff2b0, emissiveIntensity: 0.8 })), 0, 0.16, 0.21));
    g.position.set(0, 0.32, -0.02);
    g.rotation.z = 0.08;
  } else if (kind === "canotier") {
    const straw = hatTexture((c, W, H) => {
      c.fillStyle = "#f2d38a";
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "#c9a24f";
      c.lineWidth = 2;
      for (let y = 0; y < H; y += 6) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y + 3);
        c.stroke();
      }
    });
    const m = candy(0xffffff, { map: straw, roughness: 0.7, clearcoat: 0.2 });
    brimmedHat(g, { crown: m, brim: m, band: candy(0x15121a), crownH: 0.14, crownR: 0.24, brimR: 0.44, taper: 1 });
    g.position.set(0, 0.34, -0.02);
    g.rotation.set(-0.08, 0, -0.12);
  } else if (kind === "beret") {
    const m = candy(0xc4122f, { roughness: 0.75, clearcoat: 0.15 });
    const b = mesh(GEO.sphere, m, [0.36, 0.1, 0.36], [0.05, 0.05, 0]);
    g.add(b, mesh(GEO.capsule, m, [0.015, 0.03, 0.015], [0.05, 0.16, 0]));
    g.position.set(0, 0.33, -0.02);
    g.rotation.z = -0.28;
  } else if (kind === "melon") {
    const m = candy(0x2a1d14, { roughness: 0.35 });
    g.add(mesh(new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), m, [0.25, 0.25, 0.25]));
    const brim = mesh(new THREE.TorusGeometry(0.3, 0.05, 10, 40), m, [1, 1, 0.5]);
    brim.rotation.x = Math.PI / 2;
    g.add(brim, mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 32), m));
    g.add(mesh(new THREE.CylinderGeometry(0.252, 0.252, 0.05, 32, 1, true), candy(0x111111), 1, [0, 0.03, 0]));
    g.position.set(0, 0.33, -0.02);
  } else if (kind === "toque") {
    const white = candy(0xffffff, { roughness: 0.6, clearcoat: 0.3 });
    g.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 28), white, 1, [0, 0.08, 0]));
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      g.add(mesh(GEO.sphere, white, 0.15, [Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15]));
    }
    g.add(mesh(GEO.sphere, white, 0.18, [0, 0.36, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.04, 28, 1, true), candy(0xff5fa2), 1, [0, 0.05, 0]));
    g.position.set(0, 0.33, -0.02);
  } else if (kind === "sherif") {
    const leather = candy(0xe0b45a, { roughness: 0.4, clearcoat: 0.6, metalness: 0.2 });
    g.add(mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), leather, [0.27, 0.3, 0.24]));
    const brim = mesh(new THREE.TorusGeometry(0.37, 0.1, 10, 40), leather, [1, 1, 0.35]);
    brim.rotation.x = Math.PI / 2;
    g.add(brim, mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 40), leather));
    g.add(mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.06, 32, 1, true), candy(0x5a2a10), 1, [0, 0.04, 0]));
    g.add(at(star(0.08, 0.035, 0.015, candy(0xffd23f, { metalness: 0.9, roughness: 0.1, emissive: 0xffa000, emissiveIntensity: 0.3 })), 0, 0.12, 0.25));
    g.position.set(0, 0.32, -0.02);
    g.rotation.x = -0.1;
  } else if (kind === "champion") {
    const gold = candy(0xffc425, { metalness: 0.85, roughness: 0.12, emissive: 0xff9a00, emissiveIntensity: 0.15 });
    g.add(mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.16, 32, 1, true), gold));
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      g.add(at(star(0.07, 0.03, 0.02, gold), Math.cos(a) * 0.24, 0.17, Math.sin(a) * 0.24));
      g.add(mesh(new THREE.OctahedronGeometry(0.04), candy([0xff3d6e, 0x3dd6ff, 0x7dff6a, 0xb48cff, 0xffffff][i], { roughness: 0, emissive: 0xffffff, emissiveIntensity: 0.2 }), 1, [Math.cos(a) * 0.255, 0.04, Math.sin(a) * 0.255]));
    }
    const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), candy(0xff2d55, { roughness: 0, emissive: 0xff2d55, emissiveIntensity: 0.5 }));
    big.position.set(0, 0.36, 0);
    big.userData.spin = true;
    g.add(big);
    g.position.set(0, 0.42, 0);
  } else if (kind === "aureole") {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.045, 14, 48),
      new THREE.MeshStandardMaterial({
        emissive: 0xffffff,
        emissiveIntensity: 1.4,
        emissiveMap: canvasTexture(256, 8, (c, W, H) => {
          const gr = c.createLinearGradient(0, 0, W, 0);
          ["#ff4d6d", "#ff9a3d", "#ffe14d", "#6dff8a", "#4dc3ff", "#9a6dff", "#ff4d6d"].forEach((col, i, a) => gr.addColorStop(i / (a.length - 1), col));
          c.fillStyle = gr;
          c.fillRect(0, 0, W, H);
        }),
        color: 0xffffff,
      }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.castShadow = false;
    g.add(halo);
    g.userData.float = true;
    g.position.set(0, 0.62, -0.02);
  } else if (kind === "lapin") {
    const white = candy(0xffffff);
    const pink = candy(0xffa8c8);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.add(mesh(GEO.capsule, white, [0.08, 0.22, 0.05], [0, 0.3, 0]), mesh(GEO.capsule, pink, [0.045, 0.17, 0.02], [0, 0.3, 0.035]));
      ear.position.set(s * 0.12, 0, 0);
      ear.rotation.z = -s * 0.25;
      g.add(ear);
    }
    g.add(mesh(GEO.torus, candy(0xff5fa2), [0.25, 0.25, 0.25]).rotateX(Math.PI / 2));
    g.position.set(0, 0.3, 0);
  } else if (kind === "licorne") {
    const tex = hatTexture((c, W, H) => {
      c.fillStyle = "#ffe9f6";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#ffb3e6";
      for (let y = -H; y < H * 2; y += 22) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y + 40);
        c.lineTo(W, y + 50);
        c.lineTo(0, y + 10);
        c.fill();
      }
    });
    g.add(mesh(new THREE.ConeGeometry(0.09, 0.42, 24), candy(0xffffff, { map: tex, emissive: 0xffc0ee, emissiveIntensity: 0.3 }), 1, [0, 0.22, 0.14]).rotateX(0.35));
    g.position.set(0, 0.26, 0.05);
  } else if (kind === "donut") {
    g.add(mesh(new THREE.TorusGeometry(0.22, 0.11, 16, 32), candy(0xe8a15a, { roughness: 0.5 }), 1, [0, 0.06, 0]).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.TorusGeometry(0.22, 0.105, 16, 32), candy(0xff7fbf), [1.02, 1.02, 0.6], [0, 0.1, 0]).rotateX(Math.PI / 2));
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const sp = mesh(GEO.capsule, candy([0xffffff, 0xffd23f, 0x3dd6ff, 0x7dff6a][i % 4]), [0.012, 0.02, 0.012], [Math.cos(a) * 0.22, 0.17, Math.sin(a) * 0.22], false);
      sp.rotation.z = Math.PI / 2;
      sp.rotation.y = a * 3;
      g.add(sp);
    }
    g.position.set(0, 0.3, -0.02);
  } else if (kind === "fleurs") {
    const cols = [0xff5fa2, 0xffd23f, 0xffffff, 0xb48cff, 0x5ad1ff];
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      const f = new THREE.Group();
      for (let p = 0; p < 5; p += 1) {
        const pa = (p / 5) * Math.PI * 2;
        f.add(mesh(GEO.sphere, candy(cols[i % cols.length]), [0.04, 0.02, 0.04], [Math.cos(pa) * 0.04, 0, Math.sin(pa) * 0.04], false));
      }
      f.add(mesh(GEO.small, candy(0xffc425), 0.025, [0, 0.01, 0], false));
      f.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
      f.rotation.x = 0.4 * Math.sin(a);
      g.add(f);
    }
    g.add(mesh(GEO.torus, candy(0x3dbb6a), [0.3, 0.3, 0.2]).rotateX(Math.PI / 2));
    g.position.set(0, 0.24, -0.02);
  }
  return g;
}

function buildFace(kind) {
  const g = new THREE.Group();
  g.position.set(0, 0.05, 0.43);
  if (kind === "soleil" || kind === "coeur" || kind === "etoiles" || kind === "lunettes3d") {
    const lensMat = {
      soleil: candy(0x111118, { roughness: 0.05 }),
      coeur: candy(0xff3d7a, { roughness: 0.1, transparent: true, opacity: 0.9 }),
      etoiles: candy(0xffd23f, { roughness: 0.1, transparent: true, opacity: 0.9, emissive: 0xffa000, emissiveIntensity: 0.3 }),
    }[kind];
    for (const s of [-1, 1]) {
      let l;
      if (kind === "coeur") {
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.08);
        shape.bezierCurveTo(-0.16, 0.02, -0.08, 0.14, 0, 0.06);
        shape.bezierCurveTo(0.08, 0.14, 0.16, 0.02, 0, -0.08);
        l = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }), lensMat);
        l.scale.setScalar(1.3);
      } else if (kind === "etoiles") {
        l = star(0.13, 0.06, 0.02, lensMat);
      } else if (kind === "lunettes3d") {
        l = mesh(new THREE.BoxGeometry(0.17, 0.11, 0.02), candy(s < 0 ? 0xff2d3d : 0x2d9bff, { transparent: true, opacity: 0.75, roughness: 0.05 }));
        g.add(mesh(new THREE.BoxGeometry(0.2, 0.14, 0.015), candy(0xffffff), 1, [s * 0.15, 0, -0.012]));
      } else {
        l = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 24), lensMat).rotateX(Math.PI / 2);
      }
      l.position.set(s * 0.15, 0, 0);
      g.add(l);
    }
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.025, 0.025), candy(kind === "soleil" ? 0x222222 : 0xffffff), 1, [0, 0.03, 0]));
  } else if (kind === "monocle") {
    const gold = candy(0xffc425, { metalness: 0.8, roughness: 0.15 });
    g.add(mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 32), gold, 1, [0.16, 0, 0.01]));
    g.add(mesh(new THREE.CircleGeometry(0.095, 32), candy(0xdff6ff, { transparent: true, opacity: 0.35, roughness: 0 }), 1, [0.16, 0, 0.012]));
    const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.24, -0.06, 0), new THREE.Vector3(0.3, -0.2, -0.05), new THREE.Vector3(0.22, -0.35, 0)]), 20, 0.006, 6), gold);
    g.add(chain);
  } else if (kind === "aviateur") {
    const leather = candy(0x7a4a24, { roughness: 0.6 });
    const metal = candy(0xc8ccd6, { metalness: 0.8, roughness: 0.2 });
    const glass = candy(0xffc46a, { transparent: true, opacity: 0.6, roughness: 0 });
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.07, 28), metal, 1, [s * 0.15, 0, 0]).rotateX(Math.PI / 2));
      g.add(mesh(new THREE.CircleGeometry(0.09, 28), glass, 1, [s * 0.15, 0, 0.037]));
    }
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 40, Math.PI), leather, [1, 1, 1.1], [0, 0, -0.32]).rotateX(Math.PI / 2));
    g.position.set(0, 0.2, 0.36);
    g.rotation.x = -0.35;
  } else if (kind === "moustache") {
    const m = candy(0x3a2010, { roughness: 0.5 });
    for (const s of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * 0.09, -0.03, 0.01), new THREE.Vector3(s * 0.17, 0.0, 0), new THREE.Vector3(s * 0.19, 0.05, -0.01)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 8), m));
    }
    g.position.set(0, -0.11, 0.41);
  }
  return g;
}

function buildNeck(kind) {
  const g = new THREE.Group();
  g.position.set(0, 0.25, 0.3);
  if (kind === "noeudpap") {
    const m = candy(0xd6203a);
    for (const s of [-1, 1]) {
      const wing = mesh(GEO.cone, m, [0.09, 0.14, 0.05], [s * 0.07, 0, 0]);
      wing.rotation.z = s * Math.PI / 2;
      g.add(wing);
    }
    g.add(mesh(GEO.sphere, m, [0.04, 0.04, 0.03]));
    g.position.set(0, 0.22, 0.41);
  } else if (kind === "bandana") {
    const tex = canvasTexture(128, 128, (c, W) => {
      c.fillStyle = "#e8203a";
      c.fillRect(0, 0, W, W);
      c.fillStyle = "#fff";
      for (let i = 0; i < 30; i += 1) {
        c.beginPath();
        c.arc((i * 37) % W, (i * 59) % W, 5, 0, Math.PI * 2);
        c.fill();
      }
    });
    const tri = mesh(GEO.cone, candy(0xffffff, { map: tex, roughness: 0.6 }), [0.26, 0.3, 0.06], [0, -0.06, 0.12]);
    tri.rotation.z = Math.PI;
    g.add(tri, mesh(GEO.torus, candy(0xe8203a), [0.3, 0.3, 0.3]).rotateX(Math.PI / 2 - 0.5));
  } else if (kind === "foulard" || kind === "echarpe") {
    const tex = canvasTexture(128, 32, (c, W, H) => {
      c.fillStyle = kind === "foulard" ? "#fff8ee" : "#3dd6a8";
      c.fillRect(0, 0, W, H);
      if (kind === "echarpe") {
        c.fillStyle = "#ff5fa2";
        for (let x = 0; x < W; x += 32) c.fillRect(x, 0, 16, H);
      }
    }, true);
    const m = candy(0xffffff, { map: tex, roughness: 0.75, clearcoat: 0.1 });
    g.add(mesh(new THREE.TorusGeometry(0.28, 0.07, 12, 32), m).rotateX(Math.PI / 2 - 0.5));
    const tail = mesh(GEO.capsule, m, [0.07, 0.16, 0.03], [0.12, -0.14, 0.18]);
    tail.rotation.z = 0.3;
    tail.userData.flutter = true;
    g.add(tail);
  } else if (kind === "grelot") {
    g.add(mesh(GEO.torus, candy(0xff7fae), [0.29, 0.29, 0.25]).rotateX(Math.PI / 2 - 0.5));
    g.add(mesh(GEO.sphere, candy(0xffc425, { metalness: 0.8, roughness: 0.15 }), 0.07, [0, -0.1, 0.2]));
  }
  return g;
}

function buildBack(kind) {
  const g = new THREE.Group();
  if (kind === "cape" || kind === "royale") {
    const geo = new THREE.PlaneGeometry(0.72, 0.8, 6, 8);
    geo.translate(0, -0.4, 0);
    const cape = new THREE.Mesh(geo, candy(kind === "royale" ? 0x6a2bd9 : 0xff2d4a, { side: THREE.DoubleSide }));
    cape.castShadow = true;
    cape.userData.wave = geo;
    cape.userData.base = geo.attributes.position.array.slice();
    g.add(cape);
    if (kind === "royale") {
      const fur = mesh(GEO.capsule, candy(0xffffff, { roughness: 0.9, clearcoat: 0 }), [0.08, 0.32, 0.08], [0, 0, 0]);
      fur.rotation.z = Math.PI / 2;
      g.add(fur);
      for (let i = 0; i < 5; i += 1) g.add(mesh(GEO.small, candy(0x111111), 0.02, [-0.2 + i * 0.1, -0.02, 0.07], false));
    }
    g.position.set(0, 0.72, 0.05);
    g.rotation.x = -1.2;
    g.userData.cape = cape;
  } else if (kind === "ailes") {
    const m = candy(0xbff3ff, { transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const wing = mesh(GEO.sphere, m, [0.32, 0.03, 0.2], [s * 0.3, 0, 0]);
      wing.rotation.z = s * 0.5;
      const small = mesh(GEO.sphere, m, [0.2, 0.03, 0.14], [s * 0.24, -0.12, -0.1]);
      small.rotation.z = s * 0.2;
      g.add(wing, small);
    }
    g.position.set(0, 0.78, 0.05);
    g.userData.wings = true;
  } else if (kind === "fusee") {
    const m = candy(0xdfe4ec, { metalness: 0.5, roughness: 0.2 });
    for (const s of [-1, 1]) {
      g.add(mesh(GEO.capsule, m, [0.09, 0.14, 0.09], [s * 0.12, 0, 0]));
      g.add(mesh(GEO.cone, candy(0xff3d3d), [0.09, 0.12, 0.09], [s * 0.12, 0.2, 0]));
      const flame = mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 1.2, 0.3) }), [0.06, 0.2, 0.06], [s * 0.12, -0.22, 0], false);
      flame.rotation.x = Math.PI;
      flame.userData.flame = true;
      g.add(flame);
    }
    g.position.set(0, 0.74, -0.05);
    g.rotation.x = 0.35;
    g.userData.rocket = true;
  }
  return g;
}

/** Modèle d'un accessoire seul (pour l'ouverture des coffres). */
export function buildItem(slot, kind) {
  const build = { hat: buildHat, face: buildFace, neck: buildNeck, back: buildBack }[slot];
  const g = build(kind);
  g.position.set(0, 0, 0);
  g.rotation.set(0, 0, 0);
  return g;
}

// Poils hérissés : petites pointes sur le dos, la tête et la queue
function buildBristles(material, tail) {
  const spikes = new THREE.Group();
  const geo = new THREE.ConeGeometry(0.045, 0.26, 8);
  for (let i = 0; i < 70; i += 1) {
    const u = Math.random();
    const a = (Math.random() - 0.5) * 2.2;
    const spike = new THREE.Mesh(geo, material);
    // Sur le dos (demi-sphère supérieure du corps)
    const dir = new THREE.Vector3(Math.sin(a) * 0.34, Math.cos(a) * 0.31, (u - 0.5) * 0.8);
    spike.position.copy(dir).add(new THREE.Vector3(0, 0.5, 0));
    spike.lookAt(spike.position.clone().add(new THREE.Vector3(dir.x, dir.y + 0.2, dir.z * 0.4)));
    spike.rotateX(Math.PI / 2);
    spikes.add(spike);
  }
  spikes.scale.setScalar(0.001);
  spikes.visible = false;
  return spikes;
}

/** Bandages et béquilles pour Pucci, après sa défaite (cinématique). */
export function addInjuries(toon) {
  const { legs, head, rig } = toon.userData;
  const bandage = candy(0xf3dfb8, { roughness: 0.85, clearcoat: 0.1 });
  const red = candy(0xff2d4a);
  legs.filter((l) => l.userData.front).forEach((leg) => {
    for (let i = 0; i < 5; i += 1) leg.add(mesh(GEO.torus, bandage, [0.11, 0.11, 0.16], [0, -0.04 - i * 0.055, 0]).rotateX(Math.PI / 2 + (i % 2 ? 0.25 : -0.25)));
    leg.add(mesh(GEO.sphere, bandage, [0.125, 0.095, 0.145], [0, -0.3, 0.03]));
    // Petite croix rouge sur le bandage
    leg.add(mesh(new THREE.BoxGeometry(0.07, 0.022, 0.02), red, 1, [0, -0.14, 0.12], false));
    leg.add(mesh(new THREE.BoxGeometry(0.022, 0.07, 0.02), red, 1, [0, -0.14, 0.12], false));
  });
  // Pansement en croix sur la tête et une bosse
  const plaster = candy(0xffc9a8, { roughness: 0.7 });
  const p1 = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), plaster, 1, [0.14, 0.3, 0.27]);
  p1.rotation.set(-0.6, 0.3, 0.6);
  const p2 = p1.clone();
  p2.rotation.z = -0.4;
  head.add(p1, p2, mesh(GEO.sphere, candy(0x2a2430), 0.07, [-0.12, 0.38, 0.1]));
  // Deux béquilles sous les pattes avant
  const metal = candy(0xc8ccd6, { metalness: 0.7, roughness: 0.25 });
  const pad = candy(0x3a3a48, { roughness: 0.8 });
  const crutches = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Group();
    c.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 10), metal, 1, [0, 0.5, 0]));
    c.add(mesh(GEO.capsule, pad, [0.035, 0.09, 0.035], [0, 1.02, 0]).rotateZ(Math.PI / 2));
    c.add(mesh(GEO.capsule, pad, [0.025, 0.05, 0.025], [0, 0.6, 0.05]).rotateX(Math.PI / 2));
    c.add(mesh(GEO.sphere, candy(0x222222), [0.03, 0.02, 0.03], [0, 0.01, 0]));
    c.position.set(s * 0.34, 0, 0.3);
    c.rotation.z = -s * 0.18;
    c.rotation.x = -0.12;
    rig.add(c);
    crutches.push(c);
  }
  toon.userData.crutches = crutches;
  return toon;
}

export function setBristle(toon, k) {
  toon.userData.bristle = k;
}

// ---------------------------------------------------------------------------
// Construction des personnages
// ---------------------------------------------------------------------------

export function createToon(kind = "kichta", { skin = "caramel", look = null } = {}) {
  const pucci = kind === "pucci";
  const L = look && !pucci ? normalizeLook(look) : null;
  const s = pucci ? null : L ? { base: L.base, light: L.chest, stripe: L.stripe, nose: L.nose, eye: L.eye } : SKINS[skin] || SKINS.caramel;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  const skinGloss = L && L.fur === "hairless" ? { roughness: 0.5, clearcoat: 0.5 } : {};
  const headMat = candy(0xffffff, { map: pucci ? pucciHeadTexture() : L ? lookHeadTexture(L) : kichtaHeadTexture(s), ...skinGloss });
  const bodyMat = candy(0xffffff, { map: pucci ? null : L ? lookBodyTexture(L) : kichtaBodyTexture(s), color: pucci ? 0x1d1822 : 0xffffff, ...skinGloss });
  const baseMat = candy(pucci ? 0x1d1822 : s.base);
  const lightMat = candy(pucci ? 0xfffaf3 : s.light);
  const stripeMat = candy(pucci ? 0x1d1822 : s.stripe);
  const pinkMat = candy(pucci ? 0xff9fb5 : s.nose);
  const innerEar = candy(pucci ? 0xffb3c4 : 0xffb6a0);
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTexture(pucci ? "#d9d23a" : s.eye), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 });
  const eyeMat2 = L && L.eye2 ? new THREE.MeshPhysicalMaterial({ map: eyeTexture(L.eye2), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0 }) : eyeMat;
  // Couleurs de chaque partie pour un chat personnalisé
  const muzzleMat = L ? candy(L.muzzle) : lightMat;
  const pawMat = L ? candy(L.paw) : lightMat;
  const legMat = L ? candy(L.leg) : baseMat;
  const earMat = L ? candy(L.ear) : pucci ? baseMat : stripeMat;
  const ringMat = L ? (L.legRing ? candy(L.legRing) : null) : pucci ? null : stripeMat;
  const long = L && L.fur === "long";

  // Corps : petit et rond
  const body = new THREE.Group();
  body.position.y = 0.5;
  rig.add(body);
  const torso = mesh(GEO.sphere, bodyMat, L && L.body === "slim" ? [0.3, 0.29, 0.44] : long ? [0.37, 0.33, 0.46] : [0.34, 0.31, 0.44]);
  torso.rotation.y = Math.PI / 2;
  body.add(torso);
  // Plastron clair
  body.add(mesh(GEO.sphere, lightMat, [0.25, 0.25, 0.2], [0, -0.04, 0.26]));
  if (L && L.white === "locket") body.add(mesh(GEO.sphere, candy(WHITE), [0.12, 0.12, 0.08], [0, 0.05, 0.38]));
  if (pucci) body.add(mesh(GEO.sphere, lightMat, [0.3, 0.2, 0.36], [0, -0.13, 0]));

  // Tête : grosse, comme une figurine
  const head = new THREE.Group();
  head.position.set(0, 0.44, 0.3);
  body.add(head);
  const flat = L && L.face === "flat";
  head.add(mesh(GEO.sphere, headMat, flat ? [0.46, 0.4, 0.37] : [0.43, 0.39, 0.4]));
  // Joues rebondies et museau clair
  for (const side of [-1, 1]) head.add(mesh(GEO.sphere, muzzleMat, flat ? [0.13, 0.1, 0.08] : [0.12, 0.1, 0.1], [side * 0.09, -0.15, flat ? 0.29 : 0.31]));
  head.add(mesh(GEO.sphere, muzzleMat, [0.1, 0.07, 0.08], [0, -0.23, flat ? 0.25 : 0.27]));
  if (long) {
    // Collerette de poils longs et joues touffues
    const ruff = candy(L.white !== "none" || L.pattern === "point" ? L.chest : mixColor(L.base, L.chest, 0.5));
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 8) * Math.PI - Math.PI / 2;
      body.add(mesh(GEO.sphere, i % 2 ? ruff : bodyMat, [0.15, 0.15, 0.13], [Math.sin(a) * 0.28, 0.17 - Math.abs(Math.sin(a)) * 0.06, 0.24 + Math.cos(a) * 0.08]));
    }
    for (const side of [-1, 1]) head.add(mesh(GEO.sphere, headMat, [0.13, 0.13, 0.13], [side * 0.36, -0.12, 0.08]));
  }
  if (pucci) head.add(mesh(GEO.small, stripeMat, [0.06, 0.04, 0.03], [0, -0.26, 0.31]));
  // Nez
  const nose = mesh(GEO.sphere, pinkMat, [0.055, 0.04, 0.04], flat ? [0, -0.05, 0.37] : [0, -0.07, 0.39]);
  head.add(nose);
  if (pucci) head.add(mesh(GEO.small, stripeMat, [0.022, 0.018, 0.012], [-0.022, -0.065, 0.425]));
  // Yeux
  const eyes = [];
  const lids = [];
  const lidMat = candy(pucci ? 0x1d1822 : s.base);
  const lidGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.16, 0.04, 0.4);
    eye.rotation.y = side * (flat ? 0.2 : 0.28);
    if (flat) eye.position.z = 0.37;
    const ball = mesh(GEO.sphere, side > 0 ? eyeMat2 : eyeMat, [0.075, pucci ? 0.11 : flat ? 0.15 : 0.14, flat ? 0.13 : 0.12], [0, 0, 0], false);
    ball.rotation.y = -Math.PI / 2;
    eye.add(ball);
    head.add(eye);
    eyes.push(eye);
    // Paupière (cachée) : elle descend à moitié quand Kichta prend un air narquois
    const lid = new THREE.Group();
    lid.position.copy(eye.position);
    lid.rotation.y = eye.rotation.y;
    const dome = mesh(lidGeo, lidMat, [0.088, 0.155, 0.135], [0, 0, 0], false);
    lid.add(dome);
    lid.visible = false;
    head.add(lid);
    lids.push(lid);
    if (pucci) {
      // Sourcils froncés de méchante
      const brow = mesh(GEO.capsule, stripeMat, [0.025, 0.11, 0.025], [side * 0.16, 0.2, 0.36], false);
      brow.rotation.z = Math.PI / 2 + side * 0.45;
      head.add(brow);
    }
  }
  // Oreilles larges (comme sur les photos de Kichta)
  const earKind = L ? L.ears : "normal";
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.25, 0.3, -0.02);
    ear.rotation.set(-0.1, side * -0.35, side * -0.38);
    ear.add(mesh(GEO.cone, earMat, [0.16, 0.3, 0.07], [0, 0.1, 0]));
    ear.add(mesh(GEO.cone, innerEar, [0.1, 0.2, 0.03], [0, 0.07, 0.04], false));
    if (earKind === "big") ear.scale.set(1.3, 1.35, 1.2);
    if (earKind === "small") ear.scale.set(0.85, 0.8, 1);
    if (earKind === "fold") {
      // Oreilles pliées vers l'avant (Scottish Fold)
      ear.position.set(side * 0.2, 0.31, 0.06);
      ear.rotation.set(1.05, side * -0.15, side * -0.45);
      ear.scale.set(1.15, 0.72, 1.2);
    }
    if (earKind === "curl") ear.rotation.x = -0.75;
    if (L && L.tufts) ear.add(mesh(GEO.cone, candy(L.stripe), [0.05, 0.08, 0.03], [0, 0.27, 0], false));
    head.add(ear);
  }
  // Moustaches
  const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of L && L.fur === "hairless" ? [] : [-1, 1]) {
    for (const tilt of [-0.12, 0.08]) {
      const w = mesh(GEO.capsule, whiskerMat, [0.006, 0.14, 0.006], [side * 0.26, -0.13, 0.3], false);
      w.rotation.z = Math.PI / 2 + side * tilt;
      w.rotation.y = side * -0.3;
      head.add(w);
    }
  }
  // Sourire
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI), stripeMat);
  smile.position.set(0, -0.15, 0.38);
  smile.rotation.z = Math.PI;
  head.add(smile);

  if (pucci) {
    const collar = new THREE.Mesh(GEO.torus, candy(0xff7fae));
    collar.scale.set(0.27, 0.27, 0.27);
    collar.position.set(0, 0.2, 0.24);
    collar.rotation.x = Math.PI / 2 - 0.6;
    body.add(collar);
    const tag = new THREE.Group();
    tag.position.set(0, 0.08, 0.47);
    tag.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24), candy(0x111111)).rotateX(Math.PI / 2));
    tag.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 20), candy(0xffffff)).rotateX(Math.PI / 2));
    body.add(tag);
  }

  // Pattes courtes
  const legs = [];
  for (const [x, z, front] of [[-0.17, 0.24, true], [0.17, 0.24, true], [-0.17, -0.22, false], [0.17, -0.22, false]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.36, z);
    leg.add(mesh(GEO.capsule, legMat, long ? [0.1, 0.14, 0.1] : [0.09, 0.14, 0.09], [0, -0.14, 0]));
    leg.add(mesh(GEO.sphere, pawMat, [0.11, 0.08, 0.13], [0, -0.3, 0.03]));
    if (ringMat) leg.add(mesh(GEO.torus, ringMat, [0.09, 0.09, 0.09], [0, -0.12, 0]).rotateX(Math.PI / 2));
    leg.userData = { front, side: Math.sign(x) };
    rig.add(leg);
    legs.push(leg);
  }

  // Queue annelée, au bout noir (ou selon la robe du chat personnalisé)
  const tail = [];
  const tailMats = [];
  if (L) {
    const tabby = TABBY.includes(L.pattern) || L.pattern === "torbie";
    const tailBase = L.pattern === "point" ? candy(L.stripe) : L.white === "all" ? candy(WHITE) : baseMat;
    const tailPatch = candy(L.pattern === "calico" || L.pattern === "tortie" || L.pattern === "torbie" ? L.patch : L.stripe);
    for (let i = 0; i < 9; i += 1) {
      let m = tailBase;
      if (tabby) m = i >= 7 || i % 2 ? stripeMat : baseMat;
      else if (L.pattern === "calico" || L.pattern === "tortie") m = (i * 7 + L.seed) % 3 === 0 ? tailPatch : tailBase;
      else if (L.pattern === "smoke" && i < 2) m = candy(L.light);
      if (L.white === "van" && !tabby && L.pattern !== "calico") m = baseMat;
      tailMats.push(m);
    }
  }
  let parent = rig;
  const tailBase = new THREE.Group();
  tailBase.position.set(0, 0.6, -0.4);
  rig.add(tailBase);
  parent = tailBase;
  for (let i = 0; i < 9; i += 1) {
    const seg = i === 0 ? tailBase : new THREE.Group();
    if (i > 0) {
      seg.position.y = 0.1;
      parent.add(seg);
    }
    const r = ((pucci ? 0.09 : 0.08) - i * 0.004) * (long ? 1.7 : L && L.fur === "hairless" ? 0.7 : 1);
    const mat = pucci ? baseMat : L ? tailMats[i] : i >= 7 ? stripeMat : i % 2 ? stripeMat : baseMat;
    seg.add(mesh(GEO.sphere, mat, [r, 0.08, r], [0, 0.05, 0]));
    tail.push(seg);
    parent = seg;
  }

  // Accessoires
  const slots = { hat: new THREE.Group(), face: new THREE.Group(), neck: new THREE.Group(), back: new THREE.Group() };
  head.add(slots.hat, slots.face);
  body.add(slots.neck);
  rig.add(slots.back);

  // Poils hérissés (quand Kichta et Pucci se font face)
  const bristles = buildBristles(pucci ? baseMat : stripeMat);
  rig.add(bristles);

  if (L && L.body === "big") body.scale.setScalar(1.07);
  root.userData = { rig, body, head, legs, tail, eyes, lids, smile, slots, kind, bristles, bristle: 0, flash: [bodyMat, headMat, baseMat], outfit: {}, look: L };
  return root;
}

export function dressToon(toon, { hat = "none", face = "none", neck = "none", back = "none" } = {}) {
  const { slots, outfit } = toon.userData;
  const set = (slot, kind, build) => {
    if (outfit[slot] === kind) return;
    outfit[slot] = kind;
    slots[slot].clear();
    if (kind !== "none") slots[slot].add(build(kind));
  };
  set("hat", hat, buildHat);
  set("face", face, buildFace);
  set("neck", neck, buildNeck);
  set("back", back, buildBack);
}

/**
 * pose : run, jump, fall, slide, idle, hit, fly, win, throw
 */
export function animateToon(toon, t, pose = "run", { speed = 1, lean = 0, squash = 0, flip = 0, smug = 0 } = {}) {
  const { rig, body, head, legs, tail, eyes, lids, smile, slots, bristles } = toon.userData;
  const bristle = toon.userData.bristle || 0;
  const stride = t * 13 * speed;
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  rig.scale.set(1, 1, 1);
  body.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);

  legs.forEach((leg) => {
    const { front, side } = leg.userData;
    let a = 0;
    if (pose === "run") a = Math.sin(stride + (front ? 0 : Math.PI) + (side > 0 ? 0.5 : 0)) * 1.0;
    else if (pose === "jump") a = front ? -1.2 : 1.0;
    else if (pose === "fall") a = front ? -0.5 : 0.6;
    else if (pose === "slide") a = front ? -1.45 : 1.45;
    else if (pose === "fly") a = Math.sin(t * 6 + side) * 0.35 + (front ? -0.4 : 0.4);
    else if (pose === "hit") a = Math.sin(t * 25 + side) * 0.6;
    else if (pose === "win") a = front ? -1.3 + Math.sin(t * 14) * 0.4 : 0.3;
    else if (pose === "throw") a = front && side > 0 ? -2.2 + Math.sin(t * 10) * 0.5 : 0;
    else if (pose === "hiss") a = front ? -0.35 : 0.3;
    else a = Math.sin(t * 2 + side) * 0.05;
    leg.rotation.x = a;
  });

  if (pose === "run") {
    rig.position.y = Math.abs(Math.sin(stride)) * 0.1;
    body.rotation.x = Math.sin(stride * 2) * 0.05;
    head.rotation.x = -Math.sin(stride * 2) * 0.06;
  } else if (pose === "jump") {
    body.rotation.x = -0.3;
    head.rotation.x = 0.2;
  } else if (pose === "fall") {
    body.rotation.x = 0.2;
  } else if (pose === "slide") {
    rig.scale.set(1.12, 0.62, 1.1);
    rig.position.y = -0.05;
    head.rotation.x = -0.3;
  } else if (pose === "hit") {
    rig.rotation.z = 1.4;
    rig.position.y = 0.25;
  } else if (pose === "win") {
    rig.position.y = Math.abs(Math.sin(t * 7)) * 0.4;
    head.rotation.z = Math.sin(t * 7) * 0.2;
  } else if (pose === "fly") {
    body.rotation.x = -0.15;
    rig.position.y = Math.sin(t * 3) * 0.08;
  } else {
    body.rotation.x = Math.sin(t * 1.6) * 0.02;
    head.rotation.y = Math.sin(t * 0.7) * 0.3;
    head.rotation.x = Math.sin(t * 1.1) * 0.06;
  }
  if (pose === "hiss") {
    // Dos rond, tête en avant, tremblements
    rig.position.y = 0.04 + Math.sin(t * 60) * 0.01;
    body.rotation.x = -0.12;
    head.rotation.x = 0.25;
  }
  rig.rotation.z += lean;
  if (flip) rig.rotation.x = -flip * Math.PI * 2;
  if (squash) rig.scale.multiply(new THREE.Vector3(1 + squash * 0.25, 1 - squash * 0.3, 1 + squash * 0.25));

  // Clignement des yeux
  const blink = (t + 2) % 3.7 < 0.12 ? 0.15 : 1;
  eyes.forEach((e) => (e.scale.y = blink));
  // Air narquois : yeux mi-clos en biais, sourire en coin, menton levé
  eyes.forEach((e, i) => {
    e.rotation.z = smug * (i === 0 ? -0.25 : 0.25);
    if (smug) e.scale.y = 1 - smug * 0.15;
  });
  (lids || []).forEach((l, i) => {
    l.visible = smug > 0.05;
    // Paupière qui descend en biais (plus basse côté extérieur)
    l.rotation.x = 0.2 - (1 - smug) * 1.4;
    l.rotation.z = smug * (i === 0 ? -0.3 : 0.3);
  });
  if (smile) {
    smile.rotation.z = Math.PI + smug * 0.45;
    smile.position.x = smug * 0.03;
    smile.scale.set(1 + smug * 0.7, 1 + smug * 0.3, 1 + smug * 0.5);
  }
  if (smug) {
    head.rotation.x -= smug * 0.18;
    head.rotation.z += smug * 0.14;
  }

  tail.forEach((seg, i) => {
    const wave = pose === "run" ? 9 : 3.5;
    seg.rotation.x = i === 0 ? (pose === "slide" ? -1.2 : -0.9) : 0.18 + Math.sin(t * wave - i * 0.6) * 0.06;
    seg.rotation.z = Math.sin(t * wave * 0.7 - i * 0.5) * 0.16;
  });

  // Poils hérissés et queue gonflée
  bristles.visible = bristle > 0.01;
  if (bristles.visible) bristles.scale.setScalar(bristle * (1 + Math.sin(t * 50) * 0.04));
  tail.forEach((seg, i) => {
    const puff = 1 + bristle * 0.9;
    seg.children[0].scale.x = seg.children[0].scale.z = (seg.userData.r || (seg.userData.r = seg.children[0].scale.x)) * puff;
    if (bristle > 0.3) seg.rotation.x = i === 0 ? -1.4 : 0.03;
  });

  // Accessoires animés
  slots.hat.children.forEach((g) => {
    if (g.userData.float) g.position.y = 0.62 + Math.sin(t * 2.5) * 0.03;
    g.traverse((o) => o.userData.spin && (o.rotation.y = t * 2));
  });
  slots.neck.children.forEach((g) => g.traverse((o) => o.userData.flutter && (o.rotation.z = 0.3 + Math.sin(t * 14) * 0.25)));
  slots.back.children.forEach((g) => {
    if (g.userData.cape) {
      const cape = g.userData.cape;
      const pos = cape.userData.wave.attributes.position;
      const base = cape.userData.base;
      for (let i = 0; i < pos.count; i += 1) {
        const y = base[i * 3 + 1];
        pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 12 + y * 8) * 0.06 * -y;
      }
      pos.needsUpdate = true;
      g.rotation.x = pose === "run" || pose === "fly" ? -1.25 - Math.sin(t * 8) * 0.08 : -0.3;
    }
    if (g.userData.wings) g.children.forEach((w, i) => (w.rotation.y = Math.sin(t * 20) * 0.5 * (i < 2 ? 1 : -1)));
    if (g.userData.rocket) g.children.forEach((c) => c.userData.flame && c.scale.set(0.06, 0.15 + Math.random() * 0.15, 0.06));
  });
}

export function flashToon(toon, amount) {
  for (const m of toon.userData.flash) {
    m.emissive = m.emissive || new THREE.Color();
    m.emissive.setRGB(amount, amount * 0.25, amount * 0.25);
  }
}
