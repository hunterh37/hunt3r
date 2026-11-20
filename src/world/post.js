import * as THREE from 'three';
import { shared } from './toon.js';

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
uniform sampler2D tColor, tAux;
uniform vec2 uRes, uTan;
uniform float uLine, uWhite, uBoil, uCell;
uniform vec3 uF, uR, uU, uPaper, uMid, uInk, uHaze;
varying vec2 vUv;

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
  }
  float line = smoothstep(0.35, 0.75, edge) * strength;
  col = mix(col, mix(uInk, uHaze * 0.45, fade * 0.8), line);
  col = mix(col, uPaper, uWhite);
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
      uLine: { value: 1.2 }, uWhite: { value: 0 }, uBoil: { value: 0 }, uCell: shared.uCell,
      uF: { value: new THREE.Vector3(0, 0, -1) }, uR: { value: new THREE.Vector3(1, 0, 0) }, uU: { value: new THREE.Vector3(0, 1, 0) },
      uPaper: shared.uPaper, uMid: shared.uMid, uInk: shared.uInk, uHaze: shared.uHaze,
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
