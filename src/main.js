import * as THREE from 'three';
import { createWorld } from './world/index.js';
import { createPhone } from './phone/index.js';
import { createUI } from './ui/index.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const params = new URLSearchParams(location.search);
const frozen = params.has('p') ? parseFloat(params.get('p')) : null; // ?p=0.85 pins the timeline for stills
const frozenT = params.has('t') ? parseFloat(params.get('t')) : null;

const ui = createUI(document.getElementById('ui'));
const [world, phone] = await Promise.all([createWorld({ renderer }), createPhone({ renderer })]);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  world.resize(w, h);
  phone.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

// Page scroll f -> timeline p. Descent gets less scroll so the ground arrives sooner;
// 0.68..0.80 is the ground walk, corner and colour spread.
const FK = [0, 0.10, 0.32, 0.40, 0.70, 1], PK = [0, 0.14, 0.56, 0.68, 0.80, 1];
const skip = (f) => {
  for (let i = 1; i < FK.length; i++) if (f <= FK[i]) return PK[i - 1] + (PK[i] - PK[i - 1]) * (f - FK[i - 1]) / (FK[i] - FK[i - 1]);
  return 1;
};
let target = 0, f = 0, p = frozen ?? 0;
const readScroll = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  target = max > 0 ? window.scrollY / max : 0;
};
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();

const clock = new THREE.Clock();
let frames = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = frozenT ?? clock.elapsedTime;
  if (frozen === null) { f += (target - f) * (1 - Math.exp(-dt * 6)); p = skip(f); }
  else p = frozen;

  world.update(p, t, dt);
  phone.update(p, t, dt);
  ui.update(p, t, world.detections);

  renderer.setRenderTarget(null);
  renderer.clear();
  world.render(renderer);          // toon + outline pass, owned by world
  renderer.setRenderTarget(null);
  renderer.clearDepth();
  if (phone.visible) renderer.render(phone.scene, phone.camera); // PBR pass, no outline

  if (++frames === 8) { ui.setLoaded(); window.__ready = true; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
