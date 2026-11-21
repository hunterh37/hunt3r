import * as THREE from 'three';
import { toonMaterial } from './toon.js';

// App icons mounted flat on the two alley walls (z = ±2.5) where the camera drops in.
const ICONS = ['veep-ar', 'demi', 'marriott-bonvoy', 'viralcooker', 'vision3d']; // same 5 as the phone APPS list

export function createSigns() {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const plate = new THREE.PlaneGeometry(1, 1);
  const frameMat = toonMaterial();
  const frameGeo = new THREE.BoxGeometry(1, 1, 1);
  frameGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(frameGeo.attributes.position.count * 3).fill(0.04), 3));
  // Two vertical columns, flat on the facing walls, beside the camera's drop into the alley (x -46).
  // House at cx -45.5 (rows 2 and 3): windows at cx ±1.7, rows y 4.6 / 8.3 / 12.0, so the 2 m gap at cx is clear.
  const SIZE = 1.5, X = -45.5, ROWS_Y = [4.6, 8.3, 12.0].map((y) => y + 0.85);
  ICONS.forEach((name, i) => {
    const side = i % 2 ? 1 : -1;               // -1 north wall faces +z, +1 south wall faces -z
    const y = ROWS_Y[Math.floor(i / 2)];
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
