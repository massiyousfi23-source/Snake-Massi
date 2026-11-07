// Monde 3D « bonbon » de Kichta Run : rendu vernis, ciel pastel, piste à trois
// couloirs, quatre mondes qui s'enchaînent, décor foisonnant, obstacles,
// croquettes d'or, bonus et effets. Toute la logique de jeu est dans main.js.
import * as THREE from "../vendor/three.module.min.js";
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  OutputPass,
  ShaderPass,
  HorizontalTiltShiftShader,
  VerticalTiltShiftShader,
  RoomEnvironment,
} from "../vendor/three.addons.min.js";
import { candy, canvasTexture } from "./toons.js?v=b4";

export const LANE = 2.3;
export const BIOMES = [
  {
    id: "bonbons",
    name: "Rue des Bonbons",
    skyTop: 0xff9ccf,
    skyBottom: 0xffe3f1,
    fog: 0xffd6ea,
    ground: 0x8fe8c3,
    groundDots: "#ffffff",
    track: "#ff79b0",
    track2: "#ffb3d3",
    decor: ["lollipop", "gumdrop", "cane", "house", "mushroom", "donut", "lollipop", "gumdrop", "house"],
  },
  {
    id: "nuages",
    name: "Nuages de Guimauve",
    skyTop: 0x4aa8ff,
    skyBottom: 0xbfe4ff,
    fog: 0xb5dcff,
    ground: 0xa9d4ff,
    groundDots: "#ffffff",
    track: "#9b7dff",
    track2: "#c6b6ff",
    decor: ["cloud", "balloon", "marshmallow", "cloud", "lollipop", "star", "balloon", "cloud"],
  },
  {
    id: "chocolat",
    name: "Fabrique de Chocolat",
    skyTop: 0xff9a5a,
    skyBottom: 0xffe0b0,
    fog: 0xffd2a0,
    ground: 0x7a4225,
    groundDots: "#a8653e",
    track: "#f2b33d",
    track2: "#ffd27a",
    decor: ["cupcake", "choco", "pipe", "cupcake", "donut", "choco", "cane"],
  },
  {
    id: "glaces",
    name: "Glaces Givrées",
    skyTop: 0x7fd6ff,
    skyBottom: 0xf2fbff,
    fog: 0xe3f6ff,
    ground: 0xe9f7ff,
    groundDots: "#b9e6ff",
    track: "#46c7d9",
    track2: "#9be7f0",
    decor: ["icecream", "popsicle", "icecream", "gumdrop", "popsicle", "mushroom", "star"],
  },
  // Mondes à acheter dans la boutique
  {
    id: "plage",
    name: "Plage Sorbet",
    price: 1500,
    icon: "🏖️",
    skyTop: 0x2fc6ff,
    skyBottom: 0xfff1c9,
    fog: 0xffeacc,
    ground: 0xffe2a8,
    groundDots: "#ffffff",
    track: "#ff8a5c",
    track2: "#ffc09e",
    decor: ["palm", "parasol", "beachball", "palm", "starfish", "popsicle", "palm", "parasol"],
  },
  {
    id: "galaxie",
    name: "Galaxie Sucrée",
    price: 2500,
    icon: "🪐",
    skyTop: 0x120a3a,
    skyBottom: 0x5a2f9e,
    fog: 0x3a2370,
    ground: 0x2a1a5e,
    groundDots: "#ffe9ff",
    track: "#7b3dff",
    track2: "#b48cff",
    night: true,
    decor: ["planet", "rocket", "star", "planet", "crystal", "star", "rocket", "crystal"],
  },
  {
    id: "halloween",
    name: "Halloween Bonbons",
    price: 3500,
    icon: "🎃",
    skyTop: 0x3a1c5e,
    skyBottom: 0xff9a5a,
    fog: 0x8a4a6a,
    ground: 0x3e2a4a,
    groundDots: "#ff9a3d",
    track: "#ff7a1f",
    track2: "#ffb066",
    night: true,
    decor: ["pumpkin", "ghost", "spooky", "pumpkin", "candycorn", "ghost", "pumpkin", "cane"],
  },
];

const tmpColor = new THREE.Color();

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(0xffd6ea, 60, 150);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);

  // --- Ciel en dégradé ---------------------------------------------------------
  const skyUniforms = { top: { value: new THREE.Color(BIOMES[0].skyTop) }, bottom: { value: new THREE.Color(BIOMES[0].skyBottom) } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }",
    }),
  );
  scene.add(sky);
  // Soleil doux
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.1), fog: false }));
  scene.add(sunDisc);

  // --- Lumières : studio doux --------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xfff4fa, 0xd9a0c4, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 26, bottom: -22, near: 1, far: 80 });
  scene.add(sun, sun.target);

  // --- Sol et piste ---------------------------------------------------------------
  const groundTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i += 1) {
      g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
      g.save();
      g.translate(Math.random() * w, Math.random() * h);
      g.rotate(Math.random() * 3);
      g.fillRect(-6, -2, 12, 4);
      g.restore();
    }
  }, true);
  groundTex.repeat.set(40, 40);
  const groundMat = new THREE.MeshStandardMaterial({ color: BIOMES[0].ground, map: groundTex, roughness: 0.55 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.4;
  ground.receiveShadow = true;
  scene.add(ground);

  let trackTex = null;
  function paintTrack(biome) {
    const t = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = biome.track;
      g.fillRect(0, 0, w, h);
      // Couloirs séparés par des lignes de sucre
      g.fillStyle = biome.track2;
      for (let lane = 0; lane < 3; lane += 1) {
        g.fillRect(lane * (w / 3) + 8, 0, w / 3 - 16, h);
      }
      g.fillStyle = "rgba(255,255,255,.9)";
      for (let y = 0; y < h; y += 64) {
        g.fillRect(w / 3 - 4, y, 8, 34);
        g.fillRect((2 * w) / 3 - 4, y, 8, 34);
      }
      // Petits carrés de sucre
      for (let i = 0; i < 40; i += 1) {
        g.fillStyle = "rgba(255,255,255,.35)";
        g.fillRect(Math.random() * w, Math.random() * h, 5, 5);
      }
    }, true);
    t.repeat.set(1, 40);
    return t;
  }
  trackTex = paintTrack(BIOMES[0]);
  const trackMat = candy(0xffffff, { map: trackTex, roughness: 0.25, clearcoat: 0.8 });
  const track = new THREE.Mesh(new THREE.BoxGeometry(LANE * 3 + 0.4, 0.4, 260), trackMat);
  track.position.y = -0.2;
  track.receiveShadow = true;
  scene.add(track);
  // Bordures en sucre d'orge
  const railTex = canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff3d6e";
    for (let y = -h; y < h * 2; y += 48) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 30);
      g.lineTo(w, y + 54);
      g.lineTo(0, y + 24);
      g.fill();
    }
  }, true);
  railTex.repeat.set(1, 60);
  const railMat = candy(0xffffff, { map: railTex });
  const rails = [];
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 260, 16), railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(side * (LANE * 1.5 + 0.35), 0.1, 0);
    rail.castShadow = true;
    scene.add(rail);
    rails.push(rail);
  }

  // --- Post-traitement : halo et effet « miniature » ---------------------------------
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.22, 0.4, 1.05);
  composer.addPass(bloom);
  const tiltH = new ShaderPass(HorizontalTiltShiftShader);
  const tiltV = new ShaderPass(VerticalTiltShiftShader);
  tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.42;
  composer.addPass(tiltH);
  composer.addPass(tiltV);
  composer.addPass(new OutputPass());

  // --- Biomes -------------------------------------------------------------------------
  let biomeIndex = 0;
  let biomeBlend = 1;
  const from = { top: new THREE.Color(), bottom: new THREE.Color(), fog: new THREE.Color(), ground: new THREE.Color() };
  const to = { top: new THREE.Color(), bottom: new THREE.Color(), fog: new THREE.Color(), ground: new THREE.Color() };
  function setBiome(index, instant = false) {
    const b = BIOMES[index % BIOMES.length];
    from.top.copy(skyUniforms.top.value);
    from.bottom.copy(skyUniforms.bottom.value);
    from.fog.copy(scene.fog.color);
    from.ground.copy(groundMat.color);
    to.top.setHex(b.skyTop);
    to.bottom.setHex(b.skyBottom);
    to.fog.setHex(b.fog);
    to.ground.setHex(b.ground);
    biomeIndex = index;
    biomeBlend = instant ? 1 : 0;
    if (trackTex) trackTex.dispose();
    trackTex = paintTrack(b);
    trackMat.map = trackTex;
    trackMat.needsUpdate = true;
    if (instant) applyBiome(1);
  }
  function applyBiome(k) {
    skyUniforms.top.value.lerpColors(from.top, to.top, k);
    skyUniforms.bottom.value.lerpColors(from.bottom, to.bottom, k);
    scene.fog.color.lerpColors(from.fog, to.fog, k);
    groundMat.color.lerpColors(from.ground, to.ground, k);
  }
  setBiome(0, true);

  // --- Usine à objets avec réserve (pour ne pas recréer sans cesse) ----------------
  const pools = new Map();
  function acquire(key, build) {
    const list = pools.get(key);
    let obj = list && list.pop();
    if (!obj) {
      obj = build();
      obj.userData.poolKey = key;
      obj.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = o.castShadow !== false;
          o.receiveShadow = true;
        }
      });
    }
    obj.visible = true;
    scene.add(obj);
    return obj;
  }
  function release(obj) {
    if (!obj) return;
    scene.remove(obj);
    const key = obj.userData.poolKey;
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key).push(obj);
  }

  // --- Décor -------------------------------------------------------------------------
  const palette = [0xff5fa2, 0x5ad1ff, 0xffd23f, 0x7dff9a, 0xb48cff, 0xff8a3d, 0xff4d6d];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const swirlTex = canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, w);
    const cols = ["#ff3d7a", "#ffd23f", "#3dd6ff", "#7dff6a", "#b48cff"];
    for (let a = 0; a < 40; a += 1) {
      g.strokeStyle = cols[a % cols.length];
      g.lineWidth = 16;
      g.beginPath();
      for (let r = 0; r < c; r += 2) {
        const ang = a * 0.6 + r * 0.05;
        g.lineTo(c + Math.cos(ang) * r, c + Math.sin(ang) * r);
      }
      g.stroke();
    }
  });
  const stickMat = candy(0xffffff);
  const DECOR = {
    lollipop() {
      const g = new THREE.Group();
      const h = 3 + Math.random() * 3;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 10), stickMat).translateY(h / 2));
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 40), [candy(pick(palette)), candy(0xffffff, { map: swirlTex }), candy(0xffffff, { map: swirlTex })]);
      disc.rotation.x = Math.PI / 2;
      disc.position.y = h + 1.2;
      g.add(disc);
      return g;
    },
    gumdrop() {
      const g = new THREE.Group();
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) {
        const r = 0.8 + Math.random() * 1;
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), candy(pick(palette), { roughness: 0.5, clearcoat: 0.6, sheen: 1, sheenColor: 0xffffff }));
        m.scale.y = 1.3;
        m.position.set((Math.random() - 0.5) * 2.5, -0.1, (Math.random() - 0.5) * 2.5);
        g.add(m);
      }
      return g;
    },
    cane() {
      const g = new THREE.Group();
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 3.5, 0),
        new THREE.Vector3(0, 4.6, 0),
        new THREE.Vector3(0.6, 5.3, 0),
        new THREE.Vector3(1.3, 4.9, 0),
        new THREE.Vector3(1.4, 4.2, 0),
      ]);
      const tex = railTex.clone();
      tex.repeat.set(1, 6);
      tex.needsUpdate = true;
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.2, 12), candy(0xffffff, { map: tex })));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 2.2 }));
      bulb.position.set(1.4, 3.9, 0);
      bulb.castShadow = false;
      g.add(bulb);
      g.userData.faceTrack = true;
      return g;
    },
    house() {
      const g = new THREE.Group();
      const w = 3 + Math.random() * 1.5;
      const h = 2.6 + Math.random() * 1.6;
      const wallTex = canvasTexture(128, 128, (c, W, H) => {
        c.fillStyle = "#b8743e";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#fff6e8";
        c.fillRect(0, 0, W, 8);
        // Fenêtre
        c.fillStyle = "#fff6e8";
        c.fillRect(20, 30, 36, 36);
        c.fillStyle = "#ffd36a";
        c.fillRect(25, 35, 26, 26);
        // Porte
        c.fillStyle = "#ff5fa2";
        c.beginPath();
        c.roundRect(72, 56, 34, 72, [16, 16, 0, 0]);
        c.fill();
        c.fillStyle = "#ffffff";
        for (let i = 0; i < 12; i += 1) c.fillRect(i * 11, H - 10, 6, 6);
      });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), candy(0xffffff, { map: wallTex, roughness: 0.6, clearcoat: 0.3 })).translateY(h / 2));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.8, 4), candy(pick([0xff5fa2, 0xffffff, 0x8f5cff, 0x5ad1ff])));
      roof.position.y = h + 0.9;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      // Bonbons sur le toit
      for (let i = 0; i < 5; i += 1) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), candy(pick(palette)));
        d.position.set((Math.random() - 0.5) * w * 0.8, h + 0.3, w / 2 + 0.05);
        g.add(d);
      }
      g.userData.faceTrack = true;
      return g;
    },
    mushroom() {
      const g = new THREE.Group();
      const s = 1 + Math.random() * 1.2;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45 * s, 0.55 * s, 1.6 * s, 18), candy(0xfff2df)).translateY(0.8 * s));
      const capTex = canvasTexture(256, 128, (c, W, H) => {
        c.fillStyle = Math.random() > 0.5 ? "#ff3d4d" : "#ff79c6";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffffff";
        for (let i = 0; i < 14; i += 1) {
          c.beginPath();
          c.arc(Math.random() * W, Math.random() * H * 0.7, 8 + Math.random() * 8, 0, Math.PI * 2);
          c.fill();
        }
      });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1.3 * s, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), candy(0xffffff, { map: capTex }));
      cap.position.y = 1.5 * s;
      cap.scale.y = 0.75;
      g.add(cap);
      return g;
    },
    donut() {
      const g = new THREE.Group();
      const dough = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.5, 18, 36), candy(0xe8a15a, { roughness: 0.6, clearcoat: 0.2 }));
      const iceTex = canvasTexture(256, 64, (c, W, H) => {
        c.fillStyle = pick(["#ff7fbf", "#7a4225", "#ffffff", "#8fd8ff"]);
        c.fillRect(0, 0, W, H);
        for (let i = 0; i < 70; i += 1) {
          c.fillStyle = pick(["#ff3d6e", "#ffd23f", "#3dd6ff", "#7dff6a", "#ffffff"]);
          c.fillRect(Math.random() * W, Math.random() * H, 6, 2);
        }
      });
      const icing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.52, 18, 36, Math.PI * 2), candy(0xffffff, { map: iceTex }));
      icing.scale.set(1.01, 1.01, 0.6);
      icing.position.z = 0.18;
      g.add(dough, icing);
      g.position.y = 1.6;
      const holder = new THREE.Group();
      holder.add(g);
      g.rotation.y = Math.random() * 2;
      holder.userData.spin = g;
      return holder;
    },
    cloud() {
      const g = new THREE.Group();
      const m = candy(0xffffff, { roughness: 0.6, clearcoat: 0.2 });
      for (let i = 0; i < 6; i += 1) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.9, 18, 12), m);
        s.position.set((i - 2.5) * 1.1, Math.random() * 0.8, (Math.random() - 0.5) * 1.2);
        s.castShadow = false;
        g.add(s);
      }
      g.position.y = 1 + Math.random() * 6;
      const holder = new THREE.Group();
      holder.add(g);
      holder.userData.bob = g;
      return holder;
    },
    marshmallow() {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i += 1) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 24), candy(pick([0xffffff, 0xffc4dd, 0xc4f0ff]), { roughness: 0.7, clearcoat: 0.1 }));
        m.position.set((Math.random() - 0.5) * 2.4, 0.6 + i * 0.1, (Math.random() - 0.5) * 2.4);
        m.rotation.z = (Math.random() - 0.5) * 0.4;
        g.add(m);
      }
      return g;
    },
    balloon() {
      const g = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i += 1) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), candy(pick(palette), { roughness: 0.15 }));
        b.scale.y = 1.2;
        b.position.set((Math.random() - 0.5) * 1.5, 5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
        g.add(b);
        const pts = [new THREE.Vector3(0, 2.5, 0), b.position.clone()];
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff })));
      }
      const holder = new THREE.Group();
      holder.add(g);
      holder.userData.bob = g;
      return holder;
    },
    star() {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? 0.55 : 1.3;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const star = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 4 }),
        candy(0xffd23f, { emissive: 0xffa000, emissiveIntensity: 0.35 }),
      );
      star.position.y = 4 + Math.random() * 3;
      const holder = new THREE.Group();
      holder.add(star);
      holder.userData.spin = star;
      holder.userData.bob = star;
      return holder;
    },
    cupcake() {
      const g = new THREE.Group();
      const s = 1 + Math.random() * 0.8;
      const linerTex = canvasTexture(256, 32, (c, W, H) => {
        c.fillStyle = pick(["#ff5fa2", "#5ad1ff", "#ffd23f"]);
        c.fillRect(0, 0, W, H);
        c.fillStyle = "rgba(255,255,255,.55)";
        for (let x = 0; x < W; x += 16) c.fillRect(x, 0, 8, H);
      });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1 * s, 0.8 * s, 1.3 * s, 32), candy(0xffffff, { map: linerTex })).translateY(0.65 * s));
      const frost = candy(pick([0xffffff, 0xffb3d9, 0x7a4225, 0xb3ecff]), { roughness: 0.4 });
      for (let i = 0; i < 3; i += 1) {
        const t = new THREE.Mesh(new THREE.TorusGeometry((1 - i * 0.28) * s, 0.36 * s, 14, 30), frost);
        t.rotation.x = Math.PI / 2;
        t.position.y = (1.45 + i * 0.42) * s;
        g.add(t);
      }
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 16, 12), candy(0xff1f3d)).translateY(2.55 * s));
      return g;
    },
    choco() {
      const g = new THREE.Group();
      const m = candy(0x6b3518, { roughness: 0.3 });
      const w = 2 + Math.random() * 1.5;
      const h = 3 + Math.random() * 4;
      const bar = new THREE.Group();
      for (let y = 0; y < 3; y += 1) {
        for (let x = 0; x < 2; x += 1) {
          const piece = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.1, h / 3 - 0.1, 0.6), m);
          piece.position.set((x - 0.5) * (w / 2), (y + 0.5) * (h / 3), 0);
          bar.add(piece);
        }
      }
      bar.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), m).translateY(h / 2).translateZ(-0.2));
      bar.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(bar);
      g.userData.faceTrack = true;
      return g;
    },
    pipe() {
      const g = new THREE.Group();
      const m = candy(0xd8d8e8, { metalness: 0.6, roughness: 0.25 });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 6, 20), m).translateY(3));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.6, 14, 24, Math.PI / 2), m).translateY(6).translateX(1).rotateZ(Math.PI / 2));
      const choc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 6, 16), candy(0x6b3518, { roughness: 0.15 }));
      choc.position.set(2, 3, 0);
      g.add(choc);
      g.userData.faceTrack = true;
      return g;
    },
    icecream() {
      const g = new THREE.Group();
      const s = 1.3 + Math.random() * 1.4;
      const waffle = canvasTexture(128, 128, (c, W, H) => {
        c.fillStyle = "#e3a55a";
        c.fillRect(0, 0, W, H);
        c.strokeStyle = "#b5733a";
        c.lineWidth = 5;
        for (let i = -W; i < W * 2; i += 22) {
          c.beginPath();
          c.moveTo(i, 0);
          c.lineTo(i + H, H);
          c.moveTo(i + H, 0);
          c.lineTo(i, H);
          c.stroke();
        }
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1 * s, 3 * s, 24), candy(0xffffff, { map: waffle, roughness: 0.7, clearcoat: 0.2 }));
      cone.rotation.x = Math.PI;
      cone.position.y = 1.5 * s;
      g.add(cone);
      const flavours = [0xffc4dd, 0xc4ffe4, 0xfff1b3, 0x8a4b2a, 0xc9c4ff];
      for (let i = 0; i < 2; i += 1) {
        const sc = new THREE.Mesh(new THREE.SphereGeometry(1.05 * s, 24, 16), candy(pick(flavours), { roughness: 0.45 }));
        sc.position.y = (3.2 + i * 1.3) * s;
        g.add(sc);
      }
      return g;
    },
    popsicle() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.15), candy(0xe8c08a, { roughness: 0.7 })).translateY(1));
      const pop = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 2.2, 8, 16), candy(pick([0xff4d6d, 0x5ad1ff, 0x7dff9a, 0xffd23f])));
      pop.scale.z = 0.45;
      pop.position.y = 3.4;
      g.add(pop);
      return g;
    },
  };

  // Décors des mondes à acheter
  Object.assign(DECOR, {
    palm() {
      const g = new THREE.Group();
      const h = 4 + Math.random() * 2;
      const trunkMat = candy(0xd9a066, { roughness: 0.5 });
      for (let i = 0; i < 7; i += 1) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.012, 0.26 - i * 0.012, h / 7, 12), trunkMat);
        seg.position.set(Math.sin(i * 0.35) * 0.25, (i + 0.5) * (h / 7), 0);
        g.add(seg);
      }
      const leaf = candy(pick([0x3dd68c, 0x2fbf73, 0x7dff9a]));
      for (let i = 0; i < 7; i += 1) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), leaf);
        l.scale.set(1.5, 0.12, 0.45);
        const a = (i / 7) * Math.PI * 2;
        l.position.set(Math.cos(a) * 1.2 + 0.4, h + 0.1 - 0.25, Math.sin(a) * 1.2);
        l.rotation.y = -a;
        l.rotation.z = -0.35;
        g.add(l);
      }
      for (let i = 0; i < 3; i += 1) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), candy(0x8a5a2a)).translateX(0.4 + (i - 1) * 0.3).translateY(h - 0.25));
      return g;
    },
    parasol() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), candy(0xffffff)).translateY(1.5));
      const tex = canvasTexture(256, 32, (c, W, H) => {
        for (let i = 0; i < 8; i += 1) {
          c.fillStyle = i % 2 ? "#ffffff" : pick(["#ff4d6d", "#3dd6ff", "#ffd23f"]);
          c.fillRect((i * W) / 8, 0, W / 8, H);
        }
      });
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.7, 16, 1, true), candy(0xffffff, { map: tex, side: THREE.DoubleSide }));
      top.position.y = 3.1;
      g.add(top);
      return g;
    },
    beachball() {
      const tex = canvasTexture(256, 128, (c, W, H) => {
        const cols = ["#ff4d6d", "#ffffff", "#3dd6ff", "#ffffff", "#ffd23f", "#ffffff"];
        cols.forEach((col, i) => {
          c.fillStyle = col;
          c.fillRect((i * W) / 6, 0, W / 6, H);
        });
      });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), candy(0xffffff, { map: tex, roughness: 0.15 }));
      b.position.y = 0.9;
      const holder = new THREE.Group();
      holder.add(b);
      holder.userData.spin = b;
      return holder;
    },
    starfish() {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? 0.45 : 1.2;
        const a = (i / 10) * Math.PI * 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15 }), candy(pick([0xff7a5c, 0xff5fa2, 0xffb03d])));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.1;
      const g = new THREE.Group();
      g.add(m);
      return g;
    },
    planet() {
      const g = new THREE.Group();
      const r = 1 + Math.random() * 1.6;
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), candy(pick([0xff7fbf, 0x7fd6ff, 0xffd27a, 0xb48cff]), { emissive: 0x4a2a8a, emissiveIntensity: 0.25 }));
      p.position.y = 3 + Math.random() * 5;
      g.add(p);
      if (Math.random() < 0.6) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.6, r * 0.12, 8, 48), candy(0xffffff, { emissive: 0xffc0ff, emissiveIntensity: 0.5 }));
        ring.scale.z = 0.25;
        ring.rotation.x = Math.PI / 2.4;
        ring.position.copy(p.position);
        g.add(ring);
      }
      g.userData.bob = p;
      return g;
    },
    rocket() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 2.2, 8, 20), candy(0xffffff));
      body.position.y = 2;
      g.add(body);
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 20), candy(0xff3d6e)).translateY(3.6));
      for (let i = 0; i < 3; i += 1) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), candy(0xff3d6e));
        const a = (i / 3) * Math.PI * 2;
        fin.position.set(Math.cos(a) * 0.6, 0.9, Math.sin(a) * 0.6);
        fin.rotation.y = -a;
        g.add(fin);
      }
      const win = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), candy(0x5ad1ff, { emissive: 0x5ad1ff, emissiveIntensity: 0.8 }));
      win.position.set(0, 2.6, 0.55);
      g.add(win);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.4, 0.4) }));
      flame.rotation.x = Math.PI;
      flame.position.y = 0.1;
      flame.castShadow = false;
      g.add(flame);
      g.position.y = 1 + Math.random() * 3;
      const holder = new THREE.Group();
      holder.add(g);
      holder.userData.bob = g;
      return holder;
    },
    crystal() {
      const g = new THREE.Group();
      const col = pick([0xff7fe0, 0x7fe9ff, 0xb48cff]);
      for (let i = 0; i < 4; i += 1) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + Math.random() * 0.6), candy(col, { emissive: col, emissiveIntensity: 0.6, roughness: 0.05 }));
        c.scale.y = 2;
        c.position.set((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2);
        c.rotation.z = (Math.random() - 0.5) * 0.6;
        g.add(c);
      }
      return g;
    },
    pumpkin() {
      const g = new THREE.Group();
      const s = 0.8 + Math.random() * 0.7;
      const m = candy(0xff8a1f, { roughness: 0.35 });
      for (let i = 0; i < 8; i += 1) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.7 * s, 16, 12), m);
        const a = (i / 8) * Math.PI * 2;
        lobe.scale.set(0.55, 0.85, 0.55);
        lobe.position.set(Math.cos(a) * 0.45 * s, 0.6 * s, Math.sin(a) * 0.45 * s);
        g.add(lobe);
      }
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 0.4 * s, 8), candy(0x3d8a2a)).translateY(1.25 * s));
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2 * s, 1 * s),
        new THREE.MeshBasicMaterial({
          transparent: true,
          color: new THREE.Color(2.2, 1.6, 0.4),
          map: canvasTexture(128, 128, (c) => {
            c.fillStyle = "#fff";
            c.beginPath();
            c.moveTo(30, 50); c.lineTo(52, 30); c.lineTo(58, 56); c.fill();
            c.beginPath();
            c.moveTo(98, 50); c.lineTo(76, 30); c.lineTo(70, 56); c.fill();
            c.beginPath();
            c.moveTo(24, 76); c.lineTo(104, 76); c.lineTo(84, 104); c.lineTo(64, 92); c.lineTo(44, 104); c.fill();
          }),
        }),
      );
      face.position.set(0, 0.6 * s, 0.83 * s);
      g.add(face);
      g.userData.faceTrack = true;
      return g;
    },
    ghost() {
      const g = new THREE.Group();
      const m = candy(0xffffff, { roughness: 0.6, clearcoat: 0.3, emissive: 0xb8a0ff, emissiveIntensity: 0.15 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.1, 8, 18), m);
      body.position.y = 2.2;
      g.add(body);
      for (const x of [-0.25, 0.25]) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), candy(0x1a1020)).translateX(x).translateY(2.6).translateZ(0.62));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), candy(0x1a1020)).translateY(2.2).translateZ(0.65));
      const holder = new THREE.Group();
      holder.add(g);
      holder.userData.bob = g;
      holder.userData.faceTrack = true;
      return holder;
    },
    spooky() {
      const g = new THREE.Group();
      const m = candy(0x2a1a2e, { roughness: 0.5 });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 4, 8), m).translateY(2));
      for (let i = 0; i < 5; i += 1) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.6, 6), m);
        const a = (i / 5) * Math.PI * 2;
        br.position.set(Math.cos(a) * 0.5, 3.4 + (i % 2) * 0.4, Math.sin(a) * 0.5);
        br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        g.add(br);
      }
      const bat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), candy(0x111111));
      bat.position.set(0.6, 4.4, 0);
      g.add(bat);
      return g;
    },
    candycorn() {
      const g = new THREE.Group();
      const s = 1 + Math.random();
      const tex = canvasTexture(16, 128, (c, W, H) => {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, W, H / 3);
        c.fillStyle = "#ff9a1f";
        c.fillRect(0, H / 3, W, H / 3);
        c.fillStyle = "#ffd23f";
        c.fillRect(0, (2 * H) / 3, W, H / 3);
      });
      const corn = new THREE.Mesh(new THREE.ConeGeometry(0.8 * s, 2.4 * s, 18), candy(0xffffff, { map: tex }));
      corn.position.y = 1.2 * s;
      g.add(corn);
      return g;
    },
  });

  const decor = [];
  let nextDecorZ = 0;
  function spawnDecor(z, biome) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.15) continue;
      const type = pick(biome.decor);
      const obj = acquire(`decor-${type}-${Math.floor(Math.random() * 3)}`, DECOR[type]);
      const near = Math.random() < 0.55;
      const dist = near ? LANE * 1.5 + 2.6 + Math.random() * 3 : 9 + Math.random() * 22;
      obj.position.set(side * dist, 0, z + (Math.random() - 0.5) * 4);
      obj.rotation.y = obj.userData.faceTrack ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 0.3 : Math.random() * Math.PI * 2;
      const scale = near ? 0.85 + Math.random() * 0.3 : 1.2 + Math.random() * 1.2;
      obj.scale.setScalar(scale);
      obj.userData.phase = Math.random() * 10;
      decor.push(obj);
    }
  }

  // Arcs-en-ciel au-dessus de la piste
  function rainbow() {
    const g = new THREE.Group();
    const cols = [0xff4d6d, 0xff9a3d, 0xffe14d, 0x6dff8a, 0x4dc3ff, 0x9a6dff];
    cols.forEach((c, i) => {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(9 - i * 0.45, 0.24, 10, 60, Math.PI), candy(c, { roughness: 0.2 }));
      arc.castShadow = false;
      g.add(arc);
    });
    for (const side of [-1, 1]) {
      const cloud = DECOR.cloud();
      cloud.userData.bob.position.y = 0;
      cloud.position.set(side * 7.6, 0.2, 0);
      cloud.scale.setScalar(0.9);
      g.add(cloud);
    }
    return g;
  }
  let nextRainbowZ = -140;

  // --- Obstacles -------------------------------------------------------------------
  const stripeTex = canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff3d6e";
    for (let x = -h; x < w + h; x += 48) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 24, 0);
      g.lineTo(x + 24 + h, h);
      g.lineTo(x + h, h);
      g.fill();
    }
  });
  const OBSTACLES = {
    // Barrière basse : à sauter
    barrier() {
      const g = new THREE.Group();
      const post = candy(0xffffff);
      for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 14), post).translateX(s * 0.85).translateY(0.55));
      for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), candy(0xff3d6e)).translateX(s * 0.85).translateY(1.15));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.3), candy(0xffffff, { map: stripeTex }));
      bar.position.y = 0.78;
      g.add(bar);
      return g;
    },
    // Barre haute : glisser dessous ou changer de couloir
    high() {
      const g = new THREE.Group();
      const post = candy(0xffd23f);
      for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.6, 14), post).translateX(s * 0.95).translateY(1.3));
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.5), candy(0x6b3518, { roughness: 0.25 }));
      beam.position.y = 1.95;
      g.add(beam);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.6),
        new THREE.MeshStandardMaterial({
          map: canvasTexture(256, 96, (c, W, H) => {
            c.fillStyle = "#ffd23f";
            c.beginPath();
            c.roundRect(4, 4, W - 8, H - 8, 30);
            c.fill();
            c.fillStyle = "#6b3518";
            c.font = "bold 64px sans-serif";
            c.textAlign = "center";
            c.fillText("▼ ▼", W / 2, 72);
          }),
          transparent: true,
        }),
      );
      sign.position.set(0, 1.95, 0.26);
      g.add(sign);
      return g;
    },
    // Wagon de bonbons : esquiver, ou monter dessus par une rampe
    wagon() {
      const g = new THREE.Group();
      const color = pick([0xff5fa2, 0x5ad1ff, 0x8f5cff, 0x3dd68c, 0xff8a3d]);
      const len = 9;
      const shape = new THREE.Shape();
      shape.roundRect ? shape.roundRect(-0.95, 0, 1.9, 2.5, 0.45) : shape.moveTo(0, 0);
      if (!shape.roundRect) {
        const r = 0.45;
        shape.moveTo(-0.95 + r, 0);
        shape.lineTo(0.95 - r, 0);
        shape.quadraticCurveTo(0.95, 0, 0.95, r);
        shape.lineTo(0.95, 2.5 - r);
        shape.quadraticCurveTo(0.95, 2.5, 0.95 - r, 2.5);
        shape.lineTo(-0.95 + r, 2.5);
        shape.quadraticCurveTo(-0.95, 2.5, -0.95, 2.5 - r);
        shape.lineTo(-0.95, r);
        shape.quadraticCurveTo(-0.95, 0, -0.95 + r, 0);
      }
      const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 6 });
      bodyGeo.translate(0, 0.25, -len / 2);
      const body = new THREE.Mesh(bodyGeo, candy(color));
      g.add(body);
      // Fenêtres en sucre
      const win = candy(0xd8f6ff, { roughness: 0.05, emissive: 0x9ee8ff, emissiveIntensity: 0.3 });
      for (let i = 0; i < 3; i += 1) {
        for (const s of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1.6), win);
          w.position.set(s * 1.08, 1.75, -len / 2 + 1.7 + i * 2.8);
          g.add(w);
        }
      }
      // Toit rayé
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, len - 0.4), candy(0xffffff, { map: stripeTex }));
      roof.position.y = 2.85;
      g.add(roof);
      // Roues en donuts
      for (const z of [-len / 2 + 1.3, len / 2 - 1.3]) {
        for (const s of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.17, 12, 20), candy(0xe8a15a));
          wheel.rotation.y = Math.PI / 2;
          wheel.position.set(s * 0.98, 0.3, z);
          g.add(wheel);
        }
      }
      // Visage souriant à l'avant (côté joueur = +Z)
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshStandardMaterial({
          transparent: true,
          map: canvasTexture(256, 256, (c) => {
            c.fillStyle = "#ffffff";
            for (const x of [80, 176]) {
              c.beginPath();
              c.arc(x, 100, 34, 0, Math.PI * 2);
              c.fill();
            }
            c.fillStyle = "#1a1020";
            for (const x of [88, 168]) {
              c.beginPath();
              c.arc(x, 106, 18, 0, Math.PI * 2);
              c.fill();
            }
            c.strokeStyle = "#1a1020";
            c.lineWidth = 12;
            c.lineCap = "round";
            c.beginPath();
            c.arc(128, 150, 50, 0.2, Math.PI - 0.2);
            c.stroke();
          }),
        }),
      );
      face.position.set(0, 1.5, len / 2 + 0.14);
      g.add(face);
      g.userData.length = len;
      return g;
    },
    ramp() {
      const g = new THREE.Group();
      const len = 5;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
      shape.lineTo(0, 2.95);
      shape.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: false });
      geo.translate(0, 0, -0.95);
      geo.rotateY(-Math.PI / 2);
      const m = new THREE.Mesh(geo, candy(0xffffff, { map: stripeTex }));
      g.add(m);
      g.userData.length = len;
      return g;
    },
    block() {
      const g = new THREE.Group();
      const tex = canvasTexture(128, 128, (c, W, H) => {
        c.fillStyle = "#ffbf1f";
        c.fillRect(0, 0, W, H);
        c.fillStyle = "#ffe48a";
        c.fillRect(6, 6, W - 12, 10);
        c.fillStyle = "#c46a00";
        for (const [x, y] of [[12, 12], [W - 18, 12], [12, H - 18], [W - 18, H - 18]]) c.fillRect(x, y, 6, 6);
        c.fillStyle = "#ffffff";
        c.strokeStyle = "#7a3d00";
        c.lineWidth = 6;
        c.font = "bold 92px Arial Black, sans-serif";
        c.textAlign = "center";
        c.strokeText("?", W / 2, 98);
        c.fillText("?", W / 2, 98);
      });
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), candy(0xffffff, { map: tex, emissive: 0xff9a00, emissiveIntensity: 0.15 }));
      g.add(cube);
      g.userData.cube = cube;
      g.userData.tex = tex;
      return g;
    },
    bomb() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), candy(0x1d1822, { roughness: 0.15 })).translateY(0.55));
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), candy(0xff7fae));
      fuse.position.y = 1.2;
      g.add(fuse);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.4) }));
      spark.position.y = 1.45;
      spark.castShadow = false;
      g.add(spark);
      // Rayures roses de bonbon
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 30), candy(0xff7fae));
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.55;
      g.add(band);
      g.userData.spark = spark;
      return g;
    },
    warn() {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 0.95, 32),
        new THREE.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: 0.8, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.02;
      m.castShadow = false;
      const g = new THREE.Group();
      g.add(m);
      return g;
    },
  };

  // --- Bonus -------------------------------------------------------------------------
  const POWERS = {
    magnet() {
      const g = new THREE.Group();
      const u = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.16, 12, 24, Math.PI), candy(0xff2d4a));
      u.rotation.z = Math.PI;
      g.add(u);
      for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 12), candy(0xe8eef5, { metalness: 0.6 })).translateX(s * 0.4).translateY(0.12));
      return g;
    },
    shield() {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), candy(0x6fd8ff, { transparent: true, opacity: 0.6, roughness: 0.05 })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), candy(0xffffff, { emissive: 0x6fd8ff, emissiveIntensity: 1 })));
      return g;
    },
    double() {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? 0.25 : 0.55;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 }), candy(0xffd23f, { emissive: 0xffa000, emissiveIntensity: 0.6 }));
      m.position.z = -0.09;
      g.add(m);
      return g;
    },
    balloon() {
      const g = new THREE.Group();
      [0xff5fa2, 0x5ad1ff, 0xffd23f].forEach((c, i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), candy(c, { roughness: 0.12 }));
        b.scale.y = 1.2;
        b.position.set((i - 1) * 0.3, 0.2 + (i % 2) * 0.15, 0);
        g.add(b);
      });
      return g;
    },
    spring() {
      const g = new THREE.Group();
      const pts = [];
      for (let i = 0; i <= 80; i += 1) {
        const a = i * 0.45;
        pts.push(new THREE.Vector3(Math.cos(a) * 0.3, i * 0.009 - 0.35, Math.sin(a) * 0.3));
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.06, 8), candy(0x3dd68c, { metalness: 0.3 })));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), candy(0xff3d6e)).translateY(0.4));
      return g;
    },
    fish() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), candy(0xff8a3d, { emissive: 0xff5a00, emissiveIntensity: 0.4 }));
      body.scale.set(0.5, 0.6, 1);
      g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 4), candy(0xff5a1f));
      tail.rotation.x = -Math.PI / 2;
      tail.position.z = -0.62;
      g.add(tail);
      for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), candy(0x111111)).translateX(s * 0.2).translateY(0.1).translateZ(0.3));
      return g;
    },
  };
  const bubbleMat = candy(0xffffff, { transparent: true, opacity: 0.28, roughness: 0.02, depthWrite: false });
  function makePower(type) {
    return acquire(`power-${type}`, () => {
      const g = new THREE.Group();
      const inner = POWERS[type]();
      g.add(inner);
      if (type !== "fish") {
        const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16), bubbleMat);
        bubble.castShadow = false;
        g.add(bubble);
      }
      g.userData.inner = inner;
      return g;
    });
  }

  // --- Croquettes d'or (une seule géométrie instanciée) -------------------------------------
  const MAX_COINS = 500;
  const coinTex = canvasTexture(128, 128, (c, W) => {
    c.fillStyle = "#ffcf2e";
    c.fillRect(0, 0, W, W);
    c.fillStyle = "#e89a00";
    // Empreinte de patte
    c.beginPath();
    c.ellipse(64, 80, 24, 20, 0, 0, Math.PI * 2);
    c.fill();
    for (const [x, y] of [[34, 50], [52, 34], [76, 34], [94, 50]]) {
      c.beginPath();
      c.ellipse(x, y, 10, 12, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
  const coinGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 28);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = [
    candy(0xffc21a, { metalness: 0.75, roughness: 0.18, emissive: 0xff9a00, emissiveIntensity: 0.25 }),
    candy(0xffffff, { map: coinTex, metalness: 0.6, roughness: 0.2, emissive: 0xff9a00, emissiveIntensity: 0.2 }),
    candy(0xffffff, { map: coinTex, metalness: 0.6, roughness: 0.2, emissive: 0xff9a00, emissiveIntensity: 0.2 }),
  ];
  // Un InstancedMesh n'accepte qu'un matériau : on fusionne la face avec la texture
  const coins = new THREE.InstancedMesh(coinGeo, coinMat[1], MAX_COINS);
  coins.castShadow = true;
  coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coins.count = MAX_COINS;
  coins.frustumCulled = false;
  scene.add(coins);
  const coinFree = [];
  for (let i = MAX_COINS - 1; i >= 0; i -= 1) coinFree.push(i);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX_COINS; i += 1) coins.setMatrixAt(i, hidden);
  const coinObj = new THREE.Object3D();
  function coinAlloc() {
    return coinFree.length ? coinFree.pop() : -1;
  }
  function coinFreeSlot(i) {
    if (i < 0) return;
    coins.setMatrixAt(i, hidden);
    coinFree.push(i);
  }
  function coinSet(i, x, y, z, spin, scale = 1) {
    if (i < 0) return;
    coinObj.position.set(x, y, z);
    coinObj.rotation.set(0, spin, 0);
    coinObj.scale.setScalar(scale);
    coinObj.updateMatrix();
    coins.setMatrixAt(i, coinObj.matrix);
  }

  // --- Particules (étincelles, confettis) ---------------------------------------------------
  const MAXP = 700;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3);
  const pCol = new Float32Array(MAXP * 3);
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  // Particules rondes et douces (étoiles de sucre)
  const dotTex = canvasTexture(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,.9)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  const pMat = new THREE.PointsMaterial({ size: 0.32, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);
  const parts = [];
  function burst(x, y, z, color = 0xffd23f, count = 14, power = 5) {
    tmpColor.set(color);
    for (let i = 0; i < count; i += 1) {
      if (parts.length >= MAXP) parts.shift();
      parts.push({
        x, y, z,
        vx: (Math.random() - 0.5) * power,
        vy: Math.random() * power * 0.9 + 1,
        vz: (Math.random() - 0.5) * power,
        life: 0.5 + Math.random() * 0.5,
        r: tmpColor.r * 1.6, g: tmpColor.g * 1.6, b: tmpColor.b * 1.6,
      });
    }
  }
  function confetti(x, y, z, count = 80) {
    for (let i = 0; i < count; i += 1) burst(x, y, z, pick(palette), 1, 12);
  }
  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      p.vy -= 9 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
    for (let i = 0; i < MAXP; i += 1) {
      const p = parts[i];
      const j = i * 3;
      if (!p) {
        pPos[j + 1] = -999;
        continue;
      }
      pPos[j] = p.x;
      pPos[j + 1] = p.y;
      pPos[j + 2] = p.z;
      const f = Math.min(1, p.life * 2);
      pCol[j] = p.r * f;
      pCol[j + 1] = p.g * f;
      pCol[j + 2] = p.b * f;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  // Traits de vitesse
  const LINES = 60;
  const lGeo = new THREE.BufferGeometry();
  const lPos = new Float32Array(LINES * 6);
  lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
  const lMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const speedLines = new THREE.LineSegments(lGeo, lMat);
  speedLines.frustumCulled = false;
  scene.add(speedLines);
  const lineSeeds = Array.from({ length: LINES }, () => ({ a: Math.random() * Math.PI * 2, r: 3 + Math.random() * 4, z: Math.random() * 30 }));

  // --- Qualité adaptative ---------------------------------------------------------------
  let quality = 0;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  let size = { w: 1, h: 1 };
  function setQuality(level) {
    quality = level;
    const pr = [Math.min(window.devicePixelRatio || 1, 2), 1.5, 1.25, 1][Math.min(level, 3)];
    pixelRatio = Math.min(pr, window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = level < 3;
    sun.castShadow = level < 3;
    resize(size.w, size.h);
  }
  function resize(w, h) {
    size = { w, h };
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < h ? 74 : 60;
    camera.updateProjectionMatrix();
    tiltH.uniforms.h.value = 1.6 / (w * pixelRatio);
    tiltV.uniforms.v.value = 1.6 / (h * pixelRatio);
  }

  // --- Mise à jour du décor et rendu -------------------------------------------------------
  const camLook = new THREE.Vector3();
  let shake = 0;
  let camX = 0;
  let camY = 3;
  function update(dt, t, view) {
    const { playerX, playerY, playerZ, speed, mode, fly } = view;
    // Transition de couleurs entre deux mondes
    if (biomeBlend < 1) {
      biomeBlend = Math.min(1, biomeBlend + dt / 2.5);
      applyBiome(biomeBlend);
    }
    const biome = BIOMES[biomeIndex % BIOMES.length];
    // Mondes de nuit : lumière plus douce
    const lightK = biome.night ? 0.62 : 1;
    hemi.intensity += (0.75 * lightK - hemi.intensity) * Math.min(1, dt * 1.5);
    sun.intensity += (2.2 * lightK - sun.intensity) * Math.min(1, dt * 1.5);
    // Le sol, la piste et les bordures suivent Kichta ; leur texture défile
    const snap = playerZ;
    ground.position.set(0, -0.4, snap - 60);
    groundTex.offset.y = -(snap - 60) / 10;
    track.position.z = snap - 100;
    trackTex.offset.y = -track.position.z / (260 / 40);
    railTex.offset.y = (snap - 100) / (260 / 60);
    rails.forEach((r) => (r.position.z = snap - 100));
    sky.position.set(0, 0, snap);
    sunDisc.position.set(-60, 70, snap - 220);
    sun.position.set(playerX + 8, 22, snap + 6);
    sun.target.position.set(playerX, 0, snap - 10);

    // Décor : on ajoute devant, on retire derrière
    if (nextDecorZ > playerZ + 20) nextDecorZ = playerZ + 20;
    while (nextDecorZ > playerZ - 150) {
      spawnDecor(nextDecorZ, biome);
      nextDecorZ -= 4.5 + Math.random() * 3.5;
    }
    if (nextRainbowZ > playerZ - 40) nextRainbowZ = playerZ - 140;
    if (nextRainbowZ > playerZ - 160 && mode !== "menu") {
      const r = acquire("rainbow", rainbow);
      r.position.set(0, 0, nextRainbowZ);
      r.scale.setScalar(1);
      decor.push(r);
      nextRainbowZ -= 180 + Math.random() * 160;
    }
    for (let i = decor.length - 1; i >= 0; i -= 1) {
      const d = decor[i];
      if (d.position.z > playerZ + 20) {
        release(d);
        decor.splice(i, 1);
        continue;
      }
      if (d.userData.spin) d.userData.spin.rotation.y += dt * 1.2;
      if (d.userData.bob) d.userData.bob.position.y += Math.sin(t * 1.5 + d.userData.phase) * dt * 0.4;
    }

    // Caméra derrière Kichta, un peu au-dessus
    const portrait = size.w < size.h;
    const back = portrait ? 7.4 : 6.2;
    const up = portrait ? 4.2 : 3.4;
    camX += (playerX * 0.7 - camX) * Math.min(1, dt * 6);
    const targetY = up + Math.max(0, playerY) * (fly ? 0.75 : 0.45);
    camY += (targetY - camY) * Math.min(1, dt * 4);
    shake *= Math.exp(-dt * 8);
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    if (mode === "menu") {
      // Menu : Kichta de face, la caméra se balance doucement
      const a = Math.sin(t * 0.35) * 0.45;
      const dist = portrait ? 5.2 : 4.6;
      camera.position.set(playerX + Math.sin(a) * dist, portrait ? 1.9 : 1.5, playerZ + Math.cos(a) * dist);
      camLook.set(playerX, portrait ? 2.1 : 1.05, playerZ);
    } else {
      camera.position.set(camX + sx, camY + sy, playerZ + back);
      camLook.set(camX * 0.8, 1 + Math.max(0, playerY) * 0.6, playerZ - 8);
    }
    camera.lookAt(camLook);
    const baseFov = portrait ? 74 : 60;
    const wantFov = baseFov + Math.max(0, speed - 16) * 0.55 + (fly ? 6 : 0);
    camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();

    // Traits de vitesse quand on va très vite
    const lineAlpha = mode === "run" ? Math.min(0.55, Math.max(0, (speed - 21) / 14)) + (fly ? 0.25 : 0) : 0;
    lMat.opacity = lineAlpha;
    if (lineAlpha > 0) {
      lineSeeds.forEach((s, i) => {
        s.z -= speed * dt * 1.6;
        if (s.z < 0) s.z += 30;
        const x = camera.position.x + Math.cos(s.a) * s.r;
        const y = camera.position.y - 1 + Math.sin(s.a) * s.r * 0.6;
        const z = camera.position.z - s.z;
        lPos.set([x, y, z, x, y, z - 2.5], i * 6);
      });
      lGeo.attributes.position.needsUpdate = true;
    }
    updateParticles(dt);
    coins.instanceMatrix.needsUpdate = true;
  }

  function render() {
    if (quality >= 2) renderer.render(scene, camera);
    else {
      tiltH.enabled = tiltV.enabled = quality < 1;
      composer.render();
    }
  }

  function clearDecor(z = 0) {
    decor.splice(0).forEach(release);
    nextDecorZ = z + 18;
    nextRainbowZ = z - 140;
  }

  return {
    renderer,
    scene,
    camera,
    update,
    render,
    resize,
    setQuality,
    get quality() {
      return quality;
    },
    setBiome,
    get biomeIndex() {
      return biomeIndex;
    },
    acquire,
    release,
    OBSTACLES,
    makePower,
    coinAlloc,
    coinFreeSlot,
    coinSet,
    burst,
    confetti,
    shake(amount) {
      shake = Math.max(shake, amount);
    },
    clearDecor,
  };
}
