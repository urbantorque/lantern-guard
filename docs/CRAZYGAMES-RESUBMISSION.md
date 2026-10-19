# Nightward resubmission candidate

The rejected build received only the publisher's general quality message. No specific cause was supplied. This pass addresses the five weaknesses found in our own review; acceptance and retention still require external evidence.

## Latest quality pass, 20 October 2026

All 40 waves remain one continuous defence. The new preparation tools apply to siege2 campaigns; published siege1 saves keep their existing rules. Tower damage, enemy health, wave composition and earned income are unchanged.

1. **Learn counters on the board.** Optional “Show a Chime position” and equivalent counter actions pause planning and preview a legal plot at its normal price. Gold marks actual reach; mint marks water covered by existing damage or slowing towers. No tower or money is granted. Early labels appear on enemies that are actually slowed or have damaged armour. Redundant preparation text is hidden while its lesson is visible.
2. **Recover from an early purchase mistake.** Preparation purchases, upgrades, moves and signature choices can be undone at full value until combat starts. Undo is limited to the current planning session, preserves one-wave practice isolation, and cannot rewind combat or rewards. Standard and Gentle siege2 runs get one free relocation before wave 8; subsequent moves and Nightfall retain the 25-glow price. Early upgrades show their remaining budget and the next counter's price.
3. **Read threats at portal scale.** Small enemies use distinct angular silhouettes and material cues instead of subpixel ornament. Towers fade when an approaching enemy would be obscured. Boss world labels and the HUD share the actual shield, signal and exposed state. Interrupt cues bypass routine audio limits and briefly reserve room in the mix. Compact inspectors retain both upgrade choices and leave the guided coverage visible.
4. **Trust the loss report.** New wave reports aggregate actual light lost across all escaped enemies. Recommendations use the dominant observed loss, distinguish lower-bend samples from whole-route evidence, and check the restored checkpoint's unlocked towers, money and available plots. An unaffordable or locked tower never receives a misleading “build here” marker. Older reports without aggregate evidence remain explicitly limited to their last recorded escape.
5. **See the city return.** Held waves 5, 8, 16, 24, 32 and 40 reveal the actual restored building with a brief light treatment and musical resolution. The banner can be skipped and expires automatically; reduced motion uses a shorter, static treatment. The final beacon lights the canal before the victory report. Towers, resources and campaign progress stay in place.

The package is **297,217 bytes (0.30 MB)**, **832,424 bytes unpacked**, and **10 files**. Source: `678dae7a0d21a27da394a0125fcc42e3de388731`. SHA-256: `edac99a0f76f8e81b93d37bd93d1c61d90a6cb8fd5b274de2ccda3767b4c5d7d`.

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

Run `npm run check`, `npm run test:portal-opening`, `npm run balance:siege`, `npm run balance:approval`, then `npm run build:crazygames`. `test:resubmission`, `test:approval` and the new `test:learning` are part of `check`. They test published save continuation, command timing and effects, no double activation, boss escapes through the real movement path, pre-boss recovery, paid opening comparisons, contextual teaching, preference migration and frame-rate parity.

The 12 paid Standard references produced eight full-campaign wins. Each keeper has a winning build on each passage. Frozen Battery failed at wave 16 and Chain Network failed at wave 24 on both passages. The result establishes viable routes, not universal build viability or player enjoyment. Opening results: Sol 25 light, Mira 13, Ivo 25 on the adaptive reference; two idle Sparks lose by wave 4/5.

Browser evidence uses actual UI interaction in the Codex browser. Test the packaged production build separately from development scenarios. The release browser report distinguishes responsive layout checks, observed UI flows and simulation coverage. It must identify the exact archive hash. Previous browser evidence must not be attributed to a new ZIP.

The current [browser report](../release/crazygames/browser-validation.json) records twelve production viewport layouts and the scope of each UI flow. [Media validation](../release/crazygames/media-validation.json) identifies all three covers and both silent MP4s by hash. [Release readiness](../release/crazygames/readiness.json) keeps outstanding human, device and publisher work separate. The verified ZIP remains a local generated artifact rather than a Git-tracked binary.

The compact-layout pass keeps both upgrade buttons visible at 320×740, 390×844, 821×462 and 907×510 without moving the battlefield. Reduced motion and saved music volume were exercised through the UI. Current screenshots show the [phone inspector](../artifacts/learning/production-inspector-320.png), [short desktop inspector](../artifacts/learning/production-inspector-907.png), [guided placement](../artifacts/learning/production-guided-907.png), [earned first-shop opening](../artifacts/learning/restoration-wave5.png) and [paid final-boss scenario](../artifacts/learning/final-combat-907.png). Restoration and boss images use paid development checkpoints, not fresh human playthroughs.

Development-only `?portal=crazygames&qa=1` exposes QA scenarios and media export. Generate paid opening scenarios with `npm run test:resubmission` and late scenarios with `npm run balance:siege`. `Record 16s preview` records the real canvas at normal game speed with visible wave/resource labels, without audio; download links appear when complete. Export the three covers from the same game models. These tools are excluded from production.

The updated MP4s show the Matriarch encounter at 1920×1080 and 1080×1620. The three existing covers are retained: their tower, boss and building models remain accurate. Their dimensions and hashes are checked again. `node scripts/crazygames-mp4.mjs` converts and fully decodes the source recordings. Inspect representative frames before release.

## What remains outside implementation

- Observe eight fresh players using `release/crazygames/newcomer-sessions.csv`. Do not coach placement, slowing, the armour counter or the signature choice. Record time to first useful tower, wrong taps, help requests, first loss, wave reached and enjoyment. The sheet remains blank until real sessions occur.
- Test on physical phones before claiming mobile support. Responsive viewport checks do not establish touch ergonomics, audio reactivation, battery use or sustained hardware performance. Listen to the mix on speakers and headphones. The initial submission can remain desktop-only.
- Upload the new `dist-crazygames/` contents (or the verified ZIP where accepted), replace covers and both MP4 previews, and use the revised listing. Run the hosted QA preview. Then submit for review; this repository preparation does not submit to the publisher.

## Suggested reviewer note

Nightward keeps one continuous 40-wave campaign. This candidate adds optional on-board counter placement previews, full-value preparation undo, one free early move, whole-wave loss reports and affordable checkpoint-specific recovery advice. Compact enemy silhouettes and shared boss-state labels improve combat readability. Earned restoration beats now highlight the city rebuilding, with skippable presentation and a muted/reduced-motion-safe resolution cue. The archive is 0.30 MB and makes no external game requests. Published campaigns preserve their original rules.

The release does not claim CrazyGames approval, measured retention, eight-player validation or physical mobile certification. Browser and simulation evidence is scoped in the release reports; human sessions, physical devices, audio listening and this candidate's hosted preview remain separate checks.
