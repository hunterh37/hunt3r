import * as THREE from 'three';
import { mulberry } from './builder.js';

// Sunset light for the top state. A seed picks four OKLab stops, a gradient axis and a noise offset.
// The post pass (post.js) blends the stops in OKLab and multiplies the result onto the paper tones.
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function oklab([r, g, b]) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Stops: warm 1 is butter gold and rose, 0 is pale pink and lavender. No orange.
const WARM = [0xfff1b8, 0xffd36e, 0xf07ca6, 0x6f4fa8].map(hex);
const COOL = [0xfff6d8, 0xffc9d6, 0xc99ae0, 0x5f6ab8].map(hex);
const TAILS = [0x9db4c8, 0x2a3a7a, 0xb0527a].map(hex); // haze, dusk blue, rose

export function makeSunset(seed) {
  const r = mulberry(seed);
  const warm = r();
  const stops = WARM.map((c, i) => mix3(COOL[i], c, warm));
  const tail = r();
  if (tail < 0.6) stops[3] = mix3(stops[3], TAILS[Math.floor(r() * TAILS.length)], 0.35 + 0.5 * r());
  const rot = (r() - 0.5) * 0.5, cr = Math.cos(rot), sr = Math.sin(rot);
  const chroma = 0.5 + 0.3 * r();
  const colors = stops.map((c, i) => {
    const [, a, b] = oklab(c);
    const L = 0.95 - 0.05 * i + (r() - 0.5) * 0.02; // pastel: the tint multiplies paper, ink stays ink
    return new THREE.Vector3(L, (a * cr - b * sr) * chroma, (a * sr + b * cr) * chroma);
  });
  return { colors, angle: r() * Math.PI * 2, offset: new THREE.Vector2(r() * 40, r() * 40) };
}

// Pointer in uv space (0..1, +y up), eased. With no pointer the light rests right of centre and drifts.
export function createPointer() {
  const target = new THREE.Vector2(0.62, 0.6), cur = target.clone();
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', (e) => target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight), { passive: true });
  }
  return {
    value: cur,
    update(dt, t) {
      const k = 1 - Math.exp(-dt * 3);
      cur.x += (target.x + 0.05 * Math.sin(t * 0.21) - cur.x) * k;
      cur.y += (target.y + 0.05 * Math.cos(t * 0.17) - cur.y) * k;
    },
  };
}
