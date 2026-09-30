# Nightward: vibrant city and three heroes

## Delivered

The battlefield now uses turquoise water, coral workshops, jade gardens, blue observatories and warm windows. Buildings have roofs, doors, awnings, side windows and planted terraces; quay lights form small pools at night. Water currents, weather, tower firing mechanisms and enemy wakes animate. Day/night scenery transitions over 0.8 seconds. Reduced motion stills environmental and tower movement and removes the glow effects layer.

Combat feedback now includes short muzzle flashes, coloured trails, visible impacts and brief defeat petals. The fixed-path renderer previously never drew its glow layer. That missing pass is restored; camera shake remains off. Towers have role-specific recoil, swinging bells, owl wings and charged coils. Enemies have distinct body families, armour, readable eyes, bobbing and hit feedback.

The three immediately available heroes each have eight named towers, two specialisations per tower and five stages. All use familiar roles and unlock waves, making another roster learnable. A hero is fixed for the watch.

| Hero | Style | Tradeoff |
| --- | --- | --- |
| Sol, the Emberwright | Volleys, wide blasts, armour pressure, larger harvests | Shorter sight and weaker slowing |
| Mira, the Tidekeeper | Piercing shots, lasting slows, wide night shelter | Softer hits and smaller harvests |
| Ivo, the Stormcaller | Quick reloads, extra chains, two starting beams, attacking income tower | Short reach; less damage concentrated on one target |

Each tower has a mechanical difference, a unique name and branch names, hero architecture and projectile accents. Exact rules are centralised in `src/game/heroes.ts`. Clear one- or two-sentence descriptions explain the use and tradeoff; numeric base stats appear in the inspection sheet. Sky rules lead with the current forecast and the exposed-tower count, with clock details in an optional disclosure.

Hero selection, tower definitions, stats and projectile state survive a save or retry. Old watches without a hero preserve their original balance. Per-hero records and credit keys prevent one hero overwriting another's record or duplicating journal progress. Commissions retain their separate slot and all three heroes can play them. A same-seed rematch preserves the original roster.

## Audit and design choices

The previous battlefield used similar grey-green values for ground, buildings, water and enemies. Towers were largely static and the fixed renderer discarded luminous effects. The revision keeps the architectural perspective, route geometry, mobile hit areas, local DM Sans, accessible focus states and existing navigation. It increases colour separation, silhouette variety and meaningful combat motion. Design-taste settings: variance 7, motion 6, density 5; this is a custom canvas game aesthetic, not a borrowed component system.

Scenery and light sprites are cached. The update adds no rendering dependency. The hero portraits are code-drawn geometric illustrations. Title and native launch art use the new generated city image. Background testing uses `?muted=1`.

## Verification

- 24 unique tower names and mechanically distinct base stat profiles; all 48 specialisation paths reach the cap and restore their correct hero stats.
- Exact mid-combat save continuation for all three heroes, invalid hero rejection, and unchanged pre-hero stats.
- 72 paid-build campaigns: all 48 Standard/Relaxed runs won; 23/24 Nightfall runs won with the same mixed reference planner. Ivo on Reed Crossing, seed 1047, failed at wave 15. An additional all-fan opening also failed. These results measure the reference strategies, not every possible build.
- All nine hero/commission combinations completed.
- Separate hero records, idempotent journal credit, persisted choice and isolated campaign/commission saves passed.
- Core simulator self-tests and all 11 release checks passed.
- Existing integrity suite: 15 historical Wickwater runs exactly match their original snapshots and outcomes.
- Existing fixed-storage and environment checks passed, including 16 balanced/greedy campaigns, clock boundaries, pause behaviour, harvest averaging and exact reloads.
- Browser verification covers the hero chooser, all eight Ivo descriptions, Mira purchase and upgrade, roster persistence after reload, tower sheets and day/night battlefields at 1280×720 and 390×844. At 320×667 with larger text, the page has no horizontal overflow and all chooser buttons have at least 44px height. Reduced motion and muted audio controls were also checked. The production build fits 844×390 landscape without document overflow; the forecast disclosure is keyboard accessible and browser error logs are empty.
- Production TypeScript/Vite build and Capacitor sync pass. Physical iPhone installation and device performance still need hardware validation.

Evidence: `artifacts/hero-balance.json` and `artifacts/hero-progression.json`. New checks: `npm run test:heroes` and `npm run test:hero-progression`, included in `npm run check`.

## Title art provenance

Final asset: `public/nightward-city-v2.webp` (266 KB). Native launch copies: `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732{,-1,-2}.png`. Created with the built-in ImageGen tool, then encoded to WebP and resized for the launch-image slots. The previous title remains available as a historical asset.

Initial prompt:

> Use case: stylized-concept. Asset: illustrated title background for Nightward, a premium mobile tower defence game. Create a gorgeous colourful low-poly architectural miniature canal city at blue hour. The brief is vibrant and inviting, clean and tasteful, with clearly separated turquoise canals, coral brick workshops, jade roof gardens, indigo observatories, golden horizontal windows, brass bell pavilions and a tall warm lighthouse. Orthographic three-quarter elevated viewpoint, crisp geometric planes, rich material colour, soft directional shadows, carefully composed little promenades and planted terraces. The district should feel lived in and magical through small warm windows, flower planters and colourful awnings, without glitter, fireworks or overbearing glow. Keep the geometric flat-roof architecture dominant. Wide landscape 3:2 composition with the most beautiful tall landmark and canal bend on the right two thirds; the left quarter has darker indigo canal water and quieter scenery so real interface text can be overlaid legibly. Lower centre/right must also crop beautifully for a portrait phone. Sophisticated storybook 3D art, toy-like but not childish. Bold warm/cool contrast, crisp silhouettes. No text, no logo, no UI, no frames, no fog washing out the colour, no people close up.

Final edit prompt:

> Edit this title-background illustration. Preserve its beautiful turquoise water, warm/cool colour contrast, golden sunset and three-quarter canal-city composition. Change the architectural style decisively: every building must be a clean geometric modern miniature with FLAT ROOFS, squared block shapes, planted roof terraces, long RECTANGULAR illuminated strip windows, bold coral, jade and slate-blue facades, crisp polygonal trees. Replace every dome and round arch with flat-roofed pavilions and rectangular open frames. Replace the traditional lighthouse with a stacked square contemporary lantern tower; replace the central dome observatory with a faceted contemporary observatory. Make the whole illustration much simpler, cleaner and visibly LOW POLY, like a beautiful carefully built model city. Fewer tiny details, larger confident planes, soft directional light, crisp toy architecture matching a canvas tower-defence game. Keep the premium colour, clear water and glowing windows. No medieval/fantasy castle style, no European old-town arches, no stone balustrades, no domes, no decorative classical pillars, no text or UI.

