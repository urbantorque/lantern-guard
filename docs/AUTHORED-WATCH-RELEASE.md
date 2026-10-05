# Nightward: authored watches and the nocturne front end

New watches use `watchDirector: 1`. Existing saves keep their original rules, route geometry, technique choices and wave count.

## Five gameplay changes

1. **Three distinct expeditions.** Sunforge builds from armoured fronts to protected healers and the Dredger's two exposed bends. Moonwake teaches two visible moon gates, each revealing passing hidden enemies for six seconds, then tests simultaneous entrances. Stormglass alternates close escorts and isolated targets before the Dreadnought.
2. **Consequences are easier to see.** Shatterburst names the number of shells exposed. Escort openings, interrupts and released commands take priority over routine proc text. Banked towers show their real reach and a suspended charge. Moon gates mark their actual crossing positions.
3. **One deliberate command per wave.** After choosing a signature, Sol can bank a Blast shot and ignite existing burns; Mira can hold a Chime pulse for crowd control or a boss-signal interrupt; Ivo can bank a lightning volley for a concentrated armour-piercing hit. Holding stops that tower firing. Q or the labelled combat button banks/releases; the adjacent discard button restores automatic fire. Selling the owning tower spends the command for that wave. Upgrading retains it.
4. **Reed Crossing has a return canal.** The upper island can attack two separated portions of the main route. The side inlet joins below that island, requiring a second defence in the lower basin. Old Reed Crossing saves retain the previous map.
5. **A consequential passage choice.** After wave 6 in expeditions, 12 in chapters or 20 in endurance, the game waits for a choice. Intercepting the convoy pays 180 glow immediately and adds armoured fronts to the next three waves. Guarding the channels adds two runner groups per wave and pays 90 extra glow after each clear. The choice and reward are saved; it cannot be collected twice.

## What was cut

- New runs have one signature choice. The later support-technique selection with small percentage modifiers is removed. Historical saves retain both choices.
- The main watch is now a 24-wave chapter with three acts. Removed encounters transfer their clear income into retained waves; unlocks and prices follow the shorter progression. The 40-wave endurance option remains available, with separate records. Prior 40-wave records remain visible.

## Front end

The title uses a bespoke canal-city illustration, a large two-line wordmark and restrained lantern-gold controls. Continue is the first action when a save exists. Watch setup compares keepers and waterways on one screen. Expeditions have a route index, a selected encounter illustration, a three-part tactical brief and an optional contract. The district, invader guide and settings share the same full-screen visual treatment. In-play tower inspectors remain compact.

Responsive layouts cover desktop, narrow phones and landscape phones. Dialog focus, keyboard navigation, reduced-motion settings, large-text mode and saved-game warnings remain part of the interface.

### Generated illustration

- Runtime asset: `public/nightward-nocturne.png` (1672 × 941).
- Generator: built-in ImageGen, generated for this project.
- Source output: `C:/Users/roger/.codex/generated_images/01a109cf-1773-7c21-989a-1e32a5167a7b/exec-3fcd374e-7afc-46be-9c06-fc8fe2cdd1e6.png`.
- Art brief: a nocturnal canal city, winding water and terraced roofs fading into mist; a monumental octagonal amber lantern tower on the right third, quiet dark water on the left for the title. Ink blue, petrol, slate and brass, painted concept-art shapes with gouache-like edges. No text or interface in the image. Avoid neon purple, glossy toy buildings, cute characters and busy fantasy spires.
- CSS crops the same scene responsively. Game towers, creatures, route diagrams and district buildings remain code-native artwork.

## Verification entry points

- `scripts/watch-director-test.ts`: six signature command combinations, actual effects, consumed fire, interruption, command ownership and discard, malformed saves, exact mid-command/mid-passage replay, route payouts and duration, moon gates, campaign income/unlocks, double-pass geometry, format records and historical journal credit identifiers.
- `scripts/director-balance.ts`: paid reference defences across both signatures, both passages, expeditions and chapters. `--maps --commands` adds the other chapter maps and endurance; `--stress --commands` covers Nightfall.
- `scripts/director-contracts.ts`: nine paid contract completions, all three heroes.
- `scripts/director-browser-qa.mjs`: isolated browser verification and screenshots at 1280×800, 390×844, 320×740 and 844×390. Uses a separate browser profile and leaves the player's saves untouched.
- Reports and screenshots: `artifacts/director-qa/`.

### Completed checks

- TypeScript checks and production build passed; Capacitor iOS asset/plugin sync completed.
- New command/passage tests, fixed storage, release integrity, watch experience, tactics and mastery suites passed. These include historical save migration and exact combat replay. The entire aggregate `npm run check` was not rerun.
- The final paid matrix completed 47/48 standard reference runs. Additional map/endurance coverage completed 13/15; Nightfall completed 6/6; all 9 contract objectives were won by their paid reference strategies. All three reference losses reached the final Matriarch.
- Four browser sizes passed menu selection, chapter creation, passage choice and all three bank/release/save/resume flows without browser exceptions or horizontal overflow.
- Additional 320×740 and 844×390 checks passed large text, system reduced motion, keyboard focus, two simultaneous saved-run actions, visible title-footer controls and the moon-gate board.
- iOS device performance and subjective enjoyment require playtesting on a device; asset sync does not establish either.

Paid reference bots check reachability and expose brittle strategies; they do not measure human enjoyment or establish a universal win rate. The basic planner can still lose to the final Matriarch or under-defend Stormglass's side entrance. Those remain counterplay problems rather than automatic wins.
