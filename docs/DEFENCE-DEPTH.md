# Late defence and repeat play

Implemented 28 September 2026. New campaigns carry `depth: 1`. Existing saves keep their original roster, upgrade limits and wave rules.

## Progression on the same board

The board remains 720 × 840 world units and never expands. The opening roster, paid plots, two upgrade paths and route choices remain in place.

| Available from | Addition | Cost / role |
|---|---|---|
| Wave 6, then every five waves | Optional wave supplies | 90 glow initially, rising by 30 per milestone |
| Wave 16 | Storm Reed | 480 glow; lightning chains through three targets |
| Wave 16 | Level 4 | Existing 700-glow refinement |
| Wave 26 | Dusk Ballista | 720 glow; slow, heavy bolts default to the strongest target |
| Wave 26 | Level 5 | Existing 1,250-glow refinement |
| Wave 31 | Level 6 | 1,800 glow |
| Wave 36 | Level 7 | 2,600 glow and a tower-specific final perk |

Levels 6/7 require an established tier-three path and all preceding refinements. Compared with level 5, each extra rank adds 12% base damage, 3% range and 8% slow duration; firing intervals are multiplied by 0.94 per rank. Income towers gain 12% per rank. These modest gains make new plots, support and tower choice remain relevant.

Level 7 adds two piercing targets to Wickling, wider Cracker bursts, stronger Moonbell slows, Lighthouse burns, extra Lamp Owl range support, another point of light per wave from Glow Garden, one more Storm Reed target, or 15% more Ballista damage. Brass details and gems show refinement ranks on the board.

Storm Reed's Fork path increases targets and jump distance; Thunder adds damage, armour breaking and hidden-target detection. Dusk Ballista chooses heavier bolts with a final burning upgrade, or faster firing with range and detection. Both follow the existing three-level main path and one-level crosspath rule. Neither replaces the six starting tower roles.

## Wave supplies

After waves 5, 10, 15, 20, 25, 30 and 35, one optional purchase becomes available between waves. It can be delayed within that interval, cannot stack, and affects only the next wave. All three choices cost `60 + milestone × 6` glow.

- **Quickwick oil:** attacking towers fire 15% faster.
- **Bramble net:** catches the first eight non-boss enemies that enter the final approach. Deals `8 + milestone × 0.8` damage and slows them by 50% for three seconds.
- **Lantern ward:** prevents four points of light loss.

Activation is automatic. Remaining net/ward charges appear during combat and expire at wave end. Waves cannot overlap while supplies are active, so calling early cannot extend or erase their effect. Purchases and charges survive an exact mid-wave save.

## Repeat play and return visits

- Guardians gain records for cleared waves, best wave, wins and each map/difficulty combination. Waves count even when a run ends early. A per-run high-water mark prevents retry/resume farming and locks credit to the run's guardian.
- Cosmetic milestones: bronze portrait frame at 20 cleared waves, a signature-tower pennant at 60, settlement festival lanterns at 120. Combat stats do not increase permanently.
- Daily and weekly challenges each last ten waves. They start with a defence to improve, a fixed total budget and the same map/arrival seed for everyone. Daily covers campaign waves 11–20; weekly covers 21–30 and ends at the Warden. Campaign and challenge saves remain separate.
- Campaign arrival patterns vary after wave 11: close groups, steady arrivals or staggered entrances. Enemy types, counts, sources, rewards, introductions and authored boss waves are preserved.
- A returning player gets a short defence briefing with the next threat, current resources and next milestone. Mid-wave returns remain paused.
- Lightning and bouncing shots have visible connections; fire patches have flame marks; slowed-enemy explosions get restrained feedback. Reduced-motion settings suppress extra moving accents. The late roster scrolls horizontally on phones, preserving board space.

## Verification

- Full `npm run check` passed, including 75 simulation self-tests and 15 bit-exact original replay comparisons.
- New depth tests cover tower unlocks, crosspaths, levels 6/7, spending/refunds, automatic supplies, exact restores, hidden/armoured targets, arrival invariants, fixed challenge budgets/endings, and idempotent guardian credit.
- 53 automated balance runs are recorded in `DEPTH-BALANCE.jsonl` and `DEPTH-FOCUSED-BALANCE.jsonl`. The original six-tower Standard strategy won all eight campaign map/seed cases. Specialist strategies won some maps and lost others, commonly at the Warden. Stopping investment at wave 15 lost at 25. No general enemy-health reduction was applied.
- Initial Stone Weir short-challenge results exposed poor starter coverage. Moving starter support to the lower bank produced wins with both the mixed and beam-focused follow-up strategies. The first matrix retains the pre-fix results; the focused file records the corrected runs.
- Browser checks use muted audio and 390 × 844 / 320 × 667 viewports. These verify layout and interaction on a desktop browser, not physical iPhone performance.

Bot results do not establish human win rates or retention. The next balance decisions should follow human runs that record tower choices, unspent glow, loss waves and whether players understand the specialist roles.
