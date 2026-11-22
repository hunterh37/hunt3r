import * as THREE from 'three';

const rgb = (h) => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
export const PAL = { paper: rgb(0xf4f2ec), mid: rgb(0xb9b6ae), ink: rgb(0x0a0a0a), haze: rgb(0x9db4c8) };
export const AMBER = [1, 0.541, 0.239];

// Uniform objects are shared by reference between every toon material.
export const shared = {
  uLight: { value: new THREE.Vector3(-0.5, 0.8, 0.35).normalize() },
  uPaper: { value: PAL.paper },
  uMid: { value: PAL.mid },
  uInk: { value: PAL.ink },
  uHaze: { value: PAL.haze },
  uFog: { value: 0.0007 },
  uFogMax: { value: 0.7 },
  uCell: { value: 5 },
  uColO: { value: new THREE.Vector3(63, 6, 41) },
  uColTree: { value: 0 },
  uColAll: { value: 0 },
};

const vert = /* glsl */ `
varying vec3 vN; varying vec3 vVN; varying vec3 vC; varying float vD; varying vec3 vW;
#ifdef HAS_TEX
varying vec2 vUv;
#endif
void main(){
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  vN = normalize(mat3(modelMatrix) * n);
  vVN = normalize(mat3(viewMatrix) * vN);
  vec4 mv = viewMatrix * w;
  vD = -mv.z;
  vW = w.xyz;
  vC = color;
  #ifdef HAS_TEX
    vUv = uv;
  #endif
  gl_Position = projectionMatrix * mv;
}`;

const frag = /* glsl */ `
uniform vec3 uLight, uPaper, uMid, uInk, uHaze;
uniform float uFog, uFogMax, uCell, uColTree, uColAll;
uniform vec3 uColO;
#ifdef HAS_TEX
uniform sampler2D uMap; varying vec2 vUv;
#endif
varying vec3 vN; varying vec3 vVN; varying vec3 vC; varying float vD; varying vec3 vW;
layout(location = 1) out highp vec4 gAux;

float dots(float cov){
  vec2 q = mat2(0.7071, 0.7071, -0.7071, 0.7071) * gl_FragCoord.xy / uCell;
  float d = length(fract(q) - 0.5);
  float r = sqrt(clamp(cov, 0.0, 1.6) / 3.14159);
  return smoothstep(r + 0.07, r - 0.07, d) * step(0.01, cov);
}

float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }

void main(){
  vec3 n = normalize(vN);
  float l = dot(n, uLight) * 0.5 + 0.5;
  vec3 col;
  float sat = max(max(vC.r, vC.g), vC.b) - min(min(vC.r, vC.g), vC.b);
  #ifdef HAS_TEX
    col = texture(uMap, vUv).rgb;
  #elif defined(IS_CLOUD)
    float l2 = dot(n, uLight) * 0.5 + 0.5;
    vec3 c = l2 > 0.5 ? uPaper : uMid;
    c = mix(c, uInk, dots(smoothstep(0.3, 0.06, l2) * 1.5));
    float nz = vn(vec2(vW.x + vW.z, vW.y * 1.3) * 0.045);
    float st = (1.0 - smoothstep(0.0, 0.01, abs(l2 - 0.5))) * step(0.62, nz)
             + (1.0 - smoothstep(0.0, 0.008, abs(l2 - 0.8))) * step(0.7, vn(vec2(vW.x - vW.z, vW.y) * 0.06 + 7.0));
    col = mix(c, uInk, clamp(st, 0.0, 1.0));
  #else
  if (sat > 0.15) {
    col = vC;
  } else {
    float s = (l * 0.6 + 0.4) * vC.r;
    vec3 c = s > 0.58 ? uPaper : uMid;
    float cov = smoothstep(0.42, 0.14, s) * 1.6;
    float fq = (1.0 - exp(-vD * uFog)) * uFogMax;
    cov *= 1.0 - smoothstep(0.2, 0.5, fq);
    c = mix(c, uInk, dots(cov));
    col = s < 0.09 ? uInk : c;
    // close-range brick hatch on walls
    float near = 1.0 - smoothstep(10.0, 38.0, vD);
    if (near > 0.0 && abs(n.y) < 0.3 && vC.r > 0.45 && vC.r < 0.88) {
      float row = floor(vW.y * 2.4);
      float u = abs(n.z) > abs(n.x) ? vW.x : vW.z;
      float hl = 1.0 - smoothstep(0.03, 0.07, abs(fract(vW.y * 2.4) - 0.5) * 0.5 + 0.0);
      float course = smoothstep(0.93, 0.98, fract(vW.y * 2.4));
      float tick = smoothstep(0.94, 0.985, fract(u * 1.6 + row * 0.5)) * (1.0 - course);
      col = mix(col, uInk, max(course, tick) * 0.5 * near);
    }
  }
  #endif
  #if !defined(HAS_TEX) && !defined(IS_CLOUD)
  if (uColAll + uColTree > 0.01 && sat <= 0.15) {
    // tag rides in g - r (0.01 steps): 1 canopy 2 trunk 3 brick 5/6 car 7 asphalt 8 grass 9 slate
    float tag = floor((vC.g - vC.r) * 100.0 + 0.5);
    vec3 tint = vec3(1.0, 0.95, 0.86);
    if (tag == 1.0) tint = vec3(0.42, 0.8, 0.36);
    else if (tag == 2.0) tint = vec3(0.66, 0.46, 0.3);
    else if (tag == 3.0) tint = vec3(0.93, 0.56, 0.42);
    else if (tag == 5.0) tint = vec3(0.92, 0.3, 0.26);
    else if (tag == 6.0) tint = vec3(0.32, 0.52, 0.9);
    else if (tag == 7.0) tint = vec3(0.78, 0.8, 0.86);
    else if (tag == 8.0) tint = vec3(0.62, 0.86, 0.46);
    else if (tag == 9.0) tint = vec3(0.56, 0.62, 0.78);
    float d = distance(vW, uColO) + (vn(vW.xz * 0.35 + vW.y * 0.2) - 0.5) * 8.0;
    float isTree = tag == 1.0 || tag == 2.0 ? 1.0 : 0.0;
    float k = max(isTree * smoothstep(uColTree, uColTree - 6.0, d), smoothstep(uColAll, uColAll - 10.0, d));
    k *= step(0.01, uColAll + uColTree * isTree);
    col = mix(col, col * tint * 1.06, k);
  }
  #endif
  vec3 fogCol = mix(uPaper, uHaze, 0.5);
  float f = (1.0 - exp(-vD * uFog)) * uFogMax;
  col = mix(col, fogCol, f);
  gl_FragColor = vec4(col, 1.0);
  #ifdef IS_CLOUD
  gAux = vec4(0.5, 0.5, 0.5, vD);
#else
  gAux = vec4(normalize(vVN) * 0.5 + 0.5, vD);
#endif
}`;

export function toonMaterial({ map = null, cloud = false } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map } },
    vertexShader: vert,
    fragmentShader: frag,
    vertexColors: true,
    defines: map ? { HAS_TEX: '' } : cloud ? { IS_CLOUD: '' } : {},
  });
  return m;
}
