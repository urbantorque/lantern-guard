# Watch tactics

New campaigns and expeditions use `challenge.watchTactics: 1`. Resuming a previous save preserves its original balance. Existing weekly challenges and five-wave commissions retain their published rules. Start a new watch to play the new combat rules.

## Shared-water combinations

- **Shatterburst (Chime + Blast):** a blast against a slowed, armoured target strips 12 armour from that target and up to two nearby slowed, armoured foes. All must be inside both towers' current reach. Affected targets become exposed to heavy hits (+20%) for three seconds. Four-second cooldown; relinking cannot bypass it. The Chime receives armour-removal credit.
- **Beacon Volley (Scout + Bolt):** a shot aimed inside both towers' reach becomes a luminous, heavy lance with 30% more damage and two additional pierces. It travels straight after its first contact. Four-second cooldown, committed when fired.
- Placement previews and selected pairs highlight their actual shared canal stretch in cyan. The highlight follows changes in night reach and shelter. Broken gold rings identify exposed enemies. The lance has a distinct twin-filament trail, including a still version for reduced motion.

## Encounter identity

Three authored sequences occur at expedition waves 5, 8 and 11, with campaign counterparts at 18, 23 and 33:

| Encounter | Tactical problem |
| --- | --- |
| Breakwater convoy | Armour arrives before a crowded second formation. Establish shared blast and control coverage. |
| The sheltered surgeon | Armour screens a healer; runners follow behind. Focus heavy damage and sight before the chase. |
| The late flank | The main convoy commits before fast arrivals enter from the side inlet. Reserve downstream control and finishing damage. |

Existing headcounts are preserved except where two ordinary enemies are exchanged for one healer. Forecasts list the entrance and start time of each formation, converted to the game's actual play tempo. The Dredger retains its positional openings. Interrupting a Mire Tyrant brood call or Matriarch healing signal now exposes the boss to heavy damage for four seconds; defeating the Dreadnought's last escort creates the same opening. Bosses still resist freezing and displacement.

## Crown follow-ups

Existing crown purchases (campaign wave 31, expedition wave 10) extend the signature already chosen:

| Signature | Crown behaviour | Constraint |
| --- | --- | --- |
| Wildfire | Ashfall leaves fire pools on burning defeats and spreads fresh three-second burns. | Burn ownership stays with its source tower; three pools per Blast; spread strength still decays. |
| Flashpoint | Backdraft splashes 40% of the stored-fire ignition bonus onto two nearby enemies. | Existing fire required; four-second cooldown; secondary damage cannot recursively ignite. |
| Capacitor | Thunderhead makes the third volley's first hit heavy and staggers three nearby ordinary enemies. | The two charging volleys are unchanged; bosses resist the stagger. |
| Forked current | Cascade adds two jumps if the first target dies. | Surviving the first hit prevents the extension. |
| Undertow | Dragnet exposes pushed enemies to heavy follow-up hits for three seconds. | Requires an already-slowed ordinary enemy and the third toll. |
| Still tide | Icebreak exposes frozen ordinary enemies to heavy follow-up hits for three seconds. | Requires a freezing toll; boss signals must be interrupted to create an opening. |

Crown previews explain the behaviour before purchase; crowned tower inspectors retain that explanation. No additional resource or upgrade menu is introduced.

## Breach feedback and one-wave practice

The final breach records remaining health/armour, visibility, and actual damage/control coverage at the marked lower bend. Advice reports those observations and suggests one adjustment. It does not claim to reconstruct every preceding hit or every leak in the wave.

After a defeat, **Practise this wave only** restores the matching planning checkpoint into an isolated session. The player can rearrange and upgrade using the original budget, then run one wave. The practice report compares light lost with the original attempt and offers a reset or return to the original report. Save, backup, checkpoint and progression writes are suppressed throughout practice. Reloading recovers the original saved run. A checkpoint from another wave, seed, hero or mode is rejected. The existing full-run retry remains available separately.

Failed watches can be reopened from the district. On short landscape screens, preparation controls dock in the bottom bar so they cannot cover build plots.

## Verification

- `npm run check`: full regression suite, including legacy saves and rules, plus the tactical tests.
- `npm run test:watch-tactics`: actual combat conditions, cooldowns, capped effects, boss openings, malformed save fields, complete paid runs, and identical mid-wave continuation.
- `npm run balance:tactics`: all 42 paid reference builds win across four campaign maps and three expeditions. `-- --stress`: all 12 additional Relaxed/Nightfall reference builds win. These establish viable builds, not human difficulty ratings.
- `npm run qa:tactics`: 1280×800, 390×844, 320×740 and 844×390 browser flows. Checks real practice completion, one-wave stop, budget reset, return/reload, unchanged save/checkpoint/profile storage, crown/forecast UI and absence of browser errors.
- `node scripts/visual-invariants.mjs --tactics`: 207 unclipped portraits, tower and projectile reduced-motion checks, both camera projections and 16 scenes with selected Bonds/exposed enemies. Painting leaves saved combat state unchanged.

Reports and screenshots: `artifacts/tactics-qa/`. Balance data: `artifacts/tactics-balance.json` and `artifacts/tactics-stress.json`.
