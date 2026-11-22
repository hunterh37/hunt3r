import * as THREE from 'three';
import { Builder } from './builder.js';

// Comm Ave traffic seen from the end spot (x 64, looking +z): two lanes between the parked row (z 28.3) and the mall (z 37.5).
const T = (v, tag) => [v, v + tag * 0.01, v]; // colour tag, see toon.js
const L = 320, X0 = 64 - L / 2;

function carGeo(tone, tag) {
  const B = new Builder(), c = T(tone, tag);
  B.box(0, 0.35, 0, 4.3, 0.85, 1.8, c);
  B.box(-0.1, 1.2, 0, 2.3, 0.75, 1.6, c, 0, 0.3, 0.1);
  B.box(-0.1, 1.3, 0, 2.35, 0.5, 1.62, 0.1, 0, 0.35, 0.05);
  for (const sx of [-1.4, 1.4]) for (const sz of [-0.9, 0.9]) B.tube([sx, 0.38, sz], [sx, 0.38, sz + Math.sign(sz) * 0.15], 0.38, 0.38, 8, 0.1);
  return B.build();
}

export function createTraffic(mat) {
  const group = new THREE.Group();
  const cars = [];
  const lanes = [{ z: 31.2, dir: -1, v: 15 }, { z: 34.6, dir: 1, v: 13 }];
  lanes.forEach((ln, li) => {
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(carGeo(k % 2 ? 0.92 : 0.3, (k + li) % 2 ? 5 : 6), mat);
      m.rotation.y = ln.dir > 0 ? 0 : Math.PI;
      m.frustumCulled = false;
      group.add(m);
      cars.push({ id: 100 + cars.length, m, ln, off: (k / 4) * L + li * 37 + (k * 53) % 29 });
    }
  });
  group.visible = false;
  const H = new THREE.Vector3(2.2, 0.85, 1.0);
  const boxes = () => cars.map((c) => ({ id: c.id, label: `CAR · ${Math.round(c.ln.v * 3.6)} KM/H`, conf: 0.9 + (c.id % 7) * 0.012, c: c.m.position.clone().setY(0.95), h: H }));
  return {
    group, boxes,
    update(p, t) {
      group.visible = p > 0.7;
      if (!group.visible) return;
      for (const c of cars) {
        const u = (((t * c.ln.v + c.off) % L) + L) % L;
        c.m.position.set(c.ln.dir > 0 ? X0 + u : X0 + L - u, 0.14, c.ln.z);
      }
    },
  };
}
