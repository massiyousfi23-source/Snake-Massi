// Mondes des niveaux : chaque niveau se déroule dans l'environnement de son boss.
// - Appartement (Pucci) : arbres à chat, pelote qui se balance, canapés…
// - Jardin (Rocky) : niches, os géants, fil à linge, pneu-balançoire…
// - Forêt (Pikou) : sapins, troncs, pommes de pin…
// - Forêt fleurie (Chacha) : feuilles géantes croquées, fleurs, pommes, cocons…
// - Ruelle (Moumouche) : poubelles qui débordent, bennes, réverbères…
// Toujours en style « bonbon » : formes rondes et vernies.
import * as THREE from "../vendor/three.module.min.js";
import { BIOMES, LANE } from "./world.js?v=b8";
import { candy, canvasTexture } from "./toons.js?v=b8";
import { createBone, createApple, createTrashBag } from "./bosses.js?v=b8";

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
const ball = (r, mat, x = 0, y = 0, z = 0) => mesh(new THREE.SphereGeometry(r, 24, 16), mat, x, y, z);
const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z);

// --- Textures ------------------------------------------------------------------------------
function lanes(g, w, h, color = "rgba(255,255,255,.7)") {
  g.fillStyle = color;
  for (let y = 0; y < h; y += 64) {
    g.fillRect(w / 3 - 3, y, 6, 30);
    g.fillRect((2 * w) / 3 - 3, y, 6, 30);
  }
}
const TRACKS = {
  parquet(g, w, h) {
    for (let x = 0; x < w; x += 32) {
      for (let y = (x / 32) % 2 ? -40 : 0; y < h; y += 96) {
        const s = 200 + Math.floor(Math.random() * 30);
        g.fillStyle = `rgb(${s},${s - 70},${s - 130})`;
        g.fillRect(x + 1, y + 1, 30, 94);
      }
    }
    lanes(g, w, h, "rgba(255,240,220,.55)");
  },
  paving(g, w, h) {
    g.fillStyle = "#c9b48c";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 42) {
      for (let x = (y / 42) % 2 ? -26 : 0; x < w; x += 52) {
        g.fillStyle = Math.random() < 0.5 ? "#e6d3ab" : "#dcc69a";
        g.beginPath();
        g.roundRect(x + 3, y + 3, 46, 36, 10);
        g.fill();
      }
    }
  },
  dirt(g, w, h) {
    g.fillStyle = "#a8774a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i += 1) {
      g.fillStyle = pick(["#8a5f38", "#c49563", "#b88a5a", "#d6b07c"]);
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 14; i += 1) {
      g.fillStyle = pick(["#ff9a3d", "#ffd23f", "#e05a2a", "#7bc84a"]);
      g.save();
      g.translate(Math.random() * w, Math.random() * h);
      g.rotate(Math.random() * 6);
      g.beginPath();
      g.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    lanes(g, w, h, "rgba(255,240,200,.35)");
  },
  asphalt(g, w, h) {
    g.fillStyle = "#3c3c48";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i += 1) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    g.strokeStyle = "rgba(20,20,26,.7)";
    g.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      g.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k += 1) g.lineTo((x += (Math.random() - 0.5) * 40), (y += Math.random() * 30));
      g.stroke();
    }
    lanes(g, w, h, "rgba(255,210,63,.75)");
  },
};
const WALLS = {
  appart(g, w, h) {
    // Papier peint rayé, plinthe, fenêtre et tableau
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = (x / 32) % 2 ? "#ffd9e8" : "#ffe9f1";
      g.fillRect(x, 0, 32, h);
    }
    g.fillStyle = "#fff6ee";
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = "#ffffff";
    g.fillRect(70, 40, 130, 120);
    g.fillStyle = "#a8ddff";
    g.fillRect(80, 50, 52, 48);
    g.fillRect(138, 50, 52, 48);
    g.fillRect(80, 104, 52, 46);
    g.fillRect(138, 104, 52, 46);
    g.fillStyle = "#ffbf1f";
    g.fillRect(320, 60, 110, 82);
    g.fillStyle = "#7fd8c2";
    g.fillRect(330, 70, 90, 62);
    g.font = "44px serif";
    g.fillText("🐟", 350, 118);
  },
  ruelle(g, w, h) {
    // Briques, fenêtres (certaines allumées), tuyau
    g.fillStyle = "#8a4a52";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
        g.fillStyle = pick(["#a85a5e", "#9a4e54", "#b8676a"]);
        g.fillRect(x + 1, y + 1, 30, 14);
      }
    }
    for (const [x, lit] of [[60, true], [220, false], [380, true]]) {
      g.fillStyle = "#3a2a3a";
      g.fillRect(x - 6, 50, 92, 108);
      g.fillStyle = lit ? "#ffd27a" : "#2a3550";
      g.fillRect(x, 56, 80, 96);
      g.fillStyle = "#3a2a3a";
      g.fillRect(x + 37, 56, 6, 96);
    }
    g.fillStyle = "#7a8090";
    g.fillRect(180, 0, 10, h);
  },
};

// --- Décors ---------------------------------------------------------------------------------
const C = {
  wood: candy(0xb8743e, { roughness: 0.5 }),
  dark: candy(0x3a2416),
  white: candy(0xffffff),
  leaf: candy(0x5ccc3a),
  leaf2: candy(0x3fae4a),
  pine: candy(0x2f8a4a),
  metal: candy(0xa8b0bc, { metalness: 0.6, roughness: 0.25 }),
  bulb: new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 2.2 }),
};
const colorful = () => candy(pick([0xff5fa2, 0x5ad1ff, 0xffd23f, 0x7dff9a, 0xb48cff, 0xff8a3d]));
function faceTrack(g) {
  g.userData.faceTrack = true;
  return g;
}
const DECOR = {
  // Appartement
  sofa() {
    const g = new THREE.Group();
    const m = colorful();
    g.add(box(3, 0.7, 1.3, m), box(3, 1.2, 0.35, m, 0, 0, -0.5));
    for (const x of [-1.4, 1.4]) g.add(box(0.35, 1, 1.3, m, x));
    for (const x of [-0.7, 0.7]) g.add(ball(0.42, C.white, x, 0.95, 0.05));
    g.children.at(-1).scale.set(1, 0.6, 1);
    g.children.at(-2).scale.set(1, 0.6, 1);
    return faceTrack(g);
  },
  floorlamp() {
    const g = new THREE.Group();
    g.add(cyl(0.4, 0.45, 0.1, C.white), cyl(0.05, 0.05, 3.2, C.metal));
    const shade = mesh(new THREE.CylinderGeometry(0.4, 0.7, 0.7, 24, 1, true), candy(0xffe066, { side: THREE.DoubleSide, emissive: 0xffc04a, emissiveIntensity: 0.4 }), 0, 3.3, 0);
    g.add(shade, ball(0.18, C.bulb, 0, 3.1, 0));
    return g;
  },
  plant() {
    const g = new THREE.Group();
    g.add(cyl(0.55, 0.4, 0.8, candy(0xe07a4a)));
    for (let i = 0; i < 9; i += 1) {
      const l = ball(0.5, i % 2 ? C.leaf : C.leaf2, 0, 1.2, 0);
      const a = (i / 9) * Math.PI * 2;
      l.scale.set(0.35, 1.4, 0.12);
      l.position.set(Math.cos(a) * 0.4, 1.5, Math.sin(a) * 0.4);
      l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
      g.add(l);
    }
    return g;
  },
  bookshelf() {
    const g = new THREE.Group();
    g.add(box(2.4, 3.6, 0.7, C.white));
    for (let s = 0; s < 3; s += 1) {
      let x = -1.05;
      while (x < 1.0) {
        const w = 0.12 + Math.random() * 0.12;
        const h = 0.6 + Math.random() * 0.35;
        g.add(box(w, h, 0.5, colorful(), x + w / 2, 0.25 + s * 1.15, 0.12));
        x += w + 0.02;
      }
    }
    return faceTrack(g);
  },
  catbed() {
    const g = new THREE.Group();
    const m = colorful();
    g.add(mesh(new THREE.TorusGeometry(0.8, 0.35, 14, 30), m, 0, 0.35, 0).rotateX(Math.PI / 2));
    g.add(cyl(0.8, 0.8, 0.2, C.white));
    g.add(ball(0.22, candy(0xff5fa2), 0.4, 0.5, 0.2));
    return g;
  },
  rug() {
    const g = new THREE.Group();
    const tex = canvasTexture(128, 128, (c, w) => {
      const cols = ["#ff9ccf", "#ffffff", "#7fd8c2", "#ffd23f"];
      for (let r = 6; r > 0; r -= 1) {
        c.fillStyle = cols[r % cols.length];
        c.beginPath();
        c.arc(w / 2, w / 2, (r / 6) * (w / 2), 0, Math.PI * 2);
        c.fill();
      }
    });
    const m = mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0, 0.02, 0);
    m.rotation.x = -Math.PI / 2;
    g.add(m);
    return g;
  },
  // Jardin
  niche() {
    const g = new THREE.Group();
    const m = candy(pick([0xff7a5c, 0x5ad1ff, 0xffd23f]));
    g.add(box(2, 1.6, 2, m));
    const roof = mesh(new THREE.ConeGeometry(1.75, 1.1, 4), candy(0xc84a3a), 0, 2.15, 0);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const door = mesh(new THREE.CircleGeometry(0.5, 24, 0, Math.PI), C.dark, 0, 0.5, 1.01);
    g.add(door, box(0.5, 1, 0.02, C.dark, 0, 0, 1.01));
    g.add(box(0.8, 0.22, 0.03, C.white, 0, 1.25, 1.02));
    return faceTrack(g);
  },
  flowers() {
    const g = new THREE.Group();
    g.add(cyl(1.1, 1.2, 0.25, candy(0x6b3a1a)));
    for (let i = 0; i < 9; i += 1) {
      const f = new THREE.Group();
      f.add(cyl(0.03, 0.03, 0.8, C.leaf2));
      const petal = colorful();
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2;
        f.add(ball(0.11, petal, Math.cos(a) * 0.12, 0.85, Math.sin(a) * 0.12));
      }
      f.add(ball(0.08, candy(0xffd23f), 0, 0.87, 0));
      f.position.set((Math.random() - 0.5) * 1.6, 0.2, (Math.random() - 0.5) * 1.6);
      g.add(f);
    }
    return g;
  },
  gardentree() {
    const g = new THREE.Group();
    g.add(cyl(0.3, 0.4, 2.2, C.wood));
    for (const [x, y, z, r] of [[0, 3, 0, 1.4], [0.9, 2.6, 0.3, 1], [-0.8, 2.7, -0.2, 1.1]]) g.add(ball(r, C.leaf, x, y, z));
    for (let i = 0; i < 5; i += 1) g.add(ball(0.16, candy(0xff3b3b), (Math.random() - 0.5) * 2, 2.4 + Math.random() * 1.2, 0.9));
    return g;
  },
  bush() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i += 1) g.add(ball(0.6 + Math.random() * 0.4, i % 2 ? C.leaf : C.leaf2, (i - 1.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.5));
    return g;
  },
  gnome() {
    const g = new THREE.Group();
    g.add(cyl(0.35, 0.45, 0.8, candy(0x3d7bff)));
    g.add(ball(0.3, candy(0xffd2b0), 0, 1.0, 0));
    g.add(mesh(new THREE.ConeGeometry(0.32, 0.8, 20), candy(0xff3b3b), 0, 1.5, 0));
    const beard = ball(0.3, C.white, 0, 0.85, 0.18);
    beard.scale.set(1, 1.2, 0.6);
    g.add(beard);
    return faceTrack(g);
  },
  fence() {
    const g = new THREE.Group();
    const m = C.white;
    for (let i = 0; i < 7; i += 1) {
      g.add(box(0.22, 1.3, 0.1, m, -1.8 + i * 0.6));
      g.add(mesh(new THREE.ConeGeometry(0.155, 0.25, 4), m, -1.8 + i * 0.6, 1.42, 0).rotateY(Math.PI / 4));
    }
    g.add(box(4, 0.12, 0.08, m, 0, 0.35, 0.08), box(4, 0.12, 0.08, m, 0, 0.95, 0.08));
    return faceTrack(g);
  },
  bones() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const b = createBone();
      b.position.set((i - 1) * 0.5, 0.15 + i * 0.12, (Math.random() - 0.5) * 0.4);
      b.rotation.y = Math.random() * 3;
      g.add(b);
    }
    return g;
  },
  // Forêt
  sapin() {
    const g = new THREE.Group();
    g.add(cyl(0.25, 0.35, 1.2, C.wood));
    for (let i = 0; i < 3; i += 1) g.add(mesh(new THREE.ConeGeometry(1.5 - i * 0.35, 1.8, 18), C.pine, 0, 1.8 + i * 1.1, 0));
    return g;
  },
  chene() {
    const g = new THREE.Group();
    g.add(cyl(0.45, 0.6, 2.6, C.wood));
    for (const [x, y, z, r] of [[0, 3.6, 0, 1.8], [1.3, 3.1, 0.4, 1.2], [-1.2, 3.2, -0.3, 1.3], [0.2, 4.4, 0.2, 1.2]]) g.add(ball(r, C.leaf2, x, y, z));
    return g;
  },
  fern() {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const l = ball(0.6, C.leaf, 0, 0.5, 0);
      const a = (i / 7) * Math.PI * 2;
      l.scale.set(0.25, 0.06, 1);
      l.position.set(Math.cos(a) * 0.5, 0.45, Math.sin(a) * 0.5);
      l.rotation.set(0.5, -a + Math.PI / 2, 0);
      g.add(l);
    }
    return g;
  },
  souche() {
    const g = new THREE.Group();
    g.add(cyl(0.7, 0.85, 0.8, C.wood));
    const top = mesh(new THREE.CircleGeometry(0.7, 24), candy(0xf0c48a), 0, 0.81, 0);
    top.rotation.x = -Math.PI / 2;
    g.add(top);
    return g;
  },
  rocher() {
    const g = new THREE.Group();
    const r = mesh(new THREE.DodecahedronGeometry(0.9, 1), candy(0xb8b8c8, { roughness: 0.5 }), 0, 0.5, 0);
    r.scale.set(1.3, 0.8, 1);
    g.add(r);
    return g;
  },
  // Forêt fleurie de Chacha
  feuille() {
    const g = new THREE.Group();
    const tex = canvasTexture(128, 128, (c, w) => {
      c.fillStyle = "#6fd34a";
      c.fillRect(0, 0, w, w);
      c.strokeStyle = "#3fae4a";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(w / 2, 0);
      c.lineTo(w / 2, w);
      for (let y = 10; y < w; y += 20) {
        c.moveTo(w / 2, y);
        c.lineTo(10, y - 18);
        c.moveTo(w / 2, y);
        c.lineTo(w - 10, y - 18);
      }
      c.stroke();
      // Morsures de chenille
      c.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 4; i += 1) {
        c.beginPath();
        c.arc(i % 2 ? w - 4 : 4, 20 + i * 28, 16, 0, Math.PI * 2);
        c.fill();
      }
    });
    const leaf = mesh(new THREE.CircleGeometry(1.4, 24), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 }), 0, 1.6, 0);
    leaf.scale.set(0.7, 1.2, 1);
    leaf.rotation.set(-0.3, 0, 0.2);
    g.add(leaf, cyl(0.05, 0.06, 0.9, C.leaf2));
    return faceTrack(g);
  },
  marguerite() {
    const g = new THREE.Group();
    const h = 2 + Math.random() * 1.5;
    g.add(cyl(0.07, 0.09, h, C.leaf2));
    const head = new THREE.Group();
    head.position.y = h;
    for (let p = 0; p < 12; p += 1) {
      const a = (p / 12) * Math.PI * 2;
      const petal = ball(0.4, C.white, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
      petal.scale.set(1, 0.12, 0.4);
      petal.rotation.y = -a;
      head.add(petal);
    }
    head.add(ball(0.32, candy(0xffd23f), 0, 0.05, 0));
    head.rotation.x = 0.5;
    g.add(head);
    return g;
  },
  pomme() {
    const g = new THREE.Group();
    const a = createApple();
    a.scale.setScalar(1.6);
    g.add(a);
    return g;
  },
  cocon() {
    const g = new THREE.Group();
    g.add(cyl(0.04, 0.04, 3.4, C.wood));
    const c = ball(0.3, candy(0xfff6e0, { roughness: 0.6 }), 0.15, 2.2, 0);
    c.scale.set(1, 1.8, 1);
    g.add(c, box(1.2, 0.08, 0.08, C.wood, 0.4, 3.3, 0));
    return g;
  },
  // Ruelle de Moumouche
  poubelle() {
    const g = new THREE.Group();
    const can = candy(pick([0x5a9a6a, 0x7a8090, 0x3d7bff]), { metalness: 0.3, roughness: 0.3 });
    g.add(cyl(0.55, 0.5, 1.3, can));
    const lid = cyl(0.6, 0.6, 0.08, can, 0.25, 1.35, 0);
    lid.rotation.z = -0.5;
    g.add(lid);
    // Les déchets débordent
    for (let i = 0; i < 6; i += 1) g.add(ball(0.18 + Math.random() * 0.12, candy(pick([0x2a2a36, 0xffd23f, 0x8a5a2a, 0xff7a5c, 0xffffff])), (Math.random() - 0.5) * 0.6, 1.35 + Math.random() * 0.25, (Math.random() - 0.5) * 0.6));
    const peel = ball(0.2, candy(0xffd23f), 0.7, 0.08, 0.3);
    peel.scale.set(1.6, 0.3, 0.6);
    g.add(peel);
    return g;
  },
  sacs() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const b = createTrashBag();
      b.position.set((i - 1) * 0.8, 0, (Math.random() - 0.5) * 0.6);
      b.scale.setScalar(0.8 + Math.random() * 0.3);
      g.add(b);
    }
    return g;
  },
  caisses() {
    const g = new THREE.Group();
    const m = candy(0xc89a5a, { roughness: 0.6 });
    g.add(box(1, 1, 1, m), box(1, 1, 1, m, 0.2, 1, 0.1), box(0.9, 0.9, 0.9, candy(0xd8b07a), 1.1, 0, -0.2));
    return g;
  },
  reverbere() {
    const g = new THREE.Group();
    g.add(cyl(0.08, 0.12, 4, candy(0x2a2a36)));
    g.add(box(0.5, 0.6, 0.5, candy(0x2a2a36), 0, 4, 0), box(0.38, 0.45, 0.38, C.bulb, 0, 4.07, 0));
    return g;
  },
  flaque() {
    const g = new THREE.Group();
    const p = mesh(new THREE.CircleGeometry(1.2, 24), candy(0x5a6a9a, { roughness: 0.02, metalness: 0.4 }), 0, 0.02, 0);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(1.4, 1, 1);
    g.add(p);
    return g;
  },
};

// --- Obstacles à thème --------------------------------------------------------------------
// Les « wagons » (obstacles hauts sur lesquels on peut monter) font 2,95 de haut.
const TOP = 2.95;
function sisal() {
  return canvasTexture(64, 64, (c, w) => {
    c.fillStyle = "#d8b07a";
    c.fillRect(0, 0, w, w);
    c.strokeStyle = "#a87a44";
    c.lineWidth = 3;
    for (let y = 0; y < w; y += 6) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y + 3);
      c.stroke();
    }
  }, true);
}
function rampMesh(mat) {
  const len = 5;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(0, TOP);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: false });
  geo.translate(0, 0, -0.95);
  geo.rotateY(-Math.PI / 2);
  const g = new THREE.Group();
  g.add(mesh(geo, mat));
  g.userData.length = len;
  return g;
}
function pendulum(frameMat, ballObj) {
  const g = new THREE.Group();
  for (const x of [-LANE * 1.5 - 0.6, LANE * 1.5 + 0.6]) g.add(cyl(0.16, 0.2, 4, frameMat, x));
  const bar = box(LANE * 3 + 1.6, 0.25, 0.25, frameMat, 0, 3.85, 0);
  g.add(bar);
  const rope = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), candy(0xffffff), 0, 0, 0);
  rope.castShadow = false;
  g.add(rope);
  g.add(ballObj);
  g.userData.ball = ballObj;
  g.userData.rope = rope;
  g.userData.top = 3.9;
  return g;
}
const OBSTACLES = {
  // Appartement
  books() {
    const g = new THREE.Group();
    let y = 0;
    for (let i = 0; i < 4; i += 1) {
      const h = 0.22 + Math.random() * 0.06;
      const b = box(1.9 - i * 0.12, h, 1.1, colorful(), (Math.random() - 0.5) * 0.15, y);
      b.rotation.y = (Math.random() - 0.5) * 0.2;
      g.add(b);
      y += h;
    }
    return g;
  },
  table() {
    const g = new THREE.Group();
    const m = candy(0xff9ccf);
    g.add(box(2.1, 0.22, 1.2, m, 0, 1.45));
    for (const x of [-0.9, 0.9]) for (const z of [-0.45, 0.45]) g.add(cyl(0.07, 0.07, 1.45, C.white, x, 0, z));
    g.add(box(2.15, 0.5, 0.05, candy(0xffffff), 0, 1.0, 0.6));
    g.add(cyl(0.12, 0.1, 0.35, candy(0x5ad1ff), 0.5, 1.67, 0), ball(0.18, candy(0xffd23f), -0.5, 1.82, 0));
    return g;
  },
  cattree() {
    // Arbre à chat : poteaux en sisal, plateformes moelleuses, jouet qui pend
    const g = new THREE.Group();
    const s = candy(0xffffff, { map: sisal(), roughness: 0.8, clearcoat: 0 });
    const plush = candy(0xc8a8ff, { roughness: 0.75, clearcoat: 0.1 });
    g.add(box(1.9, 0.25, 3.4, plush));
    for (const [x, z] of [[-0.6, -1], [0.6, 1], [0.6, -1]]) g.add(cyl(0.16, 0.16, TOP - 0.25, s, x, 0.25, z));
    g.add(box(1.9, 0.25, 3.4, plush, 0, TOP - 0.25));
    g.add(box(1.2, 0.2, 1.2, plush, -0.35, 1.4, 0.9));
    const bed = mesh(new THREE.TorusGeometry(0.45, 0.18, 10, 24), plush, 0.3, TOP + 0.1, -0.6);
    bed.rotation.x = Math.PI / 2;
    g.add(bed, ball(0.16, candy(0xff5fa2), -0.6, 1.0, 1.2));
    g.add(cyl(0.01, 0.01, 0.6, C.white, -0.6, 1.15, 1.2));
    g.userData.length = 3.4;
    return g;
  },
  scratchramp() {
    return rampMesh(candy(0xffffff, { map: sisal(), roughness: 0.8, clearcoat: 0 }));
  },
  vacuum() {
    // Robot aspirateur qui fonce sur Kichta
    const g = new THREE.Group();
    g.add(cyl(0.75, 0.75, 0.3, candy(0x2a2a36, { metalness: 0.3 })));
    g.add(cyl(0.3, 0.3, 0.08, candy(0x5ad1ff, { emissive: 0x5ad1ff, emissiveIntensity: 0.8 }), 0, 0.3, 0));
    g.add(box(0.5, 0.06, 0.1, candy(0xff3d4d, { emissive: 0xff3d4d, emissiveIntensity: 1 }), 0, 0.18, 0.72));
    return g;
  },
  "pendulum-appart"() {
    // Pelote de laine suspendue
    const tex = canvasTexture(128, 64, (c, w, h) => {
      c.fillStyle = "#ff7fb5";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#ffb3d6";
      c.lineWidth = 3;
      for (let i = -h; i < w; i += 9) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + h, h);
        c.stroke();
      }
    });
    return pendulum(candy(0xc8a8ff), ball(0.55, candy(0xffffff, { map: tex, roughness: 0.7, clearcoat: 0.1 })));
  },
  // Jardin
  bonebar() {
    const g = new THREE.Group();
    const b = createBone();
    b.scale.setScalar(2.3);
    b.position.y = 0.45;
    g.add(b);
    return g;
  },
  clothesline() {
    const g = new THREE.Group();
    for (const x of [-1, 1]) g.add(cyl(0.07, 0.07, 2.6, C.wood, x));
    const line = mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.1, 6), C.white, 0, 2.4, 0);
    line.rotation.z = Math.PI / 2;
    g.add(line);
    // Linge qui pend : chaussettes, t-shirt, serviette
    for (const [x, w, h, col] of [[-0.6, 0.5, 0.9, 0xff5fa2], [0.05, 0.7, 1.1, 0x5ad1ff], [0.65, 0.35, 0.8, 0xffd23f]]) g.add(box(w, h, 0.05, candy(col, { roughness: 0.8, clearcoat: 0, side: THREE.DoubleSide }), x, 2.35 - h));
    return g;
  },
  niche() {
    const g = DECOR.niche();
    g.scale.set(0.95, 1.4, 1.5);
    g.userData.faceTrack = false;
    g.userData.length = 3;
    return g;
  },
  plank() {
    return rampMesh(candy(0xd8a46a, { roughness: 0.6 }));
  },
  mower() {
    // Tondeuse qui fonce
    const g = new THREE.Group();
    g.add(box(1.1, 0.4, 1.2, candy(0xff3d4d), 0, 0.15));
    for (const x of [-0.55, 0.55]) for (const z of [-0.45, 0.45]) g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16), C.dark, x, 0.17, z).rotateZ(Math.PI / 2));
    g.add(cyl(0.04, 0.04, 1, C.metal, 0, 0.5, -0.55).rotateX(-0.5));
    return g;
  },
  "pendulum-jardin"() {
    const tire = mesh(new THREE.TorusGeometry(0.45, 0.18, 12, 28), candy(0x2a2a36, { roughness: 0.4 }), 0, 0, 0);
    return pendulum(C.wood, tire);
  },
  // Forêt
  log() {
    const g = new THREE.Group();
    const m = mesh(new THREE.CylinderGeometry(0.42, 0.42, 2, 20), C.wood, 0, 0.42, 0);
    m.rotation.z = Math.PI / 2;
    g.add(m);
    for (const x of [-1.01, 1.01]) {
      const ring = mesh(new THREE.CircleGeometry(0.42, 20), candy(0xf0c48a), x, 0.42, 0);
      ring.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(ring);
    }
    g.add(ball(0.12, candy(0xff3b3b), 0.4, 0.88, 0.1));
    return g;
  },
  branch() {
    const g = new THREE.Group();
    for (const x of [-1, 1]) g.add(cyl(0.3, 0.35, 1.3, C.wood, x));
    const b = mesh(new THREE.CylinderGeometry(0.26, 0.3, 2.6, 14), C.wood, 0, 1.8, 0);
    b.rotation.z = Math.PI / 2 + 0.04;
    g.add(b);
    for (let i = 0; i < 6; i += 1) g.add(ball(0.32, C.leaf, -1 + i * 0.4, 2.1 + (i % 2) * 0.15, 0));
    return g;
  },
  stump() {
    const g = new THREE.Group();
    g.add(cyl(0.98, 1.05, TOP, C.wood));
    const top = mesh(new THREE.CircleGeometry(0.98, 28), candy(0xf0c48a), 0, TOP + 0.01, 0);
    top.rotation.x = -Math.PI / 2;
    g.add(top, ball(0.25, candy(0xff4d4d), -0.5, TOP + 0.15, 0.3), ball(0.18, C.white, -0.35, TOP + 0.3, 0.3));
    g.scale.z = 1.6;
    g.userData.length = 3.2;
    return g;
  },
  logramp() {
    return rampMesh(candy(0xa8774a, { roughness: 0.6 }));
  },
  rollinglog() {
    const g = new THREE.Group();
    const m = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.9, 18), C.wood, 0, 0.35, 0);
    m.rotation.z = Math.PI / 2;
    g.add(m);
    g.userData.roll = m;
    return g;
  },
  "pendulum-foret"() {
    const cone = new THREE.Group();
    for (let i = 0; i < 5; i += 1) cone.add(mesh(new THREE.ConeGeometry(0.45 - i * 0.07, 0.35, 10), candy(0x8a5a2a), 0, -0.3 + i * 0.16, 0));
    return pendulum(C.wood, cone);
  },
  // Ruelle
  trashpile() {
    const g = new THREE.Group();
    const can = DECOR.poubelle();
    can.rotation.z = Math.PI / 2;
    can.position.set(-0.3, 0.55, 0);
    can.scale.setScalar(0.85);
    g.add(can);
    const bag = createTrashBag();
    bag.position.x = 0.6;
    bag.scale.setScalar(0.9);
    g.add(bag);
    return g;
  },
  pipe() {
    const g = new THREE.Group();
    for (const x of [-1, 1]) g.add(cyl(0.12, 0.12, 2.4, C.metal, x));
    const p = mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.3, 16), candy(0x7a8090, { metalness: 0.5, roughness: 0.3 }), 0, 1.95, 0);
    p.rotation.z = Math.PI / 2;
    g.add(p);
    g.add(ball(0.12, candy(0x6fd0ff, { transparent: true, opacity: 0.8 }), 0.4, 1.6, 0));
    return g;
  },
  dumpster() {
    const g = new THREE.Group();
    const m = candy(0x3d8a5a, { metalness: 0.3, roughness: 0.35 });
    g.add(box(1.95, TOP - 0.25, 4, m, 0, 0.1));
    g.add(box(2.05, 0.15, 4.1, candy(0x2a6a42), 0, TOP - 0.15));
    for (let i = 0; i < 5; i += 1) g.add(ball(0.3, candy(pick([0x2a2a36, 0xffd23f, 0xff7a5c])), (Math.random() - 0.5) * 1.2, TOP + 0.1, (Math.random() - 0.5) * 3));
    for (const x of [-0.8, 0.8]) for (const z of [-1.7, 1.7]) g.add(ball(0.12, C.dark, x, 0.1, z));
    g.userData.length = 4;
    return g;
  },
  boxramp() {
    return rampMesh(candy(0xc89a5a, { roughness: 0.6 }));
  },
  rollingcan() {
    const g = new THREE.Group();
    const m = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 18), candy(0x7a8090, { metalness: 0.4, roughness: 0.3 }), 0, 0.45, 0);
    m.rotation.z = Math.PI / 2;
    g.add(m);
    g.userData.roll = m;
    return g;
  },
  "pendulum-ruelle"() {
    const lamp = new THREE.Group();
    lamp.add(mesh(new THREE.ConeGeometry(0.5, 0.45, 18, 1, true), candy(0x2a2a36, { side: THREE.DoubleSide }), 0, 0.1, 0));
    lamp.add(ball(0.2, C.bulb, 0, -0.05, 0));
    return pendulum(candy(0x4a4a56, { metalness: 0.4 }), lamp);
  },
  // Monde bonbon par défaut
  pendulum() {
    const tex = canvasTexture(128, 64, (c, w, h) => {
      ["#ff3d7a", "#ffffff", "#ffd23f", "#ffffff"].forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect((i * w) / 4, 0, w / 4, h);
      });
    });
    return pendulum(candy(0xffffff), ball(0.55, candy(0xffffff, { map: tex })));
  },
  rusher() {
    const g = new THREE.Group();
    g.add(ball(0.5, candy(0xff5fa2), 0, 0.5, 0));
    return g;
  },
};

// --- Les mondes ------------------------------------------------------------------------------
const commun = { theme: true, noRails: true };
export const THEMES = {
  appart: {
    ...commun,
    id: "appart",
    name: "L'appartement de Pucci",
    icon: "🛋️",
    skyTop: 0xffe9d6,
    skyBottom: 0xfff6ee,
    fog: 0xffe9dc,
    ground: 0xd9a06a,
    track: "#c8875a",
    track2: "#d99a6a",
    paintTrack: TRACKS.parquet,
    paintWall: WALLS.appart,
    decor: ["sofa", "floorlamp", "plant", "bookshelf", "catbed", "rug", "plant", "sofa"],
    obstacles: { barrier: "books", high: "table", wagon: "cattree", ramp: "scratchramp", rusher: "vacuum", pendulum: "pendulum-appart" },
  },
  jardin: {
    ...commun,
    id: "jardin",
    name: "Le jardin de Rocky",
    icon: "🦴",
    skyTop: 0x5ab8ff,
    skyBottom: 0xd8f1ff,
    fog: 0xcdeaff,
    ground: 0x7ed957,
    track: "#d9c39a",
    track2: "#e6d3ab",
    paintTrack: TRACKS.paving,
    decor: ["niche", "flowers", "gardentree", "bush", "gnome", "fence", "bones", "fence", "flowers"],
    obstacles: { barrier: "bonebar", high: "clothesline", wagon: "niche", ramp: "plank", rusher: "mower", pendulum: "pendulum-jardin" },
  },
  foret: {
    ...commun,
    id: "foret",
    name: "La forêt de Pikou",
    icon: "🌲",
    skyTop: 0x7fc8ff,
    skyBottom: 0xd8f5d0,
    fog: 0xbfe8c8,
    ground: 0x4f9a3a,
    track: "#a8774a",
    track2: "#b88a5a",
    paintTrack: TRACKS.dirt,
    decor: ["sapin", "chene", "sapin", "fern", "souche", "rocher", "mushroom", "sapin"],
    obstacles: { barrier: "log", high: "branch", wagon: "stump", ramp: "logramp", rusher: "rollinglog", pendulum: "pendulum-foret" },
  },
  foret2: {
    ...commun,
    id: "foret2",
    name: "La forêt fleurie de Chacha",
    icon: "🐛",
    skyTop: 0x9fd8ff,
    skyBottom: 0xfff0c8,
    fog: 0xf0f0c0,
    ground: 0x6fc84a,
    track: "#a8774a",
    track2: "#b88a5a",
    paintTrack: TRACKS.dirt,
    decor: ["feuille", "marguerite", "chene", "pomme", "cocon", "feuille", "marguerite", "fern"],
    obstacles: { barrier: "log", high: "branch", wagon: "stump", ramp: "logramp", rusher: "rollinglog", pendulum: "pendulum-foret" },
  },
  ruelle: {
    ...commun,
    id: "ruelle",
    name: "La ruelle de Moumouche",
    icon: "🗑️",
    skyTop: 0x1a1838,
    skyBottom: 0x5a4a7a,
    fog: 0x3a3050,
    ground: 0x3e3e4a,
    night: true,
    track: "#3c3c48",
    track2: "#44444f",
    paintTrack: TRACKS.asphalt,
    paintWall: WALLS.ruelle,
    decor: ["poubelle", "sacs", "caisses", "reverbere", "poubelle", "flaque", "sacs", "poubelle"],
    obstacles: { barrier: "trashpile", high: "pipe", wagon: "dumpster", ramp: "boxramp", rusher: "rollingcan", pendulum: "pendulum-ruelle" },
  },
};
Object.values(THEMES).forEach((t) => {
  if (!BIOMES.some((b) => b.id === t.id)) BIOMES.push(t);
});
export const themeIndex = (id) => BIOMES.findIndex((b) => b.id === id);

/** Ajoute les décors et obstacles à thème au monde 3D. */
export function installThemes(world) {
  Object.assign(world.DECOR, DECOR);
  Object.assign(world.OBSTACLES, OBSTACLES);
}
