import * as THREE from 'three';

// Merges boxes, tubes and low-poly spheres into one flat-shaded BufferGeometry.
// Colours are raw sRGB greys (number) or [r,g,b]. Box y is the base of the box.
const icoCache = new Map();
function icoTris(detail) {
  if (!icoCache.has(detail)) icoCache.set(detail, new THREE.IcosahedronGeometry(1, detail).toNonIndexed().attributes.position.array);
  return icoCache.get(detail);
}

export class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.v = 0; }

  _poly(vs, col, ref) {
    const c = typeof col === 'number' ? [col, col, col] : col;
    const [a, b, d] = vs;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = d[0] - a[0], wy = d[1] - a[1], wz = d[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (ref) {
      let cx = 0, cy = 0, cz = 0;
      for (const v of vs) { cx += v[0]; cy += v[1]; cz += v[2]; }
      cx /= vs.length; cy /= vs.length; cz /= vs.length;
      if (nx * (cx - ref[0]) + ny * (cy - ref[1]) + nz * (cz - ref[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; vs = vs.slice().reverse(); }
    }
    const base = this.v;
    for (const v of vs) { this.p.push(v[0], v[1], v[2]); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]); }
    for (let k = 1; k < vs.length - 1; k++) this.i.push(base, base + k, base + k + 1);
    this.v += vs.length;
  }

  box(cx, by, cz, sx, sy, sz, col, ry = 0, ix = 0, iz = 0) {
    const hx = sx / 2, hz = sz / 2, cs = Math.cos(ry), sn = Math.sin(ry);
    const tr = (x, y, z) => [cx + x * cs + z * sn, by + y, cz - x * sn + z * cs];
    const b = [tr(-hx, 0, -hz), tr(hx, 0, -hz), tr(hx, 0, hz), tr(-hx, 0, hz)];
    const t = [tr(-hx + ix, sy, -hz + iz), tr(hx - ix, sy, -hz + iz), tr(hx - ix, sy, hz - iz), tr(-hx + ix, sy, hz - iz)];
    const ref = tr(0, sy / 2, 0);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; this._poly([b[i], b[j], t[j], t[i]], col, ref); }
    this._poly(t, col, ref);
  }

  tube(p0, p1, r0, r1, sides, col, caps = true) {
    const ax = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const L = Math.hypot(...ax) || 1; ax[0] /= L; ax[1] /= L; ax[2] /= L;
    const h = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let u = [ax[1] * h[2] - ax[2] * h[1], ax[2] * h[0] - ax[0] * h[2], ax[0] * h[1] - ax[1] * h[0]];
    const ul = Math.hypot(...u); u = u.map((x) => x / ul);
    const w = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
    const ring = (p, r) => {
      const out = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 + (sides === 4 ? Math.PI / 4 : 0), cs = Math.cos(a) * r, sn = Math.sin(a) * r;
        out.push([p[0] + u[0] * cs + w[0] * sn, p[1] + u[1] * cs + w[1] * sn, p[2] + u[2] * cs + w[2] * sn]);
      }
      return out;
    };
    const A = ring(p0, r0), Bm = ring(p1, r1);
    const ref = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
    for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; this._poly([A[i], A[j], Bm[j], Bm[i]], col, ref); }
    if (caps) { this._poly(Bm, col, ref); this._poly(A.slice().reverse(), col, ref); }
  }

  beam(p0, p1, r, col) { this.tube(p0, p1, r, r, 4, col); }

  cyl(cx, by, cz, r, h, sides, col, rt = r) { this.tube([cx, by, cz], [cx, by + h, cz], r, rt, sides, col); }

  sphere(cx, cy, cz, r, col, detail = 1, sy = 1) {
    const a = icoTris(detail);
    for (let k = 0; k < a.length; k += 9) {
      const v = [];
      for (let m = 0; m < 3; m++) v.push([cx + a[k + m * 3] * r, cy + a[k + m * 3 + 1] * r * sy, cz + a[k + m * 3 + 2] * r]);
      this._poly(v, col, [cx, cy, cz]);
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.v > 65000 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    this.p = this.n = this.c = this.i = null;
    return g;
  }
}

export const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
