import * as THREE from 'three';

// Flat clip art that takes the sun's place during the fall: iPhone, Apple Watch, Vision Pro.
// Vertex greys resolve through the toon ramp: INK to ink, PAPER to paper, MID to mid grey, TONE to mid grey with halftone.
const INK = [0.04, 0.04, 0.04], PAPER = [1, 1, 1], MID = [0.5, 0.5, 0.5], TONE = [0.36, 0.36, 0.36];

// 2D shape list in the xy plane, facing +z. Each shape sits a little above the one before it.
function art() {
  const pos = [], nor = [], col = [];
  let z = 0;
  const api = {
    get top() { return z; },
    poly(pts, c) { // star-shaped about its centroid, counter-clockwise
      let cx = 0, cy = 0;
      for (const p of pts) { cx += p[0]; cy += p[1]; }
      cx /= pts.length; cy /= pts.length;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        for (const v of [[cx, cy], a, b]) { pos.push(v[0], v[1], z); nor.push(0, 0, 1); col.push(c[0], c[1], c[2]); }
      }
      z += 0.12;
      return api;
    },
    rrect(cx, cy, w, h, r, c, rot = 0) {
      const pts = [], hw = w / 2 - r, hh = h / 2 - r, cs = Math.cos(rot), sn = Math.sin(rot);
      [[hw, hh], [-hw, hh], [-hw, -hh], [hw, -hh]].forEach(([ox, oy], k) => {
        for (let i = 0; i <= 6; i++) {
          const a = ((k + i / 6) * Math.PI) / 2, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
          pts.push([cx + x * cs - y * sn, cy + x * sn + y * cs]);
        }
      });
      return api.poly(pts, c);
    },
    bar(x0, y0, x1, y1, w, c) { // line with round caps
      return api.rrect((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) + w, w, w / 2, c, Math.atan2(y1 - y0, x1 - x0));
    },
    disc(cx, cy, rx, c, ry = rx) {
      const pts = [];
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      return api.poly(pts, c);
    },
    blob(a, b, n, notch, c) { // superellipse with a nose notch in the bottom edge
      const pts = [];
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
        const x = a * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
        let y = b * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
        if (y < 0) y += notch * Math.exp(-((x / 3.2) ** 2)) * (-y / b);
        pts.push([x, y]);
      }
      return api.poly(pts, c);
    },
    mesh(mat, z0 = 0) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, mat);
      m.position.z = z0;
      m.frustumCulled = false;
      return m;
    },
  };
  return api;
}

const backOut = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

function iphone(mat) {
  const root = new THREE.Group();
  const a = art();
  a.rrect(-7.3, 5.4, 1.2, 3.0, 0.45, INK).rrect(-7.3, 1.6, 1.2, 3.0, 0.45, INK).rrect(7.3, 3.6, 1.2, 4.6, 0.45, INK); // buttons
  a.rrect(0, 0, 14, 26, 3.6, INK).rrect(0, 0, 12.2, 24.2, 2.8, PAPER);
  a.rrect(0, 10.3, 3.8, 1.2, 0.6, INK); // island
  const tones = [MID, TONE, INK];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) a.rrect((c - 1) * 3.5, 6.9 - r * 3.5, 2.6, 2.6, 0.75, tones[(r * 2 + c) % 3]);
  a.rrect(0, -8.3, 10.6, 3.7, 1.4, MID); // dock
  for (let c = 0; c < 3; c++) a.rrect((c - 1) * 3.3, -8.3, 2.3, 2.3, 0.65, PAPER);
  a.bar(-2, -11.25, 2, -11.25, 0.45, INK);
  root.add(a.mesh(mat));
  const badge = art().disc(0, 0, 1.15, INK).disc(0, 0, 0.8, PAPER).mesh(mat, a.top + 0.1);
  badge.position.set(4.9, 8.3, a.top + 0.1);
  root.add(badge);
  return {
    root,
    tick(t) { // rocks on its tilt, notification badge pops
      root.rotation.z = 0.12 + 0.05 * Math.sin(t * 1.1);
      root.position.y = 0.5 * Math.sin(t * 1.3);
      badge.scale.setScalar(1 + 0.35 * Math.pow(Math.max(0, Math.sin(t * 1.9)), 8));
    },
  };
}

function watch(mat) {
  const root = new THREE.Group();
  const a = art();
  a.rrect(0, 0, 8.4, 30, 2.2, INK).rrect(0, 0, 7.0, 28.6, 1.6, MID); // strap
  for (const y of [11.2, 12.7, -11.2, -12.7]) a.bar(-1.9, y, 1.9, y, 0.35, INK);
  a.rrect(7.1, 2.2, 1.7, 3.0, 0.6, INK).rrect(6.9, -2.4, 1.1, 3.4, 0.45, INK); // crown, side button
  a.rrect(0, 0, 13.2, 15.6, 4.2, INK).rrect(0, 0, 11.4, 13.8, 3.3, PAPER);
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2, c = Math.cos(an), s = Math.sin(an), big = i % 3 === 0;
    a.bar(c * (big ? 3.8 : 4.3), s * (big ? 3.8 : 4.3), c * 4.8, s * 4.8, big ? 0.5 : 0.32, INK);
  }
  root.add(a.mesh(mat));
  const hour = art().bar(0, 0, 0, 2.5, 0.85, INK).mesh(mat, a.top + 0.1);
  const minute = art().bar(0, 0, 0, 3.6, 0.6, INK).mesh(mat, a.top + 0.3);
  const second = art().bar(0, -1.1, 0, 3.9, 0.3, INK).disc(0, 0, 0.6, INK).disc(0, 0, 0.28, INK).mesh(mat, a.top + 0.5);
  root.add(hour, minute, second);
  hour.rotation.z = 1.05;
  minute.rotation.z = -1.05;
  return {
    root,
    tick(t) { // second hand snaps in 30 degree steps with overshoot, minute hand creeps
      root.rotation.z = -0.08 + 0.04 * Math.sin(t * 0.9 + 1);
      root.position.y = 0.5 * Math.sin(t * 1.2 + 2);
      const s = t * 2, step = Math.floor(s) + backOut(Math.min(1, (s - Math.floor(s)) * 3));
      second.rotation.z = -step * (Math.PI / 6);
      minute.rotation.z = -1.05 - (t * Math.PI * 2) / 72;
      hour.rotation.z = 1.05 - (t * Math.PI * 2) / 864;
    },
  };
}

function vision(mat) {
  const root = new THREE.Group();
  const a = art();
  a.rrect(0, 0.6, 33, 5.4, 2.7, INK).rrect(0, 0.6, 31.6, 4.0, 2.0, MID); // band
  for (const x of [13.7, 14.7, 15.7]) a.bar(x, -0.7, x, 1.9, 0.3, INK).bar(-x, -0.7, -x, 1.9, 0.3, INK);
  a.blob(12.6, 6.8, 3.2, 1.7, INK).blob(11.7, 5.9, 3.2, 1.5, TONE); // visor, glass
  a.bar(-8.6, 1.6, -6.9, 3.6, 0.7, PAPER).bar(-6.6, 1.3, -5.6, 2.5, 0.42, PAPER); // glint
  a.disc(8.4, 2.9, 0.7, PAPER); // glint in the glass
  root.add(a.mesh(mat));
  const eyes = new THREE.Group();
  eyes.position.set(0, -0.2, a.top + 0.1);
  eyes.add(art().disc(-4.3, 0, 2.0, PAPER, 2.4).disc(4.3, 0, 2.0, PAPER, 2.4).mesh(mat));
  const pupils = art().disc(-4.3, -0.2, 1.05, INK).disc(4.3, -0.2, 1.05, INK).disc(-3.9, 0.25, 0.34, PAPER).disc(4.7, 0.25, 0.34, PAPER).mesh(mat, 0.3);
  eyes.add(pupils);
  root.add(eyes);
  return {
    root,
    tick(t) { // floats, eyes look around and blink
      root.rotation.z = 0.05 * Math.sin(t * 0.8);
      root.position.y = 0.7 * Math.sin(t);
      pupils.position.x = 0.55 * Math.sin(t * 0.7);
      pupils.position.y = 0.3 * Math.sin(t * 0.9 + 1);
      const ph = t % 3.4;
      eyes.scale.y = 1 - 0.92 * (ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0);
    },
  };
}

export function createDevices(mat) {
  return [iphone(mat), watch(mat), vision(mat)];
}

// Scale of item i of n at scroll p: pops in with overshoot at its start, shrinks out before the next start.
// starts[i] is the p at which item i appears (item 0 is present from the top).
export function swapScale(p, starts, i) {
  const x = i === 0 ? 1 : Math.min(1, Math.max(0, (p - starts[i]) / 0.016));
  const b = i + 1 < starts.length ? starts[i + 1] : Infinity;
  const o = Math.min(1, Math.max(0, (p - (b - 0.016)) / 0.014));
  return { s: (i === 0 ? 1 : backOut(x)) * (1 - o * o), spin: (x - 1) * 0.9 + o * o * 0.9 };
}
