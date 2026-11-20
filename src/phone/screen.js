import * as THREE from 'three';

// iOS Photos then app portfolio, painted to a canvas in iOS points (393 x 852).
const PW = 393, PH = 852;
const FONT = '-apple-system, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
const STORE = 'https://apps.apple.com/us/app/';
const APPS = [
  ['veep-ar', 'Veep AR', STORE + 'veep-ar-spaces-chat-meet/id1579238644'],
  ['demi', 'Demi', STORE + 'demi-ai-assistant/id6757938405'],
  ['marriott-bonvoy', 'Marriott Bonvoy', STORE + 'marriott-bonvoy-book-hotels/id455004730'],
  ['viralcooker', 'ViralCooker', STORE + 'viralcooker-ugc-video-editor/id6762104181'],
  ['vision3d', 'Vision3D', STORE + 'vision3d/id6738053111'],
];
// Contact app targets. Rows with an empty value are not drawn.
export const CONTACT = {
  name: 'Hunter Harris',
  phone: '', // e.g. '+16175550100'
  email: '', // e.g. 'hello@example.com'
  x: 'https://x.com/hunter_spatial',
  instagram: 'https://instagram.com/hunter_spatial',
};
const NPH = 36;
const OPEN_INDEX = 4; // grid cell that opens
const photoIdx = (i) => (i === OPEN_INDEX ? 0 : ((i * 7 + 3) % NPH) || 7);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => t * t * (3 - 2 * t);

function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function cover(ctx, img, x, y, w, h) {
  if (!img) { ctx.fillStyle = '#c98a6a'; ctx.fillRect(x, y, w, h); return; }
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export async function createScreen(renderer) {
  const baseUrl = import.meta.env?.BASE_URL || '/';
  const photos = await Promise.all(Array.from({ length: NPH }, (_, i) => loadImg(`${baseUrl}photos/sunset-${String(i + 1).padStart(2, '0')}.jpg`)));
  const apps = await Promise.all(APPS.map(([f]) => loadImg(`${baseUrl}apps/${f}.jpg`)));

  const CW = 1024, CH = Math.round(1024 * 2556 / 1179);
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  const S = CW / PW;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;

  const GAP = 2, COLS = 3, CELL = (PW - GAP * (COLS - 1)) / COLS;
  const GRID_TOP = 176, TAB_H = 83;
  const cellRect = (i) => ({ x: (i % COLS) * (CELL + GAP), y: GRID_TOP + Math.floor(i / COLS) * (CELL + GAP), w: CELL, h: CELL });

  function statusBar(c, col, a = 1) {
    c.save(); c.globalAlpha = a; c.fillStyle = col; c.strokeStyle = col;
    c.font = `600 17px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('9:41', 64, 31);
    // signal
    for (let i = 0; i < 4; i++) { const h = 4 + i * 2.6; rr(c, 288 + i * 4.6, 36 - h, 3.2, h, 1); c.fill(); }
    // wifi
    c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const r = 3 + i * 3.3; c.beginPath(); c.arc(318, 36, r, -Math.PI * 0.77, -Math.PI * 0.23); c.stroke(); }
    c.beginPath(); c.arc(318, 33.6, 1.5, 0, 7); c.fill();
    // battery
    c.globalAlpha = a * 0.4; c.lineWidth = 1; rr(c, 336, 24, 25, 12, 3.8); c.stroke();
    c.globalAlpha = a; rr(c, 338, 26, 21, 8, 2.4); c.fill();
    c.globalAlpha = a * 0.45; rr(c, 362, 28.5, 1.6, 4, 1); c.fill();
    c.restore();
  }
  function island(c) {
    c.fillStyle = '#000'; rr(c, (PW - 124) / 2, 11, 124, 36, 18); c.fill();
    c.fillStyle = '#0b0f1c'; c.beginPath(); c.arc(PW / 2 + 40, 29, 6.5, 0, 7); c.fill();
    c.fillStyle = '#1a2440'; c.beginPath(); c.arc(PW / 2 + 40, 29, 3.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(120,150,255,.45)'; c.beginPath(); c.arc(PW / 2 + 38.5, 27.5, 1, 0, 7); c.fill();
  }
  function homeBar(c, col, a = 1) { c.save(); c.globalAlpha = a; c.fillStyle = col; rr(c, (PW - 139) / 2, PH - 13, 139, 5, 2.5); c.fill(); c.restore(); }

  function tabIcon(c, kind, x, y, col) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2; c.lineJoin = 'round'; c.lineCap = 'round';
    if (kind === 0) { // photo flower
      for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * Math.PI / 4); c.beginPath(); c.ellipse(0, -7, 3.6, 6.6, 0, 0, 7); c.globalAlpha = 0.9; c.fill(); c.restore(); }
    } else if (kind === 1) { // for you
      rr(c, -11, -11, 22, 22, 5); c.stroke(); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-8, 0, -4, -6, 0, -2); c.bezierCurveTo(4, -6, 8, 0, 0, 6); c.fill();
    } else if (kind === 2) { // albums
      rr(c, -11, -7, 22, 16, 4); c.stroke(); c.beginPath(); c.moveTo(-8, -11); c.lineTo(8, -11); c.stroke();
    } else { c.beginPath(); c.arc(-2, -2, 8, 0, 7); c.stroke(); c.beginPath(); c.moveTo(4, 4); c.lineTo(10, 10); c.stroke(); }
    c.restore();
  }

  // Draw the library page (light) at given vertical offset zero.
  function library(c, sy = 0) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, PW, PH);
    for (let i = 0; i < NPH; i++) {
      const r = cellRect(i), y = r.y - sy;
      if (y > PH) break;
      if (y + r.h < 0) continue;
      cover(c, photos[photoIdx(i)], r.x, y, r.w, r.h);
    }
  }
  const LIB_MAX = Math.max(0, GRID_TOP + Math.ceil(NPH / COLS) * (CELL + GAP) + TAB_H - PH);
  function libraryChrome(c, a) {
    if (a <= 0.001) return;
    c.save(); c.globalAlpha = a;
    // top fade
    const g = c.createLinearGradient(0, 0, 0, GRID_TOP); g.addColorStop(0, 'rgba(255,255,255,.97)'); g.addColorStop(0.82, 'rgba(255,255,255,.97)'); g.addColorStop(1, 'rgba(255,255,255,.0)');
    c.fillStyle = g; c.fillRect(0, 0, PW, GRID_TOP);
    c.fillStyle = '#000'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.font = `700 34px ${FONT}`; c.fillText('Library', 16, 104);
    // select pill
    c.fillStyle = 'rgba(120,120,128,.16)'; rr(c, PW - 82, 72, 66, 32, 16); c.fill();
    c.fillStyle = '#000'; c.font = `500 15px ${FONT}`; c.textAlign = 'center'; c.fillText('Select', PW - 49, 93);
    // segmented control
    c.fillStyle = 'rgba(120,120,128,.12)'; rr(c, 16, 126, PW - 32, 32, 9); c.fill();
    c.fillStyle = '#fff'; rr(c, 18, 128, (PW - 36) / 4, 28, 7); c.shadowColor = 'rgba(0,0,0,.12)'; c.shadowBlur = 4; c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#000'; c.font = `500 13px ${FONT}`;
    ['Years', 'Months', 'Days', 'All Photos'].forEach((t, i) => { c.font = `${i === 3 ? 600 : 500} 13px ${FONT}`; c.fillText(t, 16 + (PW - 32) * (i + 0.5) / 4, 146); });
    c.restore();
  }
  function tabBar(c, a) {
    if (a <= 0.001) return;
    c.save(); c.globalAlpha = a;
    const y0 = PH - TAB_H;
    c.save(); c.beginPath(); c.rect(0, y0, PW, TAB_H); c.clip();
    if ('filter' in c) { c.filter = 'blur(14px) saturate(1.6)'; c.drawImage(c.canvas, 0, y0 * S, CW, TAB_H * S, 0, y0, PW, TAB_H); c.filter = 'none'; }
    c.fillStyle = 'rgba(249,249,249,.78)'; c.fillRect(0, y0, PW, TAB_H);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y0, PW, 0.5);
    const labels = ['Library', 'For You', 'Albums', 'Search'];
    labels.forEach((l, i) => {
      const x = PW / 8 + (PW / 4) * i, col = i === 0 ? '#007aff' : '#8a8a8e';
      tabIcon(c, i, x, y0 + 22, col);
      c.fillStyle = col; c.font = `500 10px ${FONT}`; c.textAlign = 'center'; c.fillText(l, x, y0 + 47);
    });
    c.restore();
  }

  function viewer(c, k) { // full screen photo on black, k = chrome alpha
    c.fillStyle = '#000'; c.fillRect(0, 0, PW, PH);
    const ph = PW; // square photo aspect fit
    cover(c, photos[photoIdx(OPEN_INDEX)], 0, (PH - ph) / 2 - 20, PW, ph);
    c.save(); c.globalAlpha = k;
    c.fillStyle = '#fff'; c.font = `600 15px ${FONT}`; c.textAlign = 'center'; c.fillText('Today', PW / 2, 78);
    c.font = `400 12px ${FONT}`; c.fillStyle = 'rgba(235,235,245,.6)'; c.fillText('7:48 PM', PW / 2, 95);
    c.strokeStyle = '#0a84ff'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(26, 66); c.lineTo(17, 75); c.lineTo(26, 84); c.stroke();
    c.fillStyle = '#0a84ff'; c.font = `400 17px ${FONT}`; c.textAlign = 'left'; c.fillText('Library', 34, 81);
    c.fillStyle = 'rgba(235,235,245,.55)'; c.fillRect(0, PH - 83, PW, 0);
    const iy = PH - 52; c.strokeStyle = '#0a84ff'; c.lineWidth = 2;
    rr(c, 36, iy - 10, 18, 20, 3); c.stroke();
    c.beginPath(); c.moveTo(PW * 0.375 + 8, iy + 8); c.bezierCurveTo(PW * 0.375 - 12, iy - 6, PW * 0.375 - 2, iy - 14, PW * 0.375 + 8, iy - 6); c.bezierCurveTo(PW * 0.375 + 18, iy - 14, PW * 0.375 + 28, iy - 6, PW * 0.375 + 8, iy + 8); c.stroke();
    c.beginPath(); c.arc(PW * 0.625, iy, 10, 0, 7); c.stroke(); c.fillStyle = '#0a84ff'; c.fillRect(PW * 0.625 - 1, iy - 1, 2, 6); c.fillRect(PW * 0.625 - 1, iy - 6, 2, 2);
    rr(c, PW - 56, iy - 9, 16, 19, 3); c.stroke();
    c.restore();
  }

  const CARD_W = (PW - 20 * 2 - 14) / 2, CARD_H = 142;
  const cardRect = (i) => ({ x: 20 + (i % 2) * (CARD_W + 14), y: 128 + Math.floor(i / 2) * (CARD_H + 56), w: CARD_W, h: CARD_H + 40 });
  function portfolio(c) {
    c.fillStyle = '#f2f2f7'; c.fillRect(0, 0, PW, PH);
    c.fillStyle = '#000'; c.textAlign = 'left'; c.font = `700 34px ${FONT}`; c.fillText('Apps', 20, 104);
    c.fillStyle = 'rgba(120,120,128,.16)'; c.beginPath(); c.arc(PW - 38, 88, 17, 0, 7); c.fill();
    c.fillStyle = '#8a8a8e'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(PW - 38 + i * 6, 88, 1.8, 0, 7); c.fill(); }
    const cw = CARD_W, ch = CARD_H;
    APPS.forEach(([, name], i) => {
      const { x, y } = cardRect(i);
      c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 10; c.shadowOffsetY = 3; c.fillStyle = '#fff'; rr(c, x, y, cw, ch, 18); c.fill(); c.restore();
      c.save(); rr(c, x, y, cw, ch, 18); c.clip(); cover(c, apps[i], x, y, cw, ch); c.restore();
      c.fillStyle = '#000'; c.font = `600 14px ${FONT}`; c.textAlign = 'left';
      // wrap name in two lines
      const words = name.split(' '); let l1 = '', l2 = '';
      for (const w of words) { if (c.measureText((l1 + ' ' + w).trim()).width < cw - 4 && !l2) l1 = (l1 + ' ' + w).trim(); else l2 = (l2 + ' ' + w).trim(); }
      c.fillText(l1, x + 2, y + ch + 20); if (l2) c.fillText(l2, x + 2, y + ch + 37);
    });
  }

  let lastKey = '';
  // Scroll story on the phone: photos scroll, one opens, app screen, then the About slide.
  function paintAuto(p) {
    const sy = LIB_MAX * 0.7 * sstep(0.80, 0.885, p);
    const open = ease(clamp((p - 0.885) / 0.03));        // grid cell -> full screen
    const fade = ease(clamp((p - 0.92) / 0.025));        // viewer -> app screen
    const slide = ease(clamp((p - 0.955) / 0.03));       // app screen -> About slide
    const key = `${sy | 0}|${(open * 40) | 0}|${(fade * 40) | 0}|${(slide * 60) | 0}`;
    if (key === lastKey) return;
    lastKey = key;
    const c = ctx; c.setTransform(S, 0, 0, S, 0, 0);
    c.clearRect(0, 0, PW, PH);
    const oi = Math.max(0, Math.floor((sy + PH * 0.45 - GRID_TOP) / (CELL + GAP))) * COLS + 1;
    if (fade < 0.999) {
      if (open < 0.001) {
        library(c, sy); libraryChrome(c, 1); tabBar(c, 1); statusBar(c, '#000'); homeBar(c, '#000');
      } else {
        library(c, sy); libraryChrome(c, 1 - open); tabBar(c, 1 - open);
        const r = cellRect(oi), ph = PW, fy = (PH - ph) / 2 - 20, ry = r.y - sy;
        const x = r.x * (1 - open), y = ry + (fy - ry) * open, w = r.w + (PW - r.w) * open, h = r.h + (ph - r.h) * open;
        c.fillStyle = `rgba(0,0,0,${open})`; c.fillRect(0, 0, PW, PH);
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); cover(c, photos[photoIdx(oi)], x, y, w, h); c.restore();
        const k = clamp((open - 0.5) * 2);
        if (k > 0) viewerChromeOnly(c, k);
        statusBar(c, open > 0.5 ? '#fff' : '#000'); homeBar(c, open > 0.5 ? '#fff' : '#000');
      }
    }
    if (fade > 0.001) {
      c.save(); c.globalAlpha = fade;
      if (slide < 0.999) portfolio(c);
      if (slide > 0.001) {
        c.save(); c.globalAlpha = fade * slide;
        c.fillStyle = '#fff'; c.fillRect(0, 0, PW, PH); aboutSlide(c); c.restore();
      }
      statusBar(c, '#000'); homeBar(c, '#000'); c.restore();
    }
    island(c);
    tex.needsUpdate = true;
  }
  function viewerChromeOnly(c, k) {
    // draw viewer chrome on top of the already drawn photo
    c.save(); c.globalAlpha = k;
    c.fillStyle = '#fff'; c.font = `600 15px ${FONT}`; c.textAlign = 'center'; c.fillText('Today', PW / 2, 78);
    c.font = `400 12px ${FONT}`; c.fillStyle = 'rgba(235,235,245,.6)'; c.fillText('7:48 PM', PW / 2, 95);
    c.strokeStyle = '#0a84ff'; c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(26, 66); c.lineTo(17, 75); c.lineTo(26, 84); c.stroke();
    c.fillStyle = '#0a84ff'; c.font = `400 17px ${FONT}`; c.textAlign = 'left'; c.fillText('Library', 34, 81);
    const iy = PH - 52; c.strokeStyle = '#0a84ff'; c.lineWidth = 2; c.lineCap = 'round';
    rr(c, 36, iy - 10, 18, 20, 3); c.stroke();
    const hx = PW * 0.375;
    c.beginPath(); c.moveTo(hx, iy + 9); c.bezierCurveTo(hx - 17, iy - 4, hx - 8, iy - 14, hx, iy - 6); c.bezierCurveTo(hx + 8, iy - 14, hx + 17, iy - 4, hx, iy + 9); c.stroke();
    c.beginPath(); c.arc(PW * 0.625, iy, 10, 0, 7); c.stroke(); c.beginPath(); c.moveTo(PW * 0.625, iy - 2); c.lineTo(PW * 0.625, iy - 6); c.moveTo(PW * 0.625, iy + 2); c.lineTo(PW * 0.625, iy + 4); c.stroke();
    rr(c, PW - 56, iy - 9, 16, 19, 3); c.stroke();
    c.restore();
  }
  // ---------- interactive layer: home screen, apps, gestures ----------
  const off = document.createElement('canvas'); off.width = CW; off.height = CH;
  const octx = off.getContext('2d');
  const ICON = 62, ICOLS = 4, IGAP = (PW - 2 * 24 - ICOLS * ICON) / (ICOLS - 1);
  const HOME = [
    { id: 'work', name: 'Work', app: 'work' }, { id: 'about', name: 'About', app: 'about' },
    { id: 'contact', name: 'Contact', app: 'contact' }, { id: 'photos', name: 'Photos', app: 'library' },
    ...APPS.map(([, name, url], i) => ({ id: 'a' + i, name, url, img: i })),
  ];
  const DOCK = [
    { id: 'phone', act: () => CONTACT.phone && (location.href = 'tel:' + CONTACT.phone) },
    { id: 'messages', act: () => CONTACT.phone && (location.href = 'sms:' + CONTACT.phone) },
    { id: 'mail', act: () => CONTACT.email && (location.href = 'mailto:' + CONTACT.email) },
    { id: 'photos', app: 'library' },
  ];
  const iconRect = (i) => ({ x: 24 + (i % ICOLS) * (ICON + IGAP), y: 72 + Math.floor(i / ICOLS) * 98, w: ICON, h: ICON });
  const dockRect = (i) => { const g = (PW - 32 - 4 * ICON) / 5; return { x: 16 + g + i * (ICON + g), y: PH - 96, w: ICON, h: ICON }; };
  const hit = (r, x, y, pad = 6) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;

  function glyph(c, id, r) {
    const { x, y, w } = r, cx = x + w / 2, cy = y + w / 2;
    const bg = { work: ['#1c1c1e', '#3a3a3c'], about: ['#8e8e93', '#c7c7cc'], contact: ['#d1d1d6', '#f2f2f7'], photos: ['#fff', '#fff'],
      phone: ['#34c759', '#5ee07c'], messages: ['#34c759', '#5ee07c'], mail: ['#0a84ff', '#5ac8fa'] }[id];
    const g = c.createLinearGradient(0, y + w, 0, y); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    c.save(); rr(c, x, y, w, w, w * 0.225); c.fillStyle = g; c.fill(); c.clip();
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round';
    if (id === 'photos') {
      const cols = ['#ff9f0a', '#ffd60a', '#a3e635', '#34c759', '#5ac8fa', '#0a84ff', '#bf5af2', '#ff375f'];
      for (let i = 0; i < 8; i++) { c.save(); c.translate(cx, cy); c.rotate(i * Math.PI / 4); c.globalAlpha = 0.85; c.fillStyle = cols[i]; c.beginPath(); c.ellipse(0, -11, 6.5, 11, 0, 0, 7); c.fill(); c.restore(); }
    } else if (id === 'work') {
      rr(c, cx - 17, cy - 9, 34, 24, 4); c.fill(); c.lineWidth = 3; rr(c, cx - 7, cy - 16, 14, 9, 3); c.stroke();
      c.fillStyle = '#2c2c2e'; c.fillRect(cx - 17, cy + 1, 34, 2.5);
    } else if (id === 'about') {
      c.beginPath(); c.arc(cx, cy - 7, 9, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy + 20, 19, 14, 0, Math.PI, 0); c.fill();
    } else if (id === 'contact') {
      c.fillStyle = '#8e8e93'; c.beginPath(); c.arc(cx, cy - 6, 10, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx, cy + 22, 20, 15, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#c7c7cc'; for (let i = 0; i < 4; i++) c.fillRect(x + w - 7, y + 12 + i * 11, 4, 7);
    } else if (id === 'phone') {
      c.save(); c.translate(cx, cy); c.rotate(-0.75); rr(c, -6, -17, 12, 34, 6); c.fill(); c.restore();
      c.fillStyle = bg[0]; c.save(); c.translate(cx, cy); c.rotate(-0.75); c.fillRect(-7, -9, 6, 18); c.restore();
    } else if (id === 'messages') {
      c.beginPath(); c.ellipse(cx, cy - 2, 21, 16, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(cx - 14, cy + 8); c.lineTo(cx - 19, cy + 18); c.lineTo(cx - 6, cy + 12); c.fill();
    } else if (id === 'mail') {
      rr(c, cx - 19, cy - 13, 38, 26, 3); c.fill();
      c.strokeStyle = bg[0]; c.lineWidth = 2.5; c.beginPath(); c.moveTo(cx - 18, cy - 11); c.lineTo(cx, cy + 3); c.lineTo(cx + 18, cy - 11); c.stroke();
    }
    c.restore();
  }
  function drawIcon(c, item, r) {
    if (item.img !== undefined) { c.save(); rr(c, r.x, r.y, r.w, r.h, r.w * 0.225); c.clip(); cover(c, apps[item.img], r.x, r.y, r.w, r.h); c.restore(); }
    else glyph(c, item.id, r);
  }
  function home(c) {
    cover(c, photos[5], 0, 0, PW, PH);
    c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, 0, PW, PH);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    HOME.forEach((it, i) => {
      const r = iconRect(i);
      c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 8; c.shadowOffsetY = 2; drawIcon(c, it, r); c.restore();
      c.fillStyle = '#fff'; c.font = `500 11.5px ${FONT}`; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 3;
      let label = it.name; while (c.measureText(label).width > ICON + 18) label = label.slice(0, -2) + '…';
      c.fillText(label, r.x + ICON / 2, r.y + ICON + 16); c.shadowBlur = 0;
    });
    // search pill
    c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, PW / 2 - 40, PH - 132, 80, 26, 13); c.fill();
    c.fillStyle = '#fff'; c.font = `500 12px ${FONT}`; c.fillText('Search', PW / 2 + 6, PH - 115);
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(PW / 2 - 22, PH - 121, 4, 0, 7); c.stroke();
    // dock
    c.save(); rr(c, 12, PH - 110, PW - 24, 92, 34); c.clip();
    if ('filter' in c) { c.filter = 'blur(18px)'; cover(c, photos[5], 0, 0, PW, PH); c.filter = 'none'; }
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(0, PH - 110, PW, 92); c.restore();
    DOCK.forEach((d, i) => drawIcon(c, d, dockRect(i)));
  }
  function header(c, title) {
    c.fillStyle = '#000'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = `700 34px ${FONT}`; c.fillText(title, 20, 104);
  }
  function about(c) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, PW, PH); header(c, 'About');
    c.fillStyle = '#d1d1d6'; c.beginPath(); c.arc(PW / 2, 196, 52, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = `600 38px ${FONT}`; c.textAlign = 'center'; c.fillText('HH', PW / 2, 210);
    c.fillStyle = '#000'; c.font = `600 22px ${FONT}`; c.fillText(CONTACT.name, PW / 2, 286);
    const paras = ['Mobile developer since 2015. I build native apps for iPhone, iPad and Apple Vision Pro in Swift, SwiftUI and RealityKit.',
      'I design, code and ship every project end to end, from the first prototype to the App Store listing.'];
    c.textAlign = 'left'; c.font = `400 16px ${FONT}`; c.fillStyle = '#3a3a3c';
    let y = 334;
    for (const t of paras) {
      let line = '';
      for (const w of t.split(' ')) { const n = line ? line + ' ' + w : w; if (c.measureText(n).width > PW - 48) { c.fillText(line, 24, y); y += 23; line = w; } else line = n; }
      c.fillText(line, 24, y); y += 36;
    }
  }
  const contactRows = () => [
    CONTACT.phone && { label: 'Call', value: CONTACT.phone, href: 'tel:' + CONTACT.phone },
    CONTACT.phone && { label: 'Message', value: CONTACT.phone, href: 'sms:' + CONTACT.phone },
    CONTACT.email && { label: 'Email', value: CONTACT.email, href: 'mailto:' + CONTACT.email },
    CONTACT.x && { label: 'X', value: '@' + CONTACT.x.split('/').pop(), href: CONTACT.x, ext: true },
    CONTACT.instagram && { label: 'Instagram', value: '@' + CONTACT.instagram.split('/').pop(), href: CONTACT.instagram, ext: true },
  ].filter(Boolean);
  const rowRect = (i) => ({ x: 16, y: 300 + i * 64, w: PW - 32, h: 56 });
  function contact(c) {
    c.fillStyle = '#f2f2f7'; c.fillRect(0, 0, PW, PH); header(c, 'Contact');
    c.fillStyle = '#aeaeb2'; c.beginPath(); c.arc(PW / 2, 190, 50, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = `600 36px ${FONT}`; c.textAlign = 'center'; c.fillText('HH', PW / 2, 203);
    c.fillStyle = '#000'; c.font = `600 22px ${FONT}`; c.fillText(CONTACT.name, PW / 2, 274);
    contactRows().forEach((r, i) => {
      const b = rowRect(i);
      c.fillStyle = '#fff'; rr(c, b.x, b.y, b.w, b.h, 12); c.fill();
      c.textAlign = 'left'; c.fillStyle = '#000'; c.font = `400 13px ${FONT}`; c.fillText(r.label.toLowerCase(), b.x + 16, b.y + 22);
      c.fillStyle = '#0a84ff'; c.font = `400 17px ${FONT}`; c.fillText(r.value, b.x + 16, b.y + 44);
    });
  }
  function aboutSlide(c) {
    about(c);
    contactRows().forEach((r, i) => {
      const b = { x: 16, y: 560 + i * 52, w: PW - 32, h: 44 };
      c.fillStyle = '#f2f2f7'; rr(c, b.x, b.y, b.w, b.h, 12); c.fill();
      c.textAlign = 'left'; c.fillStyle = '#8e8e93'; c.font = `400 13px ${FONT}`; c.fillText(r.label, b.x + 14, b.y + 27);
      c.textAlign = 'right'; c.fillStyle = '#0a84ff'; c.font = `500 15px ${FONT}`; c.fillText(r.value, b.x + b.w - 14, b.y + 28);
    });
  }
  const APP_BAR = { library: '#000', work: '#000', about: '#000', contact: '#000' };
  function drawApp(c, app) {
    if (app === 'library') { library(c, st.scroll); libraryChrome(c, 1); tabBar(c, 1); }
    else if (app === 'work') portfolio(c);
    else if (app === 'about') aboutSlide(c);
    else contact(c);
    statusBar(c, APP_BAR[app]); homeBar(c, '#000');
  }
  const appIconRect = (app) => {
    const i = HOME.findIndex((h) => h.app === app);
    return i >= 0 ? iconRect(i) : { x: PW / 2 - 31, y: PH / 2 - 31, w: 62, h: 62 };
  };

  // state
  const st = { mode: 'auto', app: 'library', k: 1, kTo: 1, lift: 0, scroll: 0, g: null, last: performance.now() };
  function setInteractive(p) {
    if (st.mode !== 'auto') return;
    st.mode = 'live'; st.p0 = p; st.app = p > 0.97 ? 'about' : p > 0.925 ? 'work' : 'library'; st.k = st.kTo = 1; st.lift = 0; st.scroll = 0;
  }
  function openApp(app) { st.app = app; st.kTo = 1; if (st.k > 0.99) st.k = 0; st.scroll = app === 'library' ? st.scroll : 0; }
  function goHome() { st.kTo = 0; }

  function paintLive() {
    const now = performance.now(), dt = Math.min(0.05, (now - st.last) / 1000); st.last = now;
    if (!st.g || st.g.kind !== 'home') st.k += (st.kTo - st.k) * (1 - Math.exp(-dt * 14));
    if (Math.abs(st.k - st.kTo) < 0.002) st.k = st.kTo;
    if (!st.g) st.lift *= Math.exp(-dt * 16);
    const k = clamp(st.k - st.lift * 0.75);
    const key = `L|${st.app}|${(k * 200) | 0}|${st.scroll | 0}`;
    if (key === lastKey) return;
    lastKey = key;
    const c = ctx; c.setTransform(S, 0, 0, S, 0, 0); c.clearRect(0, 0, PW, PH);
    if (k >= 0.999) { drawApp(c, st.app); }
    else {
      home(c); statusBar(c, '#fff'); homeBar(c, '#fff');
      if (k > 0.001) {
        octx.setTransform(S, 0, 0, S, 0, 0); octx.clearRect(0, 0, PW, PH); drawApp(octx, st.app);
        const ir = appIconRect(st.app), e = ease(k);
        const x = ir.x * (1 - e), y = ir.y * (1 - e), w = ir.w + (PW - ir.w) * e, h = ir.h + (PH - ir.h) * e;
        c.save(); c.globalAlpha = clamp(k * 3); rr(c, x, y, w, h, 14 + 40 * (1 - e)); c.clip();
        c.drawImage(off, 0, 0, CW, CH, x, y, w, h); c.restore();
      }
    }
    island(c);
    tex.needsUpdate = true;
  }

  const rips = [];
  function paint(p) {
    if (st.mode !== 'auto' && !st.g && (p < 0.8 || Math.abs(p - st.p0) > 0.004)) { st.mode = 'auto'; lastKey = ''; }
    if (rips.length) lastKey = '';
    if (st.mode === 'auto') paintAuto(p); else paintLive();
    if (!rips.length) return;
    const now = performance.now(), c = ctx; c.setTransform(S, 0, 0, S, 0, 0);
    for (let i = rips.length - 1; i >= 0; i--) {
      const r = rips[i], t = (now - r.t0) / 420;
      if (t >= 1) { rips.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - t, 3);
      c.fillStyle = `rgba(255,255,255,${0.32 * (1 - t) * (r.held ? 1 : 1)})`;
      c.beginPath(); c.arc(r.x, r.y, 10 + 26 * e, 0, 7); c.fill();
    }
    tex.needsUpdate = true;
    if (!rips.length) lastKey = '';
  }

  const inApp = () => st.k > 0.5;
  function tap(x, y) {
    if (!inApp()) {
      const hi = HOME.findIndex((_, i) => hit(iconRect(i), x, y));
      if (hi >= 0) { const it = HOME[hi]; if (it.app) openApp(it.app); else window.open(it.url, '_blank', 'noopener'); return; }
      const di = DOCK.findIndex((_, i) => hit(dockRect(i), x, y));
      if (di >= 0) { const d = DOCK[di]; if (d.app) openApp(d.app); else d.act(); }
      return;
    }
    if (y > PH - 34) { goHome(); return; }
    if (st.app === 'work') { const i = APPS.findIndex((_, j) => hit(cardRect(j), x, y, 0)); if (i >= 0) window.open(APPS[i][2], '_blank', 'noopener'); }
    if (st.app === 'contact' || st.app === 'about') {
      const rows2 = contactRows(), j2 = rows2.findIndex((_, j) => hit({ x: 16, y: 560 + j * 52, w: PW - 32, h: 44 }, x, y, 0));
      if (st.app === 'about') { if (j2 >= 0) { const r = rows2[j2]; if (r.ext) window.open(r.href, '_blank', 'noopener'); else location.href = r.href; } return; }
      const rows = contactRows(), i = rows.findIndex((_, j) => hit(rowRect(j), x, y, 0));
      if (i >= 0) { const r = rows[i]; if (r.ext) window.open(r.href, '_blank', 'noopener'); else location.href = r.href; }
    }
  }
  const input = {
    down(x, y, p) {
      setInteractive(p);
      st.g = { x0: x, y0: y, sy0: st.scroll, moved: false, kind: inApp() && y > PH - 60 ? 'home' : 'pan' };
    },
    move(x, y) {
      const g = st.g; if (!g || Number.isNaN(x)) return;
      if (Math.hypot(x - g.x0, y - g.y0) > 8) g.moved = true;
      if (g.kind === 'home') st.lift = clamp((g.y0 - y) / 320);
      else if (inApp() && st.app === 'library') st.scroll = clamp(g.sy0 - (y - g.y0), 0, LIB_MAX);
    },
    up(x, y) {
      const g = st.g; st.g = null; if (!g) return;
      if (g.kind === 'home' && g.moved) { if (st.lift > 0.18) { st.k = clamp(st.k - st.lift * 0.75); st.kTo = 0; } st.lift = 0; return; }
      if (!g.moved) tap(x, y);
    },
    wheel(dy, p) {
      if (st.mode === 'auto') return false;
      if (inApp() && st.app === 'library') { const s = clamp(st.scroll + dy, 0, LIB_MAX); if (s === st.scroll) return false; st.scroll = s; return true; }
      return false;
    },
    ripple(x, y) { rips.push({ x, y, t0: performance.now() }); },
    get live() { return st.mode !== 'auto'; },
    get dragging() { return !!st.g; },
  };

  paint(0);
  return { texture: tex, paint, input, PW, PH, aspect: 1179 / 2556 };
}
