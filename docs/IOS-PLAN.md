# Lanternlocks: path to an iOS release

Historical initial plan. The current title is **Lantern Guard: Tower Defense**. Follow [the current device/build checklist](IOS-BUILD.md) and [journey implementation and validation](JOURNEY.md); the flip-centric metrics below describe the original prototype.

The browser slice proves three things: the core loop (build, sort with the locks, upgrade), the look and feel, and the balance. This plan covers everything between here and the App Store, most valuable first.

## 1. Validate before building more (2 to 3 weeks)

The research left two assumptions unverified: that sort-puzzle players will cross over to tower defence, and how well free-to-try converts on iOS. Test both with the browser build and TestFlight before adding content.

- **Playtests:** 15 to 20 people, split between sort-puzzle players and lapsed TD players. The game logs local metrics (`lanternlocks.metrics.v1`). **Settings > Playtest data** summarises them against the goals below and exports the log as JSON (copy or save; nothing is sent). The log records light left, time paused and at speed, assists in use, resumed runs, and abandoned runs. A **First-flip hint** switch turns off the coaching arrow, so unprompted flips can be measured. Track:
  - time to first keeper (target under 10 s)
  - share of players who clear wave 1 without help
  - first lock flip before wave 3 without the prompt (kill criterion: under 60%)
  - whether routing changes outcomes (compare flips against light left)
  - whether a busy wave reads clearly at 375 px with sound off
  - whether players start a second run with a different build
- **Kill criteria from the research:**
  - players do not use gates unprompted by wave 3
  - wins depend on towers alone
  - routing becomes a single forced answer
  - testers describe it as frantic

  If any of these shows up, rework the constraints (gate cooldown, how much the landmarks matter, wave mixes) before adding content.
- **Positioning test:** show two store-page mockups (a "puzzle-defence" framing and a "strategy" framing) to each group.

## 2. Wrap and ship natively (4 to 6 weeks)

The game is a 340 KB static web app with a DOM-free simulation, so the fastest route to iOS is a thin native shell.

- **Shell:** Capacitor (WKWebView) around the Vite build, portrait-locked on iPhone, with landscape allowed on iPad using the side-panel layout that already exists.
- **Native plugins:**
  - Haptics through Core Haptics (`@capacitor/haptics`), replacing `navigator.vibrate`, with separate impact styles for build, upgrade, flip, leak and wave clear.
  - StoreKit 2 in-app purchases (RevenueCat or `cordova-plugin-purchase`).
  - Game Center for leaderboards on daily and weekly challenges.
  - iCloud saves through `NSUbiquitousKeyValueStore`. Mid-wave snapshots are already self-contained JSON of about 90 KB.
- **Audio:** set the AVAudioSession category to *ambient* so players' own music keeps playing, and resume the WebAudio context on foreground.
- **Performance:**
  - Target an iPhone 11 at 60 fps and ProMotion at 120 Hz. The simulation is a fixed step, so only rendering scales.
  - The Mope sprite cache is capped at 32 MB. Test the memory ceiling on older devices.
  - Pre-warm sprite frames during the title screen.
- **If the WebView proves limiting:** the simulation (`src/game`) has no DOM dependencies. It can move to Swift/SpriteKit or stay as a JavaScriptCore module behind a native renderer.

## 3. Content for launch (8 to 12 weeks, in parallel)

- **3 to 4 waterways**, each with a new junction mechanic from the design notes: a turntable lock (three exits), a one-way valve, a timed lock that flips on its own, and a tidal sluice. Each also adds one or two new Mope families.
- **Daily tide and weekly challenge.** Built in the browser slice (see DESIGN.md §3) and balanced with `npm run tides`. Still to do: Game Center leaderboards, which rank a day by light kept, then waves held.
- **Bloom journal:** built. It holds lifetime counts per Mope with milestones, plus four skill-earned bloom sets. Paid bloom sets would live here too.
- **Junction mechanics:** the timed lock is playable now as *Tidal locks* (a daily twist and a weekly rule), so it can be playtested before a waterway is built around it.
- **Accessibility:**
  - Dynamic Type for menu text: a Larger text setting exists; map it to the iOS text size in the native shell. VoiceOver labels on all menus (the DOM UI already has names and roles).
  - A colour-vision-safe palette option: built and checked under simulated colour-vision deficiencies. Glyphs also carry the family.
  - A one-handed mode that mirrors the dock: built (Dock side: left hand).

## 4. Business model (from the research)

**Free to try, then a one-time unlock:**

- **Free download:** Wickwater Canal (this level) with all keepers and paths, and no ads.
- **"Full Night" unlock ($6.99; test $5.99 to $7.99):** all launch waterways, Nightfall, and the daily and weekly challenges. The unlock screen lists exactly what it adds (App Store Guideline 3.1.1).
- **Optional extras, never power:**
  - bloom sets (what cheered Mopes turn into)
  - keeper skins
  - canal themes
  - ASMR sound packs
  - a supporter pack
- **Never:** energy timers, forced ads, loot boxes, paid starting glow or paid keepers.
- **Commission:** enrol in the Small Business Program (15%).

## 5. Store and launch

- **Screenshots:** portrait. Frame 1 shows a finger flipping a lock as a mixed stream splits, with the caption "Flip the locks. Sort the Mopes." Frames 2 and 3 show upgrades (the Candelabra, Sunbeam) and the boss. Test variants with Product Page Optimization.
- **App preview:** 15 s of wave 5 to 10 at 2×, sound on.
- **Editorial pitch:** Apple Design Award-style craft (per-action haptics, handmade vector art, one-thumb play). Apply to the "Discover" editorial and Apple Arcade later as an optional "+" edition, not as the business.
- **Soft launch:** Canada, Australia and New Zealand for 4 to 6 weeks. Measure D1/D7 retention, conversion to the unlock, and session length. Go/no-go gates before the global launch.
- **Steam:** ship a desktop build at the same time (the side-panel layout already exists) and enter Steam TD Fest to hedge against poor iOS discoverability.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Crossover audience doesn't convert | Market as "puzzle-defence"; keep the free level generous; add rewarded cosmetics, not ads |
| Routing feels frantic at high speed | Charms, the 0.9 s cooldown, pause-to-plan and the *Slow at the locks* assist exist; the playtest log records which players turn it on |
| Premium TD discoverability (Isle of Arrows: 272 ratings) | Creator outreach, Steam launch, editorial features, the end-of-night postcard and shareable tide results (both built) |
| WebView performance on older iPhones | 32 MB sprite budget, calm-effects mode; the simulation can move native if needed |
