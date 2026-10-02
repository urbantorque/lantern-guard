# Canal bestiary release

## Implemented scope

The enemy roster has been redrawn as fifteen independent canvas creatures. Identity comes from silhouette, anatomy and movement rather than changing the same face or colour. Shell damage removes crab/snail plating; hidden creatures retain a broken outline; slowing and stun markers remain local to the affected unit. Material-specific defeat sounds share a twelve-per-second cap. The existing restrained reward effects remain in place.

The five approved improvements are included:

1. **Combat craft and music.** Distinct animated creatures, material-led defeat sounds, four waterway arrangements and additional marimba/reed/brushed-percussion voices. The original musical form still changes at bar boundaries and keeps its second-pass variation. The note scheduler allows at most eight simultaneous score events.
2. **Readable strategy.** Short counters in the creature guide; Bond predictions before building; a dashed night-range preview; contextual armour/visibility feedback; four dismissible early lessons; observed damage/reveal/leak information after a run.
3. **Bounded hero choices.** Two selections per run, with four possible combinations per hero. Campaign choices open at waves 6/16, expedition choices at 4/8. They stay available without pausing or a decision timer. Changing to the other choice in a completed round is rejected.
4. **The Dredger.** Replaces the Sunforge finale for new watches. Its shell opens within 125 world units of each marked bend centre. Closed damage multiplier 0.6; exposed multiplier 1.4. No immunity phase or lane manipulation. Exposure derives from path position, so saves preserve it exactly and slows extend the window naturally.
5. **Named restoration.** Night Market, Canal Observatory and Waterfront Gardens have alternative campaign/expedition unlocks and two appearance choices each. Styles change existing decorative buildings, not combat stats or buildable space. Unlocks derive from existing records; replays cannot stack power.

New campaigns and expeditions opt into `watchCraft: 1`. The visual roster applies immediately to fixed-edition games; existing saves keep their mechanical rules. Enemy IDs remain stable so journals and save references migrate without remapping.

## Validation

- Full pre-existing `npm run check` chain passed: save/integrity tests, fixed routes, live upgrades, 96 paid fixed-build runs, 72 hero campaigns, continuous tempo, collision, rendering behaviour, audio scheduling and watch-depth systems.
- New `test:watch-craft` exercises all twelve hero-choice combinations, exact mid-wave resume, invalid choice order/hero rejection, old-save compatibility, actual daylight harvest multipliers, night damage, neighbour-dependent firing, both Chime branches, read-only Bond prediction, district unlocks and cosmetic validation.
- Fifteen rendering traces have finite coordinates, balanced canvas save/restore, distinct geometry and stable reduced-motion output. Each normal animation changes with time.
- All 48 new paid-build reference runs won: 36 expeditions and 12 campaigns covering all heroes and choice pairs. The report is `artifacts/watch-craft-balance.json`. This proves viable routes through the content, not that all strategies are equally strong. Campaign light remaining ranged from 13 to 25.
- A Dredger encounter probe confirmed the reference defence reaches an exposed window; roughly a quarter of its damage landed while the core was open. The boss is vulnerable outside those windows too.
- Browser inspection used a silent background tab at 1280×720, 390×844 and 320×740. Verified live technique selection, both choice buttons visible on the smallest viewport, no horizontal page overflow, running combat behind inspectors, creature guide and district display. The boss strip moved above the action to avoid build plots. No browser console errors appeared during those checks.

Browser testing remained muted as requested. Audio timing, voice limits, background suspension and mute behaviour were tested through the Web Audio harness; the new mix was not audibly auditioned. Phone viewport checks are browser emulation, not physical-device testing.

## Focused human playtest

Run these before another balance expansion. Record observations rather than explaining the answers to the player.

1. On a physical phone, ask a new player to build, specialise and recognise three enemy types without opening the guide. Record mis-taps and types confused by silhouette.
2. At the first dusk, ask which tower loses reach and how to shelter it. Note whether the preview and short tip make the response apparent.
3. At a technique choice, ask the player to state its upside and cost. If they cannot do so in ten seconds, revise the card rather than adding tutorial text.
4. In Sunforge, ask where they would add damage against the Dredger. Measure whether the marked bends change placement or slowing decisions.
5. After a watch, ask which restoration they want next and why. Then play one expedition with music enabled at low phone volume. Listen for fatigue, masking of hit cues, and obvious loop repetition.

Do not claim these human sessions were completed by the automated checks above.
