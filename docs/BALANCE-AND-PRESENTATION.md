# Combat balance and menu refinement

Implemented 28 September 2026. New games carry `balance: 1`; new daily and weekly challenges use `compact2` IDs. Existing saves retain their original combat rules, costs and challenge records. Start a new game to try this revision.

## What was wrong with Lighthouse

Three effects made it unusually good at almost everything:

1. Every boss belongs to the lilac family, as does Lighthouse. The ordinary colour-match rule gave it an unadvertised 50% bonus against every boss.
2. Piercing Ray hit every enemy along its beam at full damage. Dense crowds and boss escorts multiplied its value without a limit.
3. Twin Lamps could converge on one enemy. When the first target died, the first lamp could acquire the second lamp's target; the second lamp kept that cached target. This accidentally doubled its single-target output.

The new rules remove the boss colour bonus, cap piercing and prevent duplicate locks. Each Twin Lamp receives a 30% damage increase to preserve its intended two-target role after removing those advantages. It still deals less damage to a single boss than the old, correctly separated lamp did.

Changing target priority also clears beam locks immediately. The tower panel describes Twin Lamps as two separate beams and stops recommending Owl detection to a tower that can already see hidden enemies.

## Tower roles and final changes

| Tower or path | Decision | Reason |
|---|---|---|
| Lighthouse, Focus | Primary target takes full damage; at most two additional enemies take 50% damage and burn | A line attack remains useful without clearing an unlimited crowd |
| Lighthouse, Twin Lamps | Two different targets, each lamp at 130% of its previous base damage; no boss colour bonus | Rewards two-target coverage and hidden-enemy detection; cannot double-lock a boss |
| Cracker, Skyrocket Battery | +2 direct damage per rocket | Its last upgrade now adds useful damage as well as three rockets |
| Storm Reed | +1 base damage and +10 range | Makes its late crowd-clearing role worth a scarce plot |
| Dusk Ballista | +10 base damage; firing interval multiplied by 0.9 | Gives the expensive late tower a stronger heavy-target role |
| Wickling | No stat change | Both upgraded paths already offer good damage for their price; mass Wicklings were competitive in the baseline |
| Moonbell and Lamp Owl | No stat change | Slow, damage amplification and shared detection already improve a mixed defence |
| Glow Garden | Level 4–7 refinement costs: 180 / 220 / 140 / 120 | Generic combat prices took too long to repay within a 40-wave game |

Build costs, ordinary upgrade prices, plot prices, unlock waves, crosspath limits, wave supplies and battle-plan tradeoffs remain in place. Combat refinements still cost 700 / 1,250 / 1,800 / 2,600. Their late cost makes spreading investment and adding support viable alternatives to maximising every tower.

### Garden economics

The panel now calculates payback from the **additional** income, then shows how many waves remain. It excludes unpredictable nearby-kill bonuses and the value of healing.

For example, Harvest level 4 raises income from 144 to 173. Its 180-glow price takes seven completed waves to repay. Buying it before wave 36 shows that only five waves remain. The final levels are cheaper because fewer income payments remain; levels 6/7 are still optional, and level 7 also restores more light.

The Harvest path's expensive tier-three upgrade has not been made universally cheap. It includes healing, and over-investing in two Gardens still creates a combat weakness, particularly on Nightfall.

## Enemies and difficulty

Ordinary enemies retain their health, speed, armour, counts and colour weaknesses. Bosses retain their waves, speed, armour and special mechanics, and now have no colour weakness.

The original Lighthouse advantages masked a late-boss health problem on Nightfall. Testing Warden and Bloomheart at 100%, 90%, 85% and 80% of their previous health on Lantern Reach found that 85% restored a full 40-wave win with seven light remaining. At 90%, that strategy still lost at the Warden. The shipped correction is **85% health for these two bosses on Nightfall only**.

Gloomtoad and Old Gloom are unchanged. Standard and Relaxed retain all existing enemy health values. Warden's escort call, escort protection and acceleration still work at the same health percentages. Bloomheart retains its warning and ally-healing cycle. Neither encounter loses its tactical mechanic.

## Evidence

### Controlled damage checks

`TOWER-LAB.json` records 80 comparisons: five damage towers, both upgrade paths, four target groups, before and after. Each uses 20 seconds on real map geometry with fixed-health enemies, no route switching, income or support. Damage includes armour removed. This isolates firing behaviour; it is not a universal tower ranking. The crowd group uses lilac Bloats, so its colour bonus is relevant. Some hidden targets can be detected at close range.

| Example, damage dealt in 20 seconds | Before | After |
|---|---:|---:|
| Focus Lighthouse, one boss | 845 | 590 |
| Twin Lamps, one boss with separate target locks | 510 | 442 |
| Impact Ballista, one boss | 967 | 1,168 |
| Reload Ballista, one boss | 624 | 868 |
| Rocket Cracker, one boss | 94 | 202 |

The Twin Lamps lock bug has its own regression test; the old single-boss lab number does not include accidental double locking.

### Full games

`TOWER-BALANCE-BEFORE.jsonl` and `TOWER-BALANCE-AFTER.jsonl` each contain 64 runs: eight strategy preferences, four maps and Standard/Nightfall. Bots share routing and spending logic between versions. These are deterministic strategy checks, not human win-rate measurements.

| Strategy preference | Standard wins before → after, out of 4 | Nightfall wins before → after, out of 4 |
|---|---:|---:|
| Mixed | 4 → 4 | 1 → 1 |
| Twin Lamps | 4 → 4 | 1 → 1 |
| Piercing beams | 4 → 4 | 3 → 2 |
| No Lighthouse | 0 → 2 | 0 → 1 |
| Rockets | 0 → 2 | 0 → 0 |
| Heavy sparks | 4 → 4 | 2 → 2 |
| Lightning and bolts | 2 → 2 | 0 → 1 |
| Two Gardens | 2 → 2 | 0 → 0 |

The preference names describe bot build choices; most strategies still buy support and a Garden. The no-Lighthouse and heavy-sparks strategies explicitly ban Lighthouse. Strategies reserving space for late specialists do so in both versions.

Additional evidence:

- `TOWER-BALANCE-FOLLOWUP.jsonl`: 35 checks. Mixed, Focus and heavy-sparks strategies won Standard on all four maps with a second seed. Both tested strategies won the daily and weekly ten-wave challenges across all four layouts. Ember, Reed and Tide each completed a Standard mixed run.
- `NIGHTFALL-BALANCE.jsonl`: 17 focused checks of support paths, battle plans, fewer towers, live routing, supplies and economy choices. Millpond and Lantern Reach both have successful runs without Lighthouse. Lantern Reach also supports an eight-tower Lighthouse defence using live routing and timed oil. Other variants still lose, including several over-invested Garden builds.
- `BOSS-BALANCE-TRIALS.jsonl`: four health trials behind the final Nightfall boss adjustment.
- All four maps have successful Nightfall strategies across the main and focused checks. Success depends on the composition and route; there is no claim that every composition should win every map.

Garden healing can restore light lost earlier in a run. Finishing at full light therefore does not mean a run had no leaks. The raw files retain loss waves, enemy leaks, income and tower investment for inspection.

### Reproduce

```sh
npm run test:balance
npm run balance:towers -- --legacy
npm run balance:towers
npx tsx scripts/balance-followup.ts
npx tsx scripts/nightfall-balance.ts
npx tsx scripts/nightfall-balance.ts --economy
npx tsx scripts/boss-balance.ts
```

The boss trial script removes the shipped health factor before applying each candidate, so rerunning it tests the same absolute values. `--economy` appends its three cases to the 14 focused Nightfall cases.

## Presentation

The title screen previously put decorative art, the logo, two lines of slogan, several lines inside Continue and footer links inside one large card. The inactive board and HUD remained visible behind it. All interface text used the rounded display face.

The revision uses the existing night palette and lantern artwork with a simpler hierarchy: title, canal illustration, saved-game line, one clear Continue/Play button, then secondary links. The menu background is opaque, the enclosing card and heavy button shadow are removed, and saved-game details sit above the action. The logo keeps Fredoka; controls and descriptions use the platform's normal interface font. Short screens hide the illustration to keep the actions comfortable.

Copy now names actions and effects directly: “Achievements”, “Daily & weekly challenges”, “Enemies stopped” and “Towers built”. Upgrade descriptions use current simulation values. Boss tips explain route coverage and support instead of prescribing Lighthouse for every problem. Completed saves say “View defence”.

## Verification and limits

- All regression suites listed in `npm run check` passed, including 75 core tests, 11 release checks and 15 bit-exact original replays. The new boss-health test was rerun after fixing a missing map ID in its fixture.
- New tests cover piercing limits, secondary damage, duplicate beam locks, boss colour rules, difficulty-specific boss health, spending/refunds and exact saves for every tower path through level 7.
- Old and revised short challenges reconstruct by their own IDs and resume exactly.
- Production build and Capacitor iOS asset sync passed.
- Browser checks at 390 × 844 and 320 × 667 covered title, setup, the opening board, Lighthouse text, Garden spending/payback and scrolling upgrade panels. Original browser test data was restored. The production preview has audio muted and reported no console errors or warnings.
- These are desktop-browser checks. Physical iPhone performance, touch playtests and human difficulty/retention data remain release work.

## Four next improvements

1. **Board-aware wave advice.** Use the actual route and detection coverage to flag one concrete gap before a new threat: “Hidden enemies enter from the side. Your lower towers cannot see them.” Show this only when the gap exists, with a tap to highlight it.
2. **A small wave recap.** Let players inspect what leaked, the light lost and which towers contributed. Add one factual suggestion grounded in that wave. Existing damage reports and leak records provide the starting point; avoid an interrupting results screen after every wave.
3. **Retry the same map after a run.** Offer “Play this map again” alongside the normal next-map rotation. Keep the same arrival seed and show the previous best, so a player can test a better defence without searching through a map picker.
4. **Authored defence puzzles.** Add a few optional ten-wave challenges with a visible constraint, such as an incomplete lower-bank defence or a fixed tower budget. Award existing cosmetic progress. This tests different tower combinations without adding another currency or permanent stat advantage.

Prioritise the first two before adding more towers. They help players understand why their choices worked and make the existing roster more rewarding to learn.
