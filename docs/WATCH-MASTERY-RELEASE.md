# Watch mastery

New campaigns and ordinary expeditions opt into `challenge.watchMastery: 1`. Existing saves, published weekly variations and commissions keep their previous rules. Start a new watch for this pass.

## Ivo and pacing

- Ivo's starter Spark deals at least 1 damage, fixing the two-hit breakpoint that previously left a basic Guttermaw with 0.16 health. It gains 6 reach. Improved and specialised damage multipliers remain intact.
- Ivo's Chimes recover four percentage points of slow, and his Scouts gain 12 reach. Lightning chips 45% damage through **slowed** armour, compared with the normal 25%. Capacitor's third first hit is heavy before crowning and prioritises a boss, then durable enemies. An imminent leak still takes priority. The Thunderhead crown retains its nearby stagger.
- Campaign waves 7, 14, 19, 24, 29, 36 and 39, plus expedition wave 10, have fewer ordinary arrivals and shorter spawn sequences. Removed base bounties move into the clear reward, preventing shorter waves from starving the next purchase.
- **Broken ranks**, campaign waves 13, 22 and 34 and expedition wave 7, spaces a smaller formation to favour beams and heavy bolts. Bosses and the existing authored tactical encounters retain their timing.
- Cleanup advances at 1.6 times the normal tempo only with one or two weak ordinary enemies already inside lethal tower range, no outstanding spawns, no held/charging command, and enough distance from the lantern. Hidden, armoured, splitting and boss enemies are excluded. Opening an inspector returns normal tempo. Every simulation tick still runs at the same fixed timestep.

The unchanged paid reference planner won all 42 Standard runs. Its worst Ivo Chainworks campaign improved from 23 leaks to 2; the other seven Ivo campaign build/map combinations finished without leaks. The 12 additional Relaxed/Nightfall reference runs also won. These show viable builds, not a human difficulty rating.

| Mode | Previous mean minutes | New mean minutes |
| --- | ---: | ---: |
| Campaign | 18.16 | 17.58 |
| Sunforge | 3.98 | 3.78 |
| Moonwake | 4.22 | 4.13 |
| Stormglass | 4.57 | 4.30 |

Timing estimates use active simulation time, the 1.3 normal tempo, measured safe-cleanup ticks and four seconds per wave. They exclude player-controlled planning pauses. Baselines: `artifacts/tactics-balance.json`; new results: `artifacts/mastery-balance.json` and `artifacts/mastery-stress.json`.

## Sunforge command prototype

Ivo with **Capacitor** receives **Bank next surge** in the existing footer. Once per wave, his strongest Storm tower can reserve its next third volley. While banked, that tower stops firing and carries a pale-blue charge ring. **Release surge** spends the shot at the next available target. The Dredger's existing exposed-core bends offer a useful timing window.

There is no extra damage packet, currency or cooldown to manage. Holding costs firing time. Charging can be cancelled; a held shot must be released or discarded by selling its tower. Upgrading preserves it, and selling a tower after release cannot reset the command. Command ownership and phase survive saves and exact continuation. Other heroes and modes retain automatic combat.

## Optional expedition contracts

Select an objective on its expedition card before starting. A compact battlefield badge opens progress and rules. Failure of an objective does not end the expedition. Rematching retains the selected contract; a fresh run resets its counters.

| Contract | Requirement | Cosmetic reward |
| --- | --- | --- |
| Small company, Sunforge | Win with at most six simultaneous towers at any point and at least one surviving crowned tower. | Copper laurel details on crowns |
| The last lantern, Moonwake | No leaks during waves 10-12; at each wave end, two attack towers and a Scout must cover the marked lower bend. Uses actual current reach, including night. | Moon-glass lantern charms |
| Twin signals, Stormglass | Win with three actual Shatterburst activations and six actual Beacon Volley activations. | Silver inlays around tower bases |

The Shatterburst quota is lower because it requires slowed armour, while Beacon can activate against ordinary targets. Linking alone earns no progress. Counts persist across partner changes and sales; Small company's historical peak also survives sales. Each contract keeps a best-light record for each hero. Rewards change appearance only. Assisted practice earns no contract record, and isolated one-wave practice retains its existing suppression of all progression writes.

Nine paid reference defences complete every hero/contract combination. Their planner deliberately reserves a crown budget, relocates support before the final three waves, or moves two complementary pairs as the Bolt tower arrives. Reference planners never grant glow, bypass prices, edit enemy strength or force an objective counter. Results and final-wave fixtures are under `artifacts/mastery-qa/` and `artifacts/mastery-contracts.json`.

## Verification commands

- `npm run check`: all simulation, storage, legacy replay and feature regression suites, including mastery.
- `npm run test:watch-mastery`: command lifecycle and exact held-shot replay, armour conditions, malformed new state, safe cleanup, nine paid contract completions, practice isolation, idempotent records and cosmetic entitlement.
- `npm run balance:mastery` and `npm run balance:mastery -- --stress`: 42 Standard and 12 additional reference runs.
- `npm run test:contracts`: regenerate paid contract planning/results and the nine-run report.
- `npm run qa:mastery`: isolated Edge sessions at 1280x800, 390x844, 320x740 and 844x390; contract selection, command save/return/release, marked-bend progress, actual final-wave reward recording and rematch. The narrowest case enables large text and reduced motion.
- `node scripts/visual-invariants.mjs --mastery`: reward details in the reduced-motion checks and four-map render-purity scenes, plus 207 icon bounds and projectile-contact checks.
- `npm run build` and `npm run ios:sync`: compile the web release and copy assets into the Capacitor iOS project. Native iPhone execution requires device testing.

Completed for this pass: typecheck, mastery, tactics, experience and fixed-storage tests; 54 normal-budget balance runs and nine contract completions; all four browser layouts; visual invariants; production build and iOS asset sync. Browser checks also verify that live progress preserves keyboard focus and that a four-digit glow balance fits the narrow HUD.

The aggregate `npm run check` was stopped during its broad legacy fixed-build matrix to finish with targeted regression checks. Earlier suites passed, including 15 exact original-game replay hashes. This is not recorded as a full aggregate-suite pass. Its partial log is `artifacts/mastery-check.log`; completed browser and rendering reports are in `artifacts/mastery-qa/`.

For observed playtesting, compare a fresh Ivo watch with the previous build, then ask the player to predict what banking will do before tapping it. Record held-shot duration, whether the Dredger opening was used, mistaken taps and unused banks. Do not expand the command to other heroes until that interaction is understandable and worth the withheld fire.
