# Nightward resubmission candidate

The rejected build received only the publisher's general quality message. No specific cause was supplied. This pass addresses the five weaknesses found in our own review; acceptance and retention still require external evidence.

## Latest quality pass, 19 October 2026

The continuous 40-wave campaign, all five acts, existing checkpoints and published save rules are preserved. This pass changes presentation, teaching and recovery guidance without changing damage, income or boss health.

1. **Teach the counter where it is needed.** The portal opens on a preview of the first Spark's real coverage. One click pays 110 glow and starts wave 1 after a short, pausable countdown. Subsequent visual cards pair the actual tower and enemy models for runners, armour, healers and hidden fleets. Tips can be dismissed individually or disabled persistently, then restored in Settings. Early slow and armour-break messages depend on actual combat effects.
2. **Make the visual language consistent.** The title is composed from the same Blast, Chime, Spark, Dredger and canal buildings used in play. Historical title illustrations no longer ship. Unselected tower rings are quieter, hostile health uses a warm contrasting bar, and boss countdowns and tether instructions render above combat effects. Spent commands stop marking a tower. Compact boss labels retain a minimum screen size.
3. **Explain preparation and recovery.** Forecasts give one actionable counter for the actual next wave, including sustained damage after the Leviathan split and overlap at the Dredger's exposed bends. Defeat advice uses the last escaped enemy and its recorded breach. Retrying recomputes the highlighted empty plot against the restored checkpoint, preserving its paid resources. The suggestion clears when combat starts.
4. **Keep restoration in view.** A compact goal shows the next shop or district milestone and the number of waves still to hold. Progress counts completed waves, never the wave merely started. Resume cards show the same next goal. The first storefront opening and act restoration notices can appear during combat, with boss and inspector displays taking priority.
5. **Give the mix room and control.** Music, combat and canal ambience have independent saved volume sliders. Boss, warning and command cues duck ongoing ordinary effects and music, then restore them. Priority sounds retain the player's effects volume. Existing act arrangements, boss motifs, voice budgets, mute, reduced motion and background suspension remain in place.

Two simplifications run through the pass: Spark/Blast/Chime/Scout role names lead the build, forecast, report and roster interfaces; campaign and continue lead the title, with expeditions, practice and custom games grouped under **More ways to play**.

The final archive is **292,460 bytes (0.29 MB)**, **817,512 bytes unpacked**, and **10 files**. Its source is `5c54bb04741324aeafbb0eac5c48750c07ebfffb`; SHA-256 is `89ef8fe1ff62c0c776e79cb7d9066ccb5ce84ae23f607a02d4d94b5ce7dfbd42`. This replaces the previous 2.88 MB candidate.

## Criteria and evidence

The review uses the publisher's [gameplay requirements](https://docs.crazygames.com/requirements/gameplay/) and [quality guidelines](https://docs.crazygames.com/requirements/quality/), checked on 19 October 2026. These are implementation and test results, not an approval prediction.

| Area | Implementation and evidence | Remaining evidence |
| --- | --- | --- |
| Fast entry and skippable onboarding | One paid click starts wave 1; visual counters arrive in context; persistent Hide tips and reset tested in production | Time to understanding with fresh players |
| Readability and device layout | All ten listed publisher sizes plus 320×740 and 390×844 measured at approximately DPR 1; both upgrade actions fit four compact sizes; stationary inspector verified | Physical touch ergonomics and hardware performance |
| Refresh-rate consistency | Actual simulation snapshots match at 30, 60, 120, 144 and 165 Hz; stalled-frame work is bounded | Physical high-refresh display observation |
| Responsive controls and flow | Mouse/touch buttons and keyboard alternatives retained; pause, saved resume, direct command, signatures and optional-mode navigation exercised | Uncoached mistake and help-request rates |
| Clear goals and continuity | Next restoration and held-wave progress remain visible; paid defence continues through 40 waves | Whether restoration motivates return visits |
| Challenge and pacing | Original 12-run matrix retains 8 wins, with all keepers viable on both routes; targeted paid diagnostics below explain the two weak reference builds | Human difficulty curve and retention |
| Coherent art and presentation | Menus and covers use actual game models; signal priority, quieter rings and hostile health contrast; final boss and compact screenshots checked | Subjective appeal with target players |
| Comfortable sound | Saved independent levels, gain ducking/restoration, rate limits, motifs and visibility suspension pass automated tests | Listen on speakers/headphones and physical phones |
| Loading, reliability and maintained content | 0.29 MB ZIP; full regression and both builds pass; production nested-path loading and console checked; English UI retained | Hosted publisher preview and sustained device runs |
| Platform fit | Single-player campaign remains primary; no custom fullscreen, ads, purchases or cross-promotion; Basic Launch package retains notices | Publisher review of content, originality and final listing |

## Paid difficulty investigation

`npm run balance:approval` preserves the original builds as controls. Frozen Battery loses at wave 16, but reaches the first boss with only 9 light and leaves with 1. Reserving early glow for counters and later adding a Beam lets the tested Still Tide adaptation reach wave 40 with 2 light on convoy, and wave 32 on runners. The Chain Network control loses at wave 24. Its adapted opening and mixed finishing line clear that encounter on both routes and reach wave 32. All purchases use normal income and placement rules. Both adapted builds still have weaknesses; this does not establish universal signature viability. The changes inform player guidance rather than a blanket boss nerf.

See [diagnostic results](../artifacts/approval/balance-diagnostic.json), [production teaching](../artifacts/approval/production-coach-390.png), [production title](../artifacts/approval/production-title-1216.png) and [paid final-wave victory](../artifacts/approval/final-victory.png). The final-wave screenshot comes from a development fixture created through paid simulation.

## Earlier improvements retained

1. **An opening with decisions.** New campaigns use 330 starting glow and an authored eight-wave sequence: first placement, runners, armour, signature and command, a shop reopening, a packed wake, a repair escort and the Mire Tyrant. Chimes arrive for wave 2 and Blasts for wave 3. Clear rewards are tighter. Two unchanged Sparks now fail by wave 4 or 5; paid adaptive reference builds survive wave 8 with all three keepers. This comparison is a simulation result, not a newcomer study.
2. **A clearer canal district.** Darker, narrower banks and quieter paving give moving enemies priority. Enemy silhouettes are larger at small portal sizes, with stronger material colours. Waterfront warehouses, clockmakers and balcony houses replace repeated facades. An illuminated storefront and residents return after holding wave 5; the existing five-act restoration continues.
3. **Direct controls.** Inspectors overlay a stationary battlefield. Upgrade choices occupy full rows, Spark/Blast/Chime names match the tutorial, and damage is labelled as a cumulative total. Signature cards show available tower pairings with one benefit and one cost. New campaigns charge commands automatically, keep towers firing and activate once per wave with a button or Q. Published campaigns retain their original held-command rules.
4. **Readable combat feedback.** Mortars recoil farther and recover more slowly, airborne shells show a brief landing cue, armour breaks throw metal fragments, and slow/freeze effects use ice shapes. Ready commands mark their actual reach. Repeated cracks, launches and explosion debris are quieter and less frequent, preserving space for the existing adaptive score and boss cues. Reduced-motion settings remain supported.
5. **A fairer continuous siege.** Towers, purchases, light and glow persist through all 40 waves. Standard/Gentle boss breaches cost 8, 10 or 12 light instead of the original lethal late-boss rules. Forecasts state the actual cost. A checkpoint before each boss allows retrying that encounter; act checkpoints remain. Nightfall retains its original breach and retry rules. Old `siege1` saves keep their economy, opening waves and commands and resume exactly.

## Verification

Run `npm run check`, `npm run test:portal-opening`, `npm run balance:siege`, `npm run balance:approval`, then `npm run build:crazygames`. Both `test:resubmission` and `test:approval` are part of `check`. They test published save continuation, command timing and effects, no double activation, boss escapes through the real movement path, pre-boss recovery, paid opening comparisons, contextual teaching, preference migration and frame-rate parity.

The 12 paid Standard references produced eight full-campaign wins. Each keeper has a winning build on each passage. Frozen Battery failed at wave 16 and Chain Network failed at wave 24 on both passages. The result establishes viable routes, not universal build viability or player enjoyment. Opening results: Sol 25 light, Mira 13, Ivo 25 on the adaptive reference; two idle Sparks lose by wave 4/5.

Browser evidence uses actual UI interaction in the Codex browser. Test the packaged production build separately from development scenarios. The release browser report distinguishes responsive layout checks, observed UI flows and simulation coverage. It must identify the exact archive hash. Previous browser evidence must not be attributed to a new ZIP.

The current [browser report](../release/crazygames/browser-validation.json) records twelve production viewport layouts and the scope of each UI flow. [Media validation](../release/crazygames/media-validation.json) identifies all three covers and both silent MP4s by hash. [Release readiness](../release/crazygames/readiness.json) keeps outstanding human, device and publisher work separate. The verified ZIP remains a local generated artifact rather than a Git-tracked binary.

The final compact-layout pass keeps both upgrade buttons visible at 320×740, 390×844, 821×462 and 907×510 without moving the battlefield. Larger text and Reduced motion settings were exercised through the UI. [Phone inspector](../artifacts/resubmission/production-inspector-320.jpg), [short desktop inspector](../artifacts/resubmission/production-inspector-907.jpg), and [paid final-boss scenario](../artifacts/resubmission/final-assault-1216.jpg) provide visual evidence. The boss image is from the development QA scenario, not a fresh human playthrough.

Development-only `?portal=crazygames&qa=1` exposes QA scenarios and media export. Generate paid opening scenarios with `npm run test:resubmission` and late scenarios with `npm run balance:siege`. `Record 16s preview` records the real canvas at normal game speed with visible wave/resource labels, without audio; download links appear when complete. Export the three covers from the same game models. These tools are excluded from production.

The updated MP4s show the Matriarch encounter at 1920×1080 and 1080×1620. All three covers use the revised game models. `node scripts/crazygames-mp4.mjs` converts and fully decodes the source recordings. Inspect representative frames before release.

## What remains outside implementation

- Observe eight fresh players using `release/crazygames/newcomer-sessions.csv`. Do not coach placement, slowing, the armour counter or the signature choice. Record time to first useful tower, wrong taps, help requests, first loss, wave reached and enjoyment. The sheet remains blank until real sessions occur.
- Test on physical phones before claiming mobile support. Responsive viewport checks do not establish touch ergonomics, audio reactivation, battery use or sustained hardware performance. Listen to the mix on speakers and headphones. The initial submission can remain desktop-only.
- Upload the new `dist-crazygames/` contents (or the verified ZIP where accepted), replace covers and both MP4 previews, and use the revised listing. Run the hosted QA preview. Then submit for review; this repository preparation does not submit to the publisher.

## Suggested reviewer note

Nightward now enters its continuous 40-wave campaign with one paid placement click. Skippable visual lessons introduce slowing, armour and sight; forecasts and checkpoint retries explain the next counter. Campaign goals show the district restoration ahead. The title and covers use the actual battlefield models, combat warnings stay visible above effects, and music, effects and ambience have independent saved levels. The archive is 0.29 MB. Commands, pre-boss checkpoints, existing paid progression and published save rules are preserved. Production layouts were checked at all listed publisher sizes, with additional compact layouts and automated refresh-rate parity tests. Both gameplay previews have been refreshed.

The release does not claim CrazyGames approval, measured retention, eight-player validation or physical mobile certification.
