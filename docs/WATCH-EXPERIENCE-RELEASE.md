# Watch experience revision

New campaigns, expeditions and weekly variations carry `challenge.watchExperience: 1`. Existing saves retain their prices, unlocks, technique order, combat weather and encounters. Five-wave commissions retain their authored rules and rewards inside the expedition hub. The save schema remains compatible with the existing storage slots; weekly personal bests use a separate `experience1` identity.

## Earlier, distinct builds

The first permanent choice is now the signature, available before campaign wave 4 or expedition wave 3. The supporting choice follows before waves 12 or 7. Both arrive during preparation with no countdown running.

| Hero | Opening identity | Signature choices |
| --- | --- | --- |
| Sol | Blast towers apply a small base burn | Wildfire spreads a burning defeat to three nearby foes at 75% strength, with 15% less direct blast damage. Flashpoint consumes up to two seconds of fire for 2.5 times its stored damage. |
| Mira | Chimes are available from wave 1 | Still tide freezes ordinary foes every third chime. Undertow pushes already-slowed ordinary foes 40 route units every third chime, with 12% slower reloads. Bosses resist displacement. |
| Ivo | Lightning opens at campaign wave 3 or expedition wave 2 for 280 glow, with proportionate upgrade prices; blasts are weaker | Forked current adds three targets with about 20% less damage per hit. Capacitor triples the first hit of every third volley, trading one jump and 10% reload speed. |

## Readable combat and placement

- Placement has an explicit preview and confirmation. The ghost shows covered water, current and night reach, shelter and an available Bond. Previewing never changes the simulation or spends glow.
- A tower's first successful effect after an upgrade gets a restrained local cue. Armour breaks, freezes and Bond activations have distinct feedback with frequency limits.
- Tower details and watch reports recognise armour removal, reveals, healing interruptions, slowing hits and signature effects. Raw damage remains available.
- Compatible towers still pair automatically. The player can select a partner or choose which full slot to replace. Existing cooldowns survive replacement, and valid selected pairs remain linked.
- The lantern warning remains visible when enemies approach the exit while a drawer is open. Purchase targets remain at least 44 pixels high.

## Encounter rhythm and district payoff

Preparation waits for Ready before major bosses, technique choices and the new inlet. Ordinary waves keep their existing automatic countdown and live combat. Lower-pressure waves precede major encounters; the two-bank wake alternates entrances to test shared coverage.

Restored projects add lit market stalls, a moving observatory telescope, flowering terraces and residents to existing decorative spaces. Residents appear during quiet water or victory, away from tower plots and the river. Reduced motion keeps them still. A restoration notice identifies the earned project. A five-second, skippable neighbourhood scene precedes the victory report (two seconds with reduced motion).

## Simplifications

Rain, mist and breeze retain scenery and sound but lose their small combat and income modifiers in new watches. Day/night reach, shelter, enemy speed, tower bonuses and harvest timing remain strategic.

The home screen offers a twelve-wave expedition and a forty-wave full watch. Weekly variations and the original five-wave challenges sit together under the expedition hub. Rewards, mastery, archived variations and separate campaign/short-watch saves remain available.

## Reproduce the checks

```sh
npm run check
npm run test:watch-experience
npm run balance:experience
npm run balance:experience -- --stress
npm run ios:sync
```

The standard balance pass covers six paid reference builds across four campaign maps and all three expeditions, 42 complete runs. The stress option probes those six builds on Lantern Reach with seed 4099 in Relaxed and Nightfall. It requires Relaxed wins and records Nightfall results without forcing a perfect defence.

`test:watch-experience` checks all twelve technique combinations, exact mid-wave continuation, pure placement previews, early pricing, old rules, atmospheric weather, explicit Bond replacement, cooldown protection, support credit, weekly validation and the actual signature effects.

Browser checks use an isolated Edge profile with muted sound. Run Vite on port 5174, then `npm run qa:experience`. The harness uses `PLAYWRIGHT_PATH` and `EDGE_PATH` overrides when needed. It exercises purchases, preparation, technique choice, chosen Bonds, the lantern alert, mode navigation, weekly persistence and a real final-encounter victory at 1280×800, 390×844, 320×740 and 844×390. Screenshots and results are written under `artifacts/experience-qa/`.

Validated on 5 October 2026: the full existing regression suite passed, including 72 legacy hero campaigns. All 42 Standard reference runs and all 12 second-seed difficulty probes won. Ivo's two Nightfall builds each lost four light on Lantern Reach; the other difficulty probes finished without leaks. New technique, Bond and exact-save tests passed. All four browser sizes passed the complete gameplay and victory flow. The production web build and Capacitor iOS asset sync completed successfully.

The simulations establish viable paid builds and deterministic persistence. They do not measure human enjoyment. Physical iPhone frame pacing, touch comfort and listening on device remain human playtest checks.
