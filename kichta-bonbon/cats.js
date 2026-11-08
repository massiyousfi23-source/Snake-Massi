// Catalogue « Mon chat » : les robes et les races les plus courantes,
// pour retrouver le chat qui ressemble le plus à la photo du joueur.
// Chaque fiche décrit un look (dessiné par toons.js) et des attributs pour la
// reconnaissance : motif, couleur dominante, longueur du poil, oreilles, visage, yeux.
//
// Motifs : solid (uni), mackerel (tigré), classic (tabby marbré), spotted (tacheté),
// rosette (bengal), ticked (abyssin), smoke (fumé), tortie (écaille), calico, torbie, point (colourpoint)
// Blanc : none, locket (médaillon), mitts (chaussettes), gloves (gants), tuxedo (smoking),
// bicolor, harlequin (arlequin), van, all (tout blanc)

const C = {
  white: "#fbf8f3",
  black: "#2a2430",
  blue: "#8c94a8",
  blueDark: "#5d6578",
  choco: "#6b3f2a",
  lilac: "#bfaeb9",
  red: "#e8863a",
  redDark: "#b8541c",
  cream: "#f1cf9a",
  creamDark: "#d9a865",
  brownTabby: "#a7774a",
  brownStripe: "#3e2a1c",
  silver: "#cfd3da",
  silverStripe: "#2e2e36",
  seal: "#4a3226",
  fawn: "#efe0c6",
  ruddy: "#c07a43",
  golden: "#e2a95a",
  sable: "#5a3a26",
};
const EYE = { green: "#8fbf3a", gold: "#e8b52a", copper: "#e07a1f", blue: "#5aa8ff", hazel: "#b5a43a", olive: "#a9b23a", aqua: "#5fd6c4" };
const NOSE = { pink: "#f2a0a0", brick: "#d96a55", dark: "#3a3036", grey: "#8a7f8f", rose: "#e98c9a" };

/**
 * color : couleur dominante (pour la reconnaissance)
 * breed : race reconnaissable à l'œil (null pour les chats de gouttière)
 */
export const CATS = [
  // --- Tigrés, les chats de gouttière les plus courants ---
  { id: "tigre-brun", name: "Tigré brun", breed: null, color: "brown", look: { pattern: "mackerel", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.green, nose: NOSE.brick } },
  { id: "tigre-roux", name: "Tigré roux", breed: null, color: "orange", look: { pattern: "mackerel", base: C.red, stripe: C.redDark, light: "#fbe2c2", eye: EYE.gold, nose: NOSE.rose } },
  { id: "tabby-roux", name: "Roux marbré", breed: null, color: "orange", look: { pattern: "classic", base: C.red, stripe: C.redDark, light: "#fbe2c2", eye: EYE.copper, nose: NOSE.rose } },
  { id: "tigre-gris", name: "Tigré gris", breed: null, color: "grey", look: { pattern: "mackerel", base: "#9a9aa0", stripe: "#3b3a40", light: "#e4e2e0", eye: EYE.green, nose: NOSE.brick } },
  { id: "tabby-argent", name: "Tabby argenté", breed: "american-shorthair", color: "silver", look: { pattern: "classic", base: C.silver, stripe: C.silverStripe, light: "#f1f2f4", eye: EYE.green, nose: NOSE.brick } },
  { id: "tabby-brun", name: "Brun marbré", breed: null, color: "brown", look: { pattern: "classic", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.copper, nose: NOSE.brick } },
  { id: "tigre-creme", name: "Tigré crème", breed: null, color: "cream", look: { pattern: "mackerel", base: C.cream, stripe: C.creamDark, light: "#fff3e0", eye: EYE.gold, nose: NOSE.pink } },
  { id: "tigre-roux-blanc", name: "Roux et blanc", breed: null, color: "orange", look: { pattern: "mackerel", white: "bicolor", base: C.red, stripe: C.redDark, light: "#fbe2c2", eye: EYE.gold, nose: NOSE.pink } },
  { id: "tigre-brun-blanc", name: "Tigré brun et blanc", breed: null, color: "brown", look: { pattern: "mackerel", white: "bicolor", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.green, nose: NOSE.pink } },
  { id: "tigre-gris-blanc", name: "Tigré gris et blanc", breed: null, color: "grey", look: { pattern: "mackerel", white: "bicolor", base: "#9a9aa0", stripe: "#3b3a40", light: "#e4e2e0", eye: EYE.green, nose: NOSE.pink } },
  { id: "tigre-chaussettes", name: "Tigré aux chaussettes", breed: null, color: "brown", look: { pattern: "mackerel", white: "mitts", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.hazel, nose: NOSE.brick } },
  // --- Unis ---
  { id: "noir", name: "Noir", breed: null, color: "black", look: { pattern: "solid", base: C.black, eye: EYE.gold, nose: NOSE.dark } },
  { id: "bombay", name: "Bombay", breed: "bombay", color: "black", look: { pattern: "solid", base: "#1c1820", eye: EYE.copper, nose: NOSE.dark, body: "slim" } },
  { id: "noir-medaillon", name: "Noir au médaillon", breed: null, color: "black", look: { pattern: "solid", white: "locket", base: C.black, eye: EYE.green, nose: NOSE.dark } },
  { id: "blanc", name: "Blanc aux yeux bleus", breed: null, color: "white", look: { pattern: "solid", white: "all", base: C.white, eye: EYE.blue, nose: NOSE.pink } },
  { id: "angora-turc", name: "Angora turc", breed: "turkish-angora", color: "white", look: { pattern: "solid", white: "all", base: C.white, eye: EYE.blue, eye2: EYE.gold, nose: NOSE.pink, fur: "long", body: "slim" } },
  { id: "gris-bleu", name: "Gris uni", breed: null, color: "grey", look: { pattern: "solid", base: C.blue, eye: EYE.gold, nose: NOSE.grey } },
  { id: "chartreux", name: "Chartreux", breed: "chartreux", color: "grey", look: { pattern: "solid", base: "#8a93a6", eye: EYE.copper, nose: NOSE.grey, body: "big" } },
  { id: "british", name: "British Shorthair", breed: "british-shorthair", color: "grey", look: { pattern: "solid", base: "#8f98aa", eye: EYE.copper, nose: NOSE.grey, ears: "small", body: "big" } },
  { id: "bleu-russe", name: "Bleu russe", breed: "russian-blue", color: "grey", look: { pattern: "solid", base: "#9aa3b6", eye: EYE.green, nose: NOSE.grey, ears: "big", body: "slim" } },
  { id: "havane", name: "Havane", breed: "havana", color: "chocolate", look: { pattern: "solid", base: C.choco, eye: EYE.green, nose: NOSE.brick, ears: "big", body: "slim" } },
  { id: "burmese", name: "Burmese", breed: "burmese", color: "brown", look: { pattern: "solid", base: C.sable, light: "#8a6040", eye: EYE.gold, nose: NOSE.dark } },
  { id: "lilas", name: "Lilas", breed: null, color: "lilac", look: { pattern: "solid", base: C.lilac, eye: EYE.gold, nose: NOSE.rose } },
  { id: "creme", name: "Crème uni", breed: null, color: "cream", look: { pattern: "solid", base: C.cream, eye: EYE.copper, nose: NOSE.pink } },
  { id: "fume", name: "Noir fumé", breed: null, color: "black", look: { pattern: "smoke", base: "#2e2834", light: "#b9b6c0", eye: EYE.gold, nose: NOSE.dark } },
  // --- Noir et blanc ---
  { id: "smoking", name: "Smoking", breed: null, color: "black", look: { pattern: "solid", white: "tuxedo", base: C.black, eye: EYE.gold, nose: NOSE.pink } },
  { id: "pie-noir", name: "Noir et blanc", breed: null, color: "black", look: { pattern: "solid", white: "bicolor", base: C.black, eye: EYE.green, nose: NOSE.pink } },
  { id: "arlequin", name: "Arlequin", breed: null, color: "white", look: { pattern: "solid", white: "harlequin", base: C.black, eye: EYE.gold, nose: NOSE.pink } },
  { id: "bleu-blanc", name: "Gris et blanc", breed: null, color: "grey", look: { pattern: "solid", white: "bicolor", base: C.blue, eye: EYE.gold, nose: NOSE.pink } },
  { id: "van-turc", name: "Van turc", breed: "turkish-van", color: "white", look: { pattern: "solid", white: "van", base: C.red, eye: EYE.copper, nose: NOSE.pink, fur: "long" } },
  // --- Écailles et calicos (presque toujours des femelles) ---
  { id: "ecaille", name: "Écaille de tortue", breed: null, color: "tortie", look: { pattern: "tortie", base: C.black, patch: C.red, eye: EYE.gold, nose: NOSE.dark } },
  { id: "calico", name: "Calico", breed: null, color: "calico", look: { pattern: "calico", white: "bicolor", base: C.black, patch: C.red, eye: EYE.gold, nose: NOSE.pink } },
  { id: "calico-dilue", name: "Calico pastel", breed: null, color: "calico", look: { pattern: "calico", white: "bicolor", base: C.blue, patch: C.cream, eye: EYE.gold, nose: NOSE.pink } },
  { id: "torbie", name: "Torbie", breed: null, color: "tortie", look: { pattern: "torbie", base: C.brownTabby, stripe: C.brownStripe, patch: C.red, light: "#ead6b8", eye: EYE.green, nose: NOSE.brick } },
  // --- Colourpoints ---
  { id: "siamois", name: "Siamois", breed: "siamese", color: "point", look: { pattern: "point", light: C.fawn, base: C.fawn, stripe: C.seal, eye: EYE.blue, nose: NOSE.dark, ears: "big", body: "slim" } },
  { id: "siamois-bleu", name: "Siamois blue point", breed: "siamese", color: "point", look: { pattern: "point", light: "#eef0f4", base: "#eef0f4", stripe: C.blueDark, eye: EYE.blue, nose: NOSE.grey, ears: "big", body: "slim" } },
  { id: "ragdoll", name: "Ragdoll", breed: "ragdoll", color: "point", look: { pattern: "point", white: "mitts", light: "#f4ead9", base: "#f4ead9", stripe: "#5a4234", eye: EYE.blue, nose: NOSE.dark, fur: "long", body: "big" } },
  { id: "birman", name: "Sacré de Birmanie", breed: "birman", color: "point", look: { pattern: "point", white: "gloves", light: "#f3e2c4", base: "#f3e2c4", stripe: C.seal, eye: EYE.blue, nose: NOSE.dark, fur: "long" } },
  { id: "himalayen", name: "Himalayen", breed: "himalayan", color: "point", look: { pattern: "point", light: "#f7efe6", base: "#f7efe6", stripe: "#d1782e", eye: EYE.blue, nose: NOSE.pink, fur: "long", face: "flat", ears: "small" } },
  // --- Poils longs et visages plats ---
  { id: "persan-blanc", name: "Persan blanc", breed: "persian", color: "white", look: { pattern: "solid", white: "all", base: C.white, eye: EYE.copper, nose: NOSE.pink, fur: "long", face: "flat", ears: "small" } },
  { id: "persan-chinchilla", name: "Persan chinchilla", breed: "persian", color: "silver", look: { pattern: "smoke", base: "#d8dbe2", light: "#f6f6f8", eye: EYE.aqua, nose: NOSE.brick, fur: "long", face: "flat", ears: "small" } },
  { id: "persan-roux", name: "Persan roux", breed: "persian", color: "orange", look: { pattern: "solid", base: "#e58b3e", eye: EYE.copper, nose: NOSE.rose, fur: "long", face: "flat", ears: "small" } },
  { id: "exotic", name: "Exotic Shorthair", breed: "exotic", color: "cream", look: { pattern: "solid", base: "#eccb98", eye: EYE.copper, nose: NOSE.pink, face: "flat", ears: "small", body: "big" } },
  { id: "maine-coon", name: "Maine Coon", breed: "maine-coon", color: "brown", look: { pattern: "classic", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", white: "locket", eye: EYE.gold, nose: NOSE.brick, fur: "long", body: "big", tufts: true, ears: "big" } },
  { id: "maine-coon-roux", name: "Maine Coon roux", breed: "maine-coon", color: "orange", look: { pattern: "classic", base: C.red, stripe: C.redDark, light: "#fbe2c2", eye: EYE.gold, nose: NOSE.rose, fur: "long", body: "big", tufts: true, ears: "big" } },
  { id: "maine-coon-noir", name: "Maine Coon noir", breed: "maine-coon", color: "black", look: { pattern: "smoke", base: C.black, light: "#8e8a96", eye: EYE.gold, nose: NOSE.dark, fur: "long", body: "big", tufts: true, ears: "big" } },
  { id: "norvegien", name: "Chat des forêts norvégiennes", breed: "norwegian-forest", color: "brown", look: { pattern: "mackerel", white: "bicolor", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.green, nose: NOSE.pink, fur: "long", body: "big", tufts: true } },
  { id: "siberien", name: "Sibérien", breed: "siberian", color: "brown", look: { pattern: "mackerel", base: "#b08a5e", stripe: "#4a3424", light: "#efe2cc", eye: EYE.gold, nose: NOSE.brick, fur: "long", body: "big" } },
  { id: "angora-noir", name: "Poil long noir", breed: null, color: "black", look: { pattern: "solid", base: C.black, eye: EYE.gold, nose: NOSE.dark, fur: "long" } },
  { id: "poil-long-gris", name: "Poil long gris et blanc", breed: null, color: "grey", look: { pattern: "solid", white: "bicolor", base: C.blue, eye: EYE.gold, nose: NOSE.pink, fur: "long" } },
  // --- Tachetés et tiquetés ---
  { id: "bengal", name: "Bengal", breed: "bengal", color: "golden", look: { pattern: "rosette", base: C.golden, stripe: "#3a2414", light: "#f7e6c4", eye: EYE.green, nose: NOSE.brick, body: "slim" } },
  { id: "mau", name: "Mau égyptien", breed: "egyptian-mau", color: "silver", look: { pattern: "spotted", base: C.silver, stripe: C.silverStripe, light: "#f1f2f4", eye: EYE.green, nose: NOSE.brick, body: "slim" } },
  { id: "abyssin", name: "Abyssin", breed: "abyssinian", color: "golden", look: { pattern: "ticked", base: C.ruddy, stripe: "#5a3018", light: "#f0c89a", eye: EYE.gold, nose: NOSE.brick, ears: "big", body: "slim" } },
  // --- Oreilles et poils particuliers ---
  { id: "scottish", name: "Scottish Fold", breed: "scottish-fold", color: "grey", look: { pattern: "solid", base: "#9aa1b2", eye: EYE.copper, nose: NOSE.grey, ears: "fold" } },
  { id: "scottish-tabby", name: "Scottish Fold tigré", breed: "scottish-fold", color: "silver", look: { pattern: "classic", base: C.silver, stripe: C.silverStripe, light: "#f1f2f4", eye: EYE.copper, nose: NOSE.brick, ears: "fold" } },
  { id: "american-curl", name: "American Curl", breed: "american-curl", color: "brown", look: { pattern: "mackerel", white: "bicolor", base: C.brownTabby, stripe: C.brownStripe, light: "#ead6b8", eye: EYE.gold, nose: NOSE.pink, ears: "curl" } },
  { id: "sphynx", name: "Sphynx", breed: "sphynx", color: "pink", look: { pattern: "solid", base: "#f0c2b2", eye: EYE.aqua, nose: NOSE.rose, fur: "hairless", ears: "big", body: "slim" } },
  { id: "sphynx-gris", name: "Sphynx gris", breed: "sphynx", color: "grey", look: { pattern: "solid", white: "bicolor", base: "#a49aa0", eye: EYE.gold, nose: NOSE.rose, fur: "hairless", ears: "big", body: "slim" } },
  { id: "devon-rex", name: "Devon Rex", breed: "devon-rex", color: "cream", look: { pattern: "solid", base: "#e3c8a2", eye: EYE.gold, nose: NOSE.pink, ears: "big", body: "slim" } },
];

/** Kichta elle-même, toujours proposée en premier choix « par défaut ». */
export const KICHTA = { id: "kichta", name: "Kichta", breed: null, color: "brown", look: null };

/** Attributs utilisés par la reconnaissance, déduits du look. */
export function catAttributes(cat) {
  const L = cat.look;
  let pattern = L.pattern;
  if (L.white === "tuxedo") pattern = "tuxedo";
  else if (L.white === "van") pattern = "van";
  else if (L.white === "harlequin") pattern = "harlequin";
  else if (L.white === "all") pattern = "white";
  else if (L.white === "bicolor" && pattern === "solid") pattern = "bicolor";
  else if (L.white === "bicolor" && pattern === "mackerel") pattern = "tabby-white";
  if (pattern === "torbie") pattern = "tortie";
  if (pattern === "rosette") pattern = "spotted";
  if (L.fur === "hairless") pattern = "hairless";
  return {
    pattern,
    color: cat.color,
    fur: L.fur || "short",
    ears: L.ears === "fold" ? "fold" : "normal",
    face: L.face || "normal",
    eye: Object.entries(EYE).find(([, v]) => v === L.eye)?.[0] || "gold",
    breed: cat.breed,
  };
}
