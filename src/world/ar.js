import * as THREE from 'three';
import { Builder } from './builder.js';
import { toonMaterial } from './toon.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildProceduralHand } from '../phone/hand.js';
import { range, smooth, lerp, walkAt, walkS, WALK_L, G } from '../timeline.js';

// Ground beat AR: left hand puts on smart glasses, GPS chevrons lead round the corner,
// the hand pinch-paints "hello :)" in the air, then takes the glasses off. Toon material so the post pass inks it.
const SKIN = [0.93, 0.7, 0.57], SLEEVE = 0.24, INKC = 0.05, NAV = [0.24, 0.62, 1.0], PAINT = [0.2, 0.9, 1.0];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// The phone beat's procedural hand, mirrored to a left hand, thumb moved onto the index tip for a pinch.
// Phone-space dims only size the grip; there is no phone in this hand.
function buildHand() {
  const outer = new THREE.Group(), h = buildProceduralHand({ W: 0.0715, H: 0.1471, D: 0.0083 });
  h.scale.x = -1;
  h.userData.thumb.set(-0.034, -0.013, 0.0005);
  outer.add(h);
  return outer;
}
const TIP = V(0.039, -0.012, 0.016); // pinch point in outer (mirrored) hand space

// Smart glasses: glossy black acetate, faint blue lenses, centred on the frame origin.
function buildGlasses() {
  const g = new THREE.Group();
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0x8fc4ff, roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  const rimPts = (cx) => { const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); pts.push(V(cx + 0.026 * Math.sign(c) * Math.pow(Math.abs(c), 0.55), 0.019 * Math.sign(sn) * Math.pow(Math.abs(sn), sn > 0 ? 0.4 : 0.7), 0)); } return pts; };
  for (const cx of [-0.032, 0.032]) {
    const pts = rimPts(cx);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.0033, 10, true), frame));
    const sh = new THREE.Shape(pts.map((v) => new THREE.Vector2(v.x, v.y)));
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), lensM));
  }
  const bridge = new THREE.CatmullRomCurve3([V(-0.007, 0.012, 0), V(0, 0.015, -0.002), V(0.007, 0.012, 0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(bridge, 12, 0.0028, 8), frame));
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.011, 0.01), frame); hinge.position.set(sx * 0.06, 0.009, 0.004); g.add(hinge);
    const temple = new THREE.CatmullRomCurve3([V(sx * 0.061, 0.01, 0.008), V(sx * 0.064, 0.009, 0.07), V(sx * 0.063, 0.0, 0.13), V(sx * 0.06, -0.012, 0.145)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(temple, 24, 0.0026, 8), frame));
  }
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.002, 16), new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, clearcoat: 1 }));
  cam.rotation.x = Math.PI / 2; cam.position.set(0.058, 0.016, -0.004); g.add(cam);
  return g;
}
const HINGE = V(-0.06, 0.009, 0.004);

// Glasses display material: additive hologram, clipped to the two lens openings drawn by the HUD CSS
// (.ar .visor in ui.css: one goggle opening over the full frame). Fades in from the lens rim.
function holoMaterial(color, uni, vc = false) {
  return new THREE.ShaderMaterial({
    vertexColors: vc, defines: vc ? { USE_VC: '' } : {},
    uniforms: { uCol: { value: new THREE.Color(...color) }, ...uni },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying float vD; varying vec3 vV; varying vec3 vC;
      void main(){
        #ifdef USE_VC
        vC = color;
        #else
        vC = vec3(1.0);
        #endif
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform vec2 uRes; uniform float uHud, uTime;
      varying vec3 vN; varying float vD; varying vec3 vV; varying vec3 vC;
      float lens(vec2 q, vec2 c, vec2 h){ vec2 d = abs(q - c) / h; return pow(pow(d.x, 3.2) + pow(d.y, 3.2), 1.0 / 3.2); }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes; vec2 q = vec2(uv.x, 1.0 - uv.y);
        float e = lens(q, vec2(0.5), vec2(0.54, 0.56));
        float m = 1.0 - smoothstep(0.8, 0.95, e);
        float fr = pow(1.0 - abs(dot(normalize(vN), vV)), 2.0);
        float pulse = 0.72 + 0.28 * sin(vD * 2.6 - uTime * 5.0);
        float scan = 0.9 + 0.1 * sin(gl_FragCoord.y * 1.6);
        vec3 c = uCol * vC * (0.55 + 0.9 * fr) * pulse * scan;
        float a = m * uHud * (1.0 - smoothstep(14.0, 30.0, vD));
        gl_FragColor = vec4(c * a, a);
      }`,
  });
} // left hinge, where the pinch holds the glasses

// Single-stroke glyphs in a unit-height box. Each glyph is a list of polylines.
function glyphs() {
  const ell = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 22) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
  return [
    { w: 0.44, s: [[[0, 1], [0, 0]], [[0, 0.32], [0.08, 0.47], [0.22, 0.5], [0.3, 0.38], [0.3, 0]]] },
    { w: 0.42, s: [[[0.02, 0.26], [0.31, 0.27], [0.29, 0.42], [0.16, 0.5], [0.04, 0.42], [0.0, 0.25], [0.05, 0.08], [0.18, 0], [0.31, 0.07]]] },
    { w: 0.2, s: [[[0.05, 1], [0.04, 0.08], [0.12, 0]]] },
    { w: 0.2, s: [[[0.05, 1], [0.04, 0.08], [0.12, 0]]] },
    { w: 0.46, s: [ell(0.17, 0.25, 0.17, 0.25, Math.PI / 2, Math.PI / 2 + Math.PI * 2)] },
    { w: 0.22, s: [] },
    { w: 0.2, s: [ell(0.05, 0.42, 0.028, 0.028, 0, Math.PI * 2, 10), ell(0.05, 0.12, 0.028, 0.028, 0, Math.PI * 2, 10)] },
    { w: 0.28, s: [ell(-0.12, 0.3, 0.26, 0.42, -0.95, 0.95, 18)] },
  ];
}

// Things the glasses "detect" along the walk: [label, confidence, centre, size]. Positions follow city.js / signs.js.
const DET = [
  ['UTILITY POLE', 0.91, [40, 5, -2], [0.5, 10, 0.5]],
  ['DUMPSTER', 0.88, [38.5, 0.6, -1.75], [2, 1.3, 1.2]],
  ['DUMPSTER', 0.86, [38.5, 0.6, 1.75], [2, 1.3, 1.2]],
  ['AC UNIT', 0.79, [40.2, 6.5, 2.1], [0.9, 0.6, 0.6]],
  ['AC UNIT', 0.82, [40.2, 6.5, -2.1], [0.9, 0.6, 0.6]],
  ['APP · VEEP AR', 0.99, [38.9, 2.6, -2.44], [1.4, 1.4, 0.1]],
  ['APP · DEMI', 0.98, [38.9, 2.6, 2.44], [1.4, 1.4, 0.1]],
  ['APP · MARRIOTT BONVOY', 0.99, [45.9, 2.6, -2.44], [1.4, 1.4, 0.1]],
  ['APP · VIRALCOOKER', 0.97, [45.9, 2.6, 2.44], [1.4, 1.4, 0.1]],
  ['BICYCLE', 0.94, [47, 0.6, 1.95], [1.7, 1.2, 0.5]],
  ['WINDOW · LIT', 0.73, [47.2, 5.45, -2.45], [1.0, 1.7, 0.1]],
  ['STREET LAMP', 0.84, [50.55, 3.2, 1.85], [0.8, 0.8, 0.8]],
  ['APP · VISION3D', 0.98, [52.9, 2.6, -2.44], [1.4, 1.4, 0.1]],
  ['APP · WHOP', 0.99, [52.9, 2.6, 2.44], [1.4, 1.4, 0.1]],
  ['FIRE ESCAPE', 0.9, [52.5, 7.7, -1.6], [3, 8, 1.3]],
  ['TREE · LONDON PLANE', 0.87, [68, 6, 39.4], [6.5, 11, 6.5]],
  ['TREE · LONDON PLANE', 0.85, [63.2, 6, 45.6], [6.5, 11, 6.5]],
].map(([label, conf, c, s], id) => ({ id, label, conf, c: new THREE.Vector3(...c), h: new THREE.Vector3(...s).multiplyScalar(0.5) }));

export function createAR(scene, camera, reduced, renderer) {
  const detections = [], pv = new THREE.Vector3(), cv = new THREE.Vector3();
  // screen rects (0..1, y down) for detections in front of the walker, 2.5..24 m away
  function detect(p) {
    detections.length = 0;
    const walk = p >= G.hud1 && p <= G.paint0, cars = p >= G.track0 && p <= G.hud2 && api.tracked;
    if (!walk && !cars) return;
    camera.updateMatrixWorld();
    const far = cars ? 45 : 24;
    for (const d of cars ? api.tracked() : DET) {
      cv.copy(d.c).applyMatrix4(camera.matrixWorldInverse);
      const dist = -cv.z;
      if (dist < 2.5 || dist > far) continue;
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0, ok = true;
      for (let k = 0; k < 8; k++) {
        pv.set(d.c.x + (k & 1 ? d.h.x : -d.h.x), d.c.y + (k & 2 ? d.h.y : -d.h.y), d.c.z + (k & 4 ? d.h.z : -d.h.z)).project(camera);
        if (pv.z > 1) { ok = false; break; }
        const sx = pv.x * 0.5 + 0.5, sy = 0.5 - pv.y * 0.5;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      if (!ok || x1 < 0.04 || x0 > 0.96 || y1 < 0.04 || y0 > 0.96) continue;
      x0 = Math.max(0.02, x0); x1 = Math.min(0.98, x1); y0 = Math.max(0.03, y0); y1 = Math.min(0.97, y1);
      if (x1 - x0 < 0.015 || x1 - x0 > 0.7) continue;
      detections.push({ id: d.id, label: d.label, conf: d.conf, dist, x0, y0, x1, y1 });
    }
  }
  // PBR overlay scene in camera space (camera at origin looking -z), lit like the phone beat
  const arScene = new THREE.Scene(), arCam = new THREE.PerspectiveCamera(50, 1, 0.01, 5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  arScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture; arScene.environmentIntensity = 0.7;
  arScene.add(new THREE.HemisphereLight(0xdfe6ee, 0x2b2622, 0.4));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.4); key.position.set(0.2, 0.6, 0.5); arScene.add(key);
  const fill = new THREE.DirectionalLight(0x9db4c8, 0.6); fill.position.set(-0.6, 0.1, 0.4); arScene.add(fill);
  const rim = new THREE.DirectionalLight(0xff9a55, 1.0); rim.position.set(-0.5, -0.3, -0.4); arScene.add(rim);
  const hand = buildHand(), glasses = buildGlasses();
  for (const m of [hand, glasses]) { m.visible = false; arScene.add(m); }
  // glasses display layer: rendered with the world camera after the inked world, before the hand
  const holoScene = new THREE.Scene(), holoUni = { uRes: { value: new THREE.Vector2(1, 1) }, uHud: { value: 0 }, uTime: { value: 0 } };

  // GPS chevrons on the ground along the walk path
  const NB = new Builder(), chevS = [];
  for (let s = 2; s < WALK_L - 0.5; s += 2) {
    const a = walkAt(s), b = walkAt(Math.min(WALK_L, s + 0.3));
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, fx = dx / l, fz = dz / l, rx = -fz, rz = fx;
    const tip = [a.x + fx * 0.35, 0.2, a.z + fz * 0.35];
    for (const sd of [-1, 1]) NB.beam([a.x - fx * 0.15 + rx * sd * 0.45, 0.2, a.z - fz * 0.15 + rz * sd * 0.45], tip, 0.06, NAV);
    chevS.push(s);
  }
  const chev = new THREE.Mesh(NB.build(), holoMaterial([0.3, 0.68, 1.0], holoUni));
  chev.frustumCulled = false; chev.visible = false; holoScene.add(chev);
  const CHEV_IDX = chev.geometry.index.count / chevS.length;

  // paint strokes: "hello :)" in a plane 0.6 m in front of the end spot (camera faces +z there, screen right is -x)
  const end = walkAt(WALK_L), K = 0.105, R = 0.0042;
  const G2 = glyphs(), total = G2.reduce((a, g) => a + g.w, 0);
  const toW = (u, v) => V(end.x - (u - total / 2) * K, 1.6 + (v - 0.4) * K, end.z + 0.6);
  const PB = new Builder(), path = []; // path items: { a, b, len, draw }
  let ux = 0, prev = null, segs = 0;
  const INKS = [[1.0, 0.35, 0.55], [1.0, 0.62, 0.2], [1.0, 0.92, 0.25], [0.35, 1.0, 0.45], [0.25, 0.85, 1.0], [0.4, 0.4, 1.0], [0.75, 0.4, 1.0], [1.0, 0.4, 0.85]];
  let gi = 0;
  for (const g of G2) {
    const ink = INKS[gi++ % INKS.length];
    for (const line of g.s) {
      const pts = line.map(([u, v]) => toW(ux + u, v));
      if (prev) path.push({ a: prev, b: pts[0], len: prev.distanceTo(pts[0]) * 0.6, draw: false });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.005));
        for (let k = 0; k < n; k++) {
          const p0 = a.clone().lerp(b, k / n), p1 = a.clone().lerp(b, (k + 1) / n);
          PB.tube(p0.toArray(), p1.toArray(), R, R, 6, ink);
          path.push({ a: p0, b: p1, len: p0.distanceTo(p1), draw: true }); segs++;
        }
      }
      prev = pts[pts.length - 1];
    }
    ux += g.w;
  }
  const paint = new THREE.Mesh(PB.build(), holoMaterial([1, 1, 1], holoUni, true));
  paint.frustumCulled = false; paint.visible = false; holoScene.add(paint);
  const SEG_IDX = paint.geometry.index.count / segs;
  const pathLen = path.reduce((a, it) => a + it.len, 0);

  const tmp = V(0, 0, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
  // camera-space tip targets
  // glasses centre: below frame -> held in view -> centred on the eyes. Tip targets for the paint beat.
  const G_LOW = V(0.02, -0.3, -0.36), G_HOLD = V(0.0, -0.045, -0.3), G_EYES = V(0, 0, -0.085);
  const EYES = G_EYES.clone().add(HINGE), LOW = G_LOW.clone().add(HINGE), AWAY = V(-0.2, -0.42, -0.42);
  const mix3 = (a, b, k) => tmp.copy(a).lerp(b, k).clone();

  function headAt(u) { // u 0..1 along the paint path -> { pos, drawn }
    let d = u * pathLen, drawn = 0;
    for (const it of path) {
      if (d <= it.len) return { pos: it.a.clone().lerp(it.b, it.len ? d / it.len : 1), drawn: drawn + (it.draw && d / it.len > 0.5 ? 1 : 0) };
      d -= it.len; if (it.draw) drawn++;
    }
    return { pos: path[path.length - 1].b.clone(), drawn: segs };
  }

  const api = {
    tracked: null, // () => [{ id, label, conf, c, h }] for moving things (traffic.boxes)
    detections,
    render(r) {
      if (chev.visible || paint.visible) {
        r.getDrawingBufferSize(holoUni.uRes.value);
        r.clearDepth(); r.render(holoScene, camera);
      }
      if (!hand.visible && !glasses.visible) return;
      arCam.fov = camera.fov; arCam.aspect = camera.aspect; arCam.updateProjectionMatrix();
      r.clearDepth(); r.render(arScene, arCam);
    },
    update(p, t) {
      detect(p);
      const show = p > G.on0 && p < G.off2 + 0.004;
      hand.visible = show; glasses.visible = false;
      const hud = smooth(range(p, G.hud0, G.hud1)) * (1 - smooth(range(p, G.hud2, G.hud3)));
      holoUni.uHud.value = hud; holoUni.uTime.value = t;
      chev.visible = hud > 0.01 && p < G.paint0 + 0.004;
      paint.visible = hud > 0.01 && p >= G.draw0;
      if (chev.visible) { // chevrons appear ahead of the walker
        const s = walkS(p); let first = chevS.findIndex((cs) => cs > s - 1);
        if (first < 0) first = chevS.length;
        chev.geometry.setDrawRange(first * CHEV_IDX, (chevS.length - first) * CHEV_IDX);
      }
      if (!show) return;
      let tip, gl = null, gc = null;
      const sway = reduced ? 0 : 1;
      if (p < G.on2) {
        const a = smooth(range(p, G.on0, G.on1)), b = smooth(range(p, G.on1, G.on2));
        gc = b > 0 ? mix3(G_HOLD, G_EYES, b) : mix3(G_LOW, G_HOLD, a);
        gl = b; tip = gc.clone().add(HINGE);
        if (b > 0.97) gc = null;
      } else if (p < G.paint0) {
        tip = mix3(EYES, AWAY, smooth(range(p, G.on2, G.drop)));
      } else if (p < G.off0) {
        if (p > G.track0 + 0.003 && p < G.off0) { tip = AWAY.clone(); paint.geometry.setDrawRange(0, segs * SEG_IDX); }
        else {
        const u = range(p, G.draw0, G.draw1), h = headAt(u);
        paint.geometry.setDrawRange(0, h.drawn * SEG_IDX);
        camera.updateMatrixWorld();
        const head = camera.worldToLocal(h.pos);
        const up = smooth(range(p, G.paint0, G.draw0)), down = smooth(range(p, G.draw1, G.track0 + 0.003));
        tip = mix3(AWAY, head, up);
        if (down > 0) tip = mix3(head, AWAY, down); // hand drops while the glasses track traffic
        }
      } else {
        const a = smooth(range(p, G.off0, G.off1)), b = smooth(range(p, G.off1, G.off2));
        if (b > 0) { gc = mix3(G_EYES, G_LOW, b); gl = 1 - b; tip = gc.clone().add(HINGE); if (b < 0.03) gc = null; }
        else tip = mix3(AWAY, EYES, a);
      }
      tip.x += 0.003 * Math.sin(t * 1.3) * sway; tip.y += 0.004 * Math.sin(t * 1.7 + 1) * sway;
      e.set(-0.15, 0.35, -0.35); q.setFromEuler(e);
      hand.quaternion.copy(q);
      hand.position.copy(tip).sub(TIP.clone().applyQuaternion(q));
      if (gc) {
        glasses.visible = true;
        // tilted down and turned while held low, square and centred at the eyes
        glasses.rotation.set(lerp(-0.45, 0, gl), lerp(0.35, 0, gl), lerp(0.12, 0, gl));
        glasses.position.copy(gc);
      }
    },
  };
  return api;
}
