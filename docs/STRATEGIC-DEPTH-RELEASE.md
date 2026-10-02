# Strategic depth, landmarks and expeditions

This release adds five linked improvements to new Nightward watches. Combat keeps its existing continuous tempo and compact live upgrade panel.

| Opportunity | Shipped behaviour | Player decision |
| --- | --- | --- |
| Specialisation and combinations | All eight roles have distinct branch crowns. Five automatic Bonds form over shared route coverage. | Commit to crowd damage, piercing or support; place compatible towers together. |
| Encounter rhythm | Convoys, staggered arrivals, close formations and lighter crossings reshape authored waves. Boss bars expose phase changes. | Read the next encounter and invest in its counter before it arrives. |
| Night preparation | Support scouts store three daylight charges and spend them on night pulses. | Give up some scout damage for stronger night coverage. |
| Map identity | One functional landmark per waterway, with a visible area and concise help. | Use a limited favourable area without relying on it for the entire defence. |
| Reasons to return | Three permanent twelve-wave expeditions, nine hero mastery stamps and cosmetic/music rewards. | Revisit a short encounter with another hero or branch plan. |

## Boundaries and balance

### Crowns and Bonds

Crowns alter each chosen branch's behaviour, including tradeoffs such as lighter volleys, smaller burning blasts or slower heavy arcs. Three-beam crowns target three distinct enemies and persist those targets across reloads.

Automatic Bonds keep existing valid pairs, then select the nearest eligible unpaired towers. Each tower has one partner. Campaign slots open at waves 5 and 20; expedition slots at 3 and 7. Both towers must reach the target. New pairs have a four-second warmup, including after moving or rebuilding, so repositioning cannot reset an effect for free.

| Pair | Effect | Cooldown |
| --- | --- | --- |
| Chime + blast | Strip 6 armour after a recent toll against a slowed target | 4s |
| Scout + spark | One guided armour-breaking hit | 2s |
| Chime + beam | Strip 8 armour from a slowed target | 4s |
| Garden + storm | Slow one chain target by 25% for 2s | 3s |
| Scout + bolt | Burn for 6 damage per second for 2s | 4s |

### Sunlight and landmarks

Support scouts lose 25% of their attack damage. They collect half a reserve unit per active daylight second, up to 18 units. Six units fund a four-second night pulse, with six seconds between pulse starts. A pulse gives nearby towers +12% fire rate, expands shelter and reveals foes within 1.4 times the scout's base sight. Overlapping pulses do not stack. Reserve, pulse and cooldown persist exactly; idle time cannot charge them. Times here use simulation seconds, before the existing 1.3x authored tempo.

| Waterway | Landmark | Effect |
| --- | --- | --- |
| Millpond | Moon spring | Reveal nearby foes for 4s every 12s at night |
| Reed Crossing | Storm garden | Nearby lightning damage +5%, or +12% in rain |
| Lantern Reach | Sun terrace | Nearby Garden daylight yield +12% |
| Stone Weir | Tide bell | Nearby enemies 4% slower by day, 8% at night |

Positions stay clear of plots and inside phone framing. Landmark animations and sunlight rings respect reduced motion. Defeated enemies still award glow immediately without travelling currency particles.

### Encounters and expeditions

Campaign encounters retain the original enemy introduction waves. Pressure changes come from arrival timing, formation and occasional lighter populations. The Warden now launches exactly its four signalled escorts at 70% health under the new rules, instead of also generating unannounced extra skiffs indefinitely. It still gains protection from nearby linked escorts and surges at 35%.

Sunforge ends with a Gloomtoad, Moonwake with dividing Gloom, and Stormglass with the Warden. Each starts with 760 glow; completion income is `125 + 35 × wave`, before difficulty adjustments. This compressed economy funds the full roster by wave 9, master upgrades at 7 and crowns at 10. The side inlet opens at 6. Boss health is scaled to the short economy. Waves 6 and 10 provide lighter crossings.

All three expeditions remain available, with one featured each week. Rewards are copper rooftops, moonstone lanterns and prismatic windows. Completing all three adds a restrained answering line to the existing adaptive score. Hero stamps record each victory separately. No reward increases combat power.

## Save compatibility

`challenge.watchDepth: 1` opts new campaigns and expeditions into these rules. Continuing earlier fixed-path saves preserves their tower balance, waves and manual Bonds. The original five-wave commissions keep their previous rules. Campaign and short-watch saves remain separate; expeditions and commissions share the latter, with an explicit replacement notice. Existing journal, settings, records and rewards are retained.

## Verification

- Focused tests cover automatic pairing and cooldowns, all three new Bond effects, bounded sunlight, exact combat replay across dusk, distinct crowns, three-beam targeting, landmark placement, compressed unlocks, valid saves and idempotent rewards.
- The paid-build matrix ran 63 Standard games with real upgrade costs: three heroes, three branch plans, four campaign maps and all three expeditions. Results are stored in [the balance artifact](../artifacts/watch-depth-balance.json).
- All 27 expedition combinations won. Campaigns won 31 of 36: every hero and build plan has a viable campaign, but the same plan does not win every map. Barrage struggled on Reed Crossing and Stone Weir; Sol's shelter plan fell at Millpond's final wave. This is deterministic automated coverage with one campaign seed, not a human difficulty study.
- Nine additional second-seed games checked the income landmark and Nightfall. Balanced and early two-Garden plans both won Lantern Reach with 25 light for each hero; all three heroes completed the tested Nightfall Millpond route with 15 light. [Economy results](../artifacts/watch-depth-economy.json) establish viable alternatives in these cases, not universal balance across every placement.
- Browser review used silent previews at 1280×720, 390×844 and 320×740. It covered expedition selection, hero switching, starting and resuming, landmark framing, live upgrades and nighttime rendering. These are emulated viewport checks, not physical iPhone validation.
- The expanded score is tested through the existing silent audio harness. Background browser testing remains muted and does not alter saved sound preferences.
- `npm run check` passed in full, including the legacy rules, save integrity, 96 fixed-path reference runs, 72 hero campaigns, commission progression, continuous combat, audio and new depth tests. The production build passed. No browser warnings or errors were recorded during the reviewed flows.

Run `npm run check`, `npm run balance:watch-depth`, `npm run balance:watch-economy` and `npm run build` to reproduce the automated checks. Development fixtures opt into the new rules; `?qa=1&muted=1` never writes campaign progress.
