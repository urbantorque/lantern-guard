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

The preview runs at `http://127.0.0.1:4176/`. The ZIP is `release/crazygames/nightward-basic.zip`; `index.html` is at its root. The current portal upload area accepts the extracted game files: drag the contents of `dist-crazygames/` into it, preserving the `assets/` folder. Do not upload the entire release folder or the listing media as game files. The ZIP remains the verified archive of those same files. Standard `npm run build` still creates the normal menu-led edition in `dist/`.

```sh
npm run qa:crazygames
npm run test:siege
npm run test:fixed-storage
npm run test:clarity
npm run test:portal-opening
```

The portal browser check starts its own loopback server and tests the production bundle under `/games/nightward/`, catching broken absolute asset paths. It uses temporary browser contexts, never the user's profile. Set `PLAYWRIGHT_PATH` and `EDGE_PATH` if the machine's browser/runtime differs from the defaults in the script. Twelve desktop, tablet and phone viewports are checked at device pixel ratio 1, including larger text at 320 px. It checks first placement, action visibility, upgrade choices, frozen save restoration, wave 8-to-9 continuity, free act retries, late forecasts and final/corrupt save preservation. It records external requests and failed resource loads.

The package script enforces a 20 MB total-size ceiling, 1,500-file ceiling and relative entry assets. It removes the unnecessary title-image preload in the portal edition. `build-manifest.json` records sizes, SHA-256 checksums and source revision. Rebuild after a code change; the ZIP is generated and excluded from Git.

Both production editions include `THIRD-PARTY-NOTICES.txt`, generated from the installed DM Sans, Phosphor Icons and Capacitor packages. It preserves their full copyright and licence notices. The release check requires this file in the upload ZIP.

## Submission assets

Copy-ready listing fields are in `release/crazygames/listing.json`.

| Asset | Dimensions | Source |
| --- | --- | --- |
| Landscape cover | 1920 × 1080 | Authored composition of existing game models |
| Portrait cover | 800 × 1200 | Same identity, recomposed for portrait |
| Square cover | 800 × 800 | Same identity, recomposed for square |
| Landscape preview | 1920 × 1080, H.264 MP4 | Silent Dredger encounter capture |
| Portrait preview | 1080 × 1620, H.264 MP4 | Silent Dredger encounter capture |

Covers contain only the game title, without platform logos, borders or promotional slogans. Videos begin on the matching cover and show real gameplay at the normal simulation tempo. They contain no audio track, cursor, promotional text or letterboxing.

The live submission form accepts **MP4 or MOV**, so upload the `.mp4` previews. The `.webm` files are source captures. Set `FFMPEG_PATH` to a local FFmpeg executable with `libx264`, then run `node scripts/crazygames-mp4.mjs` to convert both captures, replace the opening cover frame and verify full decoding, dimensions, duration and silence. `--verify-only` checks existing MP4s without encoding. The default executable path is the local `imageio-ffmpeg` install under ignored `artifacts/crazygames/encoder/`. Title placement clears the different badge overlays shown by the portal's landscape, portrait and square crop tools.

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

The public developer credit is **Urban Torque**. The account owner uploaded the verified build and confirmed that the hosted preview loads, accepts tower placement and starts wave 1 in their usual browser. That is a user-reported hosted smoke test; the in-app browser's game-file host was blocked by Cloudflare. The automated local checks remain separate evidence. No mobile support claim is selected.

The listing, all three covers and both MP4 previews are saved in the existing draft. The final page is **Finalize submission**. It requires the Developer Portal terms acceptance and a PEGI 12 suitability declaration; the portal also reports that billing details are incomplete or unavailable. No final submission has been made. The owner must complete billing onboarding and review these declarations before **Submit for approval**.

For assisted submission, the owner signs in at https://developer.crazygames.com/login (or uses **Join now**), completes verification and any account terms in the browser, and leaves the dashboard open. The assistant can then upload the prepared files, enter listing fields and run the portal preview. Passwords and verification codes should stay in the browser.

If the portal requires billing onboarding, the owner completes **Account → Billing**, including their actual individual/company details and any tax declarations. CrazyGames' [billing documentation](https://docs.crazygames.com/payouts/) allows **Hold payments** in step 2 to finish onboarding without adding bank/payment details yet. This defers payouts. Do not invent identity, tax or payment information.

Any publishing agreement or rights declaration is shown to the owner for review at the point it appears. The eight-session newcomer study above is our recommended product check, not a CrazyGames account-registration requirement. Physical device checks remain necessary before claiming verified mobile support; a desktop-only initial submission avoids making an unverified mobile claim.

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
