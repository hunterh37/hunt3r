import * as THREE from 'three';
import { toonMaterial } from './toon.js';

// App icons as blade signs off the alley walls (z = ±2.5), facing the camera's final view down +x.
const ICONS = ['vision3d', 'viralcooker', 'cyberzombies', 'marriott-bonvoy', 'veep-ar', 'vibebike-synthwave-rider', 'demi', 'johnnys-crazy-taxi'];

export function createSigns() {
  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL;
  const plate = new THREE.PlaneGeometry(1, 1);
  const frameMat = toonMaterial();
  const frameGeo = new THREE.BoxGeometry(1, 1, 1);
  frameGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(frameGeo.attributes.position.count * 3).fill(0.04), 3));
  ICONS.forEach((name, i) => {
    const side = i % 2 ? 1 : -1;               // -1 north wall, +1 south wall
    const x = -38 + i * 5.2, size = 1.5 + (i % 3) * 0.2;
    const y = 3.4 + ((i * 1.7) % 2.2);
    const z = side * (2.5 - 0.25 - size / 2);  // hangs off the wall into the alley
    const tex = loader.load(`${base}apps/${name}.jpg`);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    const icon = new THREE.Mesh(plate, toonMaterial({ map: tex }));
    icon.scale.set(size, size, 1);
    icon.rotation.y = -Math.PI / 2;            // normal faces -x, toward the camera
    icon.position.set(x - 0.06, y, z);
    const back = new THREE.Mesh(frameGeo, frameMat);
    back.scale.set(0.08, size + 0.14, size + 0.14);
    back.position.set(x, y, z);
    // bracket from the wall
    const arm = new THREE.Mesh(frameGeo, frameMat);
    arm.scale.set(0.06, 0.06, 0.3);
    arm.position.set(x, y + size / 2 + 0.04, side * 2.35);
    for (const m of [icon, back, arm]) { m.frustumCulled = false; group.add(m); }
  });
  return { group };
}
