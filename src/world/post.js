import * as THREE from 'three';
import { shared } from './toon.js';

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
uniform sampler2D tColor, tAux;
uniform vec2 uRes, uTan;
uniform float uLine, uWhite, uBoil, uCell, uSpeed;
uniform vec3 uF, uR, uU, uPaper, uMid, uInk, uHaze;
uniform float uSun, uSunT, uSunA, uColor;
uniform vec2 uSunO, uPtr;
uniform vec3 uSunC[4];
varying vec2 vUv;

vec3 oklab2srgb(vec3 c){
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 rgb = vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                  -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                  -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
  return pow(clamp(rgb, 0.0, 1.0), vec3(1.0 / 2.2));
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float dots(float cov){
  vec2 q = mat2(0.7071, 0.7071, -0.7071, 0.7071) * gl_FragCoord.xy / (uCell * 1.5);
  float d = length(fract(q) - 0.5);
  float r = sqrt(clamp(cov, 0.0, 1.6) / 3.14159);
  return smoothstep(r + 0.07, r - 0.07, d) * step(0.01, cov);
}
float inv(float d){ return d < 0.05 ? 0.0 : 1.0 / d; }

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 warp = (vec2(vnoise(fc / 31.0 + uBoil), vnoise(fc / 31.0 + 9.0 - uBoil)) - 0.5) * 2.2 / uRes;
  vec2 uv = vUv;
  vec4 a0 = texture(tAux, uv);
  float bg = a0.a < 0.05 ? 1.0 : 0.0;
  float d0 = bg > 0.5 ? 0.0 : a0.a;
  float n = vnoise(fc / 16.0 + uBoil) * 0.6 + vnoise(fc / 5.0 + 3.0) * 0.4;
  float fade = smoothstep(350.0, 1600.0, d0);
  float k = uLine * (0.62 + 0.9 * n) * (1.0 - 0.5 * fade);
  float strength = 1.0 - 0.3 * fade;
  vec2 dirs[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(0.7071, 0.7071), vec2(0.7071, -0.7071));
  float edge = 0.0;
  float i0 = inv(a0.a);
  for (int j = 0; j < 4; j++) {
    vec2 o = dirs[j] * k / uRes;
    vec4 a = texture(tAux, uv + o + warp);
    vec4 b = texture(tAux, uv - o + warp);
    float ia = inv(a.a), ib = inv(b.a);
    float mx = max(max(ia, ib), i0) + 1e-6;
    float lap = abs(ia + ib - 2.0 * i0) / mx;
    float de = smoothstep(0.06, 0.18, lap);
    float ne = 0.0;
    if (a.a > 0.05 && b.a > 0.05 && abs(a.r - 0.5) + abs(a.g - 0.5) + abs(a.b - 0.5) > 0.02 && abs(b.r - 0.5) + abs(b.g - 0.5) + abs(b.b - 0.5) > 0.02) {
      vec3 na = a.rgb * 2.0 - 1.0, nb = b.rgb * 2.0 - 1.0;
      ne = smoothstep(0.3, 0.6, 1.0 - dot(na, nb));
    }
    edge = max(edge, max(de, ne));
  }
  vec3 col = texture(tColor, uv).rgb;
  if (bg > 0.5) {
    vec2 s = uv * 2.0 - 1.0;
    vec3 ray = normalize(uF + s.x * uTan.x * uR + s.y * uTan.y * uU);
    float g = smoothstep(-0.1, 0.85, ray.y);
    vec3 hz = mix(uPaper, uHaze, 0.62);
    col = mix(uPaper, hz, dots(g * 1.25));
    col = mix(col, mix(uPaper, uHaze, 0.25), (1.0 - smoothstep(-0.2, 0.12, ray.y)) * 0.6);
    col = mix(col, col * mix(vec3(1.0, 0.9, 0.78), vec3(0.62, 0.8, 1.0), smoothstep(0.0, 0.5, ray.y)), uColor);
  }
  float line = smoothstep(0.35, 0.75, edge) * strength;
  col = mix(col, mix(uInk, uHaze * 0.45, fade * 0.8), line);
  // fall speed lines: ink wedges from the frame edge toward the centre, redrawn on the boil clock
  if (uSpeed > 0.01) {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 c = (vUv - 0.5) * asp;
    float r = length(c) / (0.5 * length(asp));
    float af = (atan(c.y, c.x) / 6.28318 + 0.5) * 150.0;
    float id = floor(af);
    float h = hash(vec2(id, uBoil)), h2 = hash(vec2(id + 31.0, uBoil));
    float start = mix(1.0, 0.5, uSpeed) + 0.3 * h2;
    float w = clamp((r - start) * 2.2, 0.0, 1.0) * 0.32;
    float sl = (1.0 - smoothstep(w - 0.1, w, abs(fract(af) - 0.5))) * step(0.72, h) * step(0.001, w);
    col = mix(col, uInk, sl * smoothstep(0.02, 0.2, uSpeed));
  }
  // cloud pass-through: paper halftone dots with an ink rim grow until they close the frame
  if (uWhite > 0.001) {
    float cov = min(1.0, uWhite / 0.9);
    vec2 q = mat2(0.7071, 0.7071, -0.7071, 0.7071) * fc / (uCell * 5.0);
    vec2 cell = floor(q);
    float d = length(fract(q) - 0.5);
    float rad = cov * (0.66 + 0.18 * hash(cell)) + 0.1 * (vnoise(q * 0.35 + uBoil) - 0.5) * cov;
    float rim = (1.0 - smoothstep(0.0, 0.05, abs(d - rad))) * (1.0 - smoothstep(0.45, 0.62, rad));
    col = mix(col, uInk, rim * 0.85);
    col = mix(col, uPaper, max(1.0 - smoothstep(rad - 0.04, rad, d), smoothstep(0.8, 1.0, cov)));
  }
  // sunset light at the top state: OKLab gradient on a warped noise field, multiplied onto the paper tones.
  // The pointer carries the light. On the way down the field widens and the wash breaks into halftone dots.
  if (uSun > 0.001) {
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 c = (vUv - 0.5) * asp;
    vec2 pc = (uPtr - 0.5) * asp;
    float glow = exp(-dot(c - pc, c - pc) / 0.18);
    float z = mix(0.55, 1.0, uSun);
    float tt = uSunT * 0.035;
    vec2 q = c * z * 1.15 + uSunO;
    vec2 w = vec2(vnoise(q * 1.4 + vec2(tt, -tt * 0.7)), vnoise(q * 1.4 + vec2(5.2 - tt * 0.8, 1.3 + tt))) - 0.5;
    float nz = vnoise(q * 0.9 + w * 1.6 + vec2(0.0, tt * 0.5)) * 0.65 + vnoise(q * 2.1 + w * 1.1 - tt) * 0.35;
    float f = clamp(0.5 + dot(c * z, vec2(cos(uSunA), sin(uSunA))) * 0.5 + (nz - 0.5) * 0.85 - glow * 0.22, 0.0, 1.0);
    float x = f * 3.0;
    int i = int(min(floor(x), 2.0));
    vec3 g = oklab2srgb(mix(uSunC[i], uSunC[i + 1], x - float(i)));
    float m = max(smoothstep(0.55, 0.95, uSun), dots(uSun * 2.2));
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col *= mix(vec3(1.0), g, 0.44 * m);
    col += g * glow * 0.07 * m * smoothstep(0.15, 0.7, lum);
    float ph = fract(uSunT) * 61.0;
    col += (hash(fc + ph) + hash(fc * 1.7 + 13.0 + ph) - 1.0) / 255.0;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function createPost(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const opts = { count: 2, type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples: 0 };
  const rt = new THREE.WebGLRenderTarget(Math.max(2, size.x), Math.max(2, size.y), opts);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rt.textures[0] }, tAux: { value: rt.textures[1] },
      uRes: { value: new THREE.Vector2(size.x, size.y) }, uTan: { value: new THREE.Vector2(0.5, 0.5) },
      uLine: { value: 1.2 }, uWhite: { value: 0 }, uBoil: { value: 0 }, uSpeed: { value: 0 }, uCell: shared.uCell,
      uF: { value: new THREE.Vector3(0, 0, -1) }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) },
      uPaper: shared.uPaper, uMid: shared.uMid, uInk: shared.uInk, uHaze: shared.uHaze,
      uColor: { value: 0 }, uSun: { value: 0 }, uSunT: { value: 0 }, uSunA: { value: 0 }, uSunO: { value: new THREE.Vector2() }, uPtr: { value: new THREE.Vector2(0.5, 0.5) },
      uSunC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(1, 0, 0)) },
    },
    vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
  });
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const cc = new THREE.Color();
  const e = new THREE.Matrix4();

  function resize() {
    renderer.getDrawingBufferSize(size);
    rt.setSize(Math.max(2, size.x), Math.max(2, size.y));
    mat.uniforms.uRes.value.set(size.x, size.y);
    const pr = renderer.getPixelRatio();
    shared.uCell.value = 4.4 * pr;
    mat.uniforms.uLine.value = 1.25 * pr;
  }
  resize();

  return {
    resize,
    set white(v) { mat.uniforms.uWhite.value = v; },
    set boil(v) { mat.uniforms.uBoil.value = v; },
    set speed(v) { mat.uniforms.uSpeed.value = v; },
    set sun(v) { mat.uniforms.uSun.value = v; },
    set color(v) { mat.uniforms.uColor.value = v; },
    set sunTime(v) { mat.uniforms.uSunT.value = v; },
    // s from makeSunset(), ptr is a Vector2 kept by reference
    setSunset(s, ptr) {
      mat.uniforms.uSunC.value = s.colors; mat.uniforms.uSunA.value = s.angle; mat.uniforms.uSunO.value = s.offset; mat.uniforms.uPtr.value = ptr;
    },
    render(r) {
      camera.updateMatrixWorld();
      e.copy(camera.matrixWorld);
      mat.uniforms.uR.value.setFromMatrixColumn(e, 0);
      mat.uniforms.uU.value.setFromMatrixColumn(e, 1);
      mat.uniforms.uF.value.setFromMatrixColumn(e, 2).negate();
      const th = Math.tan((camera.fov * Math.PI) / 360);
      mat.uniforms.uTan.value.set(th * camera.aspect, th);
      r.getClearColor(cc);
      const ca = r.getClearAlpha();
      r.setRenderTarget(rt);
      r.setClearColor(0x000000, 0);
      r.clear(true, true, false);
      r.render(scene, camera);
      r.setRenderTarget(null);
      r.setClearColor(cc, ca);
      r.render(quadScene, quadCam);
      r.setRenderTarget(null);
    },
  };
}
