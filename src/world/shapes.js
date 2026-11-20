import * as THREE from 'three';
import { mulberry } from './builder.js';

// 2D inside tests in unit space (about -1..1, +v is screen up). Used for deck openings and icon clouds.
const circ = (u, v, cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 < r * r;
const ell = (u, v, cx, cy, rx, ry, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a), x = u - cx, y = v - cy;
  return ((x * c + y * s) / rx) ** 2 + ((-x * s + y * c) / ry) ** 2 < 1;
};
const rrect = (u, v, cx, cy, hw, hh, r, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a), x = u - cx, y = v - cy;
  const qx = Math.abs(x * c + y * s) - hw + r, qy = Math.abs(-x * s + y * c) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r < 0;
};
const capsule = (u, v, ax, ay, bx, by, r) => {
  const dx = bx - ax, dy = by - ay, t = Math.min(1, Math.max(0, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(u - ax - dx * t, v - ay - dy * t) < r;
};
const poly = (pts) => (u, v) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const SHAPES = {
  apple: (u, v) =>
    ((circ(u, v, -0.32, 0.05, 0.55) || circ(u, v, 0.32, 0.05, 0.55) || ell(u, v, 0, -0.35, 0.62, 0.55) ||
      ell(u, v, -0.2, -0.62, 0.3, 0.25) || ell(u, v, 0.2, -0.62, 0.3, 0.25)) &&
      !circ(u, v, 0.92, 0.0, 0.32) && !circ(u, v, 0, 0.62, 0.14)) ||
    ell(u, v, 0.14, 0.82, 0.12, 0.26, -0.75),
  iphone: (u, v) => rrect(u, v, 0, 0, 0.5, 1.0, 0.25),
  hand: (u, v) =>
    rrect(u, v, 0.05, 0.25, 0.38, 0.72, 0.1, -0.12) ||
    ell(u, v, -0.05, -0.55, 0.5, 0.42) ||
    rrect(u, v, -0.05, -1.05, 0.34, 0.45, 0.1) ||
    capsule(u, v, -0.4, -0.45, -0.52, 0.12, 0.13) ||
    capsule(u, v, 0.38, -0.2, 0.5, 0.42, 0.11) ||
    capsule(u, v, 0.4, -0.45, 0.55, 0.15, 0.11) ||
    capsule(u, v, 0.35, -0.68, 0.52, -0.15, 0.1),
  swift: poly([[-0.95, 0.75], [-0.1, 0.05], [-0.85, 0.55], [-0.6, 0.15], [0.05, -0.35], [-0.3, -0.55], [-0.85, -0.55],
    [-0.35, -0.85], [0.25, -0.75], [0.65, -0.55], [0.85, -0.75], [0.8, -0.3], [0.55, 0.3], [0.1, 0.95], [0.25, 0.4], [-0.3, 0.75]]),
  gear: (u, v) => {
    const r = Math.hypot(u, v), a = Math.atan2(v, u);
    const tooth = Math.cos(a * 8) > 0.25 ? 0.95 : 0.75;
    return r < tooth && r > 0.3;
  },
  heart: (u, v) => { const x = u * 1.15, y = v * 1.15 + 0.15; return (x * x + y * y - 1) ** 3 - x * x * y ** 3 < 0; },
  pin: (u, v) => (circ(u, v, 0, 0.3, 0.6) || poly([[-0.5, 0.0], [0.5, 0.0], [0, -0.95]])(u, v)) && !circ(u, v, 0, 0.3, 0.24),
  cube: (u, v) => {
    const hex = poly([[0, 0.95], [0.82, 0.48], [0.82, -0.48], [0, -0.95], [-0.82, -0.48], [-0.82, 0.48]]);
    const inner = poly([[0, 0.7], [0.6, 0.35], [0.6, -0.35], [0, -0.7], [-0.6, -0.35], [-0.6, 0.35]]);
    return hex(u, v) && !(inner(u, v) && !capsule(u, v, 0, 0, 0, -0.7, 0.07) && !capsule(u, v, 0, 0, 0.6, 0.35, 0.07) && !capsule(u, v, 0, 0, -0.6, 0.35, 0.07));
  },
  code: (u, v) =>
    capsule(u, v, -0.35, 0.55, -0.85, 0, 0.12) || capsule(u, v, -0.85, 0, -0.35, -0.55, 0.12) ||
    capsule(u, v, 0.35, 0.55, 0.85, 0, 0.12) || capsule(u, v, 0.85, 0, 0.35, -0.55, 0.12) ||
    capsule(u, v, 0.18, 0.7, -0.18, -0.7, 0.11),
  hammer: (u, v) => rrect(u, v, -0.1, 0.55, 0.7, 0.2, 0.06, 0.35) || rrect(u, v, 0.15, -0.25, 0.12, 0.75, 0.08, 0.35),
};

const puffGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = g.attributes.position.getY(i) < -0.3 ? 0.7 : 0.84; col.set([c, c, c], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
})();

// Camera looks down with yaw -90deg: screen up = +X, screen right = +Z.
const toWorld = (cx, cz, size, u, v, out) => out.set(cx + v * size, 0, cz + u * size);

function instance(mat, puffs) {
  const mesh = new THREE.InstancedMesh(puffGeo, mat, puffs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  puffs.forEach((p, i) => { sc.set(p.r, p.r * p.flat, p.r); m4.compose(p.pos, q, sc); mesh.setMatrixAt(i, m4); });
  mesh.frustumCulled = false;
  return mesh;
}

// Cloud deck with a shaped opening: puffs fill a disc of radius outer except where the shape is.
export function cloudDeck(mat, { shape, cx, cy, cz, size, outer = 340, step = 15, seed = 1 }) {
  const inside = SHAPES[shape], rnd = mulberry(seed), puffs = [];
  const tmp = new THREE.Vector3(), e = step / size;
  for (let a = -outer; a <= outer; a += step) {
    for (let b = -outer; b <= outer; b += step) {
      const ja = a + (rnd() - 0.5) * step * 0.5, jb = b + (rnd() - 0.5) * step * 0.5;
      const d = Math.hypot(ja, jb);
      if (d > outer * (0.9 + rnd() * 0.12)) continue;
      const u = jb / size, v = ja / size;
      if (inside(u, v)) continue;
      let near = false;
      for (let k = 0; k < 8 && !near; k++) {
        const t = (k / 8) * Math.PI * 2;
        if (inside(u + Math.cos(t) * e * 1.3, v + Math.sin(t) * e * 1.3)) near = true;
      }
      if (near) continue; // the fine pass below draws the rim
      toWorld(cx, cz, size, u, v, tmp);
      tmp.y = cy + (rnd() - 0.4) * step * 0.9 + Math.min(1, d / outer) * step * 1.4;
      puffs.push({ pos: tmp.clone(), r: step * (0.85 + rnd() * 0.6), flat: 0.55 + rnd() * 0.25 });
    }
  }
  // Fine rim: small puffs hugging the outline so the opening keeps its exact silhouette.
  const fs = step / 3.2, fr = fs * 0.85, fe = fr / size;
  for (let a = -size * 1.6; a <= size * 1.6; a += fs) {
    for (let b = -size * 1.6; b <= size * 1.6; b += fs) {
      const u = b / size, v = a / size;
      if (inside(u, v)) continue;
      let clear = true, near = false;
      for (let k = 0; k < 12; k++) {
        const t = (k / 12) * Math.PI * 2;
        if (inside(u + Math.cos(t) * fe, v + Math.sin(t) * fe)) clear = false;
        if (inside(u + Math.cos(t) * e * 1.6, v + Math.sin(t) * e * 1.6)) near = true;
      }
      if (!clear || !near) continue;
      toWorld(cx, cz, size, u, v, tmp);
      tmp.y = cy + (rnd() - 0.5) * fs * 0.4;
      puffs.push({ pos: tmp.clone(), r: fr * (1 + rnd() * 0.15), flat: 0.8 });
    }
  }
  return instance(mat, puffs);
}

// Solid cloud in the silhouette of an icon, lying flat so it reads from above.
export function iconCloud(mat, { shape, cx, cy, cz, size, step = 7, seed = 1 }) {
  const inside = SHAPES[shape], rnd = mulberry(seed), puffs = [];
  const tmp = new THREE.Vector3();
  for (let a = -size * 1.2; a <= size * 1.2; a += step) {
    for (let b = -size * 1.2; b <= size * 1.2; b += step) {
      const u = b / size, v = a / size;
      if (!inside(u, v)) continue;
      toWorld(cx, cz, size, u, v, tmp);
      tmp.y = cy + (rnd() - 0.5) * step * 0.4;
      puffs.push({ pos: tmp.clone(), r: step * (0.7 + rnd() * 0.15), flat: 0.6 });
    }
  }
  return instance(mat, puffs);
}
