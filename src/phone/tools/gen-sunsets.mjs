// Procedural sunset photos. Usage: node src/phone/tools/gen-sunsets.mjs  -> public/photos/sunset-NN.jpg (768x768)
import jpeg from 'jpeg-js';
import { writeFileSync, mkdirSync } from 'node:fs';
const S = 768;
const out = new URL('../../../public/photos/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function makeNoise(seed) {
  const r = rng(seed), P = new Uint8Array(512), g = [];
  for (let i = 0; i < 256; i++) P[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const v = new Float32Array(256).map(() => r());
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = v[P[P[xi & 255] + (yi & 255)]], b = v[P[P[(xi + 1) & 255] + (yi & 255)]];
    const c = v[P[P[xi & 255] + ((yi + 1) & 255)]], d = v[P[P[(xi + 1) & 255] + ((yi + 1) & 255)]];
    const u = sm(xf), w = sm(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return (x, y, o = 5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * n2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
}
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix3 = (A, B, t) => [mix(A[0], B[0], t), mix(A[1], B[1], t), mix(A[2], B[2], t)];
function grad(stops, t) {
  t = clamp(t);
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix3(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
const rgb = (h) => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];

// Silhouette mask drawing
function stamp(m, x, y, r) {
  const x0 = Math.max(0, Math.floor(x - r - 1)), x1 = Math.min(S - 1, Math.ceil(x + r + 1));
  const y0 = Math.max(0, Math.floor(y - r - 1)), y1 = Math.min(S - 1, Math.ceil(y + r + 1));
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
    const d = Math.hypot(i + 0.5 - x, j + 0.5 - y), c = clamp(r - d + 0.5);
    if (c > m[j * S + i]) m[j * S + i] = c;
  }
}
function stroke(m, pts, w0, w1) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 0.7));
    for (let s = 0; s <= n; s++) {
      const t = s / n, u = (k + t) / (pts.length - 1);
      stamp(m, mix(ax, bx, t), mix(ay, by, t), mix(w0, w1, u) / 2);
    }
  }
}
function bez(p0, p1, p2, n = 24) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) ** 2, b = 2 * t * (1 - t), c = t * t; o.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return o; }
function palm(m, x, base, h, lean, r) {
  const top = [x + lean, base - h];
  const trunk = bez([x, base], [x + lean * 0.15, base - h * 0.55], top);
  stroke(m, trunk, h * 0.045, h * 0.025);
  const nf = 9;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + r() * 0.3, len = h * (0.35 + r() * 0.2), dir = Math.cos(a);
    const tip = [top[0] + dir * len, top[1] + Math.sin(a) * len * 0.25 + len * 0.35 + r() * 8];
    const ctrl = [top[0] + dir * len * 0.55, top[1] - len * 0.3 - Math.abs(Math.sin(a)) * len * 0.1];
    stroke(m, bez(top, ctrl, tip), h * 0.04, 1.5);
    // leaflets
    const spine = bez(top, ctrl, tip, 14);
    for (let k = 3; k < 14; k++) { const [sx, sy] = spine[k]; const l = len * 0.18 * (1 - k / 16); stroke(m, [[sx, sy], [sx + dir * l * 0.3, sy + l]], 2, 0.8); stroke(m, [[sx, sy], [sx - dir * l * 0.1, sy + l * 0.9]], 2, 0.8); }
  }
}
function pine(m, x, base, h, r) {
  stroke(m, [[x, base], [x, base - h]], h * 0.03, h * 0.015);
  const layers = 9;
  for (let l = 0; l < layers; l++) {
    const t = l / layers, y = base - h * (0.12 + t * 0.85), w = h * 0.3 * (1 - t) + 3;
    for (let k = 0; k < 14; k++) { const s = (k / 13 - 0.5) * 2; stroke(m, [[x, y - 2], [x + s * w, y + w * 0.35 + r() * 3 + Math.abs(s) * 4]], 2.2, 1); }
  }
}
function pole(m, x, base, h, w) { stroke(m, [[x, base], [x, base - h]], w, w * 0.8); stroke(m, [[x - h * 0.16, base - h * 0.9], [x + h * 0.16, base - h * 0.9]], w * 0.8, w * 0.8); stroke(m, [[x - h * 0.1, base - h * 0.75], [x + h * 0.1, base - h * 0.75]], w * 0.7, w * 0.7); }
function wire(m, x0, y0, x1, y1, sag) { stroke(m, bez([x0, y0], [(x0 + x1) / 2, Math.max(y0, y1) + sag * 2], [x1, y1], 60), 1.5, 1.5); }

const SCENES = [
  { type: 'water', hy: 0.62, sx: 0.5, warm: 0.9, cloud: 0.55, seed: 1 },
  { type: 'city', hy: 0.66, sx: 0.28, warm: 1.0, cloud: 0.4, seed: 2 },
  { type: 'palms', hy: 0.64, sx: 0.62, warm: 0.8, cloud: 0.5, seed: 3 },
  { type: 'hills', hy: 0.58, sx: 0.4, warm: 0.7, cloud: 0.7, seed: 4 },
  { type: 'pines', hy: 0.7, sx: 0.7, warm: 0.6, cloud: 0.45, seed: 5 },
  { type: 'wires', hy: 0.74, sx: 0.35, warm: 1.0, cloud: 0.6, seed: 6 },
  { type: 'water', hy: 0.55, sx: 0.72, warm: 0.5, cloud: 0.85, seed: 7 },
  { type: 'beach', hy: 0.6, sx: 0.45, warm: 0.85, cloud: 0.35, seed: 8 },
  { type: 'city', hy: 0.72, sx: 0.65, warm: 0.4, cloud: 0.7, seed: 9 },
  { type: 'hills', hy: 0.5, sx: 0.55, warm: 0.95, cloud: 0.3, seed: 10 },
  { type: 'palms', hy: 0.7, sx: 0.3, warm: 0.3, cloud: 0.6, seed: 11 },
  { type: 'wires', hy: 0.68, sx: 0.6, warm: 0.65, cloud: 0.8, seed: 12 },
  { type: 'water', hy: 0.68, sx: 0.3, warm: 0.75, cloud: 0.2, seed: 13 },
  { type: 'pines', hy: 0.62, sx: 0.4, warm: 0.9, cloud: 0.65, seed: 14 },
];
{ // procedural extras up to 36
  const T = ['water', 'city', 'palms', 'hills', 'pines', 'wires', 'beach'], r = rng(4242);
  for (let i = 15; i <= 36; i++) SCENES.push({ type: T[i % T.length], hy: 0.52 + r() * 0.22, sx: 0.25 + r() * 0.5, warm: 0.3 + r() * 0.7, cloud: 0.2 + r() * 0.65, seed: i });
}
const ONLY_NEW = process.argv.includes('--new');

function render(sc, idx) {
  const noise = makeNoise(sc.seed * 7919), r = rng(sc.seed * 31 + 5);
  const HY = sc.hy * S, SX = sc.sx * S, SY = HY - (0.02 + r() * 0.05) * S; // sun just above horizon
  const warm = sc.warm;
  // sky palette: warm 1 = fiery orange/magenta, 0 = pink/violet/teal
  const sky = [
    [0, mix3(rgb(0xffd9a0), rgb(0xffe9c4), 1 - warm)],
    [0.1, mix3(rgb(0xff9a45), rgb(0xffb08a), 1 - warm)],
    [0.3, mix3(rgb(0xe8567a), rgb(0xd9708f), 1 - warm)],
    [0.55, mix3(rgb(0x7a3f8f), rgb(0x6a5a9f), 1 - warm)],
    [0.8, rgb(0x2a3a7a)],
    [1, rgb(0x0f1c4a)],
  ];
  // mask of silhouettes
  const mask = new Float32Array(S * S);
  const R = rng(sc.seed * 101);
  const ground = new Float32Array(S); // ground top per column for hills/city
  for (let x = 0; x < S; x++) ground[x] = HY;
  if (sc.type === 'hills') {
    for (let layer = 0; layer < 3; layer++) for (let x = 0; x < S; x++) { const h = noise(x / (220 - layer * 50) + layer * 9, layer * 3.3, 4); const y = HY - (0.02 + h * 0.18 * (1 - layer * 0.25)) * S + layer * 0; ground[x] = Math.min(ground[x], y); }
  }
  if (sc.type === 'city') {
    let x = 0; while (x < S) { const w = Math.round(14 + R() * 38), h = (0.04 + Math.pow(R(), 2.2) * 0.34) * S; for (let i = x; i < Math.min(S, x + w); i++) ground[i] = Math.min(ground[i], HY - h + 12); if (R() < 0.18) { stroke(mask, [[x + w / 2, HY - h + 12], [x + w / 2, HY - h - 20 - R() * 40]], 1.6, 1.2); } x += w + (R() < 0.3 ? 2 : 0); }
  }
  if (sc.type === 'beach' || sc.type === 'palms') { for (let x = 0; x < S; x++) ground[x] = sc.type === 'palms' ? HY + 4 + noise(x / 90, 1.1) * 14 : HY; }
  if (sc.type === 'pines') { for (let x = 0; x < S; x++) ground[x] = HY + 20 + noise(x / 130, 7) * 40; }
  if (sc.type === 'wires') { for (let x = 0; x < S; x++) ground[x] = HY + 10 + noise(x / 160, 5) * 30; }
  // foreground objects
  if (sc.type === 'palms') { palm(mask, S * 0.12, S * 0.99, S * 0.5, 40, R); palm(mask, S * 0.3, S * 0.93, S * 0.3, -18, R); palm(mask, S * 0.88, S * 1.0, S * 0.6, -50, R); }
  if (sc.type === 'pines') { for (let i = 0; i < 9; i++) pine(mask, R() * S, HY + 40 + R() * 80, S * (0.1 + R() * 0.35), R); }
  if (sc.type === 'wires') {
    const xs = [S * 0.08, S * 0.5, S * 0.94]; const base = HY + 40;
    xs.forEach((x, i) => pole(mask, x, base + i * 0, S * (0.62 - i * 0.06 * (i === 1 ? -1 : 1)) * 0.8, 6));
    for (const dy of [0.9, 0.75]) for (let i = 0; i < 2; i++) { const h0 = S * 0.8 * (i === 0 ? 0.62 : 0.68); wire(mask, xs[i], base - h0 * dy, xs[i + 1], base - S * 0.8 * (i === 0 ? 0.68 : 0.56) * dy, 20); }
  }
  if (sc.type === 'water') { // distant shore + small boat
    for (let x = 0; x < S; x++) ground[x] = HY - (noise(x / 60, 9) > 0.62 ? 4 + noise(x / 20, 3) * 8 : 0);
    const bx = 120 + R() * 500; stroke(mask, [[bx - 20, HY + 40], [bx + 20, HY + 40], [bx + 12, HY + 48], [bx - 14, HY + 48]], 3, 3); stroke(mask, [[bx, HY + 40], [bx, HY + 4]], 2, 1.5);
  }
  const img = Buffer.alloc(S * S * 4);
  const sunAng = (x, y) => Math.hypot(x - SX, (y - SY) * 1.0);
  const skyAt = (x, y, withSun) => {
    const v = clamp((HY - y) / HY); // 0 horizon .. 1 top
    let c = grad(sky, Math.pow(v, 0.8));
    const d = sunAng(x, y) / S;
    const glow = Math.exp(-d * 4.2) * 0.55 * warm + Math.exp(-d * 11) * 0.5;
    c = mix3(c, [1, 0.62 + 0.2 * (1 - warm), 0.28 + 0.3 * (1 - warm)], clamp(glow));
    // clouds
    const cx = x / 190, cy = y / 70 + noise(x / 400, y / 300, 2) * 1.5;
    let dens = noise(cx + sc.seed, cy, 6);
    dens = sstep(0.52 - sc.cloud * 0.2, 0.78 - sc.cloud * 0.2, dens) * sstep(HY + 10, HY - 30, y) * (0.35 + v * 0.9);
    if (dens > 0.001) {
      const lx = x + (SX - x) * 0.04, ly = y + 7 + (SY - y) * 0.04;
      const d2 = noise(lx / 190 + sc.seed, ly / 70 + noise(lx / 400, ly / 300, 2) * 1.5, 6);
      const dd = sstep(0.52 - sc.cloud * 0.2, 0.78 - sc.cloud * 0.2, d2) * sstep(HY + 10, HY - 30, ly) * (0.35 + v * 0.9);
      const rim = clamp((dens - dd) * 4 + 0.15); // lit side facing sun/below
      const near = Math.exp(-d * 2.6);
      const dark = mix3(mix3(rgb(0x3a2850), rgb(0x2a3566), v), c, 0.2);
      const lit = mix3(rgb(0xff8a50), [1, 0.82, 0.55], near);
      const underlit = clamp(1 - (y - (HY - 280)) / 400);
      let cc = mix3(dark, lit, clamp(rim * (0.35 + 0.65 * near) + near * 0.35));
      cc = mix3(cc, c, 0.12);
      c = mix3(c, cc, clamp(dens * 0.92));
    }
    if (withSun) {
      const disc = 1 - sstep(S * 0.021, S * 0.025, sunAng(x, y));
      const bloom = Math.exp(-d * 30) * 0.9 + Math.exp(-d * 90) * 0.7;
      c = [c[0] + bloom * 1.0, c[1] + bloom * 0.85, c[2] + bloom * 0.55];
      c = mix3(c, [1, 0.97, 0.88], disc);
    }
    return c;
  };
  const sil = [0.025 + 0.02 * (1 - warm), 0.02, 0.035];
  const gr = rng(sc.seed * 13 + 1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let c;
      const gy = ground[x];
      if (y < gy && !(sc.type === 'beach' && y > HY)) c = skyAt(x, y, true);
      else if (sc.type === 'water' || sc.type === 'beach') {
        // reflection of sky
        const depth = (y - HY) / (S - HY);
        const wob = (noise(x / 14, y / 2.5, 3) - 0.5) * 18 * (0.2 + depth) + (noise(x / 60, y / 9, 3) - 0.5) * 8;
        const ry = clamp(HY - (y - HY) * 0.85 - 4 + wob * 0.6, 0, HY - 1);
        let rc = skyAt(x + wob * 0.5, ry, false);
        rc = mix3(rc, mix3(rgb(0x2a2f4a), rgb(0x6a3a4a), 1 - depth), 0.35 + depth * 0.25);
        // glitter path
        const path = Math.exp(-Math.pow((x - SX) / (S * (0.025 + depth * 0.16)), 2));
        const g = clamp(noise(x / 5, y / 1.7, 3) * 1.6 - 0.65 + (1 - depth) * 0.1);
        const glit = path * g * (sc.type === 'water' ? 1.9 : 1.2);
        rc = [rc[0] + glit * 1.0, rc[1] + glit * 0.78, rc[2] + glit * 0.45];
        if (sc.type === 'beach') { // wet sand foreground
          const sand = clamp((y - (HY + (S - HY) * 0.45)) / ((S - HY) * 0.25));
          const edge = sstep(0, 1, sand); const wet = mix3(rc, mix3(rgb(0x4a3328), rgb(0x8a5a40), noise(x / 30, y / 6)), 0.55);
          rc = mix3(rc, wet, edge);
        }
        c = rc;
      } else {
        // land silhouette with faint haze gradient
        const hz = clamp((y - gy) / 160);
        const depth = clamp((HY - gy) / (S * 0.2));
        const haze = mix3(skyAt(x, HY - 6, false), sil, 1 - 0.55 * Math.exp(-(y - gy) / 50) * (1 - depth * 0.4) * (sc.type === 'hills' ? 1 : 0.1));
        c = mix3(haze, sil, clamp(hz * 3 + 0.4));
        { const g2 = Math.exp(-(y - HY) / 140) * 0.10 * warm; c = [c[0] + g2 * 1.0 * (1 + noise(x / 40, y / 10) ), c[1] + g2 * 0.45, c[2] + g2 * 0.3]; }
        if (sc.type === 'city' && y < HY - 2 && y > gy + 8 && (x % 6) < 3 && (y % 9) < 4 && ((x * 7 + (y / 9 | 0) * 13 + (x / 6 | 0) * 31) % 11) < 2) c = [1, 0.74, 0.4]; // lit windows
        if (sc.type === 'hills') { const layer = clamp((gy - (HY - 0.2 * S)) / (0.2 * S)); c = mix3(mix3(rgb(0x7a4a6a), sil, 1 - layer * 0.6), sil, clamp((y - gy) / 40)); }
      }
      const m = mask[y * S + x];
      if (m > 0) c = mix3(c, sil, m);
      // vignette, lens look, grain
      const vx = (x / S - 0.5), vy = (y / S - 0.5), vig = 1 - 0.38 * (vx * vx + vy * vy) * 2.2;
      const gn = (gr() + gr() + gr() - 1.5) * 0.045;
      let R_ = c[0] * vig + gn, G = c[1] * vig + gn, B = c[2] * vig + gn * 1.1;
      // filmic tone curve
      const tm = (v) => { v = Math.max(0, v); return v < 0.6 ? v : 0.6 + (1 - Math.exp(-(v - 0.6) * 2.2)) * 0.4 / 1; };
      R_ = Math.pow(clamp(tm(R_)), 0.95); G = Math.pow(clamp(tm(G)), 0.95); B = Math.pow(clamp(tm(B)), 0.95);
      const o = (y * S + x) * 4;
      img[o] = R_ * 255; img[o + 1] = G * 255; img[o + 2] = B * 255; img[o + 3] = 255;
    }
  }
  const name = `sunset-${String(idx + 1).padStart(2, '0')}.jpg`;
  writeFileSync(out + name, jpeg.encode({ data: img, width: S, height: S }, 88).data);
  console.log(name, sc.type);
}
SCENES.forEach((sc, i) => { if (!ONLY_NEW || i >= 14) render(sc, i); });
