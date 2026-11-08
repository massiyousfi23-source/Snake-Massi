// Outils communs aux cinématiques : rendu « bonbon » (vernis, halo, effet miniature),
// textes à l'écran, petites aides d'animation.
import * as THREE from "../../vendor/three.module.min.js";
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass, HorizontalTiltShiftShader, VerticalTiltShiftShader, RoomEnvironment } from "../../vendor/three.addons.min.js";
import { canvasTexture } from "../toons.js?v=b7";

export const W = 1280;
export const H = 720;
export const FPS = 30;
export const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const seg = (t, a, b) => ease((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;

/** Scène d'intérieur (la chambre secrète) avec le même rendu que le jeu. */
export function createStage(canvas, { background = 0xffd6ea } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.05, 200);
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.45, 1.0));
  const th = new ShaderPass(HorizontalTiltShiftShader);
  const tv = new ShaderPass(VerticalTiltShiftShader);
  th.uniforms.h.value = 1.3 / W;
  tv.uniforms.v.value = 1.3 / H;
  th.uniforms.r.value = tv.uniforms.r.value = 0.45;
  composer.addPass(th);
  composer.addPass(tv);
  composer.addPass(new OutputPass());
  return { renderer, scene, camera, render: () => composer.render() };
}

/** Particules rondes additives (étincelles, cœurs de lumière, poussière). */
export function createSparks(scene, max = 900) {
  const dot = canvasTexture(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.4, "rgba(255,255,255,.8)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, w);
  });
  const pos = new Float32Array(max * 3);
  const col = new Float32Array(max * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  scene.add(pts);
  const parts = [];
  const c = new THREE.Color();
  return {
    burst(x, y, z, color, n = 20, power = 2, gravity = 4, life = 1) {
      c.set(color);
      for (let i = 0; i < n; i += 1) {
        if (parts.length >= max) parts.shift();
        parts.push({ x, y, z, vx: (Math.random() - 0.5) * power, vy: Math.random() * power, vz: (Math.random() - 0.5) * power, life: life * (0.6 + Math.random() * 0.6), g: gravity, r: c.r * 1.5, gg: c.g * 1.5, b: c.b * 1.5 });
      }
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.vy -= p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }
      for (let i = 0; i < max; i += 1) {
        const p = parts[i];
        if (!p) {
          pos[i * 3 + 1] = -999;
          continue;
        }
        pos.set([p.x, p.y, p.z], i * 3);
        const f = Math.min(1, p.life * 2);
        col.set([p.r * f, p.gg * f, p.b * f], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/** Titre et sous-titre en HTML par-dessus l'image. */
export function texts() {
  const title = document.querySelector("#title");
  const caption = document.querySelector("#caption");
  return {
    title(html, k) {
      if (title.innerHTML !== html) title.innerHTML = html;
      title.style.opacity = String(k);
      title.style.transform = `translate(-50%, 0) scale(${0.85 + k * 0.15})`;
    },
    caption(text, k) {
      if (caption.textContent !== text) caption.textContent = text;
      caption.style.opacity = String(k);
    },
  };
}

/** Une boîte de pâtée pour chat (étiquette rose). */
let canTex = null;
export function makeCan(candy) {
  if (!canTex) {
    canTex = canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = "#ff7fb5";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff";
      g.fillRect(0, 14, w, 8);
      g.fillRect(0, h - 22, w, 8);
      g.font = "bold 34px Arial Rounded MT Bold, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText("PÂTÉE", w * 0.3, 64);
      g.fillText("PÂTÉE", w * 0.8, 64);
      g.font = "28px serif";
      g.fillText("🐟 ★ 🐟", w * 0.3, 98);
      g.fillText("🐟 ★ 🐟", w * 0.8, 98);
    });
  }
  const g = new THREE.Group();
  const metal = candy(0xdfe4ec, { metalness: 0.8, roughness: 0.2 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 28), [candy(0xffffff, { map: canTex }), metal, metal]));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 8, 28), metal).rotateX(Math.PI / 2).translateZ(-0.15));
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/** Un morceau de pâtée (pour les brochettes et la gamelle). */
export function makePateeChunk(candy, s = 0.12) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), candy(0x8a4a2a, { roughness: 0.45, clearcoat: 0.6 }));
  m.scale.set(1, 0.85, 1);
  m.castShadow = true;
  return m;
}
