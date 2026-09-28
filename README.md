# Lantern Guard: Tower Defense

A lantern-lit tower defence game for phones. Build your towers, grow your defence and keep the lantern lit.

A browser game with a Capacitor iOS project, designed portrait-first for iPhone. It also plays on desktop.

New games use one compact board for 40 waves. Start with four building plots, buy more space after waves 5, 10, 15 and 20, and upgrade established towers through level 7. Storm Reed joins at wave 16 and Dusk Ballista at 26. Optional wave supplies offer one automatic boost every five waves. Four maps rotate automatically, including Stone Weir. Choose an earned guardian before starting, then choose optional battle plans after waves 10 and 20 to change how your towers work. Each plan has a benefit and a drawback. Routes pay the same glow; shorter branches reveal hidden enemies or break armour.

See [late towers, wave supplies and guardian progress](docs/DEFENCE-DEPTH.md), [replay choices and player text](docs/REPLAY-AND-CLARITY.md) and [compact progression and balance](docs/COMPACT-WATCHES.md). Existing saves retain their maps and rules; choose **New game** for the latest additions. The [native build handoff](docs/IOS-BUILD.md) describes the remaining iPhone release work.

The latest [combat and menu pass](docs/BALANCE-AND-PRESENTATION.md) fixes Lighthouse double targeting, limits piercing, removes boss colour bonuses and improves the late specialists. Gardens have separate refinement prices and show their income payback. New games and new challenges use these rules; saved runs continue under their original balance.

- Design, niche, twist, monetisation and the iOS plan: [docs/DESIGN.md](docs/DESIGN.md)
- Research: [docs/research.json](docs/research.json) (raw findings with sources)
- Balance results: [docs/balance-matrix.txt](docs/balance-matrix.txt) (full nights) and [docs/tides-matrix.txt](docs/tides-matrix.txt) (daily tides and weekly nights)
- Path to the App Store: [docs/IOS-PLAN.md](docs/IOS-PLAN.md)
- Planning relocation, tower specialisations and Harbour encounters: [docs/DEFENCE-REFINEMENTS.md](docs/DEFENCE-REFINEMENTS.md)
- Water Gardens (waves 34–39), permanent settlement restoration, mastery and chapter guardian changes: [docs/WATER-GARDENS.md](docs/WATER-GARDENS.md)
- Next three refinement priorities: [docs/NEXT-PRIORITIES.md](docs/NEXT-PRIORITIES.md)
- Proposed title and routing direction: [docs/POSITIONING-AND-ROUTING.md](docs/POSITIONING-AND-ROUTING.md)

## Run it

Requires Node 22+ (the iOS tooling requires it).

```bash
npm install
npm run dev
```

Open http://localhost:5173/. To try it on a phone, open the "Network" URL that Vite prints (for example `http://192.168.x.x:5173/`) while both devices are on the same Wi-Fi. Then use "Add to Home Screen" for a full-screen view.

For the hosted build, see [web deployment](docs/WEB-DEPLOYMENT.md). Its Sites project and static output directory are configured in `.openai/hosting.json`.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Typechecks, then builds a static site into `dist/` (including bundled fonts, works from any static host) |
| `npm run preview` | Serves the production build |
| `npm run sim` | Runs the headless balance matrix: 13 bot strategies × 3 modes |
| `npm run tides` | Runs 7 bots through 28 daily tides and the weekly rotation (`npm run tides -- 60` for more days) |
| `npm run typecheck` | Runs TypeScript over the game and the scripts |
| `npm run check` | All simulation, campaign, compact-watch and save checks, plus 15 exact original replay comparisons |
| `npm run test:compact` | Fixed geometry, paid plots, refinements, guardian unlocks, save validation and 40-wave continuity |
| `npm run balance:compact` | 54 controlled compact-watch strategy/difficulty/layout comparisons |
| `npm run test:replay` | Stone Weir, battle-plan tradeoffs, save compatibility and accurate upgrade copy |
| `npm run test:depth` | Late towers, levels 6/7, one-wave supplies, guardian progress and short challenges |
| `npm run test:balance` | Lighthouse targeting, boss health/colour rules, all tower refinements, income payback and 80 controlled damage comparisons |
| `npm run balance:towers` | 64 strategy/map/difficulty runs; add `-- --legacy` to regenerate the before-change comparison |
| `npm run balance:depth` | 41 campaign/challenge comparisons; focused follow-up: `npx tsx scripts/depth-focused-balance.ts` |
| `npm run balance:replay` | 44 map/guardian/plan comparisons; add `-- --stone-weir` for 8 additional strategy checks |
| `npm run balance:growth` | 36 growing-canal nights across 6 strategies, 3 modes and 2 seeds |
| `npm run balance:guard` | 44 Lantern Guard nights across 11 strategies, Standard/Nightfall and 2 seeds |
| `npm run test:guard` | Versioned rules, route rewards, support interactions, save continuity and planning-only wins |
| `npm run test:refinement` | Relocation resources/timers, destination auras, Warden phases, legacy Harbour rules and upgrade previews |
| `npm run test:journey` | Separate saves, migrations, retry credit, Harbour continuity, guardian behaviour and current challenges |
| `npm run test:gardens` | Chapter continuity, boss signals, Reed bounces, mastery, restoration and save validation |
| `npm run balance:gardens` | 18 guardian/difficulty/strategy journeys, including Gardens with and without further investment |
| `npm run balance:journey` | 12 guardian/difficulty/strategy openings, Harbour continuations with and without new investment, plus current daily/weekly checks |
| `npm run balance:reedbank` | 48 nights across 8 strategies, 3 modes and 2 seeds |
| `npm run ios:sync` | Build and copy the offline game into the Xcode project |
| `npm run ios:open` | Open the project in Xcode on a Mac |
| `npm test` | Simulation self-tests (saves, victory rules, routing, tides, tidal locks, journal counts): 75 checks |

## How to play

1. **Build.** Tap a stone pad, then tap a keeper twice (preview, then build). With a mouse, one click builds. You can also tap a keeper first and then a glowing pad.
2. **Plan your route.** Between waves, tap a lock to compare its two branches and their tower coverage. A solid gold line shows the complete path to the lantern. Your choice stays set. During combat, tap to switch quickly; hold a lock or pause to open the comparison.
   - Long loops give towers more firing time.
   - Short routes pay the same glow as long loops. Choose their utility when it helps your defence. The **Lantern bridge** reveals hidden Veils; the **Mill wheel** cracks armour.
3. **Combine towers.** Moonbell slows groups for repeated Cracker bursts. Lamp Owl reveals targets for nearby attackers. Selecting a tower highlights the water it reaches and links to support partners sharing that water.
4. **Use your towers' strengths.** Each tower deals ×1.5 damage to ordinary enemies with its colour and symbol. Bosses have no colour weakness in new games. Sight and heavy attacks give alternatives to routing every enemy through a landmark.
5. **Upgrade and expand your build space.** Tap a dashed + plot between waves to see its clearing cost. Tap a keeper. It has two paths: one can reach tier 3, the other stops at tier 1. On compact watches, tier-three towers gain paid level 4 after wave 15 and level 5 after wave 25. **Manage** opens targeting, moving and selling; the main panel explains each path and its upgrade effects. Between waves in an ordinary Guard night, **Move** previews a new empty pad before confirming for 25 glow. Upgrades and progress stay with the tower.
6. **Pause any time** to plan. Nightfall allows building while paused, but live route changes require time to run. Call waves early for bonus glow. New threats and the final boss get a manual planning break. The game autosaves, even mid-wave.
7. **Tides.** Collection offers two ten-wave challenges with a starting defence to improve. The daily uses campaign waves 11–20 and a total starting budget of 4,200 glow; the weekly uses waves 21–30 and 8,500 glow, ending with the Warden. Starting towers come out of that budget. Everyone gets the same map, towers and arrival pattern. Your campaign stays saved separately.
8. **Bloom journal.** Every Mope you cheer up is counted. Milestones mark each kind, and play earns bloom sets that change what the banks grow. At the end of a night you can share a postcard of the canal.
9. **Keep your defence.** Campaign and challenge nights have independent saves. On Relaxed and Standard, defeat offers a return to the last planning break with the exact towers, glow and light. Nightfall, scored challenges and free play retain their original loss rules.
10. **Replay.** Finish the 40-wave watch or continue into free play. Each new game rotates the map and offers battle plans after waves 10 and 20. Choose earned guardians before starting: Ember changes Cracker bursts, Reed gives Wicklings a weaker bouncing spark, and Tide gives Moonbells a stronger slow with slower tolls. Challenges use the default guardian. Older saves still continue into their original Harbour and Gardens chapters.

Accessibility and assists live in Settings: a colour-safe palette, larger text, a left-hand dock, and *Slow at the locks*. **Settings > Playtest data** summarises this device's play log against the iOS plan's validation goals and exports it as JSON. Nothing leaves the device unless you copy or save it.

New tower choices arrive before their wave: Wickling and Cracker at the start, Moonbell at 3, Glow Garden and Lamp Owl at 6, and Lighthouse at 7. On compact watches the board stays fixed; additional plots become available to buy after waves 5, 10, 15 and 20. Older saves and challenges retain their own tower timing and map rules. Newly launched daily/weekly challenges use Lantern Guard routing and support rules; previously saved challenges retain their original rules and IDs.

New games also offer levels 6 and 7 after waves 30 and 35. Each level 7 tower gains a final perk. Storm Reed arrives at wave 16, Dusk Ballista at wave 26. Buy optional oil, a net or a ward between waves once per five-wave interval. These activate automatically for the next wave and expire when it ends. Guardian records count cleared waves across games toward cosmetic frames, pennants and festival lanterns.

Garden levels 4–7 cost 180, 220, 140 and 120 glow in new games. Their panels compare the extra income with the price and remaining waves. Combat tower refinement prices remain 700, 1,250, 1,800 and 2,600 glow.

Keyboard: `1`–`8` keepers · `Q`/`E` flip locks · `Space` or `N` start or call a wave · `C` charms · `P` pause · `F` speed · `Esc` close.

## Project map

```
src/
  core/      math, spline paths, synthesised audio (WebAudio, no sound files)
  game/      deterministic simulation (no DOM): keepers, Mopes, waves, level, saves, tides
  render/    Canvas 2D art: background, Mopes (sprite-cached), keepers, blooms, effects, postcards
  ui/        DOM HUD, dock, sheets, overlays, sharing, icons (Phosphor)
  app.ts     game loop, input, coaching, persistence
scripts/     headless balance bots, the matrix and tide runners, self-tests
docs/        design notes, research data, balance results
```

The simulation runs at a fixed 60 Hz step, independent of rendering. That keeps it deterministic, lets bots play thousands of waves in seconds, and makes a native port straightforward.

## Research sources (selection)

- [Bloons TD 6 on the App Store](https://apps.apple.com/us/app/bloons-td-6/id1118115766): $6.99 plus IAP; 4.9 stars from about 348K ratings
- [MTG acquires Ninja Kiwi](https://www.mtg.com/press-releases/mtg-acquires-leading-tower-defense-gaming-studio-and-publisher-ninja-kiwi-the-maker-of-bloons/): margins and audience size
- [Sensor Tower: top TD revenue, Q3 2025](https://sensortower.com/blog/2025-q3-ios-top-5-tower%20defense%20games-revenue-us-6012932d241bc16eb85e0db8): the charts are led by war and gacha F2P games
- [GameDiscover: how Thronefall went minimal](https://newsletter.gamediscover.co/p/deep-dive-how-thronefall-went-minimal)
- [Quantic Foundry: the decline of strategy](https://quanticfoundry.com/2024/05/21/strategy-decline/): shorter planning horizons
- [mobilegamer.biz: Pixel Flow hits $100M](https://mobilegamer.biz/data-digest-pixel-flow-hits-100m-mays-top-games-neverness-to-everness-pokemon-go-more/): the sort-puzzle boom
- [AppMagic casual games, H1 2026](https://gamedevreports.substack.com/p/appmagic-mobile-casual-games-in-h1)
- [Bloons Wiki: Workshop map](https://www.bloonswiki.com/Workshop_(BTD6)): the only live-reroute feature in BTD6
- [Anomaly: Warzone Earth](https://en.wikipedia.org/wiki/Anomaly:_Warzone_Earth), [Conduct THIS!](https://apps.apple.com/us/app/conduct-this-train-action/id1151455384), [Railbound](https://en.wikipedia.org/wiki/Railbound), [Rail Route](https://store.steampowered.com/app/1124180/Rail_Route/): routing verbs proven on iPhone and PC
- [Doucet: optimizing TD for focus and thinking](https://www.gamedeveloper.com/design/optimizing-tower-defense-for-focus-and-thinking---defender-s-quest): soft counters, not lock-and-key
- [Steam: BTD6 veterans on the solved meta](https://steamcommunity.com/app/960090/discussions/0/560232608049426404/?l=english)
- [Pocket Gamer: Kingdom Rush 5 review](https://www.pocketgamer.com/kingdom-rush-5-alliance/review/)
- [Isle of Arrows on the App Store](https://apps.apple.com/us/app/isle-of-arrows-tower-defense/id1607942817): the reach limits of premium-only TD
- [BTD6 Trophy Store](https://bloons.fandom.com/wiki/Trophy_Store): skill-earned cosmetics
- [The audio of Unpacking](https://www.gamedeveloper.com/marketing/auditory-tales-from-the-making-of-zen-puzzler-unpacking): ASMR foley layering
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): 3.1.1 trial and unlock rules
