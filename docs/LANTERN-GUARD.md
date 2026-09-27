# Lantern Guard: Tower Defense

Implemented refinement pass for roadmap priorities 1 and 2.

## What changed

- The title, browser metadata, native display name and postcard sharing now use Lantern Guard: Tower Defense.
- Between waves, tapping a lock opens two route choices with the actual damage/support towers on each branch. The board draws the selected route through downstream locks to the lantern and outlines the towers covering it. The Start button stays visible.
- Routes persist between waves and saves. Live taps remain quick overrides; holding a lock or pausing opens the comparison. Ordinary new nights no longer introduce the additional charm system.
- Selected towers and placement previews highlight the water inside their range. Towers sharing water with an Owl or Moonbell have visible links and a short explanation of their interaction.
- First armour, hidden enemies, jams and the final boss have concise planning advice. Waves 8, 10, 16 and 25 require a cleared board and manual start, even with auto-start enabled. Both expansions retain their planning breaks and briefly highlight new pads.
- End screens show the next existing bloom set and its earning condition, with a direct link to the collection. A low flip count is no longer presented as a mistake in new nights.

## Rules and balance

New ordinary nights use `challenge: { expanding: 1, guard: 1 }`. The flag is validated and saved. Old nights keep their original simulation rules. Storage keys and the native bundle identifier remain stable so a display-name change cannot orphan progress.

| Change in new nights | Reason |
|---|---|
| A short route's ×2 reward follows the marked enemy downstream, matching its existing ×2 escape penalty. Taking a second short route does not stack it. Gold rings identify marked enemies. | Makes the benefit and risk use the same lifetime. |
| Moonbell and Lamp Owl gain 20 units of range. | Makes shared coverage practical across the existing pads. |
| Owl reveals last 0.8 seconds instead of being reset to 0.12 seconds each check. Other towers cannot shorten an active Owl reveal. | Gives partner towers a readable opportunity to hit a revealed enemy. |
| Old Gloom takes 45% damage while shrouded (previously 15%). Its 25% health floor and mandatory two-branch split remain. | Lets earlier investments contribute to the finale while keeping the lower-branch test. |
| Nightfall ordinary enemies use a 0.25 late-wave ramp (previously 0.10). | Fixes a difficulty inversion where later ordinary enemies could be weaker than Standard. |

Enemy groups, spawn timings, tower prices, upgrade costs, starting glow and starting light are unchanged. These are targeted support, economy and boss adjustments; difficulty still depends on placement and investment.

## Measured results

The [44-run matrix](GUARD-BALANCE.jsonl) tests 11 scripted strategies on seeds 7 and 31. It is a comparison tool, not a human win-rate estimate.

| Strategy | Standard | Nightfall |
|---|---:|---:|
| Balanced with live routing | 2/2 | 0/2 |
| Heavy hitters with live routing | 2/2 | 2/2 |
| Careful beam sorter | 2/2 | 2/2 |
| Focused beams with two gardens and live routing | 2/2 | 2/2 |
| Beam build, planning only | 2/2 | 0/2 |
| Focused beams with two gardens, planning only | 2/2 | 0/2 |

Across all tested strategies: Standard 14/22 wins; Nightfall 6/22. Several poor or overcommitted builds still lose, including early garden-heavy plans. The first hidden waves still punish weak sight coverage, so the warning and coverage display are part of this release.

A focused [eight-run Nightfall follow-up](GUARD-PLANNING.json) tested zero/one early garden with four tower limits on the normal seed 7. A beam build with one garden won all four limits with 11/15 light and **zero flips**. These are variants of one strategy. The equivalent no-garden variants lost at the final boss. This establishes a viable investment-based route through Nightfall without live sorting.

The fixed-route regression uses the same Standard beam bot, seed and budget with switching disabled; it also completes the night. Original growing-canal fixtures retain the previous interaction and rules for comparison. Player preference between fixed routes and the new planner still requires observed playtests.

## Verification

- TypeScript, the 75 original simulation checks, 11 release checks, growing-canal checks and 15 original replay hashes/outcomes pass.
- New tests cover version rejection, unchanged wave groups and prices, planning/live cooldowns, downstream rewards and escape losses, critical-wave planning, real shared coverage, overlapping Owl reveals, the Nightfall difficulty curve, all-section save recovery and boss-split recovery.
- Full Standard planning/fixed-route wins and a Nightfall win without live switching are regression checks.
- Browser checks cover 375×812, 320×700 with larger text, and 812×375 landscape. They include route selection and persistence, planning holds with auto-start enabled, tower interaction feedback, keeping the boss warning next to Start, returning lock controls after closing the planner, live tap overrides, and the end-card link to bloom sets.
- Production build and native asset sync are checked before delivery. Xcode compilation and physical-device validation remain roadmap priority 3.

Run `npm run check`, `npm run balance:guard` and `npx tsx scripts/guard-planning.ts` to reproduce the simulation evidence. Development fixtures at `/qa/` back up the origin's earlier test data and settings, mute audio automatically, and provide a restore button. Audio stays muted after restoring. Keep browser playtests muted through Settings > Mute everything on any other test origin.

The remaining product decision is whether real players prefer the routing choices and return for another session. Keep that assessment separate from bot win rates.
