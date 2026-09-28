# Compact watches

Implemented 28 September 2026. New ordinary watches use `challenge.compact: 1`. Growing Canal, Harbour, Gardens, daily challenges and historical saves keep their existing rules.

## The design correction

The previous campaign added geography faster than a phone could show it. New watches keep one 720 × 840 board, two locks and the same lantern for all 40 waves. There is no map picker, district switch or camera expansion. Four plots start cleared; eight more can be purchased with ordinary glow. Towers remain in place throughout the watch.

The first two tower choices are Wickling and Cracker. Moonbell joins at wave 3, Owl and Garden at 6, Lighthouse at 7. Gardens arrive after the player has already defended the opening and can buy extra space.

## Progression cadence

| Milestone cleared | What becomes available |
| --- | --- |
| Wave 5 | Two plots, 140 glow each |
| Wave 10 | Side inlet on the existing board; two plots, 220 glow each |
| Wave 15 | Two plots, 320 each; Mastery for tier-three towers, 700 each |
| Wave 20 | Final two plots, 440 each |
| Wave 25 | Ascendant for mastered towers, 1,250 each; Skiffs begin |
| Wave 30 | Warden defeated; Reedlings follow |
| Wave 35 | Garden procession and final mixed encounters |
| Wave 40 | Bloomheart, then optional free play |

Clearing a plot buys space, not a tower. The board shows a dashed `+`; tapping it explains the price and requires an explicit purchase. Clearing is restricted to planning breaks. Plot costs are a sunk investment for that watch; tower sale refunds remain 75% of tower spending. Relocation retains paid ranks and costs 25 glow.

Existing two-path specialisations stay intact. Mastery and Ascendant add damage, range and shorter attack intervals, with role-specific benefits for Moonbells and Gardens. Damage/range/income bonuses are additive against the tower's specialised base; attack intervals multiply by 0.85 per rank. They are available through the existing tower sheet, not a separate tree.

## Routes and economy

Compact routes have equal kill rewards and equal escape costs. The shorter branches offer a reveal bridge or armour-cracking mill; long loops offer more firing time. Coverage and enemy composition determine the useful choice. Original double-glow rules still apply to old campaigns and their saved enemies.

The compact economy starts with 80 additional glow and pays `(90 + wave × 8) × difficulty bonus` when a wave clears. Garden income is 80% of its original value and its lure bonus is halved. Lighthouse damage is 85% of its original value. These are versioned changes; original tower definitions and upgrade prices are unchanged.

Nightfall's toughness ramp begins after wave 8 and reaches its full multiplier by wave 20. It retains 15 light and no planning retry. Bloomheart's compact health is 70% of its original base, compensating for the shorter route and twelve-plot limit. Later garden crowds are also authored for the smaller footprint.

## Repeat play

New watches automatically cycle through Millpond, Reed Crossing and Lantern Reach. Geometry, useful plot positions, inlet approach and later wave schedules vary. Reed Crossing's inlet feeds the upper loop; Lantern Reach changes the bends and mirrors the utility banks. Directions are kept consistent with the screen. Retry and resume retain the exact layout, seed and schedule.

The new Tide Keeper is earned by clearing three plots in a watch. Its Moonbells apply 15 percentage points more slow but toll 25% slower. Ember and Reed Keepers retain their existing impact/fire and damage/bounce tradeoffs. Guardians are permanent profile unlocks chosen in Collection for the next ordinary watch; they introduce no second currency. Compact wins also earn the existing Canal Keeper collection reward.

## Verification

- `npm run check`: complete regression suite passed, including six compact rule groups and all 15 original replay outcomes/snapshots unchanged.
- Compact coverage: paid plots, insufficient funds/combat guards, geometry clearance, mirrored directions, upgrade timing/refunds/relocation, earned guardian tradeoff, corrupt save rejection and exact mid-wave/boss resume.
- Phone browser checks at 390 × 844 and 320 × 667, with audio muted. Plot purchase changed 900 glow to 760; Mastery changed 1,600 to 900 and revealed the locked Ascendant action. The upgrade header now remains visible while scrolling. Final encounter renders on the same board without panning.
- Production build and Capacitor iOS asset sync passed. Native installation, touch latency, battery/thermal behaviour and human retention still require device playtesting.

## Balance evidence

`npm run balance:compact` records 54 deterministic simulations in [COMPACT-BALANCE.jsonl](COMPACT-BALANCE.jsonl): three layouts, two difficulties, nine controlled strategies. These are bot comparisons, not estimated player win rates.

| Strategy | Standard wins | Nightfall wins |
| --- | ---: | ---: |
| Mixed, planning between waves | 3/3 | 1/3 |
| Beam preference, planning | 3/3 | 1/3 |
| Burst preference, planning | 3/3 | 0/3 |
| Mixed, no spending after wave 15 | 0/3 | 0/3 |
| Mixed, live routing | 2/3 | 1/3 |
| Mixed, always long routes | 2/3 | 1/3 |
| Mixed, always utility routes | 0/3 | 0/3 |
| Mixed, no garden | 3/3 | 3/3 |
| Mixed, two early gardens | 2/3 | 0/3 |

The Standard frozen defences lose at waves 24, 24 and 25; continuing to invest wins on those same layouts. One Nightfall frozen strategy dies before its spending cutoff, so that result does not establish a late-progression effect. Buying all twelve plots early also performed worse in exploratory tests than refining nine occupied plots. The harness caps redundant support towers, and uses the same mixed preferences for the route/economy comparisons.

Next human playtest: whether plot prices encourage understandable decisions, whether the first guardian reward is noticed, and whether waves 26–40 sustain interest. Nightfall's strongest sampled strategy currently avoids gardens; further tuning should follow observed player choices rather than forcing equal bot scores.
