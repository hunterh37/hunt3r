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
export const TEXT_CLOUDS = [{ y: 560, s: 0.62, seed: 21 }, { y: 410, s: 0.62, seed: 34 }];

// Ground walk path (world/index.js pose, world/ar.js chevrons, ui HUD): alley z 0 from x 38 to 60,
// quarter arc (r 4) right round the corner, then +z up the cross street toward the Comm Ave trees.
export const W1 = 22, WR = 4, WA = (Math.PI / 2) * WR, W3 = 8, WALK_L = W1 + WA + W3;
export function walkAt(s) {
  if (s <= W1) return { x: 38 + s, z: 0, turn: 0 };
  if (s <= W1 + WA) { const u = (s - W1) / WA, th = u * Math.PI / 2; return { x: 60 + WR * Math.sin(th), z: WR - WR * Math.cos(th), turn: u }; }
  return { x: 64, z: WR + (s - W1 - WA), turn: 1 };
}
// Ground beat phases in p (0.68..0.80).
export const G = {
  on0: 0.680, on1: 0.689, on2: 0.698, drop: 0.705,   // hand raises glasses, puts them on, drops
  walk0: 0.700, walk1: 0.760,                         // walk + GPS
  paint0: 0.758, draw0: 0.763, draw1: 0.776,          // hand up, pinch-paint "hello :)"
  track0: 0.777, track1: 0.786,                       // hand down, glasses track the passing cars
  off0: 0.786, off1: 0.791, off2: 0.798,              // hand up to the glasses, take them off, lower away
  hud0: 0.695, hud1: 0.701, hud2: 0.789, hud3: 0.794, // HUD worn
};
export const walkS = (p) => WALK_L * smooth(range(p, G.walk0, G.walk1));
