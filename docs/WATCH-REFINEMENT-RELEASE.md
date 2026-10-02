# Nightward: priorities 1–8

This release refines the existing game. The proposed weekly-content and mastery expansions (priorities 9 and 10) are excluded.

## Implemented

| Priority | Player-facing change |
| --- | --- |
| 1. Economy and difficulty | Opening purchases retain their prices. Campaign rewards taper after wave 15, reaching a 12% reduction; Master and Crown purchases cost 12% more (6% in expeditions). Gardens share a restoration budget of 6 light per standard watch, 12 on relaxed and 3 on nightfall. Full health does not consume it, and selling or reloading does not reset it. |
| 2. Combat outcomes | Fire spread draws a short link to its recipient; Flashpoint, charged lightning, Undertow and interrupted boss healing have distinct local cues and sounds. Capacitor shows its two stored charges on the tower. Sunlight uses a quiet local pulse instead of the boss-phase effect. Armour cracks deepen before breaking. |
| 3. Phone comfort | Larger branch copy and 44-pixel purchase controls, shorter descriptions, and revised portrait and landscape technique panels. A sustained high rendering cost lowers mobile canvas resolution, with a long cooldown before recovery. Simulation timing and touch coordinates remain unchanged. |
| 4. Opening lessons | One contextual tip at a time teaches a long firing bend, continuous building, slows, specialisation, armour and night shelter. Live hidden enemies take priority over optional advice. Dismissed lessons stay dismissed. |
| 5. Encounter pacing | The Glass Procession places armour ahead of its healer. The Second Wake separates the slow front from the follow-up. Lantern Migration delivers two arrivals eight seconds apart. Four lighter campaign crossings provide room to reinvest. All routes stay fixed. |
| 6. Hero builds | Short pairing tips explain how to support each second technique. Sol has spreading fire or consumed burns; Mira has freezing chimes or repeated pushes; Ivo has long chains or charged heavy arcs. Branch weapons now draw in front of the building instead of disappearing behind it. Paid reference builds exercise both choices, including actual lightning use for Ivo. |
| 7. District character | Four material palettes distinguish stone and teal water, brick warehouses and blue water, mint glasshouses, and lavender observatories. Roof structures, bank materials and water colours change by district. Sparse swaying reeds avoid the build plots. |
| 8. Music | Separate eight-bar hero themes sit within the existing 32-bar form and varied return. Felt-piano and harp synthesis add softer attacks and decaying harmonics. Written cadences mark phrase endings; day, night, bridge and boss arrangements change on bar boundaries. Busy combat leaves more musical space. |

## Compatibility and scope

New campaigns and ordinary expeditions carry `refinedWatch: 1`. Published saves retain their original economy and encounter rules. Visual, copy and music changes also improve existing watches. Start a new watch to use the revised rules.

The save validator rejects unsupported rule versions, impossible restoration totals and a refined flag added to weekly saves. No weekly scenarios, progression rewards or mastery goals were added. There are no new pause, speed or target-priority settings. Browsers used for development are muted, and hidden-tab audio remains suspended.

## Verification

The reproducible checks are `npm run check`, `npm run balance:refinement`, and the `scripts/refinement-*-qa.mjs` browser scripts. Evidence is stored in `artifacts/refinement-qa`, `artifacts/refinement-balance.json` and `artifacts/refinement-economy.json`.

Reference builds spend real glow, respect unlocks and specialise through normal simulation actions. Ivo reserves a plot for lightning. The refined reference player can make purchases every eight simulation seconds during combat, and reinvests income towers for the final encounter. These are feasibility and regression checks, not estimates of human win rates. Alternate weather seeds and greedy builds are recorded separately as stress probes.

Phone checks use isolated, muted Edge contexts at 320 × 740, 390 × 844 and 844 × 390, with a 1280 × 800 desktop smoke check. They cover all 24 hero/tower combinations in portrait and landscape, both technique rounds for all heroes, continuous upgrades, and overflow. District captures include all four waterways in daylight and at night. A crowded rendering fixture includes 68 enemies.

Music checks render 48-second day/night/boss excerpts of the actual Web Audio graph into an offline buffer without connecting to speakers. Offline rendering uses its own lifecycle: it starts with `startRendering()` and lets the finite graph complete without live oscillator-disposal callbacks. Live sound retains normal node cleanup. Scheduling tests also cover rate limits, hidden tabs, mute, intensity and bounded voice counts across the full 32-bar form and its varied repeat.

These checks do not establish performance on a physical iPhone or Android device, and numerical audio checks do not replace listening on phone speakers or headphones.

The full `npm run check` suite passed, including 24 exact refined save/replay cases. All 48 tower upgrade layouts, 18 technique layouts and four continuous-play viewport checks passed without horizontal overflow or browser exceptions. Audio excerpts for all three heroes were non-silent and unclipped. Rendering measurements are desktop-browser measurements under host load, not phone hardware benchmarks.

## Final balance results

- All 42 reference builds won: six builds across four campaigns and three expeditions.
- All three heroes also won the Garden-free economic probe.
- Five of six alternate-seed builds won. Mira’s Still tide build lost at wave 15 on seed 98117 in the Harbour; her Moon sight/Undertow build cleared the same seed. The probe is retained as a real tradeoff, not counted as a guaranteed win.
- All three greedy probes cleared the deliberately favourable map 2. Mira lost 9 light, restored the allowed 6, and finished with 22; healing did not erase every mistake.
- Eight additional Garden upgrade checks confirmed that both available and exhausted restoration-budget copy leave the purchase button visible on small portrait and landscape screens.
