// Scroll timeline. p is 0..1 over the whole page. Every module reads these ranges.
export const BEATS = {
  sky:     [0.00, 0.14], // above the clouds, camera looks straight down
  descent: [0.14, 0.56], // falls through cloud deck, Back Bay roofs resolve
  landing: [0.56, 0.68], // drops into the alley, pitch levels to eye height
  montage: [0.68, 0.80], // white flash, touch-device history cards
  phone:   [0.80, 1.00], // arm rises with iPhone, Photos app, then apps
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const range = (p, a, b) => clamp01((p - a) / (b - a));
export const beat = (p, name) => range(p, BEATS[name][0], BEATS[name][1]);
export const smooth = (x) => x * x * (3 - 2 * x);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

// Scroll p at which the descending camera reaches altitude y (inverse of pose() in world/index.js).
export function pAtAlt(y) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (lerp(940, 70, easeInOutCubic(m)) > y) lo = m; else hi = m; }
  return 0.14 + lo * 0.42;
}

// Intro text clouds: real 3D sky clouds under the camera path; the HTML text sits over them.
export const TEXT_CLOUDS = [{ y: 580, s: 0.62, seed: 21 }, { y: 380, s: 0.62, seed: 34 }];
