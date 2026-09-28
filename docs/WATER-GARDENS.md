# Water Gardens and settlement progression

Implemented 28 September 2026.

## What changed

1. **A settlement that remembers the defence.** Hold wave 5 to light the homes, wave 11 to repair the footbridge and bring neighbours back, wave 33 to reopen the harbour with lantern boats, and wave 39 to restore garden lilies. These are permanent profile decorations with a next-reward preview in Collection. Existing recorded accomplishments migrate automatically. There is no new currency or management screen.
2. **One optional mastery goal.** After early onboarding, planning shows the next unearned goal. Crowned immediately unlocks Ember Keeper; Full Bloom unlocks Reed Keeper; Early Bird adds village bunting. Unlocks persist through retries and resumes. Combat progress is credited during autosaves, upgrades immediately, and all milestones at wave/result boundaries. Challenges cannot award campaign mastery.
3. **Guardians work with a continuous defence.** At completed chapters, an optional disclosure offers unlocked guardians, explains the tradeoff and counts affected existing towers. Changes save immediately. Costs, tower identities, upgrades and glow remain intact. Reed sparks lose 25% base damage and can hit one additional visible enemy within 110 world units. A spark cannot bounce repeatedly or hit the same enemy twice. Lantern remains the default; challenges keep their authored rules.
4. **Water Gardens, waves 34–39.** Two upstream approaches converge above the existing Harbour. Four new pads reward entrance coverage and support/splash at the merge. Wave 34 uses familiar enemies; wave 35 introduces Reedlings, which grow one shell at the merge; wave 39 introduces Bloomheart, which signals two three-second healing pulses for nearby ordinary enemies. It never heals itself. Every earlier tower remains in place and protects the downstream route.
5. **Readable feedback.** Whole map shows all districts and lets the player tap into a district. Wave previews label the garden approaches correctly. Lock inspection brings its route into view. Slow/splash combinations have restrained visual feedback; wave highlights report measured hits or damage. Specialised towers gain broad path pennants. Bloomheart has a range ring, countdown and persistent status text, independent of audio.

## Save compatibility

- Existing v1/v2 saves remain supported. New fields are optional and validated.
- Water Gardens is opt-in from a Harbour victory (`gardens: 1`). Existing Harbour encounters and free-play runs retain their rules.
- Original segments and pads 0–21 keep their identities. New pads are 22–25.
- Mid-wave state preserves boss countdowns, Reed projectile bounce state and wave reports.
- Chapter results count separately; opening or restoring a completed chapter does not re-award its victory.
- Guardian changes clear finished-wave projectiles/fire, preventing the prior ability from leaking into the next chapter.
- The new report keeps only pending waves plus the most recently cleared wave.

## Verification

- `npm run check`: simulation, release/save recovery, growing canal, Guard, journey, refinement, Gardens and original integrity suites pass.
- Seven Gardens test groups cover continuous expansion, exact resumes, boss phases, one-time Reedling armour, the actual Reed damage tradeoff, bounce limits, factual combo reports, immediate/idempotent unlocks, migration and malformed saves.
- All 15 original Wickwater runs still match their original snapshots and outcomes exactly.
- `npm run ios:sync`: production build and Capacitor asset/plugin synchronization pass.
- Muted browser checks at 390 × 844 cover saved chapter continuation, guardian switching, correct approach labels, the overview, new-pad building and the silent boss warning. Prior browser test data is restored afterwards.
- A representative Water Gardens wave rendered 300 frames with 153 enemies at peak: median frame work 4.10 ms, p95 6.30 ms in the desktop in-app browser. This measures simulation/render work, not physical iPhone performance or end-to-end input latency.

## Balance observations

Run `npm run balance:gardens`; detailed deterministic results are in `GARDENS-BALANCE.json`. These are strategy probes using seed 7, not player win rates.

| Mode | Openings tested | Reached Gardens | Cleared Gardens | Cleared without more spending |
| --- | ---: | ---: | ---: | ---: |
| Standard | 9 | 9 | 8 | 0/9 |
| Nightfall | 9 | 5 | 2 | 0/5 |

The probes use balanced, heavy-hitter and beam-focused preferences under Lantern, Ember and Reed. Standard crowd/support builds clear the chapter; the Lantern beam-focused build loses at the final boss. The new district rewards continued investment: every frozen defence loses. Nightfall remains demanding, with successful heavy-hitter builds under Lantern and Reed. A first pass with a 35% Reed penalty was too punitive; the final 25% penalty retains a single-target cost while preserving a viable Nightfall route.

Physical iPhone touch/performance testing and observed first-time-player learning remain release gates. No App Store build, signing or TestFlight upload was performed on Windows.
