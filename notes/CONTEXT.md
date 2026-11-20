HUNT3R (hunt3r.org) portfolio landing page. Vite + three@0.170, plain ES modules, no framework.

## Brand
- Wordmark: HUNT3R. Instrument Serif for display (italic for the 3), Geist Mono 300/400 for labels, uppercase, wide tracking.
- Palette: ink #0a0a0a, paper #f4f2ec. Accents used on under 5% of pixels: amber #ff8a3d (sun, one window, one UI dot), haze #9db4c8 (sky depth).
- World look: black and white low-poly toon. 3-step cel ramp (paper, mid grey #b9b6ae, ink shadow), halftone or hatch in shadow band, thick ink outlines with slight line-weight wobble. Cute proportions: chunky, rounded, slightly oversized props.
- The iPhone, arm and screen are the single photoreal element. No outline, PBR, soft shadows, real color. The contrast between the two looks is the signature.
- No subtitles or taglines under titles. No em dashes in copy. Copy is short and plain.

## Timeline (src/timeline.js, p = 0..1)
- sky 0.00-0.14: above cloud deck, camera pitch -90 (straight down), slow drift.
- descent 0.14-0.56: fall through clouds, Back Bay roofs resolve (brownstone rows, bay windows, fire escapes, Hancock tower and Prudential far off, Charles River edge).
- landing 0.56-0.68: drop into a public alley between brownstone backs, pitch eases to 0, eye height 1.6 m.
- montage 0.68-0.80: white flash, then history cards of touch devices and patents.
- phone 0.80-1.00: arm rises from bottom right holding iPhone, Photos app with sunset photos, then app portfolio.

## Module contracts (main.js already calls these; do not edit main.js, timeline.js, index.html)
- src/world/index.js: `export async function createWorld({ renderer })` returns `{ update(p, t, dt), render(renderer), resize(w, h) }`. World owns scene, camera, toon materials and its own outline post pass. render() must end drawing to the default framebuffer (renderer.setRenderTarget(null)) and must not clear depth afterwards; main clears depth then draws phone on top.
- src/phone/index.js: `export async function createPhone({ renderer })` returns `{ scene, camera, visible, update(p, t, dt), resize(w, h) }`. Own PerspectiveCamera, own lights. scene.background must stay null. `visible` false before p 0.78.
- src/ui/index.js: `export function createUI(root)` returns `{ update(p, t), setLoaded() }`. All DOM inside root (#ui, fixed, pointer-events none; re-enable on interactive children). CSS in src/ui/ui.css imported from index.js.

## Folders (one owner each)
- src/world/ world agent. src/phone/ + public/photos/ phone agent. src/ui/ ui agent.
- public/apps/*.jpg: real app screenshots (cyberzombies, johnnys-*, vibebike-synthwave-rider) for the portfolio screen.

## Checks
- Dev server: `npm run dev` (port 5183, strict). If the port is busy another agent already runs it; reuse it.
- Stills: `node scripts/shot.mjs <tag> <p,p,p>` writes notes/shots/<tag>/pNNN.png (1024x640). `?p=0.5&t=3` pins the timeline. Add width 390 as 4th arg for phone portrait.
- No xcodebuild, no simulators. No git stash, no git worktree. Do not spawn subagents.
- Perf budget: 60 fps on an M1 laptop, under 250 draw calls, instancing and merged geometry for buildings, no textures over 2048.
