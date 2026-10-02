# Living Watch release

The eight approved priorities are delivered through the `livingWatch: 1` rules boundary. New campaigns, expeditions and weekly watches use it. Historical campaigns and expeditions retain their timings, geometry and technique rules when resumed.

## Gameplay and decisions

1. **Wave rhythm and difficulty.** Authored recovery, escort, close-crowd, runner and overlapping-inlet formations preserve the first armour/visibility lessons and existing boss encounters. Timing and composition create pressure without a global enemy-health increase. The paid-build matrix compares mixed, greedy, no-garden and spark-heavy strategies across all heroes and maps, plus every expedition technique pair.
2. **Combat presentation.** Creature bodies gain directional material shading, shell edges and local burning feedback. Tower branches add distinct weapon architecture: long spark barrels, control gongs, solar scout wings, heavy storm capacitors, harvest terraces and siege supports. A short charge glow precedes shots. Earned trim changes tower bases without changing stats.
3. **Mobile interaction.** Branch cards show the immediate benefit, opportunity cost and purchase price. Exact figures sit under Compare numbers. Portrait and short-landscape sheets keep both purchase buttons visible and at least 44 pixels high. Phone canvases cap pixel density at 1.6 to reduce fill cost. Landscape framing follows water and usable plots instead of reserving empty roof space everywhere.
4. **Coordinated encounters.** An armoured crab or Mirror Snail ahead of a Bloom Jelly grants local, non-stacking cover against light hits. Heavy damage bypasses cover; breaking the shell removes it. Mossjaw gives a two-second escort warning. A stunning chime toll can interrupt the Thorn Matriarch's healing warning. The Dredger and Warden keep their positional/escort counterplay.
5. **Hero techniques.** Sol chooses spreading half-strength burns or consuming stored burn damage through heavy hits. Mira chooses repeated freezing tolls or a fourth-toll push against already slowed ordinary enemies. Ivo chooses wider lightning chains or a doubled first hit every third volley. Existing first-round economic and placement choices remain. There are still only two technique choices per run.
6. **Waterway identity and night.** Three revised canal geometries separate harbour, crossing and basin coverage. Moon spring reveals for half of each night pulse cycle; Storm garden has a larger night bonus; Sun terrace improves daytime harvests but reduces night income; Tide bell's stronger night slow rewards overlapping heavy coverage. Forecast and landmark descriptions state the actual effects.
7. **Soundtrack.** String voices, answering hero motifs, softer phrase accents, space during dense combat and win/loss codas develop the existing original score. Night and boss changes remain aligned to bar boundaries. An offline renderer exercises the real Web Audio graph without playing sound. Background suspension and session mute remain enforced.
8. **Return and mastery.** Weekly watches rotate deterministic seeds, waterways and three single-rule constraints. Past weeks remain available with separate per-hero personal bests. Four persistent mastery accomplishments award pearl trim, engraved plinths, star lanterns and district pennants. Result feedback points to a counter for the main leaked enemy and the next unearned goal. Rewards never raise combat power.

## Validation and limits

The associated reports live under `artifacts/living-qa/`, `artifacts/living-watch-balance.json` and `artifacts/living-weekly-probe.json`. Automated reference builds are evidence of viable strategies and regression safety, not evidence of human enjoyment or retention.

- `npm run check`: the complete regression chain passed. Final targeted `test:living` checks also cover warning-state saves, Capacitor volleys, interrupted healing, actual sunlight use, forecast accuracy and idempotent reward persistence.
- `npm run build`: TypeScript and the production bundle passed.
- `npm run balance:living`: 105 of 111 paid reference runs won. Mixed campaigns won on all 12 hero/map combinations; no-Garden builds also won 12/12. Greedy and spark-heavy builds each won 10/12. All 36 expedition/hero/technique-pair combinations won.
- Weekly reference builds won 25/27. Weeks 7 (Sol) and 8 (Mira) need an earlier defence investment: no-Garden builds won all three tested technique pairs for each. The weekly probe records both winning and losing approaches.
- Muted browser checks passed at 1280×800, 390×844, 320×740 and 844×390. Both branch purchase buttons fit and retain 44-pixel height; no horizontal overflow or browser errors occurred.
- A separate 48-case layout pass checked every hero/tower combination in 320-pixel portrait and short landscape. Both branch purchases fit inside the drawer without scrolling in every case. The compiled bundle also passed weekly launch, purchase, continuous combat, autosave and reload in a fresh 390-pixel browser profile.
- Real 48-second offline audio renders for all three heroes were non-silent and unclipped. Peak amplitudes were 0.52–0.57.
- Desktop canvas draw checks: 11 towers and 7 enemies took 1.4 ms median / 6.5 ms p95. A 67-enemy pressure scene took 5.6 ms median / 15.9 ms p95. These measure rendering only, not full frame time or phone performance.

The browser scripts accept `PLAYWRIGHT_PATH` and `EDGE_PATH` for other machines. Start Vite before running `living-browser-qa.mjs` or `living-visual-qa.mjs`. After publishing, `living-production-qa.mjs` checks the source commit, weekly launch, continuous combat, branch purchase and saved-game reload in a fresh, silent browser profile. Set `EXPECTED_COMMIT` to the release SHA; its output goes to ignored `dist-artifact/`.

Browser checks use isolated muted desktop/phone viewports. They do not represent physical-device testing. Audio renders can establish a non-silent, unclipped signal, but no audible listening session or uncoached human playtest is claimed.

For a physical-phone pass, play the opening, first dusk and one specialisation without explanation. Check tap accuracy and whether the player can state a branch's benefit and trade-off. Listen to a complete expedition through the phone speaker at low volume, particularly the night transition and repeated attack sounds. Keep those observations separate from automated results.
