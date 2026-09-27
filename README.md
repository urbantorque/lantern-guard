# Lanternlocks

A cozy puzzle-defence prototype for phones. Flip the canal locks, sort the grumpy Mopes, and keep the Great Lantern lit.

A browser game with a Capacitor iOS project, designed portrait-first for iPhone. It also plays on desktop.

New nights use one growing canal: Lantern bend first, the upper canal before wave 6, then the west inlet before wave 11. Existing towers and upgrades stay in place. The title has one Play/Continue action, and the tower tray explains each keeper's role. See [the growing canal and verification](docs/GROWING-CANAL.md) and [the native build handoff](docs/IOS-BUILD.md). Legacy saves retain their original map and rules.

- Design, niche, twist, monetisation and the iOS plan: [docs/DESIGN.md](docs/DESIGN.md)
- Research: [docs/research.json](docs/research.json) (raw findings with sources)
- Balance results: [docs/balance-matrix.txt](docs/balance-matrix.txt) (full nights) and [docs/tides-matrix.txt](docs/tides-matrix.txt) (daily tides and weekly nights)
- Path to the App Store: [docs/IOS-PLAN.md](docs/IOS-PLAN.md)
- Next three refinement priorities: [docs/NEXT-PRIORITIES.md](docs/NEXT-PRIORITIES.md)
- Proposed title and routing direction: [docs/POSITIONING-AND-ROUTING.md](docs/POSITIONING-AND-ROUTING.md)

## Run it

Requires Node 22+ (the iOS tooling requires it).

```bash
npm install
npm run dev
```

Open http://localhost:5173/. To try it on a phone, open the "Network" URL that Vite prints (for example `http://192.168.x.x:5173/`) while both devices are on the same Wi-Fi. Then use "Add to Home Screen" for a full-screen view.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Typechecks, then builds a static site into `dist/` (including bundled fonts, works from any static host) |
| `npm run preview` | Serves the production build |
| `npm run sim` | Runs the headless balance matrix: 13 bot strategies × 3 modes |
| `npm run tides` | Runs 7 bots through 28 daily tides and the weekly rotation (`npm run tides -- 60` for more days) |
| `npm run typecheck` | Runs TypeScript over the game and the scripts |
| `npm run check` | Typecheck, original simulation/release checks, growing-canal transitions and saves, and 15 original replay comparisons |
| `npm run balance:growth` | 36 growing-canal nights across 6 strategies, 3 modes and 2 seeds |
| `npm run balance:reedbank` | 48 nights across 8 strategies, 3 modes and 2 seeds |
| `npm run ios:sync` | Build and copy the offline game into the Xcode project |
| `npm run ios:open` | Open the project in Xcode on a Mac |
| `npm test` | Simulation self-tests (saves, victory rules, routing, tides, tidal locks, journal counts): 75 checks |

## How to play

1. **Build.** Tap a stone pad, then tap a keeper twice (preview, then build). With a mouse, one click builds. You can also tap a keeper first and then a glowing pad.
2. **Steer.** Tap a lock gate on the map, or its button at the bottom of the screen, to send Mopes down the other channel. The button shows the next Mopes heading for that lock.
   - Long loops are safe.
   - Short runs pay **double glow** and escapees cost **double light**. They also have a trick. The **Lantern bridge** reveals hidden Veils; the **Mill wheel** cracks shells.
3. **Sort by colour and shape.** Each keeper works ×1.5 on Mopes that wear its colour and symbol: flame, burst, snowflake, eye or sparkle.
4. **Charms.** From wave 8 in a new night, the Charms button (or pressing and holding a lock) makes a lock always send one kind of Mope the same way.
5. **Upgrade.** Tap a keeper. It has two paths: one can reach tier 3, the other stops at tier 1. **Manage** opens targeting and selling; the main panel shows upgrades and numerical benefits.
6. **Pause any time** to plan. Nightfall allows building while paused, but locks only flip while time runs. Call waves early for bonus glow. The game autosaves, even mid-wave.
7. **Tides.** After your first night, Collection offers a daily tide (waves 15 to 25 of a seeded remix, built from a 4,700-glow bank) and a weekly night (the whole canal under one rule). Everyone gets the same ones; results can be shared as text.
8. **Bloom journal.** Every Mope you cheer up is counted. Milestones mark each kind, and play earns bloom sets that change what the banks grow. At the end of a night you can share a postcard of the canal.

Accessibility and assists live in Settings: a colour-safe palette, larger text, a left-hand dock, and *Slow at the locks*. **Settings > Playtest data** summarises this device's play log against the iOS plan's validation goals and exports it as JSON. Nothing leaves the device unless you copy or save it.

New tower choices arrive before their wave: Wickling and Cracker at the start, Moonbell at 3, Glow Garden at 4, Lamp Owl at 6, and Lighthouse at 7. Map expansions wait until every active wave clears. Even with auto-start on, press Start yourself after an expansion so you have time to build.

Keyboard: `1`–`6` keepers · `Q`/`E` flip locks · `Space` or `N` start or call a wave · `C` charms · `P` pause · `F` speed · `Esc` close.

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
