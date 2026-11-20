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
