# Lanternlocks: design notes

Historical concept document. The current game is **Lantern Guard: Tower Defense**, with build-dependent route planning and a continuous defence. See [the current implementation](LANTERN-GUARD.md) and [the journey expansion](JOURNEY.md). The research and monetisation ideas below are proposals, not shipped features or validated demand.

**Pitch:** A cozy puzzle-defence game for iPhone. Grumpy ink Mopes drift down lantern-lit canals. You build keepers on the banks and flip the canal locks mid-wave, sorting each group into the channel that suits it. Keep the Great Lantern lit.

## 1. The niche

Adults who like the *idea* of strategy but bounce off current tower defence (TD). Two groups overlap here:

- **Sort-puzzle players.** Mostly women aged 30 to 55, iPhone-first. They play colour-sort and jam puzzles to relax and "keep the mind sharp". No TD is pitched at them: every top-grossing US TD game (Arknights, Kingdom Guard, Watcher of Realms, Raid Rush) is war- or gacha-themed. Meanwhile their own genre is flooded with shallow clones.
- **Time-poor, lapsed strategy players.** These are the people buying minimal one-twist TD hybrids on Steam (Thronefall about 1M copies, The King is Watching 500K+, 9 Kings). Almost none of those games are on iOS, and BTD6 rounds often run past 30 minutes.

Secondary audiences reached through the same choices: cozy players (non-violent theme, pause anywhere, Relaxed mode); parents and 50+ players (no ads, no loot boxes, colour plus shape readability); and lapsed BTD6 players who want more to *do* during a wave.

Caveats from the research: it is a hypothesis, not a finding, that sort-puzzle players will cross over to TD. Conversion from free-to-try to paid on iOS also needs measuring in a soft launch.

## 2. The twist: live lock gates

Two lock gates split the canal. **Tap a lock, or its button in the thumb-zone dock, to send the Mopes behind it down the other channel.** Each lock offers a real trade-off:

| Lock | Long loop (default) | Short run |
|---|---|---|
| Upper Lock | **West loop**: long and safe, more time under your keepers | **Lantern run**: pays **double glow**; its bridge **reveals Veils** for good |
| Lower Lock | **East loop**: long and safe | **Mill run**: pays **double glow**; its waterwheel **cracks shells** |

Decisions this creates *during* a wave, every few seconds:

- **Sort by type.** Veils go to the Lantern run, shells to the Mill run, Skitters and bosses to the long loops.
- **Greed or safety.** Weak Mopes go down the rich short runs for double glow; tough ones go the long way.
- **Load balancing.** Split a dense group across both channels so neither set of keepers is swamped.
- **Boss prep.** Gloomtoads jam any lock they sit on, so the locks must be set before one arrives. Old Gloom splits in two at the Lower Lock, so both lower channels need to hold.
- **Automate.** Charms (120 glow) permanently route one trait (shelled, hidden, swift or heavy) at a gate. This trades money for attention, which suits high speed and busy late waves.
- **Soft counters.** Keepers do ×1.5 damage to Mopes wearing their colour and symbol: amber flame, coral burst, ice snowflake, lime eye, lilac sparkle. Sparks only *chip* shells (×0.25) rather than bouncing off. Every keeper spots Veils up close, and Owls spot them from far away. Misrouting costs efficiency; it never means an automatic leak.

Guardrails from research into Conduct THIS!, Anomaly and Mini Metro:

- a 0.9 s cooldown per gate, so flipping is a decision, not spam
- routing is fully deterministic
- flowing water, chevrons and a big arrow dial show where Mopes will go
- a queue of incoming Mope icons at every gate and in the dock
- pause and plan at any time (not in Nightfall, the pure challenge mode)

Novelty check: live junction switching is open in shipped TD. BTD6 has it only as a 20-second gizmo on one map (Workshop). Mazing games fix the path once a wave starts, and ChangePath is an unreviewed itch.io demo.

## 3. Systems

**Keepers** (each has 2 paths × 3 tiers; one path may reach tier 3, the other stops at tier 1):

| Keeper | Role | Path A | Path B |
|---|---|---|---|
| Wickling (110) | quick sparks, amber | Fan → Twin Wick, Tri-Candle, Candelabra | Long → Long Wick, Hot Wax (cracks shells), Beacon Wick (sees Veils) |
| Cracker (200) | firework splash, cracks shells, coral | Boom → Big Bang, Double Pop, Grand Finale (cluster) | Rocket → Sparkler Tail (burn), Rocketry (homing), Skyrocket Battery |
| Moonbell (150) | slowing toll, hits hidden, ice | Toll → Deep Toll, Ringing Hit, Stillbell (freeze) | Chime → Wide Chime, Resonance (+1 dmg taken), Bellwether (strips Veils) |
| Lamp Owl (170) | spots Veils, lime | Hunter → Sharp Talons, Ironbeak, Great Horned (dive) | Watch → Keen Eyes, Night Watch (+range aura), Parliament (+speed aura) |
| Lighthouse (340) | beam, melts shells, lilac | Focus → Lens Polish, Piercing Ray, Sunbeam | Sweep → Tall Tower, Night Lens, Twin Lamps |
| Glow Garden (230) | economy, gold | Harvest → Moth Beds, Night Bloom, Moon Orchard (+1 light a wave) | Lure → Sweet Nectar, Moth Guard, Moonflower |

**Mopes:** Drip, Skitter (fast), Shellback (shell), Veil (hidden), Bloat (splits into 3), Wisp (swarm), Mender (heals), Veiled Shell. Bosses: Gloomtoad (spits Drips, jams gates) and Old Gloom (splits at the Lower Lock, phases). Every Mope has a distinct silhouette *and* a colour marking, so colour is never the only cue.

**Economy:** Glow comes from cheering up Mopes (doubled on short runs), wave-clear bonuses, garden income, and a bonus for calling a wave early.

**Modes:**

- **Relaxed:** 50 light, softer Mopes.
- **Standard:** 25 light; pause to plan.
- **Nightfall:** 15 light, Mopes grow up to ×1.4 tougher, no charms, no flipping while paused.

**Challenges** (open after the first finished night; results are kept in a local log, best per challenge):

- **Daily tide.** Everyone gets the same one on a calendar day. It opens after wave 14 with 4,700 glow to build with, then plays a seeded remix of waves 15 to 25 on Standard (about 7 minutes). Each remixed wave spends the same glow budget as the handmade wave it replaces, so the economy and threat curve hold. Menders, Veiled Shells and Veils cost a little more of the budget because they are harder than their pay. The remix keeps the canonical bosses and draws its crowds from the patterns the late waves use: sortable clumps, charm-friendly interleaves, streams and swarms. A **featured Mope** turns up far more often, plus one **twist** (Swift current: ordinary Mopes 10% faster; Thick shells: a third tougher; Tidal locks; Sluice night: most Mopes use the West Sluice) and/or one **rule** (no charms, no gardens, or only three keepers). Results can be shared as plain text.
- **Weekly night.** The whole canal on Standard under one rule that turns over each Monday: Fixed locks, Tidal locks, Swift current, Lean night (no charms or gardens), Thick shells.
- **Tidal locks** are the first playable junction mechanic from the waterway plan (the timed lock). A lock opened onto its short run swings back to the long loop 5 seconds later. A draining ring on the dial and a bar on the dock button show how long is left, and a jammed lock waits for the boss to pass. Greed now costs attention: the rich run has to be held open on purpose.

## 4. The level's arc (Wickwater Canal, 25 waves plus free play)

Each early wave teaches one idea, and the bosses punctuate the arc.

- **Wave 1:** Drips; build your first keeper.
- **Wave 2:** the Upper Lock opens; the first flip earns double glow.
- **Wave 3:** Skitters; the long loops matter.
- **Wave 4:** the Lower Lock and Mill run open.
- **Wave 5:** Shellbacks; the Mill wheel pays off.
- **Wave 6:** a Wisp swarm.
- **Wave 7:** Bloats.
- **Wave 8:** Veils; the Lantern bridge pays off.
- **Wave 10:** the Gloomtoad, which jams locks.
- **Wave 11:** the West Sluice opens. Its Mopes skip the Upper Lock and its bridge, so the map changes mid-level.
- **Wave 12:** Menders.
- **Wave 16:** Veiled Shells.
- **Waves 18, 20 and 23:** multiple toads.
- **Wave 25:** Old Gloom, which splits at the Lower Lock.

After a win, free play continues with procedural escalation. A full Standard run takes 12 to 17 minutes at 1×. It autosaves after every wave, and Continue resumes instantly.

## 5. Feel, art and sound

- **Look.** Night canal with a single warm accent: lantern amber on deep teal-navy. The water is the brightest element, so ink-dark Mopes silhouette against it. Keepers glow warm; effects use additive light. All art is vector-drawn in Canvas 2D, so it stays crisp on any display. Mopes are pre-rendered into sprite frames: 275 on screen hold 60 fps, and draws take about 2.4 ms.
- **Non-violent.** Cheering up a Mope frees the firefly inside it. The firefly flies to the glow counter, and a bloom in the Mope's colour settles on the bank. By the end of the night the canal has visibly flowered.
- **ASMR and sound.** Every sound is synthesised, and all of it is tuned to one pentatonic scale:
  - bubble pops that climb the scale as combos build
  - glassy clinks when sparks chip a shell, and crunchy shell cracks
  - wooden gate clacks with a water swish
  - FM bell tolls and firework crackles
  - an ambient bed of water and crickets under a generative kalimba
- **Readability.**
  - Health bars only where they carry information; sprite and particle budgets.
  - A calm-effects mode, reduced motion and screen-shake toggles.
  - World text scales up on small screens.
  - Everything important is visual, so the game reads fully with sound muted.
  - **Colour-safe palette** (Settings). The standard family colours collapse for deuteranopes: Moonbell ice and Lighthouse lilac fall to 3.4 OKLab units apart. The alternative set was checked under simulated protanopia, deuteranopia and tritanopia (Machado 2009, full severity). Its closest pair stays 10 units apart, and every colour keeps 6:1 contrast or better on the night. The lantern amber stays the one UI accent in both sets.
  - **Larger text** scales menus, sheets and messages, and raises the floor for map labels.
  - **Left-hand dock** mirrors the wave button, charms and HUD buttons to the left thumb.
  - **Slow at the locks** eases time to half speed while Mopes reach a lock the player can flip (the "frantic" risk in the iOS plan).
  - Haptics on build, upgrade, flip, leak and wave clear (Android web now; Core Haptics on iOS).

## 6. Balance method

`npm run sim` runs 13 bot personalities through the full level on every mode, using the deterministic simulation. The results are in `docs/balance-matrix.txt`.

- **Relaxed:** 12 of 13 win. Only the bot that parks both locks on the rich runs from wave 1 loses, at wave 5.
- **Standard:** 10 of 13 win, finishing with 3 to 25 light. Random flipping, the over-greedy garden economy and parking on the rich runs all lose by wave 6.
- **Nightfall:** only routing strategies win (sparks + bells, careful sorter with Lighthouses, sorting then parking from wave 12). Every no-routing strategy loses, at the latest to Old Gloom at wave 25.

That last result is the key check that the twist is essential rather than cosmetic.

`npm run tides` does the same for challenges: 7 bots over 28 daily tides and the weekly rotation. The results are in `docs/tides-matrix.txt`:

- careful routers keep every tide (28 of 28)
- average routers keep about three in four (21 and 22 of 28, including the slow-reactions bot)
- the bot that never routes keeps fewer than one in three (8 of 28); charms alone keep 18

Hard days cluster on Swift current and the Old Gloom finale. Two rules came out of this run. Swift current spares the bosses, because one leaked half of Old Gloom ends the night and turned the finale into a coin flip. Trio stays out of the weekly rotation, since three keepers against the whole night is what the Trio feat is for.

## 7. Fair monetisation (iOS)

**Free to try, then a one-time unlock:**

- **Free download:** this full level, all keepers and paths within it, and no ads.
- **"Full Night" unlock ($6.99; test $5.99 to $7.99):** all launch waterways, Nightfall, the daily seeded challenge and weekly restriction challenges.
- **Clarity:** the unlock screen lists exactly what it adds (App Store Guideline 3.1.1).

**After the unlock, optional and never power:**

- **Waterway expansions ($4.99 to $9.99).** Each brings a new junction mechanic (turntable, one-way valve, timed lock), new Mope families, and a free preview level.
- **Directly priced cosmetics.** No premium currency and no loot boxes. Examples: bloom sets (what Mopes turn into), keeper skins, canal and gate themes, and ASMR sound packs.
- **Skill-earned prestige cosmetics.** Earned from Feats and Nightfall. The first four exist as bloom sets in the Bloom journal: Lantern lilies (win on Standard), Tide pearls (keep 3 daily tides), Starmoss (cheer up 5,000 Mopes) and Moonpetals (win on Nightfall). Each set keeps a hint of the family colour, so the banks still show what was cheered.
- **Supporter pack ($2.99 to $4.99)** at launch.

**Hard rules:**

- No energy timers.
- No forced or interstitial ads.
- Never sell keepers, upgrade paths, boosts or starting glow.
- Never charge for anything that was free.
- iCloud save from day one.

## 8. Why players return

- 12 to 17 minute sessions with an instant resume.
- Eleven Feats that each demand a different strategy, such as Hands Off (3 or fewer flips), Trio, Lean Lanterns and Lockkeeper.
- Three modes, plus free play.
- The end screen explains which Mope got through, on which route, and what counters it, and suggests an unused keeper to try next.
- A daily tide and a weekly night, both shareable, with the last seven days shown as a strip of kept and lost tides (no streak counter, so a missed day costs nothing).
- The **Bloom journal**: lifetime counts for every kind of Mope, with bud, bloom and full-bloom milestones, and the earned bloom sets.
- A **night postcard** at the end of every night: the flowered canal, the keepers where they stood and the result, as a 4:5 picture to share or save.
- Planned: Game Center leaderboards for the tides, new waterways every 4 to 6 months, and seasonal cosmetic tracks.
