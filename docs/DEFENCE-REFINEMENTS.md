# Refining the established defence

Implemented 27 September 2026. This is the next approved development batch: planning relocation, clearer tower specialisations and stronger Harbour encounters.

## Relocation

Select a tower, open **Manage → Move**, choose an empty pad, then confirm for **25 glow**. The ghost retains the tower's actual upgrades. Highlighted water and a range circle preview reach at the destination, including any nearby Owl range support. Cancelling spends nothing and restores the original camera view. Harbour/Canal view switching remains available while choosing.

Moving is available between waves in ordinary Guard nights, including existing Guard saves. Pausing an active wave does not permit it. Scored challenges and legacy-rule nights retain their original actions. Auto-start and the manual next-wave action wait until the move is resolved.

The same tower object moves. Its identity, upgrades, targeting, damage/kills/support record, attack/dive/moth timers and income are retained. Moving does not count as building, reset income or increase the resale value. Auras and cached route/support coverage update after moving.

## Tower specialisations

Every path has a short purpose beside its name: crowd fan versus piercing reach, larger bursts versus tracking runners, control versus damage support, and so on. Upgrade previews now show up to two actual effects from the simulation definitions, including piercing beams, extra targets, homing, armour damage, stuns, reveal, support auras, burn and income. Existing tower art already changes with upgrade tiers and is retained in movement previews.

Descriptions now distinguish Resonance's +1 per discrete hit from its +25% continuous damage, and explain that bosses resist Stillbell stuns. Tower prices, damage statistics and crosspath limits are unchanged in this batch. The goal is to expose and test the existing specialisations before changing their balance.

## Harbour encounters

Newly opened Harbours save `harbourEncounters: 1`. Existing Harbour saves keep their prior wave groups, timings and Warden behaviour, including mid-wave saves.

- Wave 28 sends three tight Wisp groups, creating distinct splash opportunities.
- Wave 31 alternates Harbour crowds and west-inlet Skiffs, giving both parts of the defence a role.
- These pacing changes retain the same enemy counts and types.
- At 70% health, the Warden gives a visible 2.4-second escort signal. Four Skiffs then travel ahead in formation. Nearby escorts have visible links to the boss; while at least one linked escort is alive within 170 world units, the Warden takes 40% less damage.
- Defeating the escorts, or allowing them to separate beyond link range, restores full damage. Broken armour accelerates escort Skiffs as usual.
- At 35% health the guard drops and the Warden accelerates once by 30%. Live status text explains the signal, linked escorts, exposed boss and surge, including when the boss is outside the current view.

## Verification

- `npm run check`: TypeScript, original simulation/release/growth/Guard/journey suites, six new refinement groups and 15 exact original replay comparisons pass.
- New coverage checks movement identity/resources/timers, destination auras, failed moves, scored challenges, exact save restoration, Warden warning/guard/surge restoration, legacy Harbour rules and every legal upgrade preview.
- `npm run balance:journey`: all six Standard strategies/guardian combinations complete both chapters; four of six Nightfall combinations complete both (the other two lose in the unchanged canal). All ten successful continuations use all four Harbour pads.
- Frozen-at-dawn beam defences still win in four of ten tests. The other six frozen defences lose at wave 33. This batch creates encounter variety; it does not establish equal strength among all tower builds.
- Browser checks are muted. Relocation charges exactly 25 glow, retains upgrades and contribution, survives reload, and works across Harbour/Canal views. Portrait checks cover 375×812 and 320×700 with larger text; the small upgrade sheet scrolls when needed. Landscape at 812×375 keeps movement controls accessible, including cancellation across views. No browser errors or warnings were recorded.

`npm run ios:sync` builds and copies the updated offline web assets into the existing iOS project. A native Xcode compile/sign/device run is still required.

Results are scripted probes and browser checks. Observed player learning, return sessions and physical iPhone performance remain the release gates in [IOS-BUILD.md](IOS-BUILD.md).

Next scope after those checks: settlement restoration and chapter rewards, one further guardian sidegrade, and another district with a distinct spatial idea. These are not included in this batch.
