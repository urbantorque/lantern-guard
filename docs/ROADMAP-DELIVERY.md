# Roadmap delivery

## Board clarity

- Keeper names are readable in the phone tray.
- Active channels have clearer current direction and closed channels are quieter.
- Tower inspection uses the existing dock footprint. Selecting a keeper keeps the board in place and leaves the locks visible.
- The main sheet shows the two upgrade choices with numerical benefits. Manage opens targeting and selling.
- Range-increasing upgrades show a prospective range ring on hover or keyboard focus.
- Planning flips explain the chosen route, including double glow and double escape damage.
- The first build prompt is brief. Existing contextual coaching and the Guide remain available.
- Narrow-screen and larger-text spacing were checked, including 320-pixel portrait and phone landscape.

## Save and mobile foundation

The save and lifecycle work, native project, bundled assets, haptics and audio handling are documented in [IOS-BUILD.md](IOS-BUILD.md). Native compilation and physical iPhone validation remain outstanding.

## Reedbank Reach (superseded in the title menu)

A selectable second 25-wave waterway with offset locks, a longer inlet and different central-bank coverage. It keeps all six original keepers, upgrade paths, enemy introductions, reward budgets, boss schedule and gate mechanics. Inlet allocations vary in the second half of the night.

The subsequent [growing-canal revision](GROWING-CANAL.md) removes map selection. New nights expand Wickwater in stages. Reedbank remains supported for legacy saves and regression tests. The cosmetic is now earned by completing a growing-canal night; previously earned blooms and medals are preserved.

Balanced, heavy and long-range beam builds won Standard on both tested seeds. The slow-reaction build also won both. Permanent rich-route parking and an early three-garden investment failed. See [the full balance report](REEDBANK-BALANCE.md).

## Verification

- 75 original simulation checks.
- 11 release checks covering corrupt saves, quota failures, unavailable storage, migration, atomic flowers/checkpoint recovery, map validity, exact resume, and progress rewards.
- 15 Wickwater replay comparisons: five builds across all three modes match the restored original snapshot hashes and outcomes exactly.
- 48 Reedbank balance runs across eight strategies, three modes and two seeds.
- Browser checks: build and upgrade at 320 and 375 pixels, larger text, Manage, keyboard inspection, landscape, new-map selection, final-wave reload returning paused, natural victory, cosmetic unlock and equip.
- A development browser benchmark of 300 frames on a busy Reedbank wave measured 2.1 ms median and 3.0 ms p95 frame work, with 27 Mopes present at peak. It measures simulation and canvas work on this Windows host, not iPhone performance or the browser compositor.
- Production build and `cap sync ios` pass. The Xcode project parses and includes its privacy resource. Dependency audit reports zero known vulnerabilities at the time of this check.

## Original-game protection

The original tower definitions, wave definitions and Wickwater geometry are unchanged. The original pre-roadmap source backup is `.recovery/original-before-roadmap.zip`; earlier rollback recovery files remain in `.recovery/`. The recorded original replay fixtures are `scripts/fixtures/wickwater-original.json` and must not be regenerated to make a failing comparison pass.
