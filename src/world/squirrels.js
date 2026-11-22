import * as THREE from 'three';
import { Builder } from './builder.js';

// Grey-world squirrels for the colour beat: two climb trunks, two dart along the Comm Ave mall.
// Model space: +x nose, +y back, belly -y. Saturated vertex colours render flat in the toon shader.
const FUR = [0.52, 0.33, 0.2], DARK = [0.36, 0.22, 0.13], BELLY = [0.86, 0.72, 0.56], TAIL = [0.6, 0.4, 0.25], EYE = 0.03;

function bodyGeo() {
  const B = new Builder();
  B.sphere(-0.05, 0.0, 0, 0.085, FUR, 2, 0.95);        // haunch
  B.sphere(0.03, 0.01, 0, 0.07, FUR, 2, 0.95);         // ribcage
  B.sphere(0.02, -0.03, 0, 0.055, BELLY, 2, 0.8);      // belly
  B.sphere(0.1, 0.035, 0, 0.05, FUR, 2);               // shoulders
  B.sphere(0.155, 0.065, 0, 0.048, FUR, 2, 0.95);      // head
  B.sphere(0.2, 0.055, 0, 0.026, FUR, 2, 0.9);         // snout
  B.sphere(0.222, 0.058, 0, 0.009, DARK, 1);           // nose
  B.sphere(0.165, 0.04, 0, 0.032, BELLY, 1, 0.8);      // cheek / throat
  for (const sz of [-1, 1]) {
    B.sphere(0.175, 0.08, sz * 0.03, 0.009, EYE, 1);   // eye
    B.tube([0.14, 0.1, sz * 0.022], [0.135, 0.145, sz * 0.03], 0.012, 0.004, 6, DARK); // ear
    B.sphere(-0.06, -0.02, sz * 0.05, 0.05, FUR, 2, 1.1);  // thigh
    B.tube([-0.035, -0.06, sz * 0.05], [0.02, -0.085, sz * 0.045], 0.014, 0.01, 6, DARK); // hind foot
    B.tube([0.1, 0.0, sz * 0.03], [0.12, -0.07, sz * 0.032], 0.012, 0.008, 6, FUR);     // foreleg
  }
  return B.build();
}
function tailGeo() {
  const B = new Builder(), pts = [[0, 0], [-0.07, 0.07], [-0.1, 0.17], [-0.08, 0.27], [-0.02, 0.32], [0.03, 0.31]];
  pts.forEach(([x, y], i) => { const r = 0.035 + 0.035 * Math.sin((i / (pts.length - 1)) * Math.PI); B.sphere(x, y, 0, r, i % 2 ? TAIL : FUR, 2, 1); });
  return B.build();
}

export function createSquirrels(mat) {
  const group = new THREE.Group(), bg = bodyGeo(), tg = tailGeo();
  const make = () => {
    const root = new THREE.Group(), body = new THREE.Mesh(bg, mat), tail = new THREE.Mesh(tg, mat);
    tail.position.set(-0.12, 0.03, 0); body.add(tail); root.add(body);
    for (const m of [body, tail]) m.frustumCulled = false;
    root.scale.setScalar(1.5);
    group.add(root);
    return { root, body, tail };
  };
  const S = [
    { kind: 'climb', x: 68, z: 39.4, r: 0.42, sp: 0.55, ph: 0.3 },
    { kind: 'climb', x: 58.5, z: 39.4, r: 0.42, sp: 0.8, ph: 2.1 },
    { kind: 'run', x0: 50, x1: 78, z: 38.4, sp: 0.07, ph: 0.0 },
    { kind: 'run', x0: 56, x1: 74, z: 46.6, sp: 0.1, ph: 0.6 },
  ].map((d) => ({ ...d, ...make() }));
  const f = new THREE.Vector3(), u = new THREE.Vector3(), w = new THREE.Vector3(), M = new THREE.Matrix4();
  const orient = (q, fx, fy, fz, ux, uy, uz) => { f.set(fx, fy, fz).normalize(); u.set(ux, uy, uz); w.crossVectors(f, u); q.setFromRotationMatrix(M.makeBasis(f, u, w)); };
  group.visible = false;

  return {
    group,
    update(p, t) {
      group.visible = p > 0.795;
      if (!group.visible) return;
      for (const s of S) {
        let gait;
        if (s.kind === 'climb') {
          // dash up, freeze, dash down: eased bursts with pauses
          const c = (t * s.sp + s.ph) % 4, k = c < 1 ? c : c < 2 ? 1 : c < 3 ? 3 - c : 0;
          const e = k * k * (3 - 2 * k), up = (c < 1) || (c >= 2 && c < 3) ? (c < 1 ? 1 : -1) : 0;
          const a = -Math.PI / 2 + 0.5 * Math.sin(t * 0.3 + s.ph);            // camera side of the trunk, wandering a little
          const ox = Math.cos(a) * s.r, oz = Math.sin(a) * s.r;
          s.root.position.set(s.x + ox, 0.25 + 2.9 * e, s.z + oz);
          orient(s.root.quaternion, 0, up >= 0 ? 1 : -1, 0, ox, 0, oz);
          gait = up !== 0 ? 1 : 0;
        } else {
          // runs a stretch, stops to look around, turns back
          const c = (t * s.sp + s.ph) % 2, dir = c < 1 ? 1 : -1, k = c < 1 ? c : 2 - c;
          const e = Math.min(1, Math.max(0, (k - 0.1) / 0.8)), m = e * e * (3 - 2 * e);
          const moving = k > 0.1 && k < 0.9;
          s.root.position.set(s.x0 + (s.x1 - s.x0) * m, 0.5 + 0.09, s.z + 0.3 * Math.sin(k * 9 + s.ph));
          orient(s.root.quaternion, dir, 0, 0.15 * Math.cos(k * 9 + s.ph), 0, 1, 0);
          gait = moving ? 1 : 0;
        }
        const ph = t * 16 + s.ph * 5;
        s.body.position.y = gait * 0.05 * Math.abs(Math.sin(ph));
        s.body.rotation.z = gait * 0.18 * Math.sin(ph) + (1 - gait) * 0.05 * Math.sin(t * 3 + s.ph);
        s.tail.rotation.z = 0.25 * Math.sin(ph * (gait ? 1 : 0.2) + 1) - gait * 0.3;
      }
    },
  };
}
