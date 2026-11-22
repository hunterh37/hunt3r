import './ui.css';
import { range, smooth, clamp01, pAtAlt, TEXT_CLOUDS, G, W1, WA, WALK_L, walkS } from '../timeline.js';
import { CARDS, LAYOUT, cardHTML } from './cards.js';

const CAPS = [];
// Lines spelled out in the air during the rest of the descent, one character per scroll step.
const AIR = ['Building spatial apps', 'for Apple Vision Pro and iPhone', 'since 2015,', 'for Fortune 500 teams', 'and early-stage startups.'];
const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Card schedule: starts accelerate, each lasts about 1% of p, overlapping.
const N = CARDS.length;
const SCHED = CARDS.map((_, i) => {
  const u = i / (N - 1);
  return { s: 0.6855 + 0.09 * (1 - Math.pow(1 - u, 1.45)), d: 0.052 - 0.014 * u };
});

// Flash: fast attack, slower decay.
function flash(p, a, peak, end, amp) {
  if (p < a || p > end) return 0;
  if (p <= peak) return amp * smooth(range(p, a, peak));
  const q = range(p, peak, end);
  return amp * Math.pow(1 - q, 1.8);
}

// Per-letter spans for the 3D scroll wave on the intro lines.
const esc = (c) => (c === '&' ? '&amp;' : c === ' ' ? '&nbsp;' : c);
const lettersOf = (str) => [...str].map((c) => `<span class="zl" aria-hidden="true">${esc(c)}</span>`).join('');

export function createUI(root) {
  const params = new URLSearchParams(location.search);
  const pinned = params.has('p');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const letters = [...'HUNT3R'].map((c, i) => `<span class="${c === '3' ? 'it' : ''}"><em style="--i:${i}">${c}</em></span>`).join('');
  root.innerHTML = `
    <div class="grain" id="u-grain"></div>
    <div class="frame"></div>
    <div class="rail"><div class="ri" id="u-contact" role="button" tabindex="0"><span class="lab mono">CONTACT</span></div></div>
    <div class="abs hero">
      <div class="hero-cue bl" id="u-cue"><span class="mono">SCROLL</span><span class="chev"></span></div>
    </div>
    <div class="abs intro" id="u-name"><div class="cloud"><div class="intro-name serif sel z3" aria-label="Hunter Harris">${lettersOf('Hunter Harris')}</div></div></div>
    <div class="abs intro" id="u-role"><div class="cloud"><div class="intro-line serif sel z3" aria-label="visionOS and iOS Engineer">${lettersOf('visionOS & iOS Engineer')}</div></div></div>
    <div class="abs air" id="u-air">${AIR.map((l) => `<div class="air-l serif sel" aria-label="${l}">${[...l].map((ch) => `<span>${ch}</span>`).join('')}</div>`).join('')}</div>
    ${CAPS.map((c) => `<div class="abs cap"><span class="ln"></span><span class="tx mono sel">${c}</span></div>`).join('')}
    <div class="abs ar" id="u-ar" aria-hidden="true"><div class="visor"></div><div class="det" id="u-det"></div>
      <div class="ar-nav"><span class="ar-ico" id="u-ar-ico">↑</span><span class="ar-tx"><b id="u-ar-t"></b><span class="mono" id="u-ar-s"></span></span></div></div>
    <div class="abs more" id="u-more" aria-hidden="true"><span class="mono">Keep scrolling</span><span class="chev"></span></div>
    <div class="abs dim" id="u-dim"></div>
    <div class="abs cards" id="u-cards">${CARDS.map(cardHTML).join('')}</div>
    <div class="abs veil" id="u-veil"></div>
    <div class="abs flash" id="u-flash"></div>
    <div class="ld${pinned ? ' instant gone' : ''}" id="u-ld"><div class="ld-word serif">${letters}</div><div class="ld-bar"></div></div>`;

  const $ = (id) => root.querySelector('#' + id);
  root.querySelectorAll('.ri').forEach((el) => {
    const go = () => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('contact-press'));
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  const grain = $('u-grain'), cue = $('u-cue');
  const dim = $('u-dim'), cardsEl = $('u-cards'), fl = $('u-flash'), ld = $('u-ld');
  const caps = [...root.querySelectorAll('.cap')];
  const cards = [...root.querySelectorAll('.card')];
  const veil = $('u-veil');

  // grain texture, generated once
  const g = document.createElement('canvas'); g.width = g.height = 128;
  const gx = g.getContext('2d'), id = gx.createImageData(128, 128);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gx.putImageData(id, 0, 0);
  grain.style.backgroundImage = `url(${g.toDataURL()})`;

  // static layout of cards
  const narrow = matchMedia('(max-width:700px)').matches;
  cards.forEach((el, i) => { el.style.left = (narrow ? 50 + (LAYOUT[i][0] - 50) * 0.3 : LAYOUT[i][0]) + '%'; el.style.top = LAYOUT[i][1] + '%'; });
  // fullscreen plate: offset to viewport centre and scale that fills ~86% of the short side
  let FULL = [];
  const measure = () => {
    const W = innerWidth, H = innerHeight;
    FULL = cards.map((el, i) => {
      const cw = el.offsetWidth || 240, ch = el.offsetHeight || 330;
      const lx = parseFloat(el.style.left) / 100, ly = parseFloat(el.style.top) / 100;
      return { dx: (0.5 - lx) * W, dy: (0.5 - ly) * H, s: Math.min((H * 0.86) / ch, (W * 0.84) / cw) };
    });
  };
  measure(); addEventListener('resize', measure);
  // text windows: while the camera is 240..90 above each 3D text cloud
  const WIN = TEXT_CLOUDS.map((c) => [pAtAlt(c.y + 215), pAtAlt(c.y + 180), pAtAlt(c.y + 125), pAtAlt(c.y + 95)]);

  // write-if-changed cache
  const cache = new WeakMap();
  const set = (el, key, val, apply) => {
    let m = cache.get(el); if (!m) cache.set(el, (m = {}));
    if (m[key] === val) return; m[key] = val; apply(el, val);
  };
  const op = (el, v) => set(el, 'o', v.toFixed(3), (e, s) => { e.style.opacity = s; });
  const tf = (el, s) => set(el, 't', s, (e, v) => { e.style.transform = v; });

  const INK = [10, 10, 10], PAPER = [244, 242, 236];
  let lastFg = '';
  function fg(p, f) {
    const k = Math.round(Math.max(smooth(range(p, 0.1, 0.14)) * (1 - f > 0.5 ? 1 : 0), 0) * 8) / 8;
    const c = INK.map((v, j) => Math.round(v + (PAPER[j] - v) * k));
    const s = `rgb(${c})`;
    if (s !== lastFg) { lastFg = s; root.style.setProperty('--fg', s); root.style.setProperty('--sh', k > 0.5 ? 'rgba(10,10,10,.6)' : 'rgba(244,242,236,.55)'); }
  }
  const zLetters = ['u-name', 'u-role'].map((id) => [...root.querySelectorAll('#' + id + ' .zl')]);
  let curBeat = -1, lastAlt = '', lastGrain = -1;

  // detection callouts inside the glasses HUD: pooled boxes, lock-on when an id first appears
  const detEl = $('u-det'), detPool = [], seen = new Map();
  function boxEl(i) {
    if (!detPool[i]) { const b = document.createElement('div'); b.className = 'dbox'; b.innerHTML = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><span class="blob"></span><span class="dtag mono"></span>'; detEl.appendChild(b); detPool[i] = b; }
    return detPool[i];
  }
  function drawDet(dets, t) {
    const live = new Set();
    dets.forEach((d, i) => {
      live.add(d.id); if (!seen.has(d.id)) seen.set(d.id, t);
      const age = t - seen.get(d.id), lock = Math.min(1, age / 0.45), e = 1 - Math.pow(1 - lock, 3);
      const b = boxEl(i), grow = (1 - e) * 0.35, w = d.x1 - d.x0, h = d.y1 - d.y0;
      b.style.display = '';
      b.style.left = ((d.x0 - w * grow / 2) * 100).toFixed(2) + '%'; b.style.top = ((d.y0 - h * grow / 2) * 100).toFixed(2) + '%';
      b.style.width = (w * (1 + grow) * 100).toFixed(2) + '%'; b.style.height = (h * (1 + grow) * 100).toFixed(2) + '%';
      b.style.opacity = (0.35 + 0.65 * e).toFixed(2);
      const n = Math.round(Math.min(1, age / 0.7) * d.label.length);
      const txt = d.label.slice(0, n) + (n >= d.label.length ? `  ${Math.round(d.conf * 100)}% · ${d.dist.toFixed(1)} M` : '');
      const tag = b.lastChild; if (tag.textContent !== txt) tag.textContent = txt;
      b.classList.toggle('locked', lock >= 1);
    });
    for (let i = dets.length; i < detPool.length; i++) detPool[i].style.display = 'none';
    for (const id of [...seen.keys()]) if (!live.has(id)) seen.delete(id);
  }

  // idle nudge: if the reader stops short of the end for 2.5 s, a glowing cue fades in at the bottom
  const moreEl = $('u-more');
  let lastScroll = performance.now(), more = 0;
  addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  addEventListener('wheel', () => { lastScroll = performance.now(); }, { passive: true });
  addEventListener('touchmove', () => { lastScroll = performance.now(); }, { passive: true });

  function update(p, t, dets = []) {
    {
      const idle = (performance.now() - lastScroll) / 1000;
      const want = !pinned && p > 0.04 && p < 0.97 && idle > 2.5 ? 1 : 0;
      more += (want - more) * (want ? 0.04 : 0.15);
      op(moreEl, more);
    }
    // grain
    if (!pinned && !reduced) {
      const k = Math.floor(t * 12);
      if (k !== lastGrain) { lastGrain = k; grain.style.transform = `translate(${(k * 37) % 64}px,${(k * 53) % 64}px)`; }
    }

    // altitude
    let a;
    if (p < 0.66) {
      const u = clamp01(p / 0.68);
      const v = 1.6 + (3200 - 1.6) * Math.pow(1 - u, 1.6);
      a = 'ALT ' + (v < 10 ? v.toFixed(1) : fmt.format(Math.round(v))) + ' M';
    } else a = '';
    if (a !== lastAlt) lastAlt = a;


    // hero
    op(cue, 1 - smooth(range(p, 0.0, 0.05)));
    const nameEl = $('u-name'), roleEl = $('u-role');
    const ph = (a, b, c, d) => smooth(range(p, a, b)) * (1 - smooth(range(p, c, d)));
    // text rides the 3D clouds: grows with them as the camera drops
    [nameEl, roleEl].forEach((el, i) => {
      const [a0, a1, b0, b1] = WIN[i];
      // the name is already on its cloud at p 0, small and far; the role still fades in on approach
      const tin = i === 0 ? 1 : smooth(range(p, a0, a1)), tout = smooth(range(p, b0, b1));
      op(el, tin);
      const far = i === 0 ? 0.5 + 0.2 * smooth(range(p, 0, a0)) : 0.7;
      tf(el, `scale(${(p < a0 ? far : 0.7 + 0.6 * range(p, a0, b1)).toFixed(3)})`);
      // 3D wave: a crest runs left to right, lifting each letter toward the camera, then the letter falls back and fades
      const zl = zLetters[i], n = zl.length, q = range(p, a1, b1);
      for (let k = 0; k < n; k++) {
        const c = n > 1 ? k / (n - 1) : 0.5;
        const x = q * 1.5 - 0.25 - c;                       // crest position relative to this letter
        const h = reduced ? 0 : Math.exp(-(x * x) / 0.018);  // lift
        const gone = smooth(clamp01((x - 0.08) / 0.22)) * smooth(range(p, b0, b1) * 1.6 + 0.4 * q);
        const fadeIn = smooth(clamp01((tin - c * 0.35) / 0.65));
        op(zl[k], fadeIn * (1 - Math.max(gone, tout)));
        tf(zl[k], `translate3d(0,${(-h * 0.12).toFixed(3)}em,${(h * 140 - gone * 60).toFixed(1)}px) rotateX(${((1 - h) * gone * 38 - h * 8).toFixed(1)}deg)`);
        set(zl[k], 'h', h > 0.5 ? 1 : 0, (e, v) => e.classList.toggle('hot', !!v));
      }
    });

    // smart glasses HUD: lens rims in frame plus turn-by-turn, then the paint prompt
    const arEl = $('u-ar'), hud = smooth(range(p, G.hud0, G.hud1)) * (1 - smooth(range(p, G.hud2, G.hud3)));
    op(arEl, hud);
    if (hud > 0) {
      const s = walkS(p);
      let ico = '↱', tt = 'Turn right', ss = `${Math.max(1, Math.ceil(W1 - s))} m`;
      if (p >= G.track0) { ico = '◎'; tt = 'Tracking'; ss = `${dets.length} vehicles`; }
      else if (p >= G.paint0) { ico = '✎'; tt = 'Pinch to draw'; ss = 'Air canvas'; }
      else if (s >= WALK_L - 0.3) { ico = '◉'; tt = 'Arrived'; ss = 'Commonwealth Ave'; }
      else if (s > W1 + WA * 0.8) { ico = '↑'; tt = 'Continue'; ss = `${Math.ceil(WALK_L - s)} m`; }
      else if (s > W1 - 1.5) ss = 'Now';
      set(arEl, 'nav', ico + tt + ss, () => { $('u-ar-ico').textContent = ico; $('u-ar-t').textContent = tt; $('u-ar-s').textContent = ss; });
      tf(arEl, `scale(${(1.06 - 0.06 * hud).toFixed(3)})`);
    }
    drawDet(hud > 0.3 ? dets : [], t);

    // air text: spelled out between the last text cloud and the ground
    const airEl = $('u-air');
    const A0 = WIN[1][3] + 0.005, A1 = 0.545, L = AIR.length;
    op(airEl, 1 - smooth(range(p, 0.55, 0.565)));
    airEl.querySelectorAll('.air-l').forEach((line, li) => {
      const q = range(p, A0 + ((A1 - A0) * li) / L, A0 + ((A1 - A0) * (li + 0.85)) / L);
      const spans = line.children, n = Math.round(q * spans.length);
      op(line, q > 0 ? 1 : 0);
      for (let k = 0; k < spans.length; k++) op(spans[k], k < n ? 1 : 0);
    });

    // descent captions
    const w = (0.56 - 0.18) / 3;
    caps.forEach((c, i) => {
      const q = range(p, 0.18 + i * w - 0.004, 0.18 + (i + 1) * w + 0.004);
      const o = smooth(range(q, 0, 0.12)) * (1 - smooth(range(q, 0.88, 1)));
      op(c, o);
      tf(c, `translateY(-50%) translateX(${((1 - o) * -14).toFixed(1)}px)`);
      tf(c.firstChild, `scaleX(${o.toFixed(3)})`);
    });

    // montage
    const f1 = 0, f2 = 0; // montage skipped
    const f = Math.max(f1, f2);
    op(fl, f);
    fg(p, f);
    op(dim, 0 * smooth(range(p, 0.684, 0.698)) * (1 - smooth(range(p, 0.788, 0.797))));
    const blur = Math.round((f1 * 7 + f2 * 4) * 2) / 2;
    set(cardsEl, 'f', blur, (e, v) => { e.style.filter = v ? `blur(${v}px) brightness(${1 + v * 0.12})` : ''; });
    const inMontage = false;
    const out = 1 - smooth(range(p, 0.786, 0.795));
    let vv = 0;
    cards.forEach((c, i) => {
      const { s, d } = SCHED[i];
      const q = (p - s) / d;
      if (!inMontage || q <= 0) { op(c, 0); return; }
      const qq = Math.min(q, 1);
      let newer = 0;
      for (let j = i + 1; j < N; j++) if (p > SCHED[j].s) newer++;
      const o = smooth(range(qq, 0, 0.05)) * out;
      set(c, 'b', Math.max(0.5, 1 - 0.14 * newer), (e, v) => { e.style.filter = v < 1 ? `brightness(${v.toFixed(2)})` : ''; });
      const [, , rot, ls] = LAYOUT[i];
      const F = FULL[i] || { dx: 0, dy: 0, s: 1 };
      // 0-0.3 fullscreen plate with slow push-in, 0.3-0.55 eased flight into the collage slot
      const k = reduced ? 1 : smooth(smooth(range(qq, 0.3, 0.55)));
      const push = 1 + 0.035 * range(qq, 0, 0.3);
      const fs = F.s * push;
      const slot = ls * (1 - 0.025 * newer);
      const sc = fs + (slot - fs) * k;
      const x = F.dx * (1 - k), y = F.dy * (1 - k) + k * (0.5 - qq) * 12;
      const r = rot * k;
      op(c, o);
      tf(c, `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(3)})`);
    });
    for (let k = 1; k < N; k++) { const x = p - SCHED[k].s; if (x > 0 && x < 0.004) vv = Math.max(vv, 0.3 * (1 - x / 0.004)); }
    op(veil, vv * out);

  }

  let loaded = false;
  function setLoaded() {
    if (loaded) return; loaded = true;
    if (pinned) { ld.classList.add('gone'); return; }
    ld.classList.add('done');
    setTimeout(() => ld.classList.add('gone'), 1250);
  }

  if (!document.querySelector('link[rel~="icon"]')) {
    const l = document.createElement('link'); l.rel = 'icon';
    l.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0a0a0a"/><text x="16" y="25" font-size="26" text-anchor="middle" font-style="italic" font-family="Georgia,serif" fill="#f4f2ec">3</text></svg>');
    document.head.appendChild(l);
  }
  update(0, 0);
  return { update, setLoaded };
}
