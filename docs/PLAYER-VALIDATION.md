# Nightward: player and device validation

This protocol covers the evidence that implementation and automated checks cannot supply. No observed-player scores, retention rates, sales forecasts or physical iPhone performance are claimed by this release.

## Newcomers: eight observed sessions

Use four players who know tower defence and four who do not. Start with a clean profile and the continuous 40-wave campaign on Standard. Let players choose their keeper. Observe the first eight-wave act and its transition to wave 9 without coaching. Ask the player to think aloud only when it does not interrupt an action. Enable optional local recording with their agreement; export it after the session. The recording remains on the device until manually exported.

Record time to first purchase, unsuccessful taps, first understanding of overlapping damage/control, command banking and release, time spent browsing, leaks, restart decisions and the player's interpretation of the restored market. Separate active combat from reading and planning. A test observer can record finger occlusion and confusion that event logs cannot show.

Provisional release gates, not industry benchmarks:

- At least seven of eight place a useful first tower within 45 seconds without help.
- At least six explain why control and damage should share water, and can intentionally bank and release their keeper's command.
- At least six finish the opening act within ten minutes, including planning. At least seven understand that their towers, remaining light and resources continue into wave 9.
- Every player can find the act retry after a loss and resume after returning from the home screen. They should be able to predict which purchases a retry will rewind. No player mistakes short practice for permanent progress.
- Ask enjoyment, control and clarity independently on a ten-point scale. Investigate any repeated score below seven by watching the interaction that caused it.

## Returning players: six observed sessions

Use two players per keeper. Continue their own saved defence through Moon Gates and The Broken Waterway, then observe the final act. Let players choose their signature; offer the alternative on a later fresh run. Do not hand them the automated reference builds. Include at least one campaign completed across several sittings.

Check whether players can describe a real reason to change placement, targeting or investment between crowded and spaced fleets. Ask them to predict the route change before choosing a passage. Observe whether a Crown feels earned and visibly different, whether a held tower's opportunity cost is understood, and whether they deliberately interrupt a boss or break its tether.

For Ivo, compare direct marking and the target list. Include a target leaving range. A stale choice should be understood as waiting for another selection. Measure mistaken releases separately from missed taps.

After a defeat, ask the player to describe the cause and name one concrete adjustment before opening the breach report. Retry the current act from its saved defence. Check whether the rewind feels fair and whether the player understands the retained earlier acts. The optional one-wave practice remains useful for testing a specific adjustment.

Track first Crown timing, useful purchases after wave 32, disengagement during cleanup and whether pressure feels cumulative across the five acts. Ask players to identify an early tower that remained useful at the end. Observe whether restoration milestones are noticed without opening another screen.

## Physical iPhone pass

Run a production iOS build on an iPhone SE class device and a current notched iPhone. Browser viewport emulation is not a substitute for these checks.

1. Play the full continuous campaign, including at least 20 uninterrupted minutes and a suspend/resume in another sitting. Record sustained frame time, thermal behaviour, battery use and memory. Aim for 60 fps on the current device and stable 30 fps or better on the older device; investigate prolonged stalls rather than averaging them away.
2. Check portrait and landscape, safe areas, home indicator, 44-point actions, larger text and the target list with an actual finger. Ensure the board remains usable when controls expand.
3. Background during a boss channel, force-close between waves, relaunch, interrupt with an incoming call, then resume. Compare light, glow, selected passage and held command with the saved state.
4. Check speakers, headphones, silent mode, music/effect switches and app backgrounding. Listen for fatigue over a full watch, drowned-out boss signals and harsh repeated high frequencies.
5. Test reduced motion and the distinct palette. Verify that timing information, armour, visibility and boss intent remain understandable without animation or colour alone.
6. Test offline launch, local recording export and nearly full storage. Existing storage integrity tests protect saves, but the native export and file picker still need device observation.

## Score targets and the evidence needed

| Criterion | Target | Evidence required |
| --- | --- | --- |
| Core loop | 9 | Players willingly start another mission and describe an achievable next goal |
| Agency | 9.5 | Multiple successful builds with distinct choices; players predict placement and passage consequences |
| Depth/mastery | 9 | Repeat runs produce purposeful changes and better outcomes without a single dominant recipe |
| Clarity | 8 | Accurate threat and defeat explanations, low accidental input rate |
| Onboarding | 8 | Newcomer gates above pass without coaching |
| Pacing | 8 | Planning feels useful; cleanup and reports do not produce repeated disengagement |
| Fairness | 8 | Losses are explainable and a specific adjustment helps |
| Combat feel | 8.5 | Players identify weapon impact and major interrupts at actual device size |
| Visual identity | 8 | Units and districts are identifiable from silhouette and materials without labels |
| Progression | 7.5 | Players recognise restoration changes and pursue a specific next reward |
| Variety | 8 | Missions demand different responses and players can describe those differences |
| Attachment | 7.5 | Players remember at least one resident and care about reopening a place |
| Mobile usability | 8.5 | Physical device input, sound, suspend/resume and sustained performance gates pass |

A useful next playtest brief: “Observe this player without coaching, separate game-rule confusion from input mistakes, and return the three most frequent problems with timestamps and one proposed change for each.”
