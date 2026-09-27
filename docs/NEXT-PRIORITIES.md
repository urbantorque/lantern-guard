# Next three refinement priorities

Status: the approved follow-on roadmap is now implemented: guided placement and factual loss feedback, separate campaign/challenge saves, planning retries, eight Harbour waves with the existing defence, an optional Ember guardian, and current-rule challenges. See [journey implementation and evidence](JOURNEY.md). Observed newcomer/retention testing and physical iPhone validation remain outstanding. The recommendations below preserve the original acceptance targets.

## 1. Make the board clear and make routing earn its place

The highest priority is whether a first-time player understands placement, routes and incoming threats, and whether changing a route creates an interesting decision. The growing canal and role descriptions reduce the initial choices, but the player's feedback about understanding the board and repetitive switching still needs validation with new players. The detailed recommendation is in [Positioning and routing](POSITIONING-AND-ROUTING.md).

Next work:

- Teach placing a Wickling and seeing the water it covers through short demonstrations on the real board. Introduce routing only after the player sees enemies crossing that coverage. Keep prompts dismissible and teach one action at a time.
- Prototype choosing a default route during the existing between-wave planning break, keeping occasional live overrides. Show the full path and which built towers cover it. Compare this with the current switches and with a version that has fixed routes before committing to a redesign.
- Make route value depend on the player's placements and upgrades. Test whether bridge/mill effects and the short-route reward/escape rules overwhelm that choice; simplify them if they keep prescribing one answer per enemy type.
- When previewing a tower, distinguish the water it covers from water outside its range. Keep the cost, role and placement confirmation together.
- Make each expansion easy to follow: show where the new entrance feeds the existing defence, highlight the new pads briefly, and keep the existing towers visibly anchored.
- Explain hidden enemies and armour when they first appear, using the available counter and route on the player's current board.

Acceptance target: in a small observed playtest, at least 8 of 10 first-time players can place a tower and explain where enemies are heading without verbal assistance. Retain interactive routing only if players can explain a build-dependent reason to use it and prefer playing with it. Check the smallest supported phone, larger text and sound off. These are product targets, not measured results.

Apple's [game design guidance](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) supports teaching mechanics in a playable context and adapting the interface to small touch screens.

## 2. Reward creative tower builds across the full 25-wave journey

The latest [36-run balance matrix](GROWING-CANAL-BALANCE.jsonl) shows a forgiving Standard opening: every tested strategy cleared the first five waves without losing light. Later viability is narrower. Balanced routing, slow reactions and long-range beams won both Standard seeds, while heavy hitters, no routing and three early gardens failed. All 12 primary Nightfall runs lost; the [eight focused follow-ups](GROWING-CANAL-NIGHTFALL.json) produced one win. These are scripted strategy comparisons, not human win rates.

Next work:

- Inspect waves 8–10 and the final boss first. Separate losses caused by unclear information from losses caused by poor spending or placement.
- Give advance, concise notice of the boss's split and the need to cover both lower branches, with a useful planning opportunity.
- Make existing combinations visible: Moonbell gives Cracker more time to hit groups; Lamp Owl lets nearby damage towers attack hidden enemies. Explain the benefit at selection and show it in combat. Keep any numerical claim tied to the actual simulation.
- Tune wave composition, upgrade value and resource timing where tests expose a narrow required build. Keep deliberate spending, coverage and upgrade choices consequential. Recheck difficulty after any routing experiment so removing repetitive input does not also remove the challenge.
- Make growing the same defence rewarding: give each expansion a brief completion moment and show the next existing bloom milestone after a wave or on the end screen. Use the current journal and cosmetic rewards.
- Give returning players a clear existing challenge or mastery goal, such as a different tower combination or a journal milestone. Measure whether they voluntarily start or resume another session before adding permanent power upgrades or character selection.

Acceptance target: several distinct, documented Standard strategies can complete the night; at least two reproducible Nightfall strategies can beat the normal game seed. Human testers should be able to describe what caused a loss and what they would change. Keep the original-save regression fixtures unchanged.

## 3. Prove the game works as an iPhone app

The browser build, native asset sync and save tests pass. The Xcode project has not yet been compiled, signed or played on a physical iPhone. That is the largest remaining gap between the current game and a credible iOS beta.

Next work:

- Build and sign the existing Capacitor project on a Mac; run it on a small iPhone and a newer device with a home indicator.
- Verify touch selection, safe areas, larger text, haptics, audio interruptions, offline launch, backgrounding and force-quit recovery, including both expansion boundaries.
- Profile busy waves and a complete session for frame pacing, memory and heat. Desktop canvas timings are not evidence of iPhone performance.
- Distribute a TestFlight build to a small group and review screenshots, crash reports, early exits, repeat sessions and resumed nights before adding more systems. TestFlight supports [screenshot and crash feedback](https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-tester-feedback/).

Acceptance target: a reproducible signed build; the [device checklist](IOS-BUILD.md) passes on the chosen minimum device; uninterrupted and resumed nights reach the same outcome; and real testers complete a session and can return to their defence reliably.

Next gate: observe first-time players and returning sessions on the implemented build, then complete the physical iPhone checklist before expanding the roster further. Ember Keeper is the single optional guardian experiment; there is no permanent power progression tree.
