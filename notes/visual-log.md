
## ui
- Iter 1: mix-blend-mode difference had no effect inside #ui stacking context (chrome invisible). Replaced with p-driven --fg colour swap (ink to paper over p 0.10-0.14, ink during flash) plus opposing text-shadow. Grain reduced to 0.05. Last card ended at 0.788 leaving empty dim at 0.79; schedule stretched to 0.7935.
- Iter 2: left-column scrim added for phone beat legibility on any backdrop. Chrome moved above dim and cards (z-index) so it stays readable in montage. Flash covers chrome by design at 0.685.
- Known: world and phone were stubs (paper backdrop), so chrome contrast over the real toon scene is unverified. Console shows one 404 from another module.

## phone
- Iter 1 (p 0.82-1.0, 390px): phone reads as iPhone, UI sharp. Defects: nail spikes at fingertips, thumb nail white and oversized, skin clay-flat, portrait phone clipped at edges, open photo mostly black.
- Iter 2: nails resized and seated on dorsal side, thumb thinner, skin darker with stronger normal map, lights reworked, portrait width clamp and lower yaw. Defects left: skin still smooth (clay), no joint creases, thumb long.
- Iter 3: open photo switched to water sunset (sunset-01). Console shows one 404 (public/arm/arm.glb probe, expected when absent). Not verified at p 0.80 start frame beyond 0.82.

## world
- iter 1 (p 0..0.9): outlines, halftone and alley depth read. Defects: right alley wall solid black, wire mass at vanishing point, city black mass from the air, sun hidden under clouds, sign text clipped.
- iter 2: raised cel ramp (s=(0.6l+0.4)*albedo), window colour 0.2, lighter brick, fewer wires and poles, sun moved above top cloud layer with fixed ray winding, sign font 58px. Shots p0/0.2/0.6/0.66/0.9 pass checklist a-g. Console: only a 404 (favicon).
- Remaining: p0.2 hero cloud covers city centre; p0.6 landing frame is busy; cloud interior has no detail lines.
- Round 2 iter 1 (ui2, ui2-m): paper labels with ink border for mark, nav, altitude, rail and descent captions (13 px); hero solid ink, fades over last 20%; phone beat uses a paper panel, scrim removed; portrait keeps only eyebrow and serif line; cards 55vh, 4 to 6 overlap, durations 0.052 to 0.038, paper veil on each hit; favicon via JS (404 gone).
- Round 2 iter 2: older cards dimmed by brightness instead of opacity (ghosting removed); portrait card x spread narrowed to stay in frame.
- Round 2 iter 1 (phone2): per-limb canvas maps (creases, micro-lines, pores, tendons, redness, tip, AO), flatter palmar section, per-finger curl, shorter thumb at right screen edge, curved nail patch with lunula, knit normal map, subsurface wrap plus transmission, shadow map scoped to scene. Defects: phone top clipped, palm normal gouges, nail slivers, black pole dot on fingertips, sleeve off-frame.
- Round 2 iter 2: fill 0.72, normal strength lowered then raised to 1.0, nails shortened and seated, fingertip pole normals fixed, sleeve moved into lower right. Left: creases barely visible at 1024px, skin still soft CG, nails small. Paper-coloured haze comes from world floor and page scrim, not the phone scene.
- round 2 iter 1 (world2 0..0.9): cloud shader (IS_CLOUD: 3 bands, halftone underside, short noise-masked ink strokes, no normal edges), rounder lobes, bigger central gap, depth-thin distant lines in haze ink, pitch -90 until 0.56, descent aimed at alley, brighter alley (paper walls and floor), brick hatch near, mullions near, lit window and lamp amber, Hancock at x=300 with open lots. Defects: stroke bars too thick on clouds, vanishing point tangle, Hancock hidden.
- round 2 iter 2: thinner strokes, fewer poles and wires, near-only detail range, puddles moved, Hancock darker. Vanishing point tangle remains.
