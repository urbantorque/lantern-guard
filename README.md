# Nightward

The city sleeps. You keep the light.

Build a thoughtful defence through a quiet canal district. Study the next wave, choose where to invest, and keep the district alight for forty waves.

![Nightward's colourful canal district](public/nightward-city-v2.webp)

- **Four fixed waterways.** Placement and shared coverage shape your defence.
- **A new canal bestiary.** Fifteen distinct silhouettes: paddle-tailed salamanders, needlefish, plated crabs, glass rays, lantern moths, walking seedpods, steam launches and four large creatures plus the Dredger. Each has its own movement, armour/reveal cues and a short counter in the creature guide. Reduced motion freezes their animation.
- **Two hero techniques per watch.** Choose once at waves 6 and 16 (4 and 8 in expeditions). Each pair offers a benefit and a cost, from Sol's daylight dividend to Ivo's isolated-tower reach. Choices never interrupt combat or expire while you read them.
- **Three heroes, eight towers each.** Sol brings fire and income, Mira brings control and night shelter, Ivo brings speed and electricity. Each roster has different mechanics, names and architecture; every tower has five stages.
- **Quick, live upgrades.** Compare two compact specialisations, commit to one and upgrade while combat continues. Each tower automatically aims for its role, with imminent leaks taking priority.
- **Distinct crowns and automatic Bonds.** Each crown extends its chosen stream. Five compatible tower pairs link automatically over shared coverage, with one partner per tower and at most two active Bonds. The upgrade panel shows the active link.
- **Three twelve-wave expeditions.** Sunforge, Moonwake and Stormglass offer compressed progression, a final boss and per-hero mastery stamps. Earn copper roofs, moonstone lanterns and prismatic windows; completing the set adds a soundtrack accompaniment. Every expedition remains available.
- **Useful district landmarks.** The Moon spring reveals nearby hidden foes at night, the Storm garden strengthens nearby lightning, the Sun terrace boosts daylight harvests, and the Tide bell slows passing enemies.
- **A continuous watch.** One authored tempo, 30% faster than the former default. The first tower starts a four-second countdown; subsequent waves follow automatically. Build, upgrade, move and sell during combat. Named encounters alternate pressure and recovery; the footer previews the next threat and boss bars explain phases. Three difficulties and same-seed retries remain available.
- **Prepare for night.** About 46 real seconds of daylight favour Gardens and long-range builds; 37-second nights reward lamplit towers and Owl shelter. Weather shifts about every 23 combat seconds. Live Gardens earn for the time each tier worked, preventing last-second harvest exploits.
- **Store sunlight.** A scout's support stream trades some attack damage for three daylight charges. At night, automatic pulses briefly extend sight and boost nearby fire rate. Stationary pips and a live charge count show the reserve.
- **An evolving score.** An original 32-bar form with a varied second pass, four waterway arrangements, three hero melodies, a bridge, later-wave accompaniment and a boss pulse. Night changes instrumentation on bar boundaries. Marimba, soft reeds, glass bells and brushed percussion sit alongside water and weather ambience. Defeat sounds distinguish metal, glass and soft creatures. Sound and music preferences remain separate.
- **A clearer battlefield.** Wide screens show the canal across the screen. Phones keep it vertical and frame the selected tower during upgrades. Glow updates immediately, without flying reward particles.
- **Readable decisions.** Build cards preview compatible Bonds; selected towers show night reach and explain hidden/armoured targets. Brief first-watch tips can be dismissed. The end report uses actual damage, reveals and light lost.
- **The Dredger.** Sunforge's new final encounter opens its coral core at two marked bends. It takes 60% damage while closed and 140% while open. Slows extend the opportunity; heavy damage and overlapping coverage both help.
- **Restore three named places.** The Night Market, Canal Observatory and Waterfront Gardens have campaign or expedition unlocks. Each offers two cosmetic styles, visible in the district panorama and existing battlefield buildings.

The original three five-wave District Commissions remain accessible from Expeditions. Expeditions and commissions share the short-watch save slot; the campaign has its own. Cosmetic rewards never increase combat power. Continuing an existing save preserves its rules; start a new campaign or expedition for the new strategic systems.

## Play and develop

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Add `?muted=1` for a silent preview. Progress stays on the device. Backgrounding freezes the watch and suspends audio; returning continues without a resume control. Browsers can require a gesture to restore sound.

```sh
npm run check       # Regression suites, saves, sky rules and hero balance
npm run balance:watch-depth # 63 paid-build runs across heroes, branches and maps
npm run balance:watch-economy # Income greed, a second forecast and Nightfall
npm run test:watch-craft # Techniques, bestiary rendering, projects and encounter saves
npm run balance:watch-craft # 48 paid-build campaigns/expeditions, all technique pairs
npm run build       # Typecheck and produce dist/
npm run ios:sync    # Build and sync the Capacitor iOS project
```

Development-only `?qa=1&muted=1` offers reproducible planning states at waves 0, 15, 30 and 39 using fixtures generated by `npm run test:fixed`. The QA watch does not overwrite campaign saves or progression.

`npm run balance:watch-craft` also generates the **Test Dredger** development fixture. The new mechanics use `challenge.watchCraft: 1`; older saves retain their original rules. See [release validation and playtest protocol](docs/CANAL-BESTIARY-RELEASE.md).

The [GitHub Pages address](https://urbantorque.github.io/lantern-guard/) keeps its existing URL. A silent preview never changes your saved sound preference. Publish a clean, committed checkout with `./scripts/publish-pages.ps1`; the script builds and pushes the static site to `gh-pages`. See [deployment instructions](docs/WEB-DEPLOYMENT.md).

## Design and verification

[Strategic depth, landmarks and expeditions](docs/STRATEGIC-DEPTH-RELEASE.md) · [Continuous watch and expressive district](docs/EXPRESSIVE-WATCH-RELEASE.md) · [Battlefield and quick-upgrade revision](docs/BATTLEFIELD-EXPERIENCE-RELEASE.md) · [Continuous combat, upgrade streams and audio fixes](docs/CONTINUOUS-COMBAT-RELEASE.md) · [Three-hero release and visual revision](docs/VIBRANT-HEROES-RELEASE.md) · [Execution roadmap](docs/FIXED-PATH-ROADMAP.md) · [Original fixed-edition delivery](docs/NIGHTWARD-RELEASE.md) · [iOS build guide](docs/IOS-BUILD.md)

Nightward replaces Lantern Guard's playable routing edition. Old battle snapshots remain archived on the device; journal, settlement, achievements and settings carry forward. New records and saves use a separate rules version.

The web build and iOS asset sync are checked. Physical iPhone installation, native performance and observed human playtests still require device validation.
