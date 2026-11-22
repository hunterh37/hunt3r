import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { createScreen } from './screen.js';
import { buildProceduralHand } from './hand.js';

const W = 0.0715, H = 0.1471, D = 0.0083;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// superellipse rounded rectangle (continuous curvature, like the iPhone body)
function squircle(w, h, r, n = 5, seg = 14) {
  const s = new THREE.Shape(), hw = w / 2, hh = h / 2;
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
      const x = cx + r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = cy + r * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      s.lineTo(x, y);
    }
  };
  s.moveTo(-hw + r, -hh);
  corner(hw - r, -hh + r, -Math.PI / 2); corner(hw - r, hh - r, 0); corner(-hw + r, hh - r, Math.PI / 2); corner(-hw + r, -hh + r, Math.PI);
  return s;
}
function planeFromShape(shape, w, h, z) {
  const g = new THREE.ShapeGeometry(shape, 8), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  g.translate(0, 0, z); return g;
}

function buildPhone() {
  const g = new THREE.Group(); g.name = 'iPhone';
  const R = 0.0112, bev = 0.0009;
  const titanium = new THREE.MeshPhysicalMaterial({ color: 0xa8a59e, metalness: 1, roughness: 0.3, anisotropy: 0.55, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.9 });
  const bodyShape = squircle(W - 2 * bev, H - 2 * bev, R - bev);
  let body = new THREE.ExtrudeGeometry(bodyShape, { depth: D - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 6, steps: 1 });
  body.translate(0, 0, -(D - 2 * bev) / 2);
  body = toCreasedNormals(body, 0.8);
  const frame = new THREE.Mesh(body, titanium); frame.castShadow = true; frame.receiveShadow = true; g.add(frame);

  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.07, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.1 });
  const inset = 0.0006;
  const glass = new THREE.Mesh(planeFromShape(squircle(W - 2 * inset, H - 2 * inset, R - inset), W, H, D / 2 + 0.00008), glassMat); g.add(glass);
  const back = new THREE.Mesh(planeFromShape(squircle(W - 2 * inset, H - 2 * inset, R - inset), W, H, -D / 2 - 0.00008), new THREE.MeshPhysicalMaterial({ color: 0x3a3b3f, roughness: 0.4, clearcoat: 0.3, envMapIntensity: 0.8 }));
  back.rotation.y = Math.PI; g.add(back);

  // side buttons
  const btn = (x, y, len) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.0009, len, 0.0034), titanium); m.position.set(x, y, 0); m.castShadow = true; g.add(m); };
  btn(-W / 2 - 0.0001, 0.0522, 0.0072); btn(-W / 2 - 0.0001, 0.0388, 0.0112); btn(-W / 2 - 0.0001, 0.0237, 0.0112); btn(W / 2 + 0.0001, 0.0345, 0.0185);
  // camera bump (back, normally hidden)
  const bump = new THREE.Mesh(new THREE.BoxGeometry(0.0335, 0.0335, 0.0022), new THREE.MeshPhysicalMaterial({ color: 0x4a4b4f, roughness: 0.45, clearcoat: 0.3 }));
  bump.position.set(-W / 2 + 0.0215, H / 2 - 0.0215, -D / 2 - 0.0011); g.add(bump);
  for (const [lx, ly] of [[-0.0075, 0.0075], [-0.0075, -0.0075], [0.0075, 0]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0057, 0.0057, 0.0016, 28), new THREE.MeshPhysicalMaterial({ color: 0x08090c, roughness: 0.08, metalness: 0.6, clearcoat: 1 }));
    l.rotation.x = Math.PI / 2; l.position.set(bump.position.x + lx + 0.0025, bump.position.y + ly, -D / 2 - 0.0028); g.add(l);
  }

  // screen
  const sb = 0.0016, sR = R - sb;
  const screenMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9, toneMapped: true });
  const screen = new THREE.Mesh(planeFromShape(squircle(W - 2 * sb, H - 2 * sb, sR), W - 2 * sb, H - 2 * sb, D / 2 + 0.00016), screenMat);
  // planeFromShape maps to the full W,H; remap to the screen rectangle
  { const uv = screen.geometry.attributes.uv, p = screen.geometry.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (W - 2 * sb) + 0.5, p.getY(i) / (H - 2 * sb) + 0.5); }
  g.add(screen);
  // receives the finger shadow
  const shadow = new THREE.Mesh(planeFromShape(squircle(W - 2 * sb, H - 2 * sb, sR), W, H, D / 2 + 0.0003), new THREE.ShadowMaterial({ opacity: 0.38 }));
  shadow.receiveShadow = true; g.add(shadow);
  return { group: g, screenMat, screen };
}

async function loadArmGLB() {
  try {
    const res = await fetch('/arm/arm.glb');
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 12 || new DataView(buf).getUint32(0, true) !== 0x46546c67) return null; // 'glTF'
    const gltf = await new GLTFLoader().parseAsync(buf, '/arm/');
    return gltf.scene;
  } catch { return null; }
}

export async function createPhone({ renderer }) {
  const scene = new THREE.Scene();
  scene.background = null;
  // Shadows are enabled only while this scene renders (only this scene's lights cast shadows); prior renderer state is restored.
  let prevShadow = false, prevType = renderer.shadowMap.type;
  scene.onBeforeRender = () => { prevShadow = renderer.shadowMap.enabled; prevType = renderer.shadowMap.type; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; };
  scene.onAfterRender = () => { renderer.shadowMap.enabled = prevShadow; renderer.shadowMap.type = prevType; };
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 5);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environmentIntensity = 0.7;

  // overcast alley: big soft key from above front, cool fill, warm low rim
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x2b2622, 0.3));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.6); key.position.set(0.1, 0.5, 0.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9db4c8, 0.55); fill.position.set(-0.6, 0.1, 0.4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xff9a55, 1.1); rim.position.set(0.5, -0.4, -0.3); scene.add(rim);
  const spot = new THREE.SpotLight(0xfff6ee, 2.6, 2, 0.5, 1, 0); spot.position.set(0.0, 0.34, 0.32); spot.target.position.set(0.02, -0.02, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0002; spot.shadow.normalBias = 0.0004; spot.shadow.radius = 5; spot.shadow.camera.near = 0.1; spot.shadow.camera.far = 1.2;
  scene.add(spot, spot.target);

  const screen = await createScreen(renderer);
  const { group: phoneGroup, screenMat, screen: screenMesh } = buildPhone();
  screenMat.emissiveMap = screen.texture;

  const rig = new THREE.Group(); scene.add(rig);
  const tilt = new THREE.Group(); rig.add(tilt);
  tilt.add(phoneGroup);
  let hand = null;
  const arm = await loadArmGLB();
  if (arm) {
    let anchor = null; arm.traverse((o) => { if (o.name === 'PhoneAnchor') anchor = o; });
    arm.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (anchor) { anchor.add(phoneGroup); tilt.add(arm); } else tilt.add(arm);
    hand = arm;
  } else { hand = buildProceduralHand({ W, H, D }); tilt.add(hand); }

  let curP = 0, vis = false, aspect = 1;
  const fit = { y: 0, x: 0, dist: 0.3 };
  function layout() {
    const portrait = aspect < 0.8, fov = camera.fov * Math.PI / 180;
    const fillH = portrait ? 0.66 : 0.72;
    fit.dist = H / (fillH * 2 * Math.tan(fov / 2));
    if (portrait) { const dw = (W * 1.5) / (0.8 * aspect * 2 * Math.tan(fov / 2)); fit.dist = Math.max(fit.dist, dw); }
    const vh = 2 * fit.dist * Math.tan(fov / 2), vw = vh * aspect;
    fit.x = 0; fit.y = portrait ? 0.02 : 0.004;
    camera.position.set(0, 0, fit.dist); camera.lookAt(0, 0, 0);
    spot.target.updateMatrixWorld();
  }
  // Pointer input: ray -> phone-local glass plane -> iOS points. The thumb chases the pointer.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4();
  const glass = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(D / 2)), hitL = new THREE.Vector3();
  const SW = W - 0.0032, SH = H - 0.0032;
  const ptr = { has: false, x: 0, y: 0, on: false, down: false };
  const local = (e) => {
    if (!vis) return null;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    phoneGroup.updateWorldMatrix(true, false);
    inv.copy(phoneGroup.matrixWorld).invert();
    ray.ray.applyMatrix4(inv);
    return ray.ray.intersectPlane(glass, hitL) ? { x: hitL.x, y: hitL.y } : null;
  };
  const toPt = (l) => {
    if (!l || Math.abs(l.x) > SW / 2 || Math.abs(l.y) > SH / 2) return null;
    return { x: (l.x / SW + 0.5) * screen.PW, y: (0.5 - l.y / SH) * screen.PH };
  };
  const track = (e) => { const l = local(e); ptr.has = !!l; if (l) { ptr.x = l.x; ptr.y = l.y; } ptr.on = !!toPt(l); return l; };
  const inp = screen.input;
  addEventListener('pointerdown', (e) => {
    const q = toPt(track(e)); if (!q) return;
    ptr.down = true; th.press = 1;
    inp.down(q.x, q.y, curP); inp.ripple(q.x, q.y);
  });
  addEventListener('pointermove', (e) => {
    const q = toPt(track(e));
    document.body.style.cursor = q ? 'pointer' : '';
    if (inp.dragging) inp.move(q ? q.x : NaN, q ? q.y : NaN);
  });
  const release = (e) => { if (e) track(e); const q = e ? toPt(local(e)) : null; ptr.down = false; if (inp.dragging) inp.up(q ? q.x : NaN, q ? q.y : NaN); };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', () => release(null));
  addEventListener('blur', () => { ptr.has = false; release(null); });
  document.addEventListener('pointerleave', () => { ptr.has = false; });
  addEventListener('touchmove', (e) => { if (inp.dragging) e.preventDefault(); }, { passive: false });
  addEventListener('wheel', (e) => { const q = toPt(track(e)); if (q && inp.wheel(e.deltaY, curP)) e.preventDefault(); }, { passive: false });

  // Thumb motion: critically damped springs on pad x, y and lift.
  const thumb = hand?.userData?.thumb;
  const th = { x: thumb ? thumb.rest.x : 0, y: thumb ? thumb.rest.y : 0, l: 0, vx: 0, vy: 0, vl: 0, press: 0, last: '' };
  // Exact critically damped step: stable for any dt and rapid target changes.
  const spring = (x, v, to, w, dt) => { const d = x - to, e = Math.exp(-w * dt), j = (v + w * d) * dt; return [to + (d + j) * e, (v - w * j) * e]; };
  function stepThumb(dt) {
    if (!thumb || !dt) return;
    let tx = thumb.rest.x, ty = thumb.rest.y, tl = 0;
    if (ptr.has) {
      const cx = clamp(ptr.x, -SW / 2 + 0.004, SW / 2 - 0.003), cy = clamp(ptr.y, -SH / 2 + 0.004, SH / 2 - 0.004);
      const out = Math.hypot(ptr.x - cx, ptr.y - cy);
      const w = 1 - clamp(out / 0.07); const ws = w * w * (3 - 2 * w);
      tx += (cx - tx) * ws; ty += (cy - ty) * ws;
      tl = ptr.down ? 0 : 0.0075 * ws;
    }
    th.press = Math.max(0, th.press - dt * 6);
    if (ptr.down) tl = -0.0004;
    const wPos = ptr.down ? 34 : 13, wL = ptr.down ? 60 : 16;
    [th.x, th.vx] = spring(th.x, th.vx, tx, wPos, dt);
    [th.y, th.vy] = spring(th.y, th.vy, ty, wPos, dt);
    [th.l, th.vl] = spring(th.l, th.vl, tl, wL, dt);
    const key = `${(th.x * 1e5) | 0}|${(th.y * 1e5) | 0}|${(th.l * 1e5) | 0}`;
    if (key !== th.last) { th.last = key; thumb.set(th.x, th.y, Math.max(-0.0004, th.l)); }
  }

  const api = {
    scene, camera,
    get visible() { return vis; },
    update(p, t, dt) {
      curP = p; vis = p >= 0.799;
      if (!vis) return;
      const u = clamp((p - 0.80) / 0.08);
      // ease-out with overshoot and settle
      const c1 = 1.5, c3 = c1 + 1, e = 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
      const vh = 2 * fit.dist * Math.tan(camera.fov * Math.PI / 360);
      rig.position.set(fit.x, fit.y - (1 - e) * vh * 0.95, 0);
      const settle = 1 - u;
      const sway = (aspect < 0.8 ? 0.6 : 1) * 1;
      const tx = Math.sin(t * 0.9) * 0.012 + Math.sin(t * 7.3) * 0.0018 + settle * 0.15;
      const ty = Math.sin(t * 0.7 + 1) * 0.015 + Math.sin(t * 9.1) * 0.002;
      const tz = Math.sin(t * 0.55) * 0.01 + Math.sin(t * 6.1) * 0.0015;
      tilt.rotation.set((aspect < 0.8 ? 0.05 : 0.10) + tx * sway, (aspect < 0.8 ? -0.08 : -0.2) + ty * sway, -0.07 + tz * sway - settle * 0.1);
      tilt.position.set(Math.sin(t * 0.8) * 0.0012, Math.sin(t * 1.1) * 0.0015, 0);
      stepThumb(Math.min(dt || 0.016, 0.033));
      screen.paint(p);
    },
    resize(w, h) { aspect = w / h; camera.aspect = aspect; camera.updateProjectionMatrix(); layout(); },
  };
  layout();
  return api;
}
