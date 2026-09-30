# Nightward: fixed-path edition

30 September 2026. Rules version `fixed: 1`.

Nightward is a quiet canal district under watch. The visual brief comes from the user's images of geometric buildings with planted roofs and warm horizontal windows. It replaces the former Lantern Guard branding and cottage direction across the playable interface, code-drawn towers, enemies, scenery, title illustration, loading screen, favicon and iOS display name, icon and launch art. The repository URL and native bundle identifier stay stable so installed data remains accessible.

## Delivered

| Roadmap phases | Implemented outcome |
| --- | --- |
| 0–2: foundations and mobile | Four fixed connected waterways, no gates or switching controls; forecasts, paused contextual panels, 44px gameplay targets, planning undo, 25-glow relocation, factual failure tips, stable whole-board camera and safe-area layout. |
| 3: tower partnerships | Shatterburst joins Moonbell and Cracker: up to six armour stripped, shared target coverage, four-second cooldown. Guiding Light joins Owl and Wickling: a heavy hit against armour in shared coverage every two seconds. One Bond after wave five, two after wave twenty, one membership per tower. |
| 4–6: campaign and presentation | Eight tower roles, five stages, one branch choice, Mastered from wave sixteen and Crowned from wave thirty-one. Distinct architectural silhouettes and stage additions; revised Gloomtoad and Old Gloom; four authored map geometries and three difficulties. |
| 7: return flow | Three permanent five-wave commissions with a separate save, cosmetic market awnings/glass lights/roof gardens, four restoration milestones, retained journal, per-map and per-mode records, same-seed rematches, separate Nightfall practice. |
| 8: integration | New DM Sans interface; local 103kB title illustration; faceted enemies and vector buildings; soft restrained effects; reduced motion, larger text, distinct enemy colours and crest choices. Backgrounding pauses and suspends audio. QA previews and `?muted=1` start silently. |
| 9: web verification and compatibility | All regression suites pass, 96 paid-build campaign simulations, three commissions, deterministic save checks, corrupt-primary/backup recovery and old-profile preservation. Production build and Capacitor iOS asset sync pass. Native installation and human playtest gates are still external verification. |

## Rules and economy

Every entrance has one authored route. The old alternate channels, route bonuses and gate-jamming encounters are absent from new play. Legacy simulator rules remain behind their save version for regression compatibility; the production app only launches the fixed edition.

The player builds and upgrades between waves. Clearing a wave pays `125 + 15 × wave` glow before the difficulty modifier, plus 25% of the former enemy bounty and Garden income. This shifts the budget toward reliable survival rewards. The Garden earns 32 / 44 / 64 / 92 glow along its income branch, with a separate support branch. Upgrade previews derive their numbers from the simulation and show incremental payback against waves remaining.

The upgrade ladder is Base, Improved, Specialised, Mastered and Crowned. Improved is shared; Specialised commits to one of two branches. Crosspaths, combat guardian modifiers, supplies and optional plans have no entry points in this edition. Cosmetic crests preserve identity without creating extra balance multipliers.

Armour is introduced after the first five waves; hidden enemies follow access to the Owl. The side inlet opens at eleven. Wave fifteen's crowd is softened before hidden armour and Mastered upgrades. Late bosses use authored health adjustments, and Ballista receives stronger heavy hits to provide an alternative to beam damage. Enemy health grows steadily; Nightfall's extra health ramps after wave ten.

## Timed daylight, strategic nights and weather

The sky repeats **100 seconds of daylight and 80 seconds of night**, measured only while combat advances. The clock freezes during planning, pause, panels and app backgrounding. At 2× game speed it advances at 2×. It is unrelated to the device clock, so a returning player never arrives at an unexpected disadvantage. Commissions begin at authored offsets in this cycle.

| Condition | Strategic effect |
| --- | --- |
| Daylight | Garden yield is 140% of its base; Ballista reach is 112%. This favours economic investment and long-range coverage. |
| Night | Enemies move 8% faster. Unlit Cracker, Storm and Ballista towers lose 15% reach unless an Owl shelters them. Gardens yield 55%. |
| Lamplit defence | Wickling, Moonbell, Owl and Lighthouse retain their reach. Wickling fires 12% faster at night; Lighthouse deals 12% more damage. |
| Owl shelter | Towers within an Owl's base sight avoid darkness and mist penalties. Shelters do not stack. This creates a placement tradeoff between protecting artillery and covering hidden enemies. |

Garden rewards integrate the light and weather multiplier over the combat time of the wave. A wave with equal daylight and night exposure earns 97.5% of base income before weather. A full 180-second cycle averages about 102.2%, keeping the longer-term economy near its former baseline. Waiting in a paused game generates nothing. The exposure accumulator is saved mid-wave and restored exactly.

Weather is rolled from a separate seeded hash every 45 combat seconds. Reloads and retries preserve the forecast; a new watch can have a different sequence. The current and next condition are shown in the sky panel.

| Weather | Smaller modifier |
| --- | --- |
| Clear skies | None; two of five hash outcomes are clear. |
| Light rain | Storm damage +8%, Garden yield +5%. |
| River mist | Unlit, unsheltered towers lose another 4% reach. |
| Canal breeze | Cracker and Ballista fire 5% faster; enemy speed +2%. |

Daylight uses pale stone, green roof beds and cooler unlit windows. Night uses deep blue ground planes and warm lit facades. Rain and wind use a small number of faint marks; reduced motion removes those moving marks. Enemy visibility and hit targets remain readable in both lighting states.

The comparison bot banks for a heavy counter before buying a second night shelter. In the eight Standard comparisons, the balanced build completes **8/8**, while a build that buys and improves two early Gardens completes **3/8**. Greed produces higher harvests when it survives, but fails earlier on five map/seed combinations. See `artifacts/environment-balance.json`. These results describe those bots, not all player strategies.

## Automated evidence

`npm run check` runs typechecks, all existing historical regression suites, storage checks, `test:fixed` and `test:environment`. The main matrix runs seeds 1047 and 4099 across four maps, three modes and four spending strategies. It does not grant test builds free resources. Results are committed in `artifacts/fixed-balance.json`; another sixteen campaigns compare balanced and greedy investment.

| Mode | Completed runs | Interpretation |
| --- | --- | --- |
| Relaxed | 32 / 32 | Mixed, no Lighthouse, no Garden and no Bonds all finish on every map and seed. |
| Standard | 32 / 32 | All four tested alternatives remain viable. |
| Nightfall | 23 / 32 | The balanced reference build finishes every map and seed. Some omission builds fail, with less margin for economy, missing support and night exposure. These failures do not establish that a particular tower is mandatory. |
| District Commissions | 3 / 3 | Each authored budget and constraint has a complete five-wave solution. |

An unmaintained single-Wickling defence loses at wave four. Tests also cover all tower branches and five stages, fixed source timing and plot clearance, no overlapping waves, no building during combat, shared-coverage Bond cooldowns, exact mid-boss restoration, malformed snapshots, failed storage writes, backup recovery and idempotent journal credit. Environment tests check exact day/night boundaries, forecast determinism, weather effect limits, shelter, idle clock freeze, time-weighted harvest and mid-transition save fidelity. Old settings (mute, text size, motion, palette and cosmetic crest) are preserved on first launch of the new profile.

These are deterministic bot outcomes. They do not establish human win rates, perceived fairness, retention, or mastery of every branch. Those remain questions for observed playtests; no analytics or recurring engagement mechanism has been added.

## Mobile and accessibility review

The old always-visible controls competed with the board. Nightward uses a compact HUD, forecast and one primary wave button. Purchases and inspection use an internally scrolling bottom sheet on phones and a side sheet on desktop; the watch pauses when a panel opens. The board never recentres to accommodate a selection.

Reviewed in the browser at 320×667, 390×844, desktop 1280×720 and landscape 844×390. At 320×667 with larger text, the battlefield is about 483px high and the document remains exactly 320×667 without horizontal or vertical document overflow. Gameplay controls and plot hit areas are at least 44×44px. Fixed camera bounds reserve space for a crowned Lighthouse on the northernmost plot. Actual tower pixels are intentionally smaller than their touch targets.

Keyboard focus is trapped in modal sheets and restored on close. The underlying main view is inert while a sheet is open. Build plots have meaningful accessible names including tower stage. Forecasts and tower sheets use labelled text; live announcements report wave starts and results. Role-specific shell, concealment, healing and slow marks supplement enemy colour. Distinct-colour mode also applies to the new enemy art and journal icons.

Physical iPhone safe-area behavior, VoiceOver, thermal performance, a complete native session and device frame times have not been measured from this Windows environment. The synced iOS project is ready for that validation; an App Store release is not claimed.

## Save boundary and quieter return loop

The new edition writes under `lanternlocks.fixed1.*`. Campaign, commission and their planning checkpoints are separate. Saves use the existing checksummed envelope and a complete backup; invalid writes leave the previous save intact. Journal credit uses per-run high-water marks, so retries and reloads do not award duplicate progress. Retrying Nightfall marks that run as practice.

Old battle snapshots remain untouched on the device, but cannot be resumed through the new interface because their geometry and upgrade rules differ. The UI explains this. Legacy journal, settlement, achievements and settings are retained. No unsupported run is silently converted or awarded a win. Capacitor Preferences continues mirroring the shared `lanternlocks.*` namespace.

Commissions stay available rather than expiring. Cosmetic rewards alter settlement details; they do not make a returning player stronger. Defeat explains the last escaped enemy and a relevant counter, while a same-seed retry lets the player evaluate a changed decision.

## Art provenance and maintenance

The title and native splash illustration were generated from the two user-supplied visual references, using this brief: a low-poly orthographic canal town at dusk; slate-blue flat-roof buildings, planted terraces, warm long rectangular windows, a tall lantern building, bell pavilion, observatory and small defensive structures; restrained lighting and haze; no text, logos, neon, ornate fantasy roofs or excessive effects. The user's source images are not distributed in the repository. The final optimized web asset is `public/nightward-title.webp`.

Battlefield geometry, tower stages, enemy shapes, district details and the icon are original Canvas/SVG code. Code-native assets keep anchors, touch geometry and phone-scale silhouettes predictable. DM Sans is bundled through Fontsource under the SIL Open Font License; Phosphor icons use MIT. License texts are included in `docs/licenses/`. Audio remains locally synthesized.

The three native launch assets use the same illustration with aspect fill. The 1024px native icon is an opaque render of `public/icon.svg`. Native `appId` remains `com.lanternlocks.game`; product display name is Nightward.
