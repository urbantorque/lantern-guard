# Nightward: CrazyGames Basic Launch

The portal edition opens directly on the existing continuous 40-wave campaign. New profiles start with Sol on Standard at Millpond, the campaign's established map. The first plot opens a Spark preview immediately; the player still chooses where to build, pays the normal price and starts the first wave. A short footer explains automatic firing and permanent tower continuity. Keeper and difficulty choices remain in the campaign menu.

Existing campaigns restore exactly and wait paused for **Continue defence**. Defeat and victory saves reopen their reports. A damaged primary save uses the existing backup; if both are unreadable, onboarding does not overwrite them. Other save slots and the standalone/native menu entry are preserved.

This is the **Basic Launch** edition. It has no advertising, paid retries, purchases, third-party SDK, login or external analytics. Optional playtest logging remains consent-based and local. CrazyGames collects Basic Launch engagement metrics without an SDK. Full Launch ad integration and account-linked saves are later work, contingent on selection.

## Build and test

```sh
npm ci
npm run build:crazygames
npm run preview:crazygames
```

The preview runs at `http://127.0.0.1:4176/`. The ZIP is `release/crazygames/nightward-basic.zip`; `index.html` is at its root. Upload the ZIP, not the entire release folder. `dist-crazygames/` contains the extracted game only. Standard `npm run build` still creates the normal menu-led edition in `dist/`.

```sh
npm run qa:crazygames
npm run test:siege
npm run test:fixed-storage
npm run test:clarity
npm run test:portal-opening
```

The portal browser check starts its own loopback server and tests the production bundle under `/games/nightward/`, catching broken absolute asset paths. It uses temporary browser contexts, never the user's profile. Set `PLAYWRIGHT_PATH` and `EDGE_PATH` if the machine's browser/runtime differs from the defaults in the script. Twelve desktop, tablet and phone viewports are checked at device pixel ratio 1, including larger text at 320 px. It checks first placement, action visibility, upgrade choices, frozen save restoration, wave 8-to-9 continuity, free act retries, late forecasts and final/corrupt save preservation. It records external requests and failed resource loads.

The package script enforces a 20 MB total-size ceiling, 1,500-file ceiling and relative entry assets. It removes the unnecessary title-image preload in the portal edition. `build-manifest.json` records sizes, SHA-256 checksums and source revision. Rebuild after a code change; the ZIP is generated and excluded from Git.

## Submission assets

Copy-ready listing fields are in `release/crazygames/listing.json`.

| Asset | Dimensions | Source |
| --- | --- | --- |
| Landscape cover | 1920 × 1080 | Authored composition of existing game models |
| Portrait cover | 800 × 1200 | Same identity, recomposed for portrait |
| Square cover | 800 × 800 | Same identity, recomposed for square |
| Landscape preview | 1920 × 1080 | Silent Dredger encounter capture |
| Portrait preview | 1080 × 1620 | Silent Dredger encounter capture |

Covers contain only the game title, without platform logos, borders or promotional slogans. Videos begin on the matching cover and show real gameplay at the normal simulation tempo. They contain no audio track, cursor, promotional text or letterboxing.

With the development server running, `npm run qa:crazygames-media` verifies both exported videos and saves representative frames for inspection. After the full portal QA and media checks, `npm run check:crazygames-release` verifies the upload hash, cover dimensions and evidence, then writes the release validation reports. `readiness.json` keeps human/device testing and publisher submission explicitly separate from automated checks.

To regenerate, start `npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`, then run `npm run assets:crazygames`. `QA_URL` overrides that server address. The artwork generator uses the game's Canvas models directly; no external stock imagery is required. Five paid campaign snapshots live in `qa/fixtures/crazygames/`. Regenerate them with `npm run fixtures:crazygames` after changing campaign balance.

## Newcomer playtest before submission

Use eight fresh profiles: four tower-defence players and four newcomers. Start the portal build directly, without coaching. Ask permission before enabling local recording in Settings, then reload so the session includes the opening. Use `release/crazygames/newcomer-sessions.csv`; blank cells are intentionally unobserved results.

1. Record time to first useful tower and first wave, wrong taps and requests for help. Aim for at least seven of eight useful placements within 45 seconds.
2. Observe waves 1–8. Record where the player becomes unsure, quits or asks to restart. Check whether the first signature and pause control are understood.
3. At wave 9, ask what carried forward. Towers, upgrades, glow and light should be understood without explanation.
4. Return later and continue the same save. Ask whether the next objective is clear. Test an act retry after a loss; it remains free.
5. Ask separately for enjoyment, clarity and control ratings. Export the optional local event log and record observations alongside it.

Run a real Chrome/Edge browser pass and physical Android/iPhone browser sessions, including suspend/resume, audio reactivation, touch input and sustained late-wave performance. Emulated viewports do not prove hardware performance. Do not claim device support or human retention from the automated report alone.

## Portal submission and decisions

The developer account owner still needs to complete the CrazyGames account/billing details, upload the ZIP, covers and previews, paste the listing, select actually verified devices, review the current terms and submit for publisher QA. This preparation does not register an account, accept publishing terms or publish the game.

Use non-exclusive distribution initially. The public GitHub Pages edition remains available. Do not select an exclusive arrangement while another public browser version remains live without resolving that conflict.

Basic Launch runs 7–21 days. The usual endpoint is at least seven days and 500 plays; otherwise the period ends at 21 days. Ads remain disabled. Review average session time, conversion beyond one minute and next-day return. The publisher gives 10+ minutes, 80%+ conversion and 10–15% next-day retention as examples of strong performance, not guaranteed acceptance gates. No Nightward values are claimed before real data arrives.

If selected for Full Launch, add SDK gameplay events, robust ad pause/mute/error recovery and account-linked saves. Trial natural breaks after act bosses, preserving the full defence. Keep existing retries free. Measure actual net revenue per 1,000 sessions before forecasting A$200/month.

## Requirements checked

- [Basic Launch process](https://docs.crazygames.com/)
- [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- [Gameplay and portal viewport requirements](https://docs.crazygames.com/requirements/gameplay/)
- [Cover and preview specifications](https://docs.crazygames.com/requirements/game-covers/)
- [Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)

Reviewed 16 October 2026. Confirm the developer portal's current fields during upload.
