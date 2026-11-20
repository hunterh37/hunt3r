import './ui.css';
import { range, smooth, clamp01 } from '../timeline.js';
import { CARDS, LAYOUT, cardHTML } from './cards.js';

const CAPS = [];
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
    <div class="abs intro" id="u-name"><div class="cloud"><div class="intro-name serif sel">Hunter Harris</div></div></div>
    <div class="abs intro" id="u-role"><div class="cloud"><div class="intro-role mono sel">visionOS &amp; iOS Engineer</div><div class="intro-line serif sel">Building spatial apps for Apple Vision Pro and iPhone.</div></div></div>
    ${CAPS.map((c) => `<div class="abs cap"><span class="ln"></span><span class="tx mono sel">${c}</span></div>`).join('')}
    <div class="abs dim" id="u-dim"></div>
    <div class="abs cards" id="u-cards">${CARDS.map(cardHTML).join('')}</div>
    <div class="abs veil" id="u-veil"></div>
    <div class="abs flash" id="u-flash"></div>
    <div class="ld${pinned ? ' instant gone' : ''}" id="u-ld"><div class="ld-word serif">${letters}</div><div class="ld-bar"></div></div>`;

  const $ = (id) => root.querySelector('#' + id);
  root.querySelectorAll('.ri').forEach((el) => {
    const go = () => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
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
  let curBeat = -1, lastAlt = '', lastGrain = -1;

  function update(p, t) {
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
    // name cloud: present at load, drifts up and swells as the camera passes it
    const nOut = smooth(range(p, 0.08, 0.13));
    op(nameEl, 1 - nOut);
    tf(nameEl, `translateY(${(-nOut * 60).toFixed(1)}px) scale(${(1 + nOut * 0.5).toFixed(3)})`);
    // second cloud: rises in, then passes
    const rIn = smooth(range(p, 0.12, 0.16)), rOut = smooth(range(p, 0.26, 0.31));
    op(roleEl, rIn * (1 - rOut));
    tf(roleEl, `translateY(${((1 - rIn) * 60 - rOut * 60).toFixed(1)}px) scale(${(0.9 + rIn * 0.1 + rOut * 0.5).toFixed(3)})`);

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
