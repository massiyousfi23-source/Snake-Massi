// Fourrure en temps réel par « coquilles » : chaque partie du pelage est
// dupliquée en fines couches décalées le long des normales ; une texture de
// bruit perce les couches pour dessiner des poils qui s'affinent vers la pointe.
import * as THREE from "../vendor/three.module.min.js";

const noiseTexture = (() => {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    // Poils de longueurs variées : beaucoup de courts, quelques longs
    const v = Math.pow(Math.random(), 0.65) * 255;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
})();

function shellMaterial(base, k, offset, density) {
  const material = new THREE.MeshStandardMaterial({
    map: base.map || null,
    color: base.color.clone(),
    roughness: 0.95,
    metalness: 0,
  });
  material.defines = { USE_UV: "" };
  const uniforms = {
    furK: { value: k },
    furOffset: { value: offset },
    furDensity: { value: density },
    furNoise: { value: noiseTexture },
  };
  material.userData.furUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float furK;\nuniform float furOffset;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed += normalize(objectNormal) * furOffset * furK;
        transformed.y -= furOffset * furK * furK * 0.45;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float furK;\nuniform float furDensity;\nuniform sampler2D furNoise;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float furStrand = texture2D(furNoise, vUv * vec2(furDensity * 2.0, furDensity)).r;
        if (furStrand < furK * 0.92 + 0.06) discard;
        diffuseColor.rgb *= mix(0.55, 1.12, furK);`,
      );
  };
  material.customProgramCacheKey = () => "fourrure-coquille";
  return material;
}

/**
 * Ajoute la fourrure à toutes les pièces dont le matériau porte userData.fur.
 * length : longueur des poils dans les unités du modèle.
 */
export function addFur(root, { layers = 8, length = 0.014, density = 70 } = {}) {
  const targets = [];
  root.traverse((object) => {
    if (object.isMesh && object.material && object.material.userData && object.material.userData.fur) targets.push(object);
  });
  const cache = new Map();
  const shells = [];
  for (const mesh of targets) {
    const s = (Math.abs(mesh.scale.x) + Math.abs(mesh.scale.y) + Math.abs(mesh.scale.z)) / 3 || 1;
    const offset = length / s;
    for (let i = 1; i <= layers; i += 1) {
      const k = i / layers;
      const key = `${mesh.material.uuid}:${i}:${offset.toFixed(4)}`;
      let material = cache.get(key);
      if (!material) {
        material = shellMaterial(mesh.material, k, offset, density * (mesh.material.userData.furDensity || 1));
        cache.set(key, material);
      }
      const shell = new THREE.Mesh(mesh.geometry, material);
      shell.castShadow = false;
      shell.receiveShadow = false;
      shell.userData.isFurShell = true;
      shell.userData.layer = i;
      mesh.add(shell);
      shells.push(shell);
    }
  }
  root.userData.furShells = shells;
  root.userData.furLayers = layers;
  return shells;
}

/** Garde une couche sur n (qualité adaptative). */
export function setFurQuality(root, keepEvery = 1) {
  for (const shell of root.userData.furShells || []) {
    shell.visible = keepEvery > 0 && shell.userData.layer % keepEvery === 0;
  }
}
