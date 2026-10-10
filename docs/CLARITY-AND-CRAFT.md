# Clarity, canal craft and campaign audio

The continuous campaign now gives players time to read, makes purchasing and command ownership explicit, and gives the five acts their own musical progression. This pass changes presentation and interaction without changing tower prices, enemy health, wave composition or campaign rewards.

## Player experience

1. **Planning and pause.** The HUD pause button and P freeze simulation and the four-second wave countdown. Menus, forecasts, guides and settings pause automatically. Closing a reference resumes the watch unless the player had already paused. Build and tower panels remain usable during manual pause. Background suspension and save behaviour remain intact.
2. **Build and upgrade.** Placement puts the main assessment first and retains a fixed Build action outside the scrolling content. Coverage details are optional. Specialisation cards show a benefit, a trade-off and a labelled price; one disclosure holds the numbers. The opening campaign setup puts keeper, difficulty and launch ahead of the full act list.
3. **Forecasts tied to the canal.** The next-wave action opens the next wave, with a separate Current tab during combat. Entrance counts and approach arrows follow the chosen forecast. Revealing arches and the Dredger's vulnerable bends follow that selection too. Bosses whose escape ends the run carry an explicit defeat warning.
4. **Commands.** The footer names the result, actual owner, preparation state and loss of automatic fire. Corners mark the owner on the board while charging or holding. Existing target brackets remain tied to eligible enemies. Ignition, freeze and discharge have distinct release sounds.
5. **Less competing information.** Preparation sits in the footer. Repeated day/night range claims, duplicate lesson overlays and expanded numeric upgrade lists are removed from the default view. Cosmetic weather lives in the sky reference. Stable tower roles accompany keeper-specific names.

## Art and sound

- **Canal materials.** Broad flagstones, masonry townhouses, slate roofs, brass lamps and one cast-shadow direction replace the former flat ground and small ceramic houses in current watches. Trees have irregular canopies. Earned district projects are larger and their moving details use the same scale. Keeper portraits share warm light and cool masonry colours.
- **Enemy readability.** Ironclaws have bold plated chevrons; Wraith Rays have pale wing edges; Leech Choirs have a distinct green organ and hood outline. Backed signal countdowns stay visible on paving and water. Anatomy, target position and combat state still come from the simulation.
- **Attack weight.** Heavy weapons recoil quickly and return slowly; mortar pistons expose their travel. Physical steel and feathers keep crisp edges, while ignited ammunition emits light. Rolling mortar seams, material fragments and water ripples give contact an aftermath. Routine hits, deaths and Chime rings are quieter visually. Commands, Crowns, bosses and act endings retain larger accents. Reduced motion still removes decorative movement.
- **Five-act composition.** Waves 1–8 use the sparse felt opening; 9–16 introduce marimba and a measured mechanical pulse; 17–24 use harp and reed space; 25–32 bring lower strings; 33–40 return the keeper melody with brighter answers. Changes occur on bar boundaries. All three keeper themes, the 32-bar form, second-pass variation, dusk and outcome arrangements remain.
- **Sound hierarchy.** Five boss timbres and motifs distinguish the Tyrant, Dredger, Leviathan, Dreadnought and Matriarch. A global admission budget limits routine event bursts. Warnings and commands briefly suppress ordinary cues and duck the music, then recover smoothly. Ordinary wave clears get a short confirmation. Music, canal/weather ambience and combat effects are independently saved. Existing profiles with music disabled keep ambience disabled on migration.

## Verification

Run `npm run check` and `npm run ios:sync` for regression, production compilation and Capacitor asset sync.

Browser QA uses separate, disposable Edge contexts. It never touches the user's browser profile or saves. `npm run balance:siege` generates the campaign fixtures used by the browser scripts. With Vite running on port 5176:

```sh
npm run qa:clarity
node scripts/craft-art-qa.mjs
node scripts/craft-audio-qa.mjs
node scripts/visual-invariants.mjs --story
```

`QA_URL`, `PLAYWRIGHT_PATH` and `EDGE_PATH` override machine defaults. `QA_OUT` changes the visual invariant report directory. Evidence for this pass is in `artifacts/craft/`: four viewport reports and screenshots, restored scenery, portraits, audio-control persistence, rendering invariants, and offline audio levels. Audio WAV previews remain local QA artifacts.

The checks cover 320×740 (larger text and reduced motion), 390×844, 844×390 and 1280×800; visible purchase actions; menu/manual pause; correct current/next forecasts; save migration; five distinct act arrangements and boss cues; bounded sound admission; 207 unclipped icons; both camera projections; projectile contact; and render/save separation. Offline samples are checked for finite output, audible energy and clipping headroom.

A browser render profile is CPU timing, not a device frame-rate guarantee. Physical iPhone performance, speaker/headphone listening and observed human ease of play still need device playtesting.
