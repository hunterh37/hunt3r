import * as THREE from 'three';
import { mulberry } from './builder.js';
import { AMBER, toonMaterial } from './toon.js';
import { cloudDeck, iconCloud } from './shapes.js';
import { createDevices, swapScale } from './props.js';
import { range, smooth, easeInOutCubic, lerp, TEXT_CLOUDS } from '../timeline.js';

// Camera xz during the descent at altitude y (mirrors pose() in world/index.js).
function camAt(y) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (lerp(940, 70, easeInOutCubic(m)) > y) lo = m; else hi = m; }
  const p = 0.14 + lo * 0.42;
  return { x: lerp(50, -46, smooth(lo)), z: lerp(55, 0, smooth(range(p, 0.14, 0.45))) };
}

// Puffy low-poly clouds (merged icospheres, smooth normals so intersections inks as creases), plus the sun.
function clusterGeo(seed) {
  const r = mulberry(seed);
  const pos = [], nor = [], col = [];
  const k = 10 + Math.floor(r() * 3);
  const ico = new THREE.IcosahedronGeometry(1, 2).toNonIndexed().attributes.position.array;
  for (let s = 0; s < k; s++) {
    const x = ((s / (k - 1)) * 2 - 1) * 1.05 + (r() - 0.5) * 0.2;
    const rad = (0.82 - Math.abs(x) * 0.42) * (0.75 + r() * 0.4) * 100;
    const cx = x * 100, cz = (r() - 0.5) * 70, cy = rad * 0.32 + (s % 3 === 2 ? rad * 0.55 : 0) + r() * 8;
    for (let i = 0; i < ico.length; i += 3) {
      const dx = ico[i], dy = ico[i + 1], dz = ico[i + 2];
      const px = cx + dx * rad, pz = cz + dz * rad;
      let py = cy + dy * rad * 0.8;
      if (py < 0) py = 0;
      const nl = Math.hypot(dx, dy * 1.5, dz);
      pos.push(px, py, pz); nor.push(dx / nl, (dy * 1.5) / nl, dz / nl);
      const c = 0.82 - (py < 6 ? 0.14 : 0);
      col.push(c, c, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function sunGeo(R) {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, color) => { for (const v of [a, b, c]) { pos.push(v[0], v[1], 0); nor.push(0, 0, 1); col.push(...color); } };
  const N = 36;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    tri([0, 0], [Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a1) * R, Math.sin(a1) * R], AMBER);
  }
  const ink = [0.04, 0.04, 0.04], R2 = 20;
  for (let i = 0; i < R2; i++) {
    const a = (i / R2) * Math.PI * 2, w = 0.045, long = i % 2 === 0;
    const r0 = R * 1.22, r1 = R * (long ? 2.0 : 1.55);
    const pt = (rr, aa) => [Math.cos(aa) * rr, Math.sin(aa) * rr];
    tri(pt(r0, a + w), pt(r0, a - w), pt(r1, a), ink);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function createSky(sunMat, camera, reduced) {
  const mat = toonMaterial({ cloud: true });
  const group = new THREE.Group();
  const rnd = mulberry(77);
  const layers = [
    { y: 430, n: 9, s: [1.5, 2.3], seed: 1 },
    { y: 560, n: 8, s: [1.3, 2.0], seed: 2 },
    { y: 690, n: 7, s: [1.1, 1.7], seed: 3 },
    { y: 820, n: 5, s: [0.9, 1.4], seed: 4 },
    { y: 625, n: 0, s: [0.42, 0.42], seed: 5, hero: [12, 33] },
  ];
  const insts = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  layers.forEach((L, li) => {
    const geo = clusterGeo(L.seed * 13);
    const list = [];
    if (L.hero) list.push({ x: L.hero[0], z: L.hero[1], s: L.s[0], ry: 0.4 });
    while (list.length < L.n) {
      const x = -520 + rnd() * 1250, z = -720 + rnd() * 1500;
      const hole = ((x - 60) / 360) ** 2 + ((z - 50) / 300) ** 2 < 1;
      if (hole) continue;
      list.push({ x, z, s: L.s[0] + rnd() * (L.s[1] - L.s[0]), ry: rnd() * Math.PI });
    }
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((c, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.ry);
      sc.set(c.s, c.s * (0.8 + rnd() * 0.5), c.s);
      ps.set(c.x, L.y, c.z);
      m4.compose(ps, q, sc);
      mesh.setMatrixAt(i, m4);
      insts.push({ li, x: c.x, y: L.y, z: c.z, s: c.s });
    });
    mesh.frustumCulled = false;
    mesh.userData.li = li;
    group.add(mesh);
  });
  const meshes = group.children.slice();
  const offs = meshes.map(() => 0);

  // Sun, then iPhone, Apple Watch and Vision Pro in its place as the scroll advances (STARTS, in p).
  // The prop is anchored in camera space so it stays in frame on every aspect; at p 0 on a wide frame it sits at (96, 872, 8).
  const sun = new THREE.Mesh(sunGeo(8.5), sunMat);
  sun.frustumCulled = false;
  const sunRoot = new THREE.Group();
  sunRoot.add(sun);
  const STARTS = [0, 0.045, 0.105, 0.165];
  const items = [{ root: sunRoot, tick(t) { sun.rotation.z = t * 0.06; } }, ...createDevices(sunMat)].map((it) => {
    const holder = new THREE.Group();
    holder.add(it.root);
    return { holder, tick: it.tick };
  });
  const prop = new THREE.Group();
  items.forEach((it) => prop.add(it.holder));
  group.add(prop);
  const vF = new THREE.Vector3(), vU = new THREE.Vector3(), vR = new THREE.Vector3();

  // Clouds that carry the intro text, centred under the camera path, long axis across the screen.
  const textClouds = TEXT_CLOUDS.map((tc) => {
    const m = new THREE.Mesh(clusterGeo(tc.seed), mat);
    const c = camAt(tc.y);
    m.position.set(c.x, tc.y, c.z);
    m.rotation.y = Math.PI / 2;
    m.scale.set(tc.s, tc.s * 0.8, tc.s * 1.25);
    m.frustumCulled = false;
    group.add(m);
    return m;
  });

  // Deck the camera falls through: apple.
  const decks = [
    { shape: 'apple', y: 790, size: 62, seed: 11 },
  ];
  for (const d of decks) {
    const c = camAt(d.y);
    group.add(cloudDeck(mat, { shape: d.shape, cx: c.x, cy: d.y, cz: c.z, size: d.size, seed: d.seed }));
  }
  // iOS engineering icons drifting between decks, off the camera axis.
  const icons = [
    { shape: 'swift', y: 860, dx: 150, dz: -170, size: 48 },
    { shape: 'gear', y: 720, dx: -160, dz: 190, size: 40 },
    { shape: 'heart', y: 700, dx: 190, dz: 150, size: 36 },
    { shape: 'code', y: 540, dx: -180, dz: -160, size: 42 },
    { shape: 'pin', y: 530, dx: 170, dz: 200, size: 38 },
    { shape: 'cube', y: 380, dx: -150, dz: 170, size: 38 },
    { shape: 'hammer', y: 370, dx: 160, dz: -150, size: 40 },
  ];
  const iconMeshes = icons.map((ic, i) => {
    const c = camAt(ic.y);
    const m = iconCloud(mat, { shape: ic.shape, cx: c.x + ic.dx, cy: ic.y, cz: c.z + ic.dz, size: ic.size, seed: 30 + i });
    group.add(m);
    return m;
  });

  return {
    group,
    update(t, p = 0) {
      meshes.forEach((m, i) => {
        offs[i] = reduced ? 0 : t * (0.6 + 0.3 * i) + 20 * Math.sin(t * 0.05 + i * 2);
        m.position.x = offs[i];
      });
      iconMeshes.forEach((m, i) => { m.position.x = reduced ? 0 : 6 * Math.sin(t * 0.12 + i); });
      prop.visible = p < 0.27;
      if (prop.visible) {
        const e = camera.matrixWorld;
        vR.setFromMatrixColumn(e, 0); vU.setFromMatrixColumn(e, 1); vF.setFromMatrixColumn(e, 2).negate();
        const tv = Math.tan((camera.fov * Math.PI) / 360), th = tv * camera.aspect;
        const fall = smooth(range(p, 0.02, 0.24)), exit = range(p, 0.225, 0.262);
        const depth = lerp(128, 72, fall);
        const ny = 0.6 + 0.06 * fall + 1.6 * exit * exit; // rises out of the top of the frame as the camera falls past
        prop.position.copy(camera.position).addScaledVector(vF, depth).addScaledVector(vU, ny * tv * depth).addScaledVector(vR, Math.max(-0.406, -0.62 * th) * depth);
        prop.quaternion.copy(camera.quaternion);
        prop.scale.setScalar((depth / 128) * lerp(1, 1.3, fall) * Math.min(1, th / 0.38));
        items.forEach((it, i) => {
          const { s, spin } = swapScale(p, STARTS, i);
          it.holder.visible = s > 0.002;
          if (!it.holder.visible) return;
          it.holder.scale.setScalar(s);
          it.holder.rotation.z = spin;
          it.tick(t);
        });
      }
      // hide a text cloud just before the camera would clip into it
      textClouds.forEach((m) => { m.visible = camera.position.y > m.position.y + 75; });
    },
    whiteout(cp) {
      let w = 0;
      for (const c of insts) {
        const dx = (cp.x - (c.x + offs[c.li])) / (135 * c.s), dz = (cp.z - c.z) / (70 * c.s), dy = (cp.y - c.y - 20 * c.s) / (50 * c.s);
        const d = Math.hypot(dx, dz, dy);
        w = Math.max(w, Math.min(1, Math.max(0, (1.05 - d) / 0.5)));
      }
      return w;
    },
  };
}
