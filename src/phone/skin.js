import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function heightToNormal(h, W, H, k) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), id = x.createImageData(W, H);
  const g = (xx, yy) => h[clamp(yy, 0, H - 1) * W + ((xx + W) % W)];
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const dx = (g(xx + 1, y) - g(xx - 1, y)) * k, dy = (g(xx, y + 1) - g(xx, y - 1)) * k, l = Math.hypot(dx, dy, 1), o = (y * W + xx) * 4;
    id.data[o] = (-dx / l * 0.5 + 0.5) * 255; id.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; id.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; id.data[o + 3] = 255;
  }
  x.putImageData(id, 0, 0); return c;
}
const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping; return t; };

// Per-limb, tiling-free maps. u around the limb (0..0.5 palmar, 0.5..1 dorsal), v along it (0 base, 1 tip).
// spec: { seed, creases:[v], tip:bool, ao:bool, lines:[{v,u0,u1,depth}] , tendons:bool, W, H }
export function makeLimbMaps(spec) {
  const W = spec.W || 256, H = spec.H || 512, r = rng(spec.seed || 1);
  const h = new Float32Array(W * H), rough = new Float32Array(W * H).fill(0.58);
  const dent = (x, y, rad, amp, rv = 0.1) => { for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) { const d = Math.hypot(i, j) / rad; if (d < 1) { const yy = y + j; if (yy < 0 || yy >= H) continue; const o = yy * W + ((x + i + W) % W); h[o] -= amp * (1 - d * d); rough[o] += rv * (1 - d); } } };
  // pores and micro-lines (cross-hatched)
  for (let i = 0; i < W * H / 38; i++) dent((r() * W) | 0, (r() * H) | 0, 1 + ((r() * 1.6) | 0), 0.45 + r() * 0.4);
  for (let i = 0; i < W * H / 260; i++) {
    const x0 = r() * W, y0 = r() * H, a = (r() < 0.5 ? 0.7 : -0.7) + (r() - 0.5) * 0.35, L = 8 + r() * 18;
    for (let s = 0; s < L; s++) { const x = ((x0 + Math.cos(a) * s) | 0), y = (y0 + Math.sin(a) * s) | 0; if (y >= 0 && y < H) { const o = y * W + ((x + W) % W); h[o] -= 0.22; rough[o] += 0.05; } }
  }
  const crease = (v, u0, u1, depth, wid) => {
    const yc = v * H, ph = r() * 6;
    for (let x = (u0 * W) | 0; x < u1 * W; x++) {
      const t = (x / W - u0) / (u1 - u0), env = Math.sin(Math.PI * clamp(t)) ** 0.5, y0 = yc + Math.sin(x * 0.09 + ph) * 1.2 + (r() - 0.5) * 0.6;
      for (let j = -wid * 2; j <= wid * 2; j++) { const yy = Math.round(y0 + j); if (yy < 0 || yy >= H) continue; const o = yy * W + (x % W); const f = Math.exp(-(j * j) / (wid * wid)); h[o] -= depth * env * f; rough[o] += 0.12 * env * f; }
    }
  };
  for (const v of spec.creases || []) {
    for (let k = -2; k <= 2; k++) crease(v + k * 0.017 + (r() - 0.5) * 0.004, 0.56 + r() * 0.04, 0.94 - r() * 0.04, 1.3 - Math.abs(k) * 0.25, 1.4); // dorsal
    crease(v, 0.04, 0.46, 4.2, 2.2); crease(v + 0.045, 0.08, 0.42, 2.6, 1.8); // palmar flexion
  }
  for (const L of spec.lines || []) crease(L.v, L.u0, L.u1, L.depth, L.wid || 2);
  if (spec.tendons) for (let k = 0; k < 4; k++) { const u = 0.62 + k * 0.1; for (let y = 0; y < H; y++) { const x = (((u + Math.sin(y * 0.02 + k) * 0.01) * W) | 0); for (let j = -5; j <= 5; j++) h[y * W + ((x + j + W) % W)] += 1.2 * (1 - Math.abs(j) / 5); } }
  // albedo
  const ac = document.createElement('canvas'); ac.width = W; ac.height = H; const a = ac.getContext('2d');
  a.fillStyle = '#f4e8e1'; a.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, rd = 15 + r() * 45, g = a.createRadialGradient(x, y, 0, x, y, rd); const pink = r() < 0.5; g.addColorStop(0, pink ? 'rgba(236,160,150,.15)' : 'rgba(255,238,195,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.fillRect(x - rd, y - rd, rd * 2, rd * 2); }
  for (let i = 0; i < 160; i++) { a.fillStyle = `rgba(140,90,70,${0.05 + r() * 0.1})`; a.beginPath(); a.arc(r() * W, r() * H, 0.5 + r() * 1.3, 0, 7); a.fill(); }
  const blob = (u, v, ru, rv, rgba) => { a.save(); a.translate(u * W, v * H); a.scale(ru * W, rv * H); const g = a.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba); g.addColorStop(1, 'rgba(255,255,255,0)'); a.fillStyle = g; a.beginPath(); a.arc(0, 0, 1, 0, 7); a.fill(); a.restore(); };
  for (const v of spec.creases || []) { blob(0.75, v, 0.17, 0.045, 'rgba(214,105,98,.34)'); blob(0.25, v, 0.2, 0.012, 'rgba(160,70,62,.35)'); a.fillStyle = 'rgba(120,55,48,.18)'; for (let k = -2; k <= 2; k++) a.fillRect(0.58 * W, (v + k * 0.017) * H - 0.5, 0.36 * W, 1); }
  if (spec.tip) { blob(0.5, 0.99, 0.5, 0.09, 'rgba(222,100,100,.42)'); blob(0.25, 0.94, 0.2, 0.08, 'rgba(235,130,125,.35)'); blob(0.75, 0.9, 0.14, 0.05, 'rgba(255,225,210,.5)'); }
  if (spec.ao) { blob(0.25, 0.5, 0.22, 0.5, 'rgba(110,55,50,.32)'); }
  const rc = document.createElement('canvas'); rc.width = W; rc.height = H; const rx = rc.getContext('2d'), rid = rx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { const v = clamp(rough[i] + (r() - 0.5) * 0.05, 0.42, 0.74) * 255; rid.data[i * 4] = rid.data[i * 4 + 1] = rid.data[i * 4 + 2] = v; rid.data[i * 4 + 3] = 255; }
  rx.putImageData(rid, 0, 0);
  return { map: tex(ac, true), normal: tex(heightToNormal(h, W, H, spec.nk || 0.75), false), rough: tex(rc, false) };
}

export function makeSkinMaterial(maps, tile) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, map: maps.map, normalMap: maps.normal, roughnessMap: maps.rough,
    normalScale: new THREE.Vector2(1.0, 1.0), roughness: 1, metalness: 0, specularIntensity: 0.55,
    sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffc2a8), envMapIntensity: 0.3,
  });
  if (tile) for (const t of [maps.map, maps.normal, maps.rough]) { t.wrapT = THREE.RepeatWrapping; }
  // subsurface approximation: wrapped diffuse with red-shifted terminator, plus transmission at thin/grazing areas
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>',
      THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        'vec3 irradiance = dotNL * directLight.color;',
        `float wrapN = saturate( ( dot( geometryNormal, directLight.direction ) + 0.4 ) / 1.4 );
         vec3 irradiance = dotNL * directLight.color + max( wrapN - dotNL, 0.0 ) * directLight.color * vec3( 0.6, 0.17, 0.08 );
         float thin = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 2.2 );
         float back = saturate( dot( -directLight.direction, geometryViewDir ) * 0.5 + 0.5 );
         reflectedLight.directDiffuse += directLight.color * thin * back * vec3( 0.55, 0.12, 0.05 ) * material.diffuseColor * 0.9;`));
  };
  return m;
}

export function makeNailMaterial() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 96; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 96, 0, 0); g.addColorStop(0, '#d89f94'); g.addColorStop(0.7, '#e8b8ad'); g.addColorStop(0.9, '#f1d5cb'); g.addColorStop(1, '#f6e8e0');
  x.fillStyle = g; x.fillRect(0, 0, 64, 96);
  x.fillStyle = 'rgba(255,240,232,.7)'; x.beginPath(); x.ellipse(32, 92, 22, 14, 0, Math.PI, 0); x.fill(); // lunula
  x.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 8; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 96); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.14, envMapIntensity: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

export function makeKnitMaterial() {
  const W = 128, H = 128, h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const rib = Math.cos(x / W * Math.PI * 2 * 8) * 0.5 + 0.5;                    // vertical ribs
    const st = Math.abs(((y / 8) % 1) - 0.5) * 2 + Math.abs((((x + 8) / 8) % 1) - 0.5) * 0.0; // stitch rows
    const v = Math.abs(((x / 4) % 1) - 0.5) * 2;
    h[y * W + x] = rib * 3 + (v * 0.8 + ((y % 8) / 8) * 0.8) * (rib > 0.5 ? 1 : 0.4) + st * 0.3;
  }
  const n = new THREE.CanvasTexture(heightToNormal(h, W, H, 1.1)); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(3, 16);
  return new THREE.MeshStandardMaterial({ color: 0x24252a, normalMap: n, normalScale: new THREE.Vector2(1.6, 1.6), roughness: 0.96, metalness: 0, envMapIntensity: 0.35 });
}
