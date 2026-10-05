# The Long Watch: continuous campaign

The primary campaign is one 40-wave defence on Millpond. Five acts replace the eight short mission resets. The battlefield, tower identities, upgrades, cooldowns, keeper signature, glow, remaining light and permanent passage choice persist until victory or defeat.

| Waves | Act | Boss | Change to the defence |
| --- | --- | --- | --- |
| 1–8 | First Lights | Brood Captain | Establish overlapping damage/control; choose a signature at wave 4 |
| 9–16 | The Iron Procession | Dredger | Repair convoys, spaced armour, new specialist roles |
| 17–24 | Moon Gates | Umbra Leviathan | Permanent passage, side entrance, revealing arches and first Crowns |
| 25–32 | The Broken Waterway | Dreadnought | Coordinated attacks, alternating crowds and isolated heavies |
| 33–40 | Last Bloom | Matriarch | Combined sight, control, repair and burst tests |

Ordinary waves follow after the existing four-second breath. Major preparations and act boundaries stay on the board until the player is ready. There is no intermediate win, fresh starting budget, full heal or mission-selection detour. Boss waves are 8, 16, 24, 32 and 40; lighter crossings before them remain above the opening pressure floor.

## Economy and construction

Starting glow is 440. Clear income grows from `95 + wave × 9`, with 130 additional glow after each eighth wave, before the existing difficulty and late-reward modifiers. Enemy bounties and earned Garden income remain separate. The three tower stages remain Base, Specialisation and Crown; Crowns open at wave 17. The paid references continue purchasing upgrades into the final act.

The passage choice follows wave 16. Restore the jetty for an additional plot and an immediate advance, or reopen the lower sluice for a longer side approach and delayed income. Each has three waves of additional arrivals. The original route and plots remain in place. The second entrance opens at wave 17, and the revealing arches activate with it.

## Saves and defeat

The new `siege1` rules and `siege` save slot do not rewrite earlier mission, custom-watch or expedition saves. Existing records and restoration rewards retain their credit. The title provides access to earlier saves alongside the current defence.

Act checkpoints are immutable snapshots before preparation at waves 0, 8, 16, 24 and 32. Purchases, passage selection and reloads do not overwrite those snapshots. Standard and Gentle defeats can retry the current act with its exact saved defence, budget, light and scenery. A retry at wave 17 can reconsider the passage without accumulating its grant. Nightfall ends the run on defeat; ordinary save/resume remains available.

The eight former missions are optional short practice in a separate slot. They award no campaign progress and do not overwrite the long defence or expedition. Earlier in-progress mission saves continue under their original rules.

## Restoration during the run

| Project | First stage | Second stage | Complete |
| --- | --- | --- | --- |
| Night Market | 8 | 16 | 24 |
| Canal Observatory | 16 | 24 | 40 |
| Waterfront Gardens | 24 | 32 | 40 |

Stages update the actual district scenery and earned profile records. Act milestones show a brief resident line on the battlefield. Only the final victory opens the campaign result. Existing fully restored profiles retain their appearance.

## Validation

- `npm run check`: full historical/current regression suite, including the continuous campaign tests, passes.
- `npm run balance:siege`: 12 paid Standard references, six compositions across both passages; 8 finish all 40 waves. Every keeper has a winning composition on each passage. The failed references are retained: Ivo's chain build fails at the Dreadnought on both routes; Sol's fire relay and Mira's frozen battery fail at the Matriarch on the jetty route.
- Four additional Sol Nightfall references produce two complete Ignition wins, one through each passage, with 3 light remaining. This is not coverage of every Nightfall keeper/build.
- Balance runs check tower/resource continuity and exact live save restoration around bosses and the newly opened inlet. Checkpoint tests cover immutable state, identity matching, retry resources, route reconsideration, corrupt data and failed writes.
- Browser checks pass at 1280×800, 390×844, 320×740 and 844×390: opening purchase, resume, earlier saves, act transition, passage choice, checkpoint retry, final combat/result, restoration and isolated short practice. Larger text and reduced motion are included at 320 pixels. Screenshots were inspected.
- Production build and Capacitor iOS asset/plugin sync pass. The main bundle remains above Vite's default 500 kB advisory (about 199 kB gzip). No Xcode archive, signing or physical-device performance result is claimed.

Machine-readable results are in `artifacts/siege/summary.json`, `balance.json`, `balance-nightfall-sol.json` and `browser-report.json`. Raw fixture states, images and logs remain local QA artifacts. The balance runs are automated strategies, not human win rates or measured enjoyment. Updated observed-player guidance is in `PLAYER-VALIDATION.md`.

Use `npm run dev -- --port 5176` for the local preview. `npm run qa:siege` recreates the paid fixtures and browser checks; `QA_URL`, `PLAYWRIGHT_PATH`, `EDGE_PATH` and `QA_WIDTH` can override the workstation defaults.
