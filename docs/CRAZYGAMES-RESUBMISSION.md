# Nightward resubmission candidate

The rejected build received only the publisher's general quality message. No specific cause was supplied. This pass addresses the five weaknesses found in our own review; acceptance and retention still require external evidence.

## Changes to review

1. **An opening with decisions.** New campaigns use 330 starting glow and an authored eight-wave sequence: first placement, runners, armour, signature and command, a shop reopening, a packed wake, a repair escort and the Mire Tyrant. Chimes arrive for wave 2 and Blasts for wave 3. Clear rewards are tighter. Two unchanged Sparks now fail by wave 4 or 5; paid adaptive reference builds survive wave 8 with all three keepers. This comparison is a simulation result, not a newcomer study.
2. **A clearer canal district.** Darker, narrower banks and quieter paving give moving enemies priority. Enemy silhouettes are larger at small portal sizes, with stronger material colours. Waterfront warehouses, clockmakers and balcony houses replace repeated facades. An illuminated storefront and residents return after holding wave 5; the existing five-act restoration continues.
3. **Direct controls.** Inspectors overlay a stationary battlefield. Upgrade choices occupy full rows, Spark/Blast/Chime names match the tutorial, and damage is labelled as a cumulative total. Signature cards show available tower pairings with one benefit and one cost. New campaigns charge commands automatically, keep towers firing and activate once per wave with a button or Q. Published campaigns retain their original held-command rules.
4. **Readable combat feedback.** Mortars recoil farther and recover more slowly, airborne shells show a brief landing cue, armour breaks throw metal fragments, and slow/freeze effects use ice shapes. Ready commands mark their actual reach. Repeated cracks, launches and explosion debris are quieter and less frequent, preserving space for the existing adaptive score and boss cues. Reduced-motion settings remain supported.
5. **A fairer continuous siege.** Towers, purchases, light and glow persist through all 40 waves. Standard/Gentle boss breaches cost 8, 10 or 12 light instead of the original lethal late-boss rules. Forecasts state the actual cost. A checkpoint before each boss allows retrying that encounter; act checkpoints remain. Nightfall retains its original breach and retry rules. Old `siege1` saves keep their economy, opening waves and commands and resume exactly.

## Verification

Run `npm run check`, `npm run test:portal-opening`, `npm run balance:siege`, then `npm run build:crazygames`. The focused `test:resubmission` suite is part of `check`. It tests published save continuation, command timing and effects, no double activation, boss escapes through the real movement path, pre-boss recovery, and paid opening comparisons.

The 12 paid Standard references produced eight full-campaign wins. Each keeper has a winning build on each passage. Frozen Battery failed at wave 16 and Chain Network failed at wave 24 on both passages. The result establishes viable routes, not universal build viability or player enjoyment. Opening results: Sol 25 light, Mira 13, Ivo 25 on the adaptive reference; two idle Sparks lose by wave 4/5.

Browser evidence uses actual UI interaction in the Codex browser. Test the packaged production build separately from development scenarios. The release browser report distinguishes responsive layout checks, observed UI flows and simulation coverage. It must identify the exact archive hash. Previous browser evidence must not be attributed to a new ZIP.

Development-only `?portal=crazygames&qa=1` exposes QA scenarios and media export. Generate paid opening scenarios with `npm run test:resubmission` and late scenarios with `npm run balance:siege`. `Record 16s preview` records the real canvas at normal game speed with visible wave/resource labels, without audio; download links appear when complete. Export the three covers from the same game models. These tools are excluded from production.

The updated MP4s show the Matriarch encounter at 1920×1080 and 1080×1620. All three covers use the revised game models. `node scripts/crazygames-mp4.mjs` converts and fully decodes the source recordings. Inspect representative frames before release.

## What remains outside implementation

- Observe eight fresh players using `release/crazygames/newcomer-sessions.csv`. Do not coach placement, slowing, the armour counter or the signature choice. Record time to first useful tower, wrong taps, help requests, first loss, wave reached and enjoyment. The sheet remains blank until real sessions occur.
- Test on physical phones before claiming mobile support. Responsive viewport checks do not establish touch ergonomics, audio reactivation, battery use or sustained hardware performance. The initial submission can remain desktop-only.
- Upload the new `dist-crazygames/` contents (or the verified ZIP where accepted), replace covers and both MP4 previews, and use the revised listing. Run the hosted QA preview. Then submit for review; this repository preparation does not submit to the publisher.

## Suggested reviewer note

Nightward has been revised after the initial quality review. The opening eight waves now teach placement, slowing and armour through distinct encounters; signatures use towers already available. Commands charge automatically without stopping tower fire. Compact inspectors keep the battlefield stationary, and upgrade choices and damage labels have been simplified. The canal district, enemy contrast, weapon feedback and audio mix have been refined. The continuous 40-wave campaign is preserved, with finite Standard boss breach costs and a checkpoint before each boss. The new artwork and preview videos use the updated game assets. Existing campaign saves retain their original rules.

The release does not claim CrazyGames approval, measured retention, eight-player validation or physical mobile certification.
