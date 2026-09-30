# Nightward: continuous combat and readable choices

30 September 2026. Follow-up to the fixed-path and three-hero releases.

## Canal and impact fixes

The renderer previously painted every bank and water layer for one segment before moving to the next. A downstream bank could cover upstream water at a junction. The full network is now stroked once per layer with round joins. Bank lamps cannot sit in a neighbouring channel.

Fixed-route segments also share neighbouring curve controls, so movement follows the same smooth connections as the drawing. All four maps have endpoint and tangent checks, and every plot retains route clearance. Map previews use the actual sampled curves. Historical routing maps keep their original sampling and geometry.

Fixed-world projectile physics now starts on the same ground plane as aiming. Shots and impacts share one visual elevation; the former distance-dependent muzzle offset is removed. Fast shots use swept contact in travel order. Ordinary sparks end on impact, piercing shots cannot hit the same foe twice, and a pierced bolt cannot turn back toward its first target. Short contact rings replace the long impact shards that looked like ricochets. Roof muzzle flashes still mark each shot.

## Tower choices during a wave

Tower inspection is a non-modal panel. It neither pauses a running wave nor resumes a deliberately paused wave. The map and Pause button remain usable. Purchases, crowns and targeting work during combat; the inspector updates affordability, glow, damage and current reach without rebuilding itself each frame. Combat purchases cannot enter planning undo history. Construction, selling, moving and Bonds remain between-wave actions.

The original Lantern Locks Fan/Long, Boom/Rocket and other paired specialisations are presented as two explicit streams for every hero tower. Each shows its role, the alternative, future mastery/crown effects, prices and unlock wave. Choosing a stream locks its competitor. The chosen route appears first on subsequent inspections.

A base tower can buy its foundation and specialisation in one action for the exact combined price. A rejected purchase spends nothing. The cheaper foundation remains available separately and keeps both options open. Existing Improved towers pay only the remaining specialisation price. Existing tower states, prices and branch stats are preserved.

On phones, the inspector reserves its own bottom area instead of covering the lower map. Landscape uses a side inspector. Sky clearance is reserved even in a short battlefield, and the Sound control becomes an icon on narrow screens.

## Sound and sky

The soundtrack is a repeating four-bar synthesised melody with bass, chord and arpeggio parts. Night uses a slower minor arrangement. Combat adds light percussion, and rain/breeze affect the ambience. Sparks, impacts, bolts and electricity have distinct cues with rate limits. Music also runs on the title screen after a gesture.

The HUD has a speaker button, and Settings separates soundtrack/atmosphere from effects. Unmuting unlocks audio on the same gesture. `?muted=1` and QA mode only mute the current session; they no longer write that override into the profile. Existing saved mute preferences are respected. Backgrounding suspends audio, and hidden tabs cannot schedule or resume it.

Daylight lasts **60 combat seconds**, night **48**, and seeded weather is checked every **30**. The original 5:4 light ratio and all strategic multipliers remain intact. The sky strip shows phase progress, a ten-second dawn/nightfall warning and an approaching weather change. Lighting blends over two seconds; reduced motion skips the blend. Planning, explicit pause and backgrounding freeze the clock. Live inspection and upgrades do not.

## Verification

- Core simulator tests, all 11 release checks, fixed-profile recovery/migration and hero progression pass. All 15 historical Wickwater runs retain exact snapshots and outcomes.
- All 48 hero/tower/stream combinations can specialise, master and crown during combat, preserve costs/lockouts and resume exactly from a save. Separate tests cover insufficient funds, wave gates, swept hits, piercing order and single impact removal.
- All four fixed maps pass endpoint/tangent continuity, source timing, plot clearance and scenery exclusion checks.
- The 96 fixed-roster paid-build campaigns complete 32/32 Relaxed, 32/32 Standard and 24/32 Nightfall runs. The mixed reference build completes every map/seed on all three difficulties; omission strategies can lose Nightfall. All three commissions complete. A neglected single-tower defence loses at wave 5.
- Hero campaigns complete 48/48 Standard/Relaxed and 20/24 Nightfall runs. The mixed reference build loses on Reed Crossing for Mira at wave 14 and Ivo at wave 15, on both seeds. These measure fixed reference strategies, not human win rates or proof of every possible build. All nine hero/commission combinations complete.
- Environment comparisons complete 8/8 balanced campaigns and 3/8 early two-Garden campaigns. Greed earns more when it survives, while mixed defences are more resilient across the tested maps/seeds. Harvest integration, pause behaviour, forecast determinism and exact reload tests pass.
- Audio tests exercise the scheduler without audible output: title melody, audio-clock timing, day/night arrangements, first-shot feedback, rate limits, independent music settings, session-only muting and background suspension. Listening quality still needs player feedback.
- Browser checks cover desktop 1280×720, portrait 390×844 and 320×667, and landscape 844×390. Live specialisation and mastery purchases retain running combat; explicit pause survives opening/closing inspection; keyboard P and live targeting work. Narrow-screen large text and reduced motion show no horizontal overflow. The final browser error log is empty. Browser work remains muted.
- TypeScript/Vite production build and Capacitor iOS asset sync pass. Physical-device performance was not measured.

Committed evidence: `artifacts/fixed-balance.json`, `artifacts/environment-balance.json`, `artifacts/hero-balance.json`, `artifacts/hero-progression.json`. New regression commands: `npm run test:continuous` and `npm run test:audio`, included in `npm run check`.
