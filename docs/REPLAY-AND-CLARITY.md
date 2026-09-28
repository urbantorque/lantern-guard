# Replay choices and clearer player text

Implemented 28 September 2026.

## Player-facing changes

- Descriptions lead with what a tower does. Upgrade names keep their character, while descriptions use direct verbs: fires, slows, reveals, burns and earns.
- The late upgrade labels are **Level 4** and **Level 5**. Their previews show actual before/after numbers. Garden income and bonus-glow descriptions use the current rules and selected battle plans. Damage previews include guardian impact reductions.
- The title offers Play/Continue and New game. Setup shows the next map, one guardian button and three difficulty buttons. Map selection remains automatic.
- Earned guardians can be chosen during setup. Ember Cracker, Reed Wick and Tide Bell have distinct portraits, board details and names. Their existing fire, bounce and slow tradeoffs remain unchanged. Unlock conditions remain one level 3 upgrade, 1,200 defeats in a game, and three purchased plots respectively.

## Maps

New games rotate Millpond → Stone Weir → Reed Crossing → Lantern Reach. Setup previews the real route geometry and gives one short placement tip. Restarting or continuing preserves the same map.

Stone Weir has diagonally separated gates and broad banks. The side entrance joins the lower gate directly, bypassing the upper loop. It retains the same twelve-plot limit, fixed 720 × 840 camera, progression prices and forty-wave campaign. This changes tower coverage without adding a new control.

## Battle plans

New games opt into `challenge.plans: 1`. After clearing waves 10 and 20, a button offers one of three changes for that game. Choices apply to existing and future towers and survive upgrades, relocation and saves. The player may defer a choice or keep playing without it. Auto-start waits while a choice is available; Start wave still works. Pause → Your battle plans shows chosen effects.

| Cleared wave | Plan | Benefit | Drawback |
| --- | --- | --- | --- |
| 10 | Piercing sparks | Wickling pierce +2 | Hit damage −15% |
| 10 | Wide bursts | Cracker explosion radius ×1.35 | Hit damage −20% |
| 10 | Lookout owls | Owl range ×1.25 | Attack interval ×1.2 |
| 20 | Burning beams | Lighthouse burn +2 damage/sec; at least 2 seconds | Beam damage −15% |
| 20 | Deep chill | Moonbell slow +10 percentage points, capped at 80% | Attack interval ×1.2 |
| 20 | Moth gardens | Gardens attack hidden and visible targets with moths; existing faster moth upgrades retained | Wave income −25% |

No extra currency or permanent combat-stat bonus. Plans are free but cannot be swapped within the run. Their drawbacks also apply when combined with guardian abilities. Old compact saves and challenges gain no plans and keep their original simulations.

## Verification and balance

`npm run check` passed, including all 15 original replay snapshots and outcomes. The new replay tests cover map clearance, routes, every plan's benefit and drawback, choice timing, invalid saves, existing/future towers, upgrades, relocation, and identical mid-wave restoration. Tests also check that Garden copy matches actual payouts.

The [44-run matrix](REPLAY-BALANCE.jsonl) uses the same deterministic mixed bot for controlled comparisons. All 16 Standard layout/plan combinations finished, as did all 12 Standard guardian/layout combinations. Nightfall finished 4/16 of the mixed-bot comparisons. These are bot outcomes, not human win rates or retention estimates.

[Eight additional Stone Weir runs](STONE-WEIR-BALANCE.jsonl) compare no-Garden, beam, burst and frozen-investment builds on Standard and Nightfall. All three investing strategies finished Standard. The beam strategy finished Nightfall with six light; the other two lost. Stopping investment after wave 15 lost at wave 22 on Standard and wave 19 on Nightfall. The new map is beatable without battle plans, while further upgrades remain necessary for the tested builds.

Muted browser checks cover guardian selection, setup, plan selection/confirmation, reload persistence, the review screen, and narrow phone layouts. Physical iPhone performance and player understanding still need device playtests.
