// SVG cloud in the toon sky style: paper puffs, flat mid shadow, ink halftone in the deepest shade,
// broken ink strokes on the terminator. Light comes from upper left like the 3D clouds.
const PAPER = '#f4f2ec', MID = '#b9b6ae', INK = '#0a0a0a';
let uid = 0;

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function cloudSVG(w, h, seed = 1) {
  const r = mulberry(seed), id = 'c' + uid++ + '_';
  const m = Math.min(w, h) * 0.55, W = w + m * 2, H = h + m * 2;
  const bx = m, by = m, R = Math.min(h * 0.5, 120);
  const puffs = [];
  // top edge: big billows, sides: medium, bottom: small flattened lobes
  const top = Math.max(3, Math.round(w / (h * 0.75)));
  for (let i = 0; i < top; i++) {
    const u = (i + 0.5) / top, rad = h * (0.42 + r() * 0.22) * (1 - Math.abs(u - 0.45) * 0.5);
    puffs.push([bx + w * u + (r() - 0.5) * 20, by + h * 0.18 - rad * 0.25, rad]);
  }
  for (const s of [0, 1]) puffs.push([s ? bx + w - h * 0.05 : bx + h * 0.05, by + h * 0.55, h * (0.42 + r() * 0.1)]);
  const bot = top + 1;
  for (let i = 0; i < bot; i++) {
    const u = (i + 0.5) / bot;
    puffs.push([bx + w * u + (r() - 0.5) * 16, by + h * 0.92, h * (0.24 + r() * 0.1)]);
  }
  const defs = [`<pattern id="${id}d" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill="${INK}"/></pattern>`];
  const body = [];
  puffs.forEach(([x, y, rad], i) => {
    defs.push(`<clipPath id="${id}${i}"><circle cx="${x}" cy="${y}" r="${rad}"/></clipPath>`);
    const lx = x - rad * 0.22, ly = y - rad * 0.3, lr = rad * 0.98;
    const dash = `${(rad * 0.5).toFixed(0)} ${(rad * 0.9).toFixed(0)} ${(rad * 0.25).toFixed(0)} ${(rad * 4).toFixed(0)}`;
    body.push(`<g clip-path="url(#${id}${i})">
      <circle cx="${x}" cy="${y}" r="${rad}" fill="${MID}"/>
      <circle cx="${x + rad * 0.35}" cy="${y + rad * 0.45}" r="${rad * 0.62}" fill="url(#${id}d)"/>
      <circle cx="${lx}" cy="${ly}" r="${lr}" fill="${PAPER}" stroke="${INK}" stroke-width="2.2" stroke-dasharray="${dash}" stroke-dashoffset="${(r() * rad).toFixed(0)}"/>
    </g>`);
  });
  body.push(`<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="${R}" fill="${PAPER}"/>`);
  return `<svg class="cloud-bg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="left:${-m}px;top:${-m}px" aria-hidden="true"><defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}
