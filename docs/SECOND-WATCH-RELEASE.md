# Nightward: the second watch

New watches use `watchDirector: 2`. Existing saves retain their published rules, upgrade stages, map geometry and record identifiers. Start a new watch to use this release's systems.

## Five deeper passes

1. **Bosses offer an action during their windup.** The Brood Captain teaches the tether before the Matriarch uses it: destroy the linked escort or interrupt the channel to stagger the boss and expose its core. A visible tether identifies the escort; armour plates, core motion, a short callout and a distinct audio cue announce the opening. The Dredger also announces each core opening. The Matriarch's health spike is reduced under the new rules.
2. **Players choose the command tower and Ivo's target.** The tower inspector assigns command ownership. The battlefield previews affected targets; Sol reports burning enemies and the first burn expiry, Mira signals an available interruption, and Ivo can select an enemy from the target panel. A chosen target that moves out of reach cannot silently redirect the shot. Ownership and held commands survive saving; selling the tower clears ownership and consumes an already banked command.
3. **Signatures reward different tower groups.** Wildfire relays reward overlapping Blast coverage; Flashpoint rewards another tower setting the fire before a heavy finisher consumes it. Undertow buys a longer firing window and an exposed-target opportunity. Capacitor puts more force into the charged volley. These sit alongside Frozen Current and Chain Network, with explicit benefit and tradeoff copy in the choice panel.
4. **Passages permanently rebuild the battlefield.** Restoring the jetty adds plot 13 and an immediate 180 glow. Reopening the sluice creates an authored, longer side approach and pays 90 glow after each of three defended waves. Both choices add their advertised three-wave opposition. The preview draws the actual selected waterway, plot and route. Original plots remain in place, and both constructions reconstruct exactly when a watch resumes.
5. **The canal city has more presence during combat.** Slate quays, broader stone banks, drainage joints, taller houses and lit awnings carry the title screen's material palette into the battlefield. Jetty rails and sluice structures persist after the choice. Tethers and command brackets draw above units so large bosses cannot hide the cue. Crown attacks and boss openings receive stronger, limited effects and sound accents. Reduced-motion behaviour is preserved.

## Two simplifications

- **Base → Specialisation → Crown.** New watches skip the separate foundation and mastery purchases. Specialisation and Crown collect the previous costs atomically; the Crown includes the stream's refinement. Crown availability uses the former mastery window (expedition wave 7, chapter wave 11, endurance wave 16). Inspectors show three stages and the full resulting stats before purchase.
- **Consistent reach and fewer passive percentages.** Scout coverage is no longer a night-range tax. Towers keep their reach across day and night. Small Scout auras and landmark percentage bonuses are removed under version 2 and the base balance is adjusted. Detection, Moon spring reveals, Beacon Bonds and limited stored-sunlight pulses remain visible support mechanics. Night still changes enemy speed and Garden income.

## Validation

The historical aggregate regression suite passed, followed by the new second-watch suite. The latter covers all four waterways and both constructions, water clearance and unchanged old plots, three-stage prices/unlocks, chosen command ownership and target effects, tether defeat and interruption, exact mid-encounter save restoration, malformed-state rejection and director-1 isolation.

Production build and Capacitor iOS asset/plugin sync passed. The build emits Vite's advisory for a JavaScript chunk above 500 kB; the current game bundle is about 544 kB (181 kB gzip). Physical iPhone performance and sound quality still need device playtesting.

Paid composition results from `npm run balance:second-watch`:

| Format | Wins / attempts |
| --- | ---: |
| Reed Crossing, 24-wave chapter | 12 / 12 |
| Sunforge | 12 / 12 |
| Moonwake | 12 / 12 |
| Stormglass | 10 / 12 |
| Nightfall chapter | 7 / 12 |
| Endurance | 10 / 12 |
| Total | 63 / 72 |

Each format runs all six paid compositions with both passages. The same Reed Crossing chapter is won by two builds per hero, with different rosters, plots and investment: Sol's Wildfire relays / Ignition siege, Mira's Frozen battery / Undertow corridor, and Ivo's Chain network / Capacitor bastion. The planner pays actual tower, plot and upgrade costs. Detailed rosters and spending are in `artifacts/second-watch/matrix-both.json`.

The nine paid contract checks all win and meet their objectives, covering every hero against Small Company, Last Lantern and Twin Signals. Results are in `artifacts/second-watch/contracts.json`.

These are reachability and regression checks, not a human win-rate estimate. Remaining reference losses are Chain Network at Stormglass's finale, several Nightfall builds, and Capacitor's early endurance defence. The simpler planner does not adapt its roster to those failures.

Browser checks use a separate Edge profile at 1280×800, 390×844, 320×740 and 844×390. They cover passage previews and construction, three-stage inspectors, all three command flows, Ivo target selection, held-command resume, 44-pixel command controls fully inside the viewport, reduced motion at the narrowest width, page errors and horizontal overflow. The footer takes its height from the controls to prevent clipping in landscape. See `scripts/second-browser-qa.mjs` and `artifacts/second-watch/browser-report.json`. Screenshots are generated locally in the same artifact directory.

## Reproduce

```sh
npm run check
npm run balance:second-watch
npm run test:second-contracts
npm run qa:second-watch
npm run ios:sync
```

The browser runner expects Vite on port 5176, or a `QA_URL` override. Its Edge/Playwright paths currently match the development workstation. It does not read or modify the player's browser profile.
