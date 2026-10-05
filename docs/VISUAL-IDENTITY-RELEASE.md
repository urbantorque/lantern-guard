# Brass defenders and hostile canals

The battlefield now uses rounded glazed ceramics, patinated brass mechanisms, warm limestone and muted foliage. The renderer builds this art from Canvas paths, with cached terrain, tree canopies and tower foundations. There are no additional downloaded assets or runtime dependencies.

## Towers and firing

All eight tower families have new bodies and weapon silhouettes. Sol adds sun gears, Mira adds planted supports, and Ivo adds conductors. Upgrade ranks, both branches, refinements, crests and mastery ornaments remain visible.

| Tower | Motion and material |
| --- | --- |
| Wick | Bevelled iris shutters, tracking cannon, recoil, sharp muzzle ignition and an ember core |
| Cracker | Mortar tubes, staggered recoil, exposed pistons, reload gears, vents and rising steam |
| Bell | Arched supports, a swinging brass bell, moving clapper and short mouth ripples |
| Owl | An armoured raptor mask, aiming lenses and articulated metal wing feathers |
| Garden | A glass conservatory, swaying stems, brass ribs and a slow rising energy band |
| Beam | A glazed lighthouse, opening prism shutters and a focused beam with moving filaments |
| Storm | Copper coils, a suspended crystal, orbiting rings, charge arcs and discharge forks |
| Ballista | Reinforced bow limbs, winding gears, moving string, guide rails and steel bolts |

Firing and reload timers drive the poses. Construction rises into place, upgrades briefly expand, and the tower aim settles toward its target. Camera projection is shared with muzzle flashes. Lightning leaves the crystal, chime effects leave the bell mouth, and mortar arcs rise vertically in either camera and terminate at the contact effect. Straight projectiles retain the combat contact plane.

## District and creatures

The four districts retain their authored routes and building locations, with revised day/night palettes, individually drawn bank stones, softer water ripples, tiled cottage roofs, window arches, planters, rounded foliage, lamps and fireflies. The home lantern is a new glass beacon and participates in normal depth ordering so nearby weapons remain visible.

All fifteen invaders have independently authored hostile anatomy. The roster uses dark chitin, patinated iron, pale bone edges and small ember eyes. Jawed canal beasts, knife-finned predators, shearing pincers, torn ray fins, hooded leeches, scythe-legged stalkers and ironclad rammers replace the friendly animal forms. The five bosses have distinct profiles: Mire Tyrant, Umbra Leviathan, Dreadnought, Thorn Matriarch and The Dredger.

Armour removal changes the bodies, the Matriarch's heart marks its healing signal, and the Mire Tyrant opens its jaw during the escort warning. The Dredger's hinged plates expose a rotating core during its actual vulnerability window. Bestiary portraits fit the full silhouettes, including horns, tails and tall limbs. Names in forecasts, journals and older encounter descriptions resolve consistently, including names already translated by the UI.

The controls use related ink-green surfaces, brass borders and warm paper highlights. Existing interaction sizes and panel layouts remain intact.

## Validation

Run Vite on port 5174, then:

```sh
npm run qa:visual
node scripts/visual-motion-qa.mjs
node scripts/weapon-visual-qa.mjs
npm run qa:experience
npm run qa:combat-visual
npm run ios:sync
```

The browser harnesses use isolated, muted Edge contexts. `EDGE_PATH` and `PLAYWRIGHT_PATH` can override local runtime locations. Results and previews are written to `artifacts/visual-overhaul/`. The gameplay harness writes its screenshots to `artifacts/experience-qa/`.

Validated on 5 October 2026:

- 207 tower/creature portraits fit within transparent margins.
- Eight tower families animate and produce identical still images under reduced motion; the existing anatomy tests also verify all fifteen creatures.
- Mortar launch and impact positions match their visual sockets in both cameras.
- Four districts, two cameras and two lighting states render without changing the simulation snapshot. Each stress scene contains twelve towers and eighty creatures. CPU submission timings are recorded separately from GPU presentation in `invariants.json`.
- Complete gameplay and victory flows pass at 1280×800, 390×844, 320×740 and 844×390.
- Type checking, watch craft, district layout, player experience, watch refinement and watch experience suites pass, including exact replay checks.
- Production web build and Capacitor iOS asset sync pass. Physical iPhone frame pacing has not been measured in this pass.

This revision changes presentation. Existing combat rules, save data, routes, ranges, prices and progression continue to use their existing simulation code.

## Combat polish and district continuity

The follow-up pass replaces all four landmark models and the three restoration projects. Earned market awnings, observatory domes and flowering conservatories now use shared artwork in the battlefield and district portrait. Both cosmetic choices remain available. The observatory telescope and active landmarks respect reduced motion.

Razorfins turn along their route; side-view rammers, Guttermaws, Obsidian Crawlers and Leviathans face the direction of travel with a dead band around vertical bends. Intact ordinary armour no longer adds a full meter above every invader. Damaged armour and boss meters remain visible.

Repeated combo text is replaced by a small local cue with a 0.35-second limit. Craft callouts have enough spacing to finish before the next one, feather impacts use the same elevation as their projectiles, and reduced motion removes flying armour shards. Mist uses soft gradients instead of hard-edged ellipses.

`qa:combat-visual` checks late-wave combat on desktop and phone in both lighting and motion modes, with all three district projects restored. It uses the paid wave-39 save when present and otherwise creates an isolated visual stress fixture. `qa:visual` also checks the four landmarks and three distinct locked/restored/alternative project portraits. Neither harness touches the player's browser profile.

## Weapon and defeat effects

Seven projectile forms now use distinct hard shapes and short trails. Mortar trails sample the ballistic arc in six segments, steel bolts use narrow contrails and split fletching, rockets have layered exhaust, feathers have bladed wings, and sparks have white-hot cores. Sun lances have two narrow moving filaments; lightning branches at intermediate contacts.

Impacts use brief local cuts of light. Explosions have broken ground shockwaves with a smaller central flash. Defeats shed armoured fragments instead of petals; those fragments fall down the screen in both cameras. The existing particle cap still applies, ordinary defeat effects are limited within each event batch, and trails retain no history. Bone teeth use inexpensive two-facet geometry to avoid a gradient for every tooth.

The visual invariant harness additionally checks reduced-motion pixels for all seven projectiles in both cameras, beam stillness and projectile-data purity. Reduced-motion explosions omit flashes and spokes. `weapon-visual-qa.mjs` records eight close-up weapon studies in `weapon-motion.webm` and `weapon-study.png`.
