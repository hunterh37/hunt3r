import * as THREE from 'three';
import { Builder, mulberry } from './builder.js';

// Back Bay, simplified. x east-west, z north(-) to south(+). Alley centreline is z=0, camera ends at x=-46 looking +x.
// Row = [zNorth, zSouth, backDir]. backDir +1: back wall at zSouth faces +z.
const ROWS = [
  [-89.5, -67.5, 1], [-62.5, -40.5, -1], [-24.5, -2.5, 1], [2.5, 24.5, -1],
  [60.5, 82.5, 1], [87.5, 109.5, -1], [125.5, 147.5, 1], [152.5, 174.5, -1],
];
const BLOCKS = [-2, -1, 0, 1, 2, 3];
const BLOCKS_ALLEY = [-2, -1, 0, 1];
const LOT = 7, PERBLOCK = 16, PERIOD = 128;
const GL = 0.2;
const XMIN = -312, XMAX = 440;
// colour tag for the ground-level colour spread (toon.js): tiny g offset, stays grey until coloured
const T = (v, tag) => [v, v + tag * 0.01, v];

export function buildCity(signMat) {
  const B = new Builder();
  const rnd = mulberry(431);
  const R = (a, b) => a + rnd() * (b - a);
  const group = new THREE.Group();

  // ---- ground ----
  B.box(60, -0.4, 250, 4000, 0.4, 1000, 0.8);           // land, top y=0
  B.box(60, -1.9, -760, 4000, 0.7, 1250, 0.5);           // river, top y=-1.2
  B.box(60, -1.2, -135.5, 4000, 1.2, 1, 0.74);           // sea wall face
  const street = (x0, x1, z0, z1, c = 0.36, h = 0.14) => B.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, T(c, 7));
  for (const [a, b] of [[-105.5, -89.5], [-40.5, -24.5], [24.5, 60.5], [109.5, 125.5], [174.5, 190.5]]) street(XMIN - 16, XMAX + 16, a, b);
  for (const a of [-67.5, 82.5, 147.5]) street(XMIN - 16, XMAX + 16, a, a + 5, 0.46, 0.13);
  street(XMIN - 16, XMAX + 16, -2.5, 2.5, 0.8);
  for (const b of [-3, -2, -1, 0, 1, 2, 3]) street(b * PERIOD + 56, b * PERIOD + 72, -105.5, 190.5, 0.36, 0.12); // lower than the E-W streets: no coplanar tops at crossings
  // Comm Ave mall
  B.box(60, 0, 42.5, XMAX - XMIN + 32, 0.5, 10, T(0.78, 8));
  B.box(60, 0.5, 42.5, XMAX - XMIN + 32, 0.04, 2.2, 0.95);
  // Esplanade
  B.box(60, 0, -120, XMAX - XMIN + 400, 0.12, 29.5, 0.76);
  B.box(60, 0.12, -121, XMAX - XMIN + 400, 0.04, 3, 0.95);
  for (let i = 0; i < 70; i++) {
    const x = XMIN - 100 + i * 11 + R(-2, 2), z = R(-130, -110);
    tree(x, z, R(0.8, 1.1));
  }
  // lawn blocks and river ripples
  for (let i = 0; i < 160; i++) B.box(R(XMIN - 300, XMAX + 300), -1.2, R(-700, -140), R(5, 12), 0.1, 0.5, 0.97);
  // Cambridge shore
  for (let i = 0; i < 60; i++) { const w = R(14, 40); B.box(-500 + i * 22, 0, -700, w, R(8, 38), R(14, 26), R(0.5, 0.72)); }

  function tree(x, z, s = 1) {
    B.cyl(x, 0, z, 0.35 * s, 3.6 * s, 6, T(0.4, 2));
    B.sphere(x, 6.2 * s, z, 3.2 * s, T(0.82, 1), 1, 0.9);
    B.sphere(x + 0.5 * s, 8.4 * s, z - 0.3 * s, 2.0 * s, T(0.9, 1), 1, 0.9);
  }

  // street trees
  for (let x = XMIN; x < XMAX; x += 9.5) { tree(x, 39.4, 1.05); tree(x + 4.7, 45.6, 1.05); }
  for (let x = XMIN + 4; x < XMAX; x += 14) { tree(x, -26.2, 0.8); tree(x + 6, -38.8, 0.8); tree(x + 3, 111.4, 0.8); tree(x + 8, 123.2, 0.8); }

  // parked cars on streets
  const car = (x, z, tone) => {
    const ct = T(tone, Math.floor(x) & 1 ? 5 : 6);
    B.box(x, 0.35, z, 4.3, 0.85, 1.8, ct);
    B.box(x - 0.1, 1.2, z, 2.3, 0.75, 1.6, ct, 0, 0.3, 0.1);
    B.box(x - 0.1, 1.3, z, 2.35, 0.5, 1.62, 0.1, 0, 0.35, 0.05);
    for (const sx of [-1.4, 1.4]) for (const sz of [-0.8, 0.8]) B.tube([x + sx, 0.38, z + sz * 1.0], [x + sx, 0.38, z + sz * 1.0 + sz * 0.15], 0.38, 0.38, 8, 0.1);
  };
  for (let x = XMIN; x < XMAX; x += R(8, 18)) { if (rnd() < 0.7) car(x, -26.5, rnd() < 0.5 ? 0.92 : 0.3); if (rnd() < 0.7) car(x + 3, 28.3, rnd() < 0.5 ? 0.92 : 0.3); if (rnd() < 0.7) car(x + 2, 110.8, rnd() < 0.5 ? 0.92 : 0.3); }

  // ---- row houses ----
  ROWS.forEach((row, ri) => {
    for (const b of (ri === 2 || ri === 3 ? BLOCKS_ALLEY : BLOCKS)) for (let i = 0; i < PERBLOCK; i++) {
      const cx = b * PERIOD - 56 + LOT / 2 + LOT * i;
      const A = (ri === 2 || ri === 3) && cx > -140 && cx < 57;
      house(cx, row, A, ri, i);
    }
  });

  function house(cx, [z0, z1, bd], A, ri, i) {
    const zc = (z0 + z1) / 2, D = 22, W = LOT - 0.02;
    const H = 15.2 + Math.floor(rnd() * 3) * 0.6;
    const tone = 0.66 + rnd() * 0.12;
    const fd = -bd;
    const zF = bd > 0 ? z0 : z1, zK = bd > 0 ? z1 : z0;
    B.box(cx, 0, zc, W, H, D, T(tone, 3));
    B.box(cx, H, zc, W, 3.2, D, T(0.34, 9), 0, 1.1, 1.5);
    B.box(cx, H + 3.2, zc, W - 2.2, 0.3, D - 3, 0.9);
    B.box(cx + R(-1.2, 1.2), H + 3.2, zc + R(-6, 6), 0.9, 2.3, 0.9, 0.45);
    if (rnd() < 0.7) B.box(cx + R(-1.2, 1.2), H + 3.2, zc + R(-6, 6), 0.9, 1.8, 0.9, 0.45);
    if (rnd() < 0.3) { // roof deck
      B.box(cx, H + 3.5, zc, 3.4, 0.14, 4.4, 0.85);
      for (const sx of [-1.7, 1.7]) B.beam([cx + sx, H + 3.5, zc - 2.2], [cx + sx, H + 4.5, zc - 2.2], 0.04, 0.1);
      B.beam([cx - 1.7, H + 4.5, zc - 2.2], [cx + 1.7, H + 4.5, zc - 2.2], 0.04, 0.1);
    }
    // dormers on mansard
    for (const side of [fd, bd]) {
      const zz = zc + side * (D / 2 - 0.9);
      B.box(cx, H + 0.4, zz, 1.5, 1.7, 1.0, 0.24);
      B.box(cx, H + 0.9, zz + side * 0.52, 0.9, 0.9, 0.08, GL);
    }
    // front: bay, windows, door, stoop
    B.box(cx, 2.6, zF + fd * 0.65, 3.4, 11.8, 1.3, T(Math.min(tone + 0.1, 0.8), 3));
    B.box(cx, 14.4, zF + fd * 0.65, 3.8, 0.35, 1.6, 0.9);
    for (const y of [4.1, 7.8, 11.5]) {
      B.box(cx, y, zF + fd * 1.33, 2.5, 1.7, 0.1, GL);
      B.box(cx - 2.6, y, zF + fd * 0.06, 0.9, 1.7, 0.1, GL);
      B.box(cx + 2.6, y, zF + fd * 0.06, 0.9, 1.7, 0.1, GL);
      B.box(cx - 2.6, y + 1.7, zF + fd * 0.1, 1.2, 0.18, 0.2, 0.92);
    }
    B.box(cx + 2.5, 0, zF + fd * 0.06, 1.0, 2.5, 0.1, GL);
    B.box(cx + 2.5, 0, zF + fd * 0.9, 1.8, 0.7, 1.5, 0.82);
    // back
    if (!A) {
      for (const y of [3.2, 7.0, 10.8]) B.box(cx, y, zK + bd * 0.06, 4.8, 1.5, 0.1, 0.4);
      return;
    }
    back(cx, zK, bd, tone, ri, i);
  }

  function back(cx, zK, bd, tone, ri, i) {
    const o = (d) => zK + bd * d;
    for (const y of [4.6, 8.3, 12.0]) for (const sx of [-1.7, 1.7]) {
      const lit = ri === 2 && Math.abs(cx - 45.5) < 0.1 && sx > 0 && y === 4.6;
      B.box(cx + sx, y, o(0.07), 1.0, 1.7, 0.1, GL);
      B.box(cx + sx, y + 1.7, o(0.12), 1.4, 0.22, 0.24, 0.92);
      if (cx < 30 && !lit) { B.box(cx + sx, y, o(0.12), 0.07, 1.7, 0.05, 0.9); B.box(cx + sx, y + 0.85, o(0.12), 1.0, 0.07, 0.05, 0.9); }
      B.box(cx + sx, y - 0.2, o(0.14), 1.3, 0.16, 0.3, 0.88);
    }
    B.box(cx + 1.7, 1.0, o(0.07), 1.0, 1.4, 0.1, GL);
    B.box(cx - 1.6, 0, o(0.07), 1.05, 2.3, 0.12, ri === 3 ? 0.5 : 0.12);
    if (!(cx > 35 && cx < 57)) B.box(cx - 1.6, 2.3, o(0.35), 1.7, 0.14, 0.7, 0.9); // no door canopy on the app-icon houses
    B.box(cx - 1.6, 0, o(0.18), 1.7, 0.18, 0.5, 0.85);
    B.cyl(cx + 3.15, 0, o(0.12), 0.1, H_(), 6, 0.55);
    // ac / meter
    const quiet = ri === 3 && cx < -5;
    if (!quiet && i % 3 === 1) B.box(cx + 1.7, 6.2, o(0.4), 0.9, 0.6, 0.6, 0.85);
    if (i % 4 === 2) B.box(cx - 3.0, 1.2, o(0.15), 0.5, 0.7, 0.3, 0.3);
    // lamp (the one street lamp accent, lit amber)
    if (ri === 3 && Math.abs(cx - 52.5) < 0.1) {
      B.beam([cx - 1.6, 3.3, o(0.05)], [cx - 1.6, 3.3, o(0.9)], 0.05, 0.1);
      B.box(cx - 1.95, 2.9, o(0.65), 0.7, 0.7, 0.7, 0.85);
      B.box(cx - 1.95, 3.5, o(0.6), 0.7, 0.1, 0.7, 0.1);
    }
    // fire escape
    if (!quiet && cx < 57 && (i % 3 === 0 || i % 7 === 4)) {
      const zo = o(0.65), zr = o(1.28), s = i % 2 ? 1 : -1;
      [4.0, 7.7, 11.4].forEach((y, k) => {
        B.box(cx, y, zo, 3.0, 0.13, 1.3, 0.16);
        B.beam([cx - 1.5, y + 0.95, zr], [cx + 1.5, y + 0.95, zr], 0.04, 0.14);
        B.beam([cx - 1.5, y + 0.5, zr], [cx + 1.5, y + 0.5, zr], 0.03, 0.14);
        for (const sx of [-1.5, 1.5]) {
          B.beam([cx + sx, y, zr], [cx + sx, y + 0.95, zr], 0.04, 0.14);
          B.beam([cx + sx, y + 0.95, o(0.04)], [cx + sx, y + 0.95, zr], 0.035, 0.14);
        }
        if (k > 0) {
          for (const dz of [0.95, 1.2]) B.beam([cx + s * 1.1, y, o(dz)], [cx - s * 1.1, y - 3.7 + 0.13, o(dz)], 0.05, 0.14);
        }
      });
      B.beam([cx + s * 1.1, 4.0, o(1.0)], [cx + s * 1.1, 1.9, o(1.0)], 0.04, 0.14);
      B.beam([cx + s * 1.1 + 0.5, 4.0, o(1.0)], [cx + s * 1.1 + 0.5, 1.9, o(1.0)], 0.04, 0.14);
    }
    // dumpsters and cans
    if (!quiet && i % 4 === 1) { B.box(cx + R(-0.5, 0.5), 0, o(0.75), 1.9, 1.15, 1.1, 0.22); B.box(cx, 1.15, o(0.8), 2.0, 0.12, 1.2, 0.55); }
    if (!quiet && i % 5 === 3) { B.cyl(cx - 1.2, 0, o(0.45), 0.32, 0.9, 7, 0.4); B.cyl(cx - 0.4, 0, o(0.45), 0.32, 0.9, 7, 0.4); }
  }
  function H_() { return 13 + rnd() * 2; }

  // ---- alley props ----
  for (const a of [-2.5, 2.5]) void a;
  // puddles
  for (let i = 0; i < 18; i++) B.box(-40 + i * 10 + R(-3, 3), 0.14, R(-1.4, 1.4), R(1.2, 2.4), 0.02, R(0.6, 0.9), 0.3);
  // drain strip
  B.box(60, 0.14, 0, 460, 0.01, 0.12, 0.5);
  // utility poles and wires
  const poles = [];
  for (let k = 0; k < 3; k++) {
    const x = -10 + k * 50, z = k % 2 ? 2.0 : -2.0;
    poles.push([x, z]);
    B.box(x, 0, z, 0.34, 10.2, 0.34, 0.5);
    B.box(x, 0, z, 0.55, 0.9, 0.55, 0.45);
  }
  const wire = (p0, p1, sag) => {
    const N = 8; let prev = p0;
    for (let s = 1; s <= N; s++) {
      const u = s / N;
      const p = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - sag * 4 * u * (1 - u), p0[2] + (p1[2] - p0[2]) * u];
      B.beam(prev, p, 0.035, 0.14); prev = p;
    }
  };
  for (let k = 0; k < poles.length - 1; k++) {
    const [x0, z0] = poles[k], [x1, z1] = poles[k + 1];
    for (const dz of [-0.8, 0, 0.8]) wire([x0, 9.3, z0 + dz], [x1, 9.3, z1 + dz], 1.4);
    // service drops to the opposite wall
  }
  // bike against the south wall
  {
    const bx = 47, bz = 1.95;
    for (const sx of [-0.55, 0.55]) {
      B.tube([bx + sx, 0.36, bz - 0.04], [bx + sx, 0.36, bz + 0.04], 0.36, 0.36, 12, 0.12);
      B.tube([bx + sx, 0.36, bz - 0.055], [bx + sx, 0.36, bz + 0.055], 0.27, 0.27, 12, 0.95);
    }
    const pts = [[bx - 0.55, 0.36], [bx, 0.38], [bx + 0.1, 0.95], [bx - 0.4, 0.92], [bx + 0.55, 0.36], [bx + 0.5, 1.0]];
    const bm = (a, b) => B.beam([a[0], a[1], bz], [b[0], b[1], bz], 0.035, 0.14);
    bm(pts[0], pts[1]); bm(pts[1], pts[2]); bm(pts[2], pts[3]); bm(pts[3], pts[0]); bm(pts[1], pts[3]); bm(pts[2], pts[4]); bm(pts[4], pts[5]);
    B.beam([bx + 0.38, 1.0, bz - 0.35], [bx + 0.5, 1.0, bz + 0.35], 0.03, 0.14);
  }
  // parked car down the alley
  {
    const x = -70, z = -0.2;
    B.box(x, 0.38, z, 4.4, 0.85, 1.85, 0.9);
    B.box(x - 0.2, 1.23, z, 2.4, 0.75, 1.65, 0.9, 0, 0.35, 0.1);
    B.box(x - 0.2, 1.33, z, 2.46, 0.5, 1.67, 0.1, 0, 0.4, 0.05);
    for (const sx of [-1.4, 1.4]) for (const sz of [-0.9, 0.9]) B.tube([x + sx, 0.38, z + sz], [x + sx, 0.38, z + sz + Math.sign(sz) * 0.16], 0.38, 0.38, 10, 0.1);
  }
  // trash bags
  for (const [x, z] of [[-34, 1.9], [-9, -1.9], [14, 1.8]]) B.sphere(x, 0.45, z, 0.5, 0.18, 1, 0.9);

  // ---- towers (Hancock and Prudential) ----
  B.box(300, 0, 0, 17, 240, 46, 0.4);
  B.box(300, 240, 0, 17.4, 2, 46.4, 0.9);
  for (let k = -2; k <= 2; k++) B.box(291.3, 0, k * 9, 0.5, 240, 0.5, 0.05);
  B.beam([300, 242, -16], [300, 270, -16], 0.5, 0.2); B.beam([300, 242, 16], [300, 270, 16], 0.5, 0.2);
  B.box(470, 0, 190, 46, 30, 46, 0.62);
  B.box(470, 30, 190, 38, 90, 38, 0.6);
  B.box(470, 120, 190, 28, 48, 28, 0.62, 0, 2, 2);
  B.box(470, 168, 190, 18, 18, 18, 0.7);
  B.tube([470, 186, 190], [470, 250, 190], 2.4, 0.2, 6, 0.6);
  // Copley / South End filler and far districts
  const filler = (x0, x1, z0, z1, step) => {
    for (let x = x0; x < x1; x += step) for (let z = z0; z < z1; z += step) {
      if (rnd() < 0.3) continue;
      const w = R(14, 24), d = R(14, 24), h = R(9, 24);
      B.box(x + R(-3, 3), 0, z + R(-3, 3), w, h, d, R(0.48, 0.72));
      B.box(x, h, z, w - 3, 1.1, d - 3, 0.22);
    }
  };
  filler(XMIN - 420, XMIN - 20, -100, 190, 30);
  filler(XMAX + 40, XMAX + 460, -100, 190, 30);
  filler(XMIN - 400, XMAX + 440, 200, 560, 30);

  const mesh = new THREE.Mesh(B.build(), signMat);
  mesh.frustumCulled = false;
  group.add(mesh);
  return { group };
}

export function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#0a0a0a'; g.lineWidth = 14; g.strokeRect(12, 12, 488, 232);
  g.lineWidth = 4; g.strokeRect(34, 34, 444, 188);
  g.fillStyle = '#0a0a0a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 58px "Helvetica Neue", Arial, sans-serif';
  g.fillText('PUBLIC ALLEY', 256, 96);
  g.font = '700 104px "Helvetica Neue", Arial, sans-serif';
  g.fillText('431', 256, 178);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
  return tex;
}
