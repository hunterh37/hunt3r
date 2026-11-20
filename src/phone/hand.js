import * as THREE from 'three';
import { makeLimbMaps, makeSkinMaterial, makeKnitMaterial, makeNailMaterial } from './skin.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const col = (hex) => new THREE.Color(hex);
const SKIN = col(0xc4896d), TIP = col(0xd2827a), KNUCKLE = col(0xb5665a), DORSAL = col(0xb98066), PALMAR = col(0xd6a08c);
const gauss = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));

// Variable-radius elliptical sweep with smooth normals. radius(t) -> [wide, thick]; colorFn(t, sinA) -> Color
export function sweep({ pts, radius, n0 = V(0, 0, 1), segs = 72, rad = 24, colorFn, uRep = 1, vRep = 1, flat = 0.14 }) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const len = curve.getLength();
  const pos = [], nor = [], uv = [], clr = [], idx = [];
  let N = n0.clone();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), T = curve.getTangentAt(t);
    N = N.clone().sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    const [rw, rh0] = radius(t);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), rh = rh0 * (1 - flat * Math.max(0, sa) * (0.5 + 0.5 * Math.abs(ca) * 0 + 0.5));
      pos.push(P.x + B.x * rw * ca + N.x * rh * sa, P.y + B.y * rw * ca + N.y * rh * sa, P.z + B.z * rw * ca + N.z * rh * sa);
      uv.push(j / rad * uRep, t * vRep);
      const c = colorFn ? colorFn(t, sa) : SKIN; clr.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + 1, c = a + rad + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const nn = g.attributes.normal;
  for (let i = 0; i <= segs; i++) { // weld seam normals
    const a = i * (rad + 1), b = a + rad, v = new THREE.Vector3().fromBufferAttribute(nn, a).add(new THREE.Vector3().fromBufferAttribute(nn, b)).normalize();
    nn.setXYZ(a, v.x, v.y, v.z); nn.setXYZ(b, v.x, v.y, v.z);
  }
  { const T = curve.getTangentAt(1); for (let j = 0; j <= rad; j++) nn.setXYZ(segs * (rad + 1) + j, T.x, T.y, T.z); }
  g.userData = { curve, N0: n0 };
  return g;
}

function fingerRadius(r0, f1 = 0.5, f2 = 0.78) {
  return (t) => {
    let k = 1 - 0.2 * t + 0.1 * gauss(t, f1, 0.05) + 0.07 * gauss(t, f2, 0.04) - 0.035 * gauss(t, f1 - 0.055, 0.012) - 0.03 * gauss(t, f2 - 0.045, 0.012);
    let e = 1;
    if (t > 0.9) e = Math.sqrt(Math.max(0.0, 1 - ((t - 0.9) / 0.1) ** 2)) * 0.95 + 0.05;
    return [r0 * k * e, r0 * 0.86 * k * e];
  };
}
function fingerColor(t, sa) {
  const c = SKIN.clone();
  const palmar = clamp01((sa + 0.2) * 1.2); // pad side (N axis) paler and pinker
  c.lerp(PALMAR, palmar * 0.55); c.lerp(DORSAL, (1 - palmar) * 0.4);
  c.lerp(KNUCKLE, 0.45 * Math.max(gauss(t, 0.5, 0.05), gauss(t, 0.78, 0.04)) * (1 - palmar * 0.7));
  c.lerp(TIP, 0.55 * smooth(0.72, 1.0, t));
  return c;
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function ellipsoid(rx, ry, rz, color) {
  const g = new THREE.SphereGeometry(1, 48, 32); g.scale(rx, ry, rz);
  const n = g.attributes.position.count, c = [];
  for (let i = 0; i < n; i++) c.push(color.r, color.g, color.b);
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 3);
  return g;
}

// Procedural right hand in phone space (phone centred at origin, front toward +z, size 0.0715 x 0.1471 x 0.0083).
export function buildProceduralHand(dims) {
  const { W, H, D } = dims, hw = W / 2, back = -D / 2, front = D / 2;
  const group = new THREE.Group(); group.name = 'ProceduralHand';
  const knit = makeKnitMaterial(), nailMat = makeNailMaterial();
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; };

  // curved nail patch: ~60% of fingertip width, lunula and free edge come from the texture
  const nailAt = (g, t, r, rhAt, flip = 1) => {
    const { curve, N0 } = g.userData, P = curve.getPointAt(t), T = curve.getTangentAt(t);
    let N = N0.clone();
    for (let i = 1; i <= 80; i++) { const Ti = curve.getTangentAt((t * i) / 80); N = N.clone().sub(Ti.clone().multiplyScalar(N.dot(Ti))).normalize(); }
    const dorsal = N.clone().multiplyScalar(-flip).normalize(), B = new THREE.Vector3().crossVectors(T, N).normalize();
    const nw = r * 0.6, nl = r * 0.6, geo = new THREE.PlaneGeometry(2, 2, 14, 12), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const a = pos.getX(i), b = pos.getY(i) * 0.5 + 0.5; // b: 0 cuticle .. 1 free edge
      pos.setXYZ(i, a * nw, (b - 0.5) * 2 * nl, -0.2 * r * a * a * 1.0 - 0.1 * r * (b - 0.4) ** 2 + 0.0003);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, nailMat); m.castShadow = true;
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(B, T, dorsal));
    m.position.copy(P).add(dorsal.clone().multiplyScalar(rhAt * 0.97));
    group.add(m);
  };

  // four fingers: path across the back, around the left edge, fingertip curled to the front. curl varies per finger.
  const defs = [
    { r: 0.0089, ye: -0.012, ym: -0.010, x0: 0.040, curl: 1.15, seed: 21 },
    { r: 0.0094, ye: -0.0305, ym: -0.030, x0: 0.044, curl: 0.9, seed: 22 },
    { r: 0.0086, ye: -0.0485, ym: -0.049, x0: 0.038, curl: 1.0, seed: 23 },
    { r: 0.0075, ye: -0.0655, ym: -0.067, x0: 0.030, curl: 1.3, seed: 24 },
  ];
  for (const d of defs) {
    const zc = back - d.r - 0.0003, ar = d.r + 0.0003;
    const pts = [
      V(d.x0 + 0.03, d.ym, zc - 0.002), V(d.x0, d.ym, zc), V(0.01, d.ye, zc), V(-hw + 0.004, d.ye, zc),
      V(-hw - ar * 0.5, d.ye, back - ar * 0.86), V(-hw - ar * 1.0, d.ye, back - ar * 0.3), V(-hw - ar * 1.02, d.ye, front * 0.6),
      V(-hw - ar * (0.9 - 0.1 * d.curl), d.ye, front + 0.0035 * d.curl), V(-hw - ar * (0.45 - 0.2 * (d.curl - 1)), d.ye, front + 0.0085 * d.curl),
    ];
    const rf = fingerRadius(d.r, 0.42, 0.7);
    const maps = makeLimbMaps({ seed: d.seed, creases: [0.42, 0.7], tip: true, ao: true });
    const g = sweep({ pts, radius: rf, n0: V(0, 0, 1), colorFn: fingerColor, segs: 90 });
    add(g, makeSkinMaterial(maps));
    const len = g.userData.curve.getLength();
    // nailAt(g, 1 - d.r * 1.45 / len, d.r, rf(1 - d.r * 1.45 / len)[1] * 0.88);
  }
  // thumb: shorter, thick base, rests on the right screen edge (clear of the tab bar centre)
  const tr = 0.0102, tz = front + tr * 0.96;
  const thumbR = (t) => { const k = 1.28 - 0.4 * t + 0.1 * gauss(t, 0.6, 0.06) - 0.03 * gauss(t, 0.54, 0.012); const e = t > 0.88 ? Math.sqrt(Math.max(0, 1 - ((t - 0.88) / 0.12) ** 2)) * 0.93 + 0.07 : 1; return [tr * 1.1 * k * e, tr * 0.9 * k * e]; };
  const REST = { x: 0.0255, y: -0.0295 }, PIV = { x: 0.066, y: -0.031 };
  // Thumb path for a pad position (x, y) on the glass, lifted by `lift` above it.
  const thumbPts = (x, y, lift) => {
    let dx = x - PIV.x, dy = y - PIV.y, L = Math.hypot(dx, dy);
    if (L < 0.03) { dx = (dx / (L || 1)) * 0.03; dy = (dy / (L || 1)) * 0.03; L = 0.03; x = PIV.x + dx; y = PIV.y + dy; }
    const ux = dx / L, uy = dy / L, ox = (x - REST.x) * 0.16, oy = (y - REST.y) * 0.16;
    const a = Math.min(0.0225, 0.48 * L), b = Math.min(0.0095, 0.2 * L);
    return [
      V(0.108, -0.045, -0.013), V(0.088 + ox * 0.5, -0.038 + oy * 0.5, -0.005),
      V(PIV.x + ox, PIV.y + oy, 0.006 + lift * 0.25),
      V(x - ux * a, y - uy * a, tz - 0.001 + lift * 0.7),
      V(x - ux * b, y - uy * b, tz + lift * 0.92),
      V(x, y, tz - 0.0003 + lift),
    ];
  };
  const thumbGeo = (x, y, lift) => sweep({ pts: thumbPts(x, y, lift), radius: thumbR, n0: V(0, 0, -1), colorFn: fingerColor, segs: 64, rad: 20 });
  const thumbMesh = add(thumbGeo(REST.x, REST.y, 0), makeSkinMaterial(makeLimbMaps({ seed: 31, creases: [0.3, 0.58], tip: true, ao: true })));
  group.userData.thumb = {
    rest: REST, front, W, H,
    set(x, y, lift) { const g = thumbGeo(x, y, lift); thumbMesh.geometry.dispose(); thumbMesh.geometry = g; },
  };
  // { const tn = 1 - tr * 1.6 / thumb.userData.curve.getLength(); nailAt(thumb, tn, tr * 1.0, thumbR(tn)[1] * 0.9, 1); }

  // palm, thenar, heel with palmar flexion creases
  const palmMaps = makeLimbMaps({ seed: 41, W: 512, H: 256, nk: 0.18, creases: [], lines: [
    { v: 0.5, u0: 0.17, u1: 0.3, depth: 4, wid: 2.4 }, { v: 0.57, u0: 0.18, u1: 0.33, depth: 3.2, wid: 2 }, { v: 0.43, u0: 0.2, u1: 0.31, depth: 3, wid: 2 }] });
  const palmMat = makeSkinMaterial(palmMaps);
  const ell = (rx, ry, rz, c) => { const g = new THREE.SphereGeometry(1, 64, 40); g.scale(rx, ry, rz); const n = g.attributes.position.count, cc = []; for (let i = 0; i < n; i++) cc.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); return g; };
  const palm = add(ell(0.062, 0.05, 0.0185, col(0xc99179)), palmMat); palm.position.set(0.085, -0.054, -0.0225); palm.rotation.z = -0.5;
  const thenar = add(ell(0.036, 0.027, 0.0165, col(0xc78c73)), palmMat); thenar.position.set(0.09, -0.032, -0.0115); thenar.rotation.z = -0.5;
  const heel = add(ell(0.04, 0.032, 0.0165, col(0xc3886f)), palmMat); heel.position.set(0.112, -0.072, -0.022); heel.rotation.z = -0.6;

  // wrist and forearm pointing down-right so the knit cuff lands in the lower-right of frame
  const W0 = V(0.112, -0.066, -0.0235), Dir = V(0.7, -0.7, -0.1).normalize();
  const fp = (s) => W0.clone().add(Dir.clone().multiplyScalar(s));
  const armMaps = makeLimbMaps({ seed: 51, W: 256, H: 512, creases: [], tendons: true });
  const farm = sweep({
    pts: [fp(-0.015), fp(0.1), fp(0.25), fp(0.5)], n0: V(0, 0, 1), segs: 40, uRep: 1, vRep: 1,
    radius: (t) => { const s = t * 0.51; return [0.0285 + 0.0105 * smooth(0, 0.5, s), 0.0225 + 0.009 * smooth(0, 0.5, s)]; },
    colorFn: () => SKIN.clone().lerp(DORSAL, 0.3),
  });
  add(farm, makeSkinMaterial(armMaps));
  const cuff = sweep({
    pts: [fp(-0.03), fp(0.08), fp(0.5), fp(0.7)], n0: V(0, 0, 1), segs: 28, flat: 0,
    radius: (t) => { const s = -0.03 + t * 0.73; const lip = 1 + 0.1 * gauss(t, 0.0, 0.02) + 0.05 * Math.cos(t * 200) * (t < 0.08 ? 1 : 0); return [(0.0395 + 0.014 * smooth(0, 0.6, s)) * lip, (0.0335 + 0.012 * smooth(0, 0.6, s)) * lip]; },
    colorFn: () => col(0xffffff), uRep: 1, vRep: 1,
  });
  add(cuff, knit);
  return group;
}
