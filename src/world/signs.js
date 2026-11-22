import * as THREE from 'three';
import { toonMaterial } from './toon.js';

// App icons mounted flat on the two alley walls (z = ±2.5) along the ground walk (x 38..60).
const ICONS = ['veep-ar', 'demi', 'marriott-bonvoy', 'viralcooker', 'vision3d', 'whop']; // phone APPS list plus Whop (top row, south wall)

export function createSigns() {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const plate = new THREE.PlaneGeometry(1, 1);
  const frameMat = toonMaterial();
  const frameGeo = new THREE.BoxGeometry(1, 1, 1);
  frameGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(frameGeo.attributes.position.count * 3).fill(0.04), 3));
  // One pair per house on the last three houses (cx 38.5 / 45.5 / 52.5), at walking eye level in the clear gap at cx.
  // +0.4 m off cx clears the door canopy (ends cx-0.75) and the ground window (starts cx+1.2).
  const SIZE = 1.4, XS = [38.9, 45.9, 52.9], Y = 2.6;
  ICONS.forEach((name, i) => {
    const side = i % 2 ? 1 : -1;               // -1 north wall faces +z, +1 south wall faces -z
    const y = Y, X = XS[Math.floor(i / 2)];
    const z = side * (2.5 - 0.06);
    const tex = loader.load(`${base}apps/${name}.jpg`);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    const icon = new THREE.Mesh(plate, toonMaterial({ map: tex }));
    icon.scale.set(SIZE, SIZE, 1);
    icon.rotation.y = side < 0 ? 0 : Math.PI;
    icon.position.set(X, y, z);
    const back = new THREE.Mesh(frameGeo, frameMat);
    back.scale.set(SIZE + 0.16, SIZE + 0.16, 0.06);
    back.position.set(X, y, side * 2.5);
    for (const m of [icon, back]) { m.frustumCulled = false; group.add(m); }
  });
  return { group };
}
