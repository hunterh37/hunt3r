import * as THREE from 'three';
import { range, smooth, easeOutCubic, easeInOutCubic, lerp, clamp01, walkAt, walkS, WALK_L, G } from '../timeline.js';
import { createAR } from './ar.js';
import { createTraffic } from './traffic.js';
import { createSquirrels } from './squirrels.js';
import { toonMaterial, shared } from './toon.js';
import { createPost } from './post.js';
import { buildCity } from './city.js';
import { createSky } from './sky.js';
import { createSigns } from './signs.js';
import { makeSunset, createPointer } from './sunset.js';

const D2R = Math.PI / 180;

export async function createWorld({ renderer }) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4500);
  camera.rotation.order = 'YXZ';

  const mat = toonMaterial();
  scene.add(buildCity(mat).group);
  scene.add(createSigns().group);
  const traffic = createTraffic(mat);
  scene.add(traffic.group);
  const squirrels = createSquirrels(mat);
  scene.add(squirrels.group);

  const sky = createSky(mat, camera, reduced);
  scene.add(sky.group);
  const ar = createAR(scene, camera, reduced, renderer);
  ar.tracked = traffic.boxes;

  const post = createPost(renderer, scene, camera);
  const pos = new THREE.Vector3();
  const pinned = typeof location !== 'undefined' && new URLSearchParams(location.search).has('p');
  let lastY = null, speed = 0;
  const qs = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const forceWhite = qs && qs.has('white') ? parseFloat(qs.get('white')) : null; // ?white=0.5 pins the cloud wipe for stills
  // Sunset light over the top state: new palette each load, ?sun=12 pins one, pinned stills default to 7.
  const sunSeed = qs && qs.has('sun') ? parseInt(qs.get('sun'), 10) || 0 : pinned ? 7 : (Math.random() * 1e9) | 0;
  const pointer = createPointer();
  post.setSunset(makeSunset(sunSeed), pointer.value);

  function pose(p, t) {
    const sk = range(p, 0, 0.14), desc = range(p, 0.14, 0.56), land = range(p, 0.56, 0.68);
    let x = lerp(60, 50, sk), y = lerp(1000, 940, sk), z = lerp(60, 55, sk);
    if (p > 0.14) {
      // hold over the apple deck (y 790, desc ~0.44) so the fall is centred on it, then drift
      x = lerp(50, 34, smooth(range(desc, 0.46, 1)));
      y = lerp(940, 70, easeInOutCubic(desc));
      z = lerp(55, 0.0, smooth(range(desc, 0.46, 0.8)));
    }
    if (p > 0.56) y = lerp(70, 1.6, easeOutCubic(range(land, 0, 0.85)));
    // touchdown: knees take the drop, one damped dip, settled before the cut at 0.68
    if (!reduced && p > 0.662 && p < 0.68) { const q = range(p, 0.662, 0.68); y -= 0.24 * Math.sin(q * Math.PI * 2.5) * Math.exp(-3.5 * q) * (1 - q); }
    let pitch = -90;
    if (p > 0.56) pitch = lerp(-90, 0, easeInOutCubic(range(land, 0.15, 1)));
    const bump = Math.sin(Math.PI * clamp01(desc));
    const fov = lerp(50, 54, smooth(land)) + 12 * bump * bump;
    const roll = 0.06 * Math.sin(p * 31) * smooth(range(p, 0.12, 0.2)) * (1 - smooth(land));
    let yaw = -Math.PI / 2;
    let py = y, pp = pitch * D2R, pr = roll;
    if (p > 0.68) {
      // walk the last houses of the alley, round the corner onto the cross street, stop facing the Comm Ave trees
      const s = walkS(p);
      const a = walkAt(s), ah = walkAt(Math.min(WALK_L, s + 2.2));
      x = a.x; z = a.z; yaw = -Math.PI / 2 - (Math.PI / 2) * ah.turn;
      const stride = s * Math.PI / 0.78, amt = smooth(range(s, 0, 1.5)) * (1 - smooth(range(s, WALK_L - 1.5, WALK_L)));
      if (!reduced) { py = 1.6 + amt * (0.04 * Math.abs(Math.sin(stride)) - 0.02); pr = amt * 0.005 * Math.sin(stride); }
      else py = 1.6;
      pp = 0.07 * smooth(range(p, G.off1, 0.8));
    }
    if (!reduced && p >= 0.68) {
      py += 0.018 * Math.sin(t * 0.9);
      pp += 0.004 * Math.sin(t * 0.7);
      yaw += 0.006 * Math.sin(t * 0.5);
    }
    return { x, y: py, z, pitch: pp, yaw, roll: pr, fov };
  }

  function update(p, t, dt = 0.016) {
    const c = pose(p, reduced ? 0 : t);
    camera.position.set(c.x, c.y, c.z);
    camera.rotation.set(c.pitch, c.yaw, c.roll);
    camera.fov = c.fov;
    camera.near = Math.min(10, Math.max(0.08, c.y * 0.012));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    sky.update(reduced ? 0 : t, p);
    shared.uFog.value = lerp(0.0011, 0.003, smooth(range(p, 0.3, 0.68)));
    // colour: street trees first, then it spreads over everything around them
    traffic.update(p, t);
    ar.update(p, reduced ? 0 : t);
    squirrels.update(p, reduced ? 0 : t);
    shared.uColTree.value = smooth(range(p, 0.792, 0.803)) * 70;
    shared.uColAll.value = smooth(range(p, 0.796, 0.81)) * 260;
    post.color = smooth(range(p, 0.796, 0.81));
    pos.copy(camera.position);
    post.white = p > 0.1 && p < 0.62 ? 0.92 * sky.whiteout(pos) : 0;
    if (forceWhite !== null) post.white = forceWhite;
    post.boil = reduced ? 0 : Math.floor(t * 5) * 1.7;
    const sun = 1 - smooth(range(p, 0.05, 0.21));
    post.sun = sun;
    if (sun > 0) { pointer.update(dt, reduced ? 0 : t); post.sunTime = reduced ? 0 : t; }
    // speed lines follow the real fall rate (m/s) of the scrolled camera; pinned stills use the slope of the path
    let want = 0;
    if (!reduced && p > 0.1 && p < 0.68) {
      if (pinned) want = clamp01((pose(p - 0.002, 0).y - pose(p + 0.002, 0).y) / 0.004 / 5200);
      else if (lastY !== null && dt > 0) want = smooth(clamp01((Math.abs(lastY - c.y) / dt - 50) / 650));
    }
    lastY = c.y;
    speed = pinned ? want : speed + (want - speed) * (1 - Math.exp(-dt * (want > speed ? 9 : 4)));
    post.speed = speed;
  }

  return {
    update,
    render(r) { post.render(r); ar.render(r); },
    get detections() { return ar.detections; },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); post.resize(); },
  };
}
