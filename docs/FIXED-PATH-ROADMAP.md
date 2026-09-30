# Nightward gameplay and visual roadmap

Prepared and executed 30 September 2026. The specification below records the original design targets. The implemented web build is now **Nightward**; see [delivery and verification](NIGHTWARD-RELEASE.md) for what shipped, the final numbers, and checks that still require physical hardware or human playtests. Earlier implementation documents describe earlier rules.

## Execution priorities and final art decision

1. **A coherent visual identity.** Nightward is a quiet canal district after dusk. The user's architectural references supersede the cottage and storybook treatments discussed below: flat roofs, planted terraces, slate planes, warm rectangular windows, architectural tower silhouettes, DM Sans and restrained feedback. Title, battlefield, menus, loading art and native icon use that direction.
2. **A phone composition that fits.** Keep the entire board visible, reserve headroom for the tallest upgrades, give every gameplay button at least 44 pixels, and move purchasing into paused contextual sheets. Use extra desktop width for a slim command column.
3. **Fewer, better decisions.** Remove route switching, crosspaths, combat guardians, supplies and battle plans from new play. Keep placement, role coverage, one branch commitment, targeting and a five-stage investment ladder. Add undo and clear next-wave information.
4. **A campaign worth mastering.** Rebuild the fixed-route economy and all four maps, introduce counters in sequence, revise gate-dependent bosses, and test paid builds that omit a Lighthouse, Garden or Bonds. Keep same-seed rematches and separate assisted Nightfall records.
5. **Return goals with visible rewards.** Add two bounded Tower Bond recipes and three permanent five-wave District Commissions. Restore windows across the district, retain the field journal and award cosmetic architectural details without increasing permanent combat power.

These priorities are implemented in the web release candidate. Physical iPhone installation, device frame-time measurements and observed newcomer/returning-player sessions remain validation work, not claimed results. Sections 1–13 retain the deeper execution rationale; where an early proposal differs from the final implementation, the delivery report is authoritative.

### Added during execution: the changing sky

The user's follow-up adds a deterministic active-time day/night cycle and smaller random weather effects. This is integrated into priority 4, with lighting changes in priority 1 and a compact forecast in priority 2. Daylight favours Garden income and Ballista reach; night speeds enemies and reduces unsheltered artillery coverage while improving lamplit specialists. Owl placement provides a resilient response. Weather is seeded, bounded and forecasted. Garden income averages time actually fought in each condition, preventing idle farming. The execution gate is exact sky/harvest saves plus paid-build comparisons across maps, seeds, modes and early economic greed. See the [final sky rules and evidence](NIGHTWARD-RELEASE.md#timed-daylight-strategic-nights-and-weather).

Lantern Guard should become a readable, expressive defence game about building a small community of towers beside fixed canals. The player studies the next threat, spends limited glow, chooses where and how to specialise, then sees the defence carry out that plan. Success should visibly strengthen the village and give the player a specific new idea to try. Its presentation should be premium, clean, beautiful and restrained, with mobile composition treated as a core design problem.

The committed direction is to remove lane and direction switching from the playable game. The principal new mechanic to prototype is **Lantern Bonds**, a small set of deliberate tower partnerships. A second, optional addition is **Village Commissions**, short defence objectives with visible settlement rewards. Both must justify their complexity through playtests before receiving full production work.

## 1 Product decisions

The design should follow these constraints:

- The entire relevant battlefield fits on a phone without panning. Fixed routes remain visible and predictable throughout a run.
- Placement, coverage, spending, specialisation and tower partnerships determine success. Pausing remains a legitimate tool at every difficulty.
- Every new threat is demonstrated before it appears in a dangerous combination. Every required capability has more than one affordable answer.
- A purchase changes something the player can see, hear or explain. The interface shows the actual next benefit and its cost together.
- Mobile is the reference layout. Give the battlefield sufficient space and the controls readable dimensions before producing final assets. Desktop then uses its extra space deliberately.
- Visual quality comes from composition, drawing, materials, typography and precise feedback. Effects should communicate an event without constantly demanding attention.
- Failure identifies a repairable problem. Repeating a run lets the player test an idea under comparable conditions.
- Returning players receive new situations, expressive rewards and achievable mastery goals. Permanent combat power does not increase through grinding.
- New systems replace overlapping systems. The launch scope remains eight towers, four maps and the existing enemy roster.

These constraints draw on Lars Doucet's discussion of readable boards, time control and multiple answers to threats in [Defender's Quest](https://www.gamedeveloper.com/design/optimizing-tower-defense-for-focus-and-thinking---defender-s-quest), and Matthew Davis's emphasis on constraints, limited menus and telegraphed information in the [Into the Breach design postmortem](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf). The mechanics and numerical targets below are proposals for Lantern Guard, not findings from those sources.

### Current strengths and problems

Keep the deterministic simulation, exact saves for a given rules version, compact board, tower personalities, warm lantern theme, pause controls, colour-safe settings and cosmetic settlement progress. The code already records useful combat facts and implements shared-coverage relationships between towers.

The current game also carries several overlapping decisions: two upgrade paths with crosspaths, levels through seven, guardians that modify tower behaviour, battle plans, supplies, plot purchases, targeting and routes. More content would multiply tuning and learning costs. The new version should explain a smaller set of decisions more clearly.

Existing balance evidence is useful as a baseline, but cannot validate fixed-path maps or new mechanics. The latest documented 64-run matrix gives different outcomes for different build preferences and maps. These are scripted outcomes, not human win rates. Existing documentation also leaves physical iPhone play and observed return behaviour unverified.

### Keep, change and retire

| Area | Decision for the new rules | Reason |
| --- | --- | --- |
| Canal switching | Remove all player control and switching variants | Commits to the requested direction |
| Fixed routes | One authored route per entrance; entrances may merge | Makes coverage legible and predictable |
| Tower roster | Keep eight; introduce gradually | Enough combinations already exist |
| Upgrade structure | Prototype five visible levels with one branch commitment | Fewer purchases with greater identity |
| Crosspaths | Retire in the new rules | Avoids a second branching rule on every tower |
| Battle plans | Retire the separate selection system; reuse good effects in branches | Consolidates overlapping specialisation |
| Wave supplies | Remove the recurring purchase menu from the initial redesign | Gives spending choices and Bonds room to breathe |
| Guardians | Preserve earned identities, records and cosmetics; move combat effects into tower branches | Avoids multiplying every balance case by a loadout modifier |
| Family colour damage bonus | Remove the ordinary-enemy 1.5x matching rule in the new rules | Explicit roles and armour/detection rules explain effectiveness |
| Early wave calling | Remove income bonuses and overlapping waves from the new campaign | Difficulty should not reward hurried inputs |
| Plot purchases | Keep, with costs and availability rebuilt around each fixed map | Space competes with tower strength |
| Target priority | Keep in advanced controls with sensible defaults | Useful agency without a mandatory tutorial |
| Daily and weekly play | Keep the short-session format; use authored situations and a browsable archive | Supports returning without missed-day pressure |
| Permanent progress | Cosmetic restoration, records and sidegrade content | Preserves a consistent skill challenge |

All retirements are design recommendations for new gameplay. They require explicit migration handling for existing progress and unfinished runs, described below.

## 2 Remove routing completely

This work is a map and rules redesign. Hiding the two gate buttons is insufficient.

### Maps and controls

Author a single continuous path from each entrance to the Great Lantern. Where two entrances exist, their routes can merge, but the player never chooses a branch. Do not introduce changing tides, lane closures, maze building or a planning-only switch as substitutes.

Start with Millpond. Redraw its canal and plot positions together so every purchasable plot has an intelligible use. Former bypasses should become scenery or be removed from the artwork; an unused water channel must not look like an enemy route. Keep the 720 by 840 world footprint unless device testing establishes a reason to change it.

Remove gate hit targets, arrow dials, both dock controls, route-comparison panels, charms and their purchase flow, Q/E shortcuts, gate coaching, gate cooldowns, tidal switches and the Slow at the locks setting. Reassign the recovered screen space to the battlefield and a compact wave forecast.

Retain a path preview as information: selecting an entrance or wave highlights the route enemies will actually travel. It never changes their destination or direction.

### Rules and content dependencies

- Remove routing rewards, routing escape penalties and route-specific scoring from the new rules.
- Remove the bridge's reveal and mill's armour-breaking combat effects. Their art can remain as landmarks. Towers must supply the necessary answers, with affordable alternatives.
- Remove fixed-lock, tidal-lock and charm-related challenge modifiers. Replace them with authored composition, coverage and budget situations.
- Retire gate-flip achievements and migrate earned recognition into legacy records. Replace future achievement goals with role mastery, coverage and deliberate spending.
- Update first-run coaching, enemy tips, tutorial diagrams, journal entries, returning-player briefings, postcards, screenshots, app descriptions and keyboard help.
- Replace route-derived leak descriptions with actual path location and entrance, such as lower bend or side inlet.

### Boss revisions

Gloomtoad loses lock jamming. Build its encounter around the existing smaller-enemy spawning ability, with a clear warning, bounded escort count and a recovery interval. It teaches handling a heavy target and its crowd together.

Old Gloom splits at an authored point on its fixed path. Both children continue forward on that route, with controlled spacing. Retune combined health, travel time and rewards so this tests sustained coverage rather than defending selectable branches. Preview the split before the encounter.

Warden can retain its telegraphed escort protection and acceleration. Bloomheart can retain its healing cycle. Introduce their component behaviours earlier in smaller encounters. Final encounters should combine learned demands, with visible opportunities to respond.

### Completion gate

Every playable mode has immutable enemy routes. UI, keyboard, tutorials, modifiers and saved-run entry points cannot expose switching. Each tower plot has measured coverage on the actual enemy paths. Detection, armour and every boss remain solvable without a gate or utility landmark.

## 3 The core loop and learning sequence

The repeated loop is: inspect the next wave, choose where to spend, watch the defence, inspect the outcome when useful, improve the plan. A five-wave milestone creates a natural stopping point and a visible reward.

At planning time, show the next enemy types, their entrances, the new property that matters and one relevant milestone. Exact counts and deeper statistics are expandable. A forecast can report uncovered path or absent detection; it must not claim a guaranteed outcome from coverage alone.

The first ten waves should teach through play:

| Wave | New lesson | Player action and feedback |
| --- | --- | --- |
| 1 | Placement and reach | Place Wickling; highlight reachable water; watch a manageable stream |
| 2 | Spending and improvement | Compare another tower with the first upgrade; show the result visibly |
| 3 | Groups | Introduce Cracker with a small cluster that demonstrates splash |
| 4 | Speed and control | Introduce Moonbell against a few fast enemies |
| 5 | Combining familiar tools | A modest mixed wave; show a first village restoration and clear stopping point |
| 6 | Space and a partnership | Expand a plot and demonstrate the first Bond using towers already understood |
| 7 | Concealment | Demonstrate Lamp Owl and an affordable alternative before a small Veil group |
| 8 | Armour | Show armour breaking; the player's earlier damage options remain useful |
| 9 | Preparation | Combine two learned properties and let the player revise the defence |
| 10 | An encounter with a warning | Gloomtoad's announced escort burst; reward the first completed act |

This is a prototype sequence. If wave 6 overloads beginners, separate plot expansion and the Bond demonstration. Introduce one rule at a time; counters must be available and affordable before the threat that tests them.

Early building mistakes should be recoverable. Allow undo for purchases and moves made during the current planning phase, before combat or rewards occur. Once a wave begins, normal economic consequences apply. Between-wave relocation retains a modest, visible glow cost; the existing 25-glow fee is a starting comparison, not a final price. Selling starts from the existing 75% refund for testing.

Relaxed and Standard retain retries from the last planning break. Nightfall keeps the same information and pause controls, with a separate unassisted record for a clean run. A player who chooses to practise a failed Nightfall wave can learn from it without the attempt becoming an unassisted clear.

## 4 Lantern Bonds

Lantern Bonds are the primary replacement for switching: the player deliberately pairs two towers covering the same part of the canal. A quiet strand of light joins them, and a recognisable combined action occurs automatically in battle.

The choice is which towers deserve a scarce partnership slot and where to place them. It does not require repeated tapping or changing enemy movement.

### Initial prototype rules

- One active Bond becomes available after the first five waves. Test a second slot after wave 20; do not add more initially.
- Each tower may belong to one Bond. Partners must cover a meaningful shared stretch of the active path, not merely touch range circles over scenery.
- Form or change Bonds between waves. There is no new currency and no recurring activation cost. The slot, tower investment and placement constraint supply the opportunity cost.
- Existing standalone tower behaviour and ordinary support interactions continue without a Bond.
- Bond effects use bounded charges or cooldowns, with deterministic triggers. Additional effects cannot trigger another Bond recursively.
- Moving, selling or changing a tower previews any loss of eligibility. Never silently reconnect it to a different tower.
- During combat, the connecting strand appears mainly on selection or activation. It must not cover the board with permanent bright lines.

### Two recipes to test first

| Partnership | Proposed combined action | Choice it creates |
| --- | --- | --- |
| Moonbell and Cracker, Shatterburst | A toll primes the partnered Cracker's next eligible blast to remove a limited amount of armour within that blast; a cooldown limits repetition | Invest in a crowd-breaking bend, accepting shorter shared coverage and the cost of two towers |
| Lamp Owl and Wickling, Guiding Light | Owl marks one revealed enemy; the partnered Wickling's next eligible volley gains a bounded armour-piercing strike against that target | Concentrate reliable damage on a priority threat while leaving the other Bond unavailable |

These are effect proposals, not tuned values. The preview should use one sentence and a brief animation. Exact damage, target limits and cooldowns belong in the inspected details and must come from the simulation definitions.

If both recipes solve the same situations, revise one before expanding the catalogue. A later Storm Reed and Ballista partnership is a possible extension only after the first recipes produce distinct decisions. There should be no requirement to author every possible tower pair.

### Failure conditions

Remove or redesign Bonds if players simply connect the same pair every run, cannot explain the combined action, feel forced to buy a support tower they do not otherwise want, or spend more time managing connections than planning defence. If the prototype fails, retain fixed paths and improve ordinary tower specialisations; route switching remains removed.

Compare competent builds with and without Bonds. Standard must remain winnable through strong placement and investment without mandatory recipe knowledge. Avoid balancing every threat around perfect Bond use.

## 5 Towers and a balanced economy

### A clear job for each tower

| Tower | Primary strength | Limitation to preserve |
| --- | --- | --- |
| Wickling | Affordable sustained damage and cleanup | Needs specialisation or help against armour and dense crowds |
| Cracker | Clumped enemies and armour breaking | Gaps between shots and weaker value against isolated runners |
| Moonbell | Buys firing time and enables control combinations | Low direct damage; duplicate slows should have limited value |
| Lamp Owl | Reveals enemies and supports a shared firing zone | Requires useful allied coverage; modest solo damage |
| Glow Garden | Converts early spending and a plot into later resources | Delays combat strength and has finite time to repay |
| Lighthouse | Sustained damage along useful sightlines | Bounded piercing and target count; must not dominate every situation |
| Storm Reed | Reaches several nearby targets in a chain | Limited value against isolated durable targets |
| Dusk Ballista | Heavy damage to armoured or high-health enemies | Slow cadence and overkill against small crowds |

Balance effective performance on real path geometry. A long-range tower's firing uptime, a Garden's occupied plot, a support tower's enabling effect and a Ballista's wasted overkill all matter beyond nominal damage per second.

Armour and concealment each need multiple realistic answers. For example, early armour can be handled by Cracker or an affordable Wickling branch. Concealment can be answered through Owl support or a suitably priced detection branch. Availability, placement and price must make those alternatives practical at the introduction wave.

### Five visible upgrade levels

Prototype a single progression of **Base, Improved, Specialised, Mastered and Crowned**. At Specialised, choose one of two branches; later purchases deepen that choice. A final transformation adds a role-specific behaviour with a conspicuous visual change. Remove the separate crosspath rule.

Keep the existing effects that produce distinct roles, including selected guardian and battle-plan ideas, but place them in this one upgrade structure. Avoid a final purchase that only adds a small percentage to damage. A stronger Wickling could gain a clearly different fan or piercing pattern; an advanced Ballista could gain a visibly heavier bolt or controlled follow-up shot.

Costs should keep expanding coverage competitive with upgrading an established tower. A player should rarely be able to maximise the entire board. Late arrivals such as Ballista need an affordable path to relevance within the waves remaining.

### Income and choice management

Use one spendable run resource, glow. Light remains the health of the Great Lantern. Rewards and restoration require no additional spendable currency.

Prototype a budget in which roughly 80% of expected non-Garden income comes from surviving a wave and 20% from defeats. This is a test parameter, not a release commitment. Its purpose is to let early leaks cost light without also making future preparation unaffordable. Measure the actual budget across every map and difficulty.

Keep Garden payback tied to incremental income and waves remaining. Its support or healing branch can remain relevant late, while the pure income branch should state honestly when it will not repay. Test zero-, one- and two-Garden builds and expose overinvestment as a deliberate risk rather than an obscure trap.

Remove early-call bonuses from this economy. Faster playback changes session length, not earnings. Price plots, base towers, specialisations and capstones together, then tune enemies against those spending opportunities.

## 6 Difficulty and campaign pacing

Retain the 40-wave structure for the first comparison build, organised into eight five-wave acts. Shorten it if observed sessions contain repetitive waves or exceed the intended time through waiting. Forty is a starting scope, not a requirement that overrides pacing.

| Waves | Main decision | Pacing and content |
| --- | --- | --- |
| 1 to 5 | Where should the first defence stand? | Three basic roles, generous recovery, first visible village reward |
| 6 to 10 | Which threats need support? | First Bond, concealment and armour taught separately, Gloomtoad |
| 11 to 15 | Expand coverage or invest for later? | Garden and the fixed side entrance introduced on different waves; first branch commitments |
| 16 to 20 | How should this build specialise? | Lighthouse, mixed formations and a stronger familiar encounter |
| 21 to 25 | Crowd coverage or concentrated damage? | Storm Reed; Old Gloom's forecast split; possible second Bond slot |
| 26 to 30 | How should the defence handle escorts and heavy targets? | Ballista and Warden, with constituent behaviours already demonstrated |
| 31 to 35 | Which final investments matter most? | Difficult combinations, capstone choices and short relief intervals |
| 36 to 40 | Can the build execute its plan under pressure? | Known mechanics combined; Bloomheart provides a readable final test |

Unlock timing is provisional. Do not introduce a tower, a new entrance, an enemy property and a progression menu at the same milestone. Show a side entrance on the map from setup, and warn again at least two waves before it activates. Once active, its route stays fixed.

Alternate demonstration, combination, pressure and relief. Raise difficulty primarily through combinations, timing, entrance coverage and limited spending. Health increases can support this pacing, but cannot carry the entire difficulty curve.

| Mode | Experience | Proposed tuning approach |
| --- | --- | --- |
| Relaxed | Learn, experiment and enjoy restoration | Larger light reserve, wider spending margin, less simultaneous pressure, planning retries |
| Standard | Reward good choices with recoverable mistakes | The reference economy and authored learning curve; credible alternative builds |
| Nightfall | Demand efficient planning and adaptation | Tighter margins and stronger known combinations; full forecast and pause remain available |

First-run Standard completion is not the only measure of fairness. Observe whether a player understands losses and improves on a repeat. A boss that abruptly demands one previously optional tower is a design failure even if a bot can beat it.

## 7 Village Commissions and reasons to return

Village Commissions are the optional second addition. A resident requests a defence feat across a short, known sequence. Completing it visibly changes a specific part of the village: a bakery lights up, a greenhouse fills with flowers or a boatmaker launches lantern boats.

Begin with three authored commissions after the first ten-wave act. Show the request, exact constraint, forecast and reward before acceptance. Support one active commission, a clear decline action and a retry of the same scenario. Declining or failing does not remove earned restoration or damage the main campaign.

Examples to prototype:

- **Room for the market:** keep one marked building plot empty for five specified waves. The constraint asks whether existing towers can cover the gap; completion adds a market stall.
- **The glassmaker's order:** complete a short armoured procession within a stated spending budget. Armour-breaking branches and partnerships provide different solutions; completion restores stained-glass windows.
- **The gardeners' watch:** hold a supplied starting defence with one Garden already occupying a plot and a limited improvement budget. The puzzle is allocating the remaining space; completion grows a new flower bed.

These are authored optional situations, not procedural errands. Validate their starting state before offering them. If an in-campaign commission cannot guarantee a fair starting state, deliver it through the existing separate challenge slot instead. Difficulty and first completion rewards are declared, and repeat completions improve a record without duplicating unlocks.

### Three reward timescales

Within a wave, reward successful plans with crisp impacts, visible combined actions and clear enemy transformations. At a milestone, reveal a tower transformation, a small restoration or a newly available option. Across sessions, offer another map, a different branch, an unfinished commission or a personal best to improve.

Give players direct access to earned maps. Keep a recommended next map, but stop forcing automatic rotation. Offer Play this map again with the same encounter seed for a controlled rematch, alongside a fresh variation.

Retain guardian names, portraits and earned cosmetics. Their new progression emphasises demonstrated play, such as a clear with a tower branch or completion of a corresponding commission. Keep existing cumulative records, but avoid building the future reward schedule entirely around hundreds of repeated waves.

Returning players should see Continue, a concise defence reminder and one relevant optional goal. Preserve campaign and challenge saves independently. A ten-wave challenge is available for a shorter session; five-wave campaign breaks are natural places to stop.

Daily and weekly selections can feature existing authored scenarios. Keep previous selections playable, with no expiring exclusive reward, escalating login streak or penalty for an absence. Begin with a small archive before expanding the calendar content burden. Cloud services and global leaderboards are outside the initial redesign.

## 8 Visual design and feedback

The art direction is a carefully illustrated miniature canal village with a restrained storybook influence: cool water and moss, warm lantern interiors, readable stone and timber, expressive towers and controlled light. Aim for a premium small game with a coherent art direction. Preserve the recognisable palette while improving shape, material and hierarchy.

### Mobile UI and graphics audit

The current build was inspected on 30 September through the local browser at several CSS viewport sizes. The tested late-game state is the existing Gallery tower upgrades fixture, Millpond after wave 25, with nine towers, 1,079 glow, 23 light, a preparation offer and guardian progress visible. Measurements come from live DOM layout. Existing gameplay images were also reviewed. Fresh browser screenshot capture failed during this pass, so these findings establish layout dimensions and CSS behaviour rather than a complete new visual screenshot review or physical-device test.

| Viewport | Battlefield container | Bottom or side dock | Finding |
| --- | --- | --- | --- |
| 320 by 667, opening tutorial | 320 by 247px | 320 by 367px | The first lesson gives more height to controls and coaching than to the battlefield |
| 320 by 667, late planning | 320 by 235px | 320 by 380px | Battlefield receives about 35% of the viewport height |
| 375 by 667, late planning | 375 by 250px | 375 by 365px | A wider short phone still compresses the map severely |
| 390 by 844, late planning | 390 by 426px | 390 by 365px | Taller phones recover room, but the dock remains expensive |
| 430 by 932, late planning | 430 by 514px | 430 by 365px | Layout depends strongly on available height |
| 844 by 390, landscape | 536 by 390px | 300 by 338px, side layout | Landscape uses a different composition and needs its own inspection |
| 1280 by 800, desktop | 856 by 768px | 380 by 706px, side layout | The board gets a generous independent area, explaining the better desktop fit |
| 320 by 667, larger text | 320 by 231px | 320 by 383px | Larger text does not resolve the underlying allocation of space |

Values are rounded; they describe these specific UI states. The board is fitted inside the battlefield container with preserved proportions. In the 320px late-planning case, the 720 by 840 world therefore scales to roughly 201px wide, despite a 320px available viewport. Its 68-world-unit stone pads become about 19px wide visually. This is a geometry calculation from the renderer and measured field, not a measured touch-target size.

The normal 320px late roster has 675px of scrollable content inside a 304px area. The first three tower cards fit, the fourth is partial, and the late specialists require horizontal scrolling. This is deliberate overflow rather than an accidental whole-page overflow, but it conceals choices and devotes 138px of height to the strip. At 390px, 813px of content still sits in a 374px strip. No whole-page horizontal overflow was detected in the measured comparison states.

The inspected Garden upgrade sheet at 320px had approximately 222px of visible height for 262px of content. Two columns were only 137px wide, and benefit descriptions used 11px type with 12.1px line height. Its header subline had about 122px of available width and ellipsis styling. Close remained a 44px control, which should be preserved. A standard new-game setup fitted inside 320 by 667 in this check; the problem is not that every screen overflows.

The title's key artwork has `display: none` below the existing 720px height breakpoint. The upgrade CSS separately increases description size on desktop, so the current experience explicitly gives phones the smaller text. These are repairable layout choices rather than a need for higher-resolution sprites alone.

Relevant implementation locations are the stacked `#dock` controls and compact tower-sheet overrides in `src/style.css`, height-dependent board scaling in `src/render/renderer.ts`, and dock contents assembled in `src/app.ts`. A supplied screenshot from the user's actual device could refine a device-specific diagnosis, but the confirmed issues above are sufficient to start redesigning the layout.

### Mobile layout redesign

Treat combat, planning and inspection as three deliberate compositions. Stop accumulating permanent banners beneath a permanently expanded shop.

- During ordinary combat, show a compact status header, the full battlefield, a small forecast when useful and a compact command bar. Tower shopping is contextual. Reserve persistent attention for threats and actions needed now.
- During planning, show Start wave, Build and the concise forecast. Put mastery, restoration, commission progress and detailed records behind one inspectable progress entry or in the milestone recap. Bond management shares the selected-tower sheet.
- Tap an empty plot to open a legible build picker with portraits, roles and costs. On short phones, use a dedicated paused sheet with a clear selected-plot preview. Do not force all eight tower cards into the permanent HUD.
- Selecting a tower opens one contextual panel. Default to a readable single-column branch comparison on narrow phones. Keep the selected tower identifiable, use a sticky action area and keep the close control reachable.
- A detailed sheet may intentionally cover part of a paused battlefield. Keep the camera and world scale fixed underneath, instead of repeatedly shrinking the map to preserve every background detail. Closing returns to precisely the same framing.
- Reserve height for the normal command bar and use controlled overlay states for temporary messages. Optional notifications must not make towers jump position during play.
- Keep all relevant enemy paths in the ordinary battle view. If wider controls need more room, simplify the controls or revise map composition before reducing sprites below readability.

Prototype around a 48 to 56px status header and a 56 to 64px command bar, with one compact forecast row. These are starting dimensions, adjusted for safe areas and large text. Target at least 65% of usable height for the battlefield in normal combat on a 320 by 667 viewport. A temporary paused inspection sheet has a separate layout budget.

Use at least 44 by 44 CSS pixels for primary touch controls as a proposed baseline, with spacing and tests for neighbouring hit areas. Canvas targets can have a larger interaction area than their art, but overlapping targets need deterministic nearest-target selection and visible feedback. Do not mistake a larger bitmap or higher device-pixel ratio for a larger touch target.

Critical descriptions and decisions should usually use 15 to 16px type; keep secondary text around 13 to 14px where it remains comfortable. Large text must reflow content rather than force a scaled-down battlefield. Permit appropriate sheet scrolling, keep purchase cost and action together, and avoid nested scrolling inside individual choices.

Test 320 by 667, 375 by 667, 390 by 844, 430 by 932, a short viewport with browser chrome, landscape and tablet. Exercise opening, every roster size, long tower names, large resource totals, both branches, Bond selection, boss warnings, defeat, victory, return briefings and large text. Physical iPhone Safari and Capacitor checks must include actual safe areas, text settings and finger targeting.

Mobile layout sign-off is a dependency for full asset production. Record reproducible screenshots, dimensions and tap outcomes for the revised build; the current failed capture does not count as visual sign-off.

### Premium art and motion standard

Use consistent perspective, clean silhouettes, convincing contact shadows, quiet material texture and a small set of light values. Water should feel luminous without looking neon; stone and timber should remain readable without heavy noisy outlines. Give landmarks enough space to breathe. A crafted tower should remain attractive with particles disabled.

Keep a restrained radius scale and a limited set of panel treatments. Use typography, alignment and spacing to establish hierarchy before adding borders, glows or badges. Refine the wordmark alongside the assets; do not assume the current rounded face should spread across the entire interface.

Ambient motion should be slow and sparse: subtle water movement, occasional reflected light and a small idle gesture. Most towers should be visually quiet when they are not attacking. Recoil and anticipation communicate weight, and each tower gets a clear attack silhouette.

Reserve the strongest light, sound and motion for a capstone transformation, a boss warning or the end of an act. Ordinary hits should not shake the camera. Avoid continuous button pulsing, broad screen flashes, constant floating damage numbers, persistent sparkling outlines and confetti after routine waves. These limits implement the requested restrained aesthetic.

Define priorities for competing effects: an imminent leak or boss cue must remain visible above ordinary attacks; a Bond activation should be readable without hiding the enemy. Specify maximum concurrent particles, short lifetimes and screen coverage limits using the finished sample and minimum-device measurements. Reduced motion preserves meaning with still indicators and brief opacity changes.

Evaluate the art sample both paused and during the busiest wave. The paused frame tests composition and craftsmanship; busy play tests hierarchy. Premium quality must survive both.

### Tower and enemy assets

Produce an art reference sheet covering silhouette, perspective, ground contact, lighting direction, materials, colour roles and animation timing. Review it at actual 320px and 390px phone widths.

Each tower needs readable base, improved and branch identities, a capstone transformation, idle behaviour, firing anticipation, attack, recovery and upgrade feedback. Five visible levels with two branches imply shared early states and separate later states; reuse components rather than commissioning unrelated art for every combination. Guardian cosmetics attach to these forms without creating separate mechanical families.

Start production with Wickling, Cracker and Moonbell. Establish Owl and Ballista silhouettes as checks that small creatures and heavy structures can fit the same visual language. Reuse the same asset definitions in the board, shop, portraits, upgrade preview, journal and title illustration.

Use authored sprite assets for expressive forms where they improve quality and retain Canvas for paths, ranges, lighting and effects. The renderer technology does not determine the style. Prove one complete tower and its animation at phone scale before converting the full roster.

Enemy silhouettes should distinguish speed, armour, concealment and healing without relying on colour. Broken shells, revealed bodies and interrupted protection must read during ordinary play. Effects yield to path visibility and threat warnings.

### World and interface

Give each waterway an architectural landmark and different useful placement geometry. Millpond uses its mill and sheltered bends; Reed Crossing emphasises reed beds and a shared approach; Lantern Reach uses longer sightlines and distant coverage; Stone Weir tests separated approaches feeding a common lower defence. Keep these paths fixed.

Make village restoration large enough to notice, with a short before-and-after reveal outside active combat. Flowers, windows and boats should occupy quiet areas rather than build plots or the enemy path.

Use one readable text family consistently in menus and canvas labels. Keep Fredoka selectively for the wordmark or celebratory text and audition a compatible body face at small sizes. Establish a type scale, stable-width resource numerals and contrast rules. Critical benefits and costs cannot depend on the present 11px or 12px supporting text.

Rebuild the tower sheet around portrait, role, branch choice, next benefit and cost. Place precise statistics, selling, targeting and detailed records behind inspectable controls. Preserve large-text layout, keyboard access and reachable close buttons.

The native launch image, app loading state and title menu should share the same visual composition. Use a static launch image that hands off cleanly to a calm animated village menu. Adapt artwork to short screens rather than hiding it entirely. Display progress only for actual work and never impose a decorative wait. Resume into a paused, readable defence.

### Sound and haptics

Keep a small coherent sound palette. Distinguish candle sparks, bell tolls, timber recoil and armour cracks. A Bond activation adds a brief combined motif. Prioritise warnings and rare rewards above repeated attack sounds, cap simultaneous voices and avoid loud celebration after every wave. Haptics acknowledge committed purchases and major outcomes. Every tactical signal remains understandable when muted or using reduced motion.

## 9 Explain outcomes without overwhelming the player

Provide an optional compact wave recap with enemies stopped, light lost, escaped enemy types and locations, and measured tower contribution. Existing damage and leak records provide a starting point.

Show support facts directly: revealed enemies subsequently hit by allies, blast hits on slowed enemies, Bond activations and wasted charges. Do not invent a precise percentage of damage caused by a support tower without a defensible measurement model.

Advice should refer to the current board and one observed issue. For example, a hidden enemy escaped past the lower bend where no detector covered its path. Tapping the advice highlights that gap. A relevant alternative can be an upgrade or relocation; avoid prescribing the same tower every time.

Keep complete records of leaks even when Gardens later restore light. A full final light bar is not a flawless run. Compare rematches using the same seed and rules version, and keep practice results distinguishable from unassisted records.

## 10 Execution phases

Each phase ends with a playable or reviewable deliverable. Durations should be estimated after the first prototype and asset sample establish actual production effort. This roadmap does not assume that art production, human testing and device validation can be completed in the same iteration as a code change.

| Phase | Deliverable | Dependency | Completion evidence |
| --- | --- | --- | --- |
| 0 | Rules brief, mobile audit, dependency inventory and baseline evidence | None | Current behaviour, phone layout failures and saves documented; future removals separated from shipped features |
| 1 | Fixed-path Millpond for ten waves | Phase 0 | Every entrance follows a stable route; no switch affordance or gate-dependent encounter |
| 2 | Mobile layout, learnable opening and economy prototype | Phase 1 | Stable readable board, contextual controls, forecasts, affordable counters, undo and failure feedback work together |
| 3 | Lantern Bonds experiment | Phase 2 | Two visible recipes tested against ordinary builds; retain, revise or cut decision recorded |
| 4 | Reference campaign and tower progression | Core decision from Phase 3 | Forty-wave pacing, eight roles, five-level prototype and viable alternate builds on Millpond |
| 5 | Premium visual and audio sample on phones | Phase 2 mechanics and mobile layout stable enough to depict | First ten waves, three finished towers, upgrade sheet and title meet the restrained art standard at small phone size |
| 6 | Four-map adaptation and balance | Phases 4 and 5 standards | Every map rebuilt and tested independently; new paths justify their plot layouts |
| 7 | Commissions, restoration and return flow | A reliable core campaign | Three authored commissions, map rematches, cosmetic rewards and separate saves |
| 8 | Full assets, interface and content integration | Mechanics and form counts stable | Roster, enemies, worlds, loading, results, audio and reduced-motion variants consistent |
| 9 | Migration, device validation and release candidate | Earlier phases integrated | Recoverable old data, deterministic new saves, physical-device evidence and observed repeat play |

### Phase 0 tasks

Capture the current opening, a mid-game defence, a late boss, a tower sheet and title on small and large phone layouts. Record a reference run's elapsed active time, budget, leaks, purchases and session break opportunities. Rerun the relevant existing checks when implementation starts; historical pass reports are not evidence for a new build.

Inventory routing dependencies across simulation, level geometry, targeting distance, boss splits, saves, settings, achievements, challenges, input and renderer. Inventory guardian, plan and supply effects proposed for consolidation. Define the new rules-version boundary before changing behaviour.

### Phases 1 to 3 tasks

Build one fixed map with placeholder art and a forecast that reflects real paths. Remove routing from that prototype end to end. Check each plot's firing coverage and the timing of all arrivals.

Tune enough early economy to support two opening plans. Implement planning undo as reversible transactions that cannot duplicate income, progress or rewards. Add the factual leak recap and replay the same opening with a revised plan.

Resolve the phone layout concurrently with these core interactions. Establish combat and inspection states, measured board area, readable text and comfortable hit targets. Validate the four-tower and eight-tower selectors before introducing a connection-control interface.

Only then introduce the first Bond. Compare three configurations: fixed paths with ordinary tower interactions, the first Bond recipe, and both candidate recipes. Keep the same map, seed and spending rules when isolating the effect. A live-switching control is not needed to reconsider the user's removal decision.

### Phases 4 to 6 tasks

Implement the simplified upgrade structure and rebuild the campaign budgets. Reuse appropriate former guardian and plan effects as branch behaviours. Author waves around affordable responses, then revise bosses. Measure the full campaign before expanding it to every map.

In parallel with stable mechanics, produce the visual sample. Complete only the states needed to judge the actual style and readability. Establish asset dimensions, frame counts, anchors, atlas use and effect budgets from that sample and a device performance target.

For each additional map, design a distinct coverage problem and solve the entire campaign with more than one strategy. Do not apply one global enemy-health reduction to compensate for badly placed plots.

### Phases 7 to 9 tasks

Connect visible restoration to existing durable progress, then add three commissions and the short-session archive. Implement map selection and rematches with readable records. Playtest returning after several days using a real paused save and an unfinished optional goal.

Complete the art roster only after forms and branches stabilise. Finish launch transitions, final screens, sound priorities and accessibility variants. Update documentation, screenshots and descriptions to match the redesigned game.

Integrate the migration proved earlier, run full regression and adversarial saves, then validate installation and a complete session on physical iPhones before treating the iOS build as releasable.

## 11 Engineering boundaries and data migration

The current project uses TypeScript, Canvas rendering, a deterministic simulation and Capacitor. Preserve these foundations unless a measured problem requires a change.

| Work area | Existing starting points |
| --- | --- |
| Fixed geometry and traversal | `src/game/compact.ts`, `src/game/level.ts`, `src/game/sim.ts`, `src/core/path.ts` |
| Wave pacing and bosses | `src/game/waves.ts`, `src/game/compact.ts`, `src/game/harbour.ts`, `src/game/gardens.ts` |
| Tower roles and prices | `src/game/defs.ts`, `src/game/balance.ts`, `src/game/depth.ts` |
| Shared coverage and Bonds | `src/game/route-plan.ts`, new focused Bond definitions and simulation state |
| Retired modifiers | `src/game/guardians.ts`, `src/game/battle-plans.ts`, `src/game/tides.ts`, preparation definitions |
| Rewards and outcomes | `src/game/progress.ts`, `src/game/feedback.ts`, `src/game/save-store.ts` |
| Inputs and UI | `src/app.ts`, `src/ui/screens.ts`, `src/ui/upgrade.ts`, `src/style.css`, `index.html` |
| Art and animation | `src/render/`, `src/ui/assets.ts`, `src/core/audio.ts` |
| Native launch and lifecycle | `ios/App/App/Assets.xcassets/`, `ios/App/App/Base.lproj/LaunchScreen.storyboard`, `src/core/platform.ts` |
| Regression and comparison | `scripts/`, `qa/` and new fixtures for the fixed-path rules |

Reuse shared-coverage mathematics while removing its dependency on selectable gate routes. Keep renderer state separate from combat rules. Store Bond partners, cooldowns, pending charges and commission state in deterministic snapshots. Visual effects must not determine damage or targeting.

Consolidate the new game's rules under a clear version boundary rather than adding another loose combination of independent feature flags. Historical fixtures can use an isolated compatibility decoder or test harness. The production UI exposes only fixed-path play.

### Migration policy

Preserve settings, journal counts, earned identities, cosmetics and historical records. Mark retired achievements as legacy recognition. New performance records carry a rules version; do not compare incompatible scores as though they describe the same challenge.

An unfinished battle cannot be promised an identical continuation after changing its geometry, upgrades and mechanics. Prototype the migration in Phase 1, using representative legacy saves, then complete it in Phase 9.

Before any conversion, retain the original snapshot and a recoverable export. Only offer conversion from a compatible planning checkpoint after tower placements, spent glow, available counters and the next wave have been validated. If a safe mapping is unavailable, explain that the old run is archived and offer a fresh fixed-path run while preserving all earned profile progress. Never silently overwrite an unsupported save or award a win for an abandoned run.

No migration option restores lane switching in the redesigned playable game. Provide a preview of the converted defence and any refunded investments before committing that conversion. Repeated launch, retry or conversion must not duplicate resources or cosmetic credit. Test primary, backup and native storage copies, and record why unsupported saves could not be mapped.

## 12 Balance and verification programme

### Automated comparisons

Build a new fixed-path bot matrix instead of assuming the existing gate-aware bots transfer unchanged. Begin with mixed defence, Wickling investment, splash and control, beam focus, late heavy damage, zero Garden, one Garden, two early Gardens, support-light, Bond-focused and no-Bond strategies. Include deliberate mistakes such as ignoring an entrance, buying economy too late and stopping investment halfway through the run.

Use four maps and three modes. Sweep a small set of named seeds while diagnosing individual changes, then run a wider held-out set before release. Store rules version, purchases, unspent glow, income sources, leaks, remaining armour, hidden escapes and loss wave. Do not infer balance from final light alone.

Test each branch against isolated targets, tight groups, staggered arrivals, armour, concealment and bosses, then repeat on real map geometry. Measure firing uptime, overkill, slow overlap and actual support events. Check Garden return against waves remaining. Test duplicate-support and stacking cases separately.

A proposed release gate is at least three materially different competent Standard strategies across every map, including wins without Lighthouse and without a Garden. Demonstrate at least two materially different Nightfall solutions per map. Not every build should win, and a scripted success does not establish human fairness.

### Simulation and persistence tests

- Fixed traversal, targeting distance, entrance timing and boss splits never depend on removed gate state.
- Every forecast and upgrade preview agrees with the actual rules.
- Both branches, each visual level, spending, undo, relocation and refunds retain correct costs and tower identity.
- Bond eligibility, target consumption, cooldowns, sell/move interactions and effect caps are deterministic and cannot recurse.
- Overlapping slows, damage amplification, reveals and boss resistances cannot create unintended permanent control.
- Mid-wave save and restore retain enemies, projectiles, pending Bond actions and boss phases exactly for the same rules version.
- Retry and commission replay cannot duplicate mastery, first-clear rewards, journal credit or unlocks.
- Campaign and challenge slots stay independent; failed writes and native recovery preserve the newest valid data.
- Removed controls, modifiers and achievements cannot reappear through an old saved setting or imported run.

### Human playtests

Use small formative sessions throughout development, then a larger confirmation round. Include new tower-defence players, experienced players and people using the smaller phone layout. Observe without explaining the solution.

The following are proposed acceptance targets, not measured results:

- At least eight of ten newcomers place a tower and identify the enemy destination unaided.
- At least eight of ten can explain why their chosen early upgrade or second tower helps.
- Most players who form a Bond can describe its activation and why they selected those partners.
- After a loss, at least eight of ten can name one actionable change supported by the recap.
- Players can distinguish tower roles, specialisation and a capstone at actual phone size without opening every panel.
- Returning testers can resume the defence and name a voluntary next goal. Record whether they actually choose a second session and their reason; do not treat stated enthusiasm as retention.

For small cohorts, report counts and observations rather than precise percentage claims about the whole audience. Separate newcomers from experienced players and record difficulty, assistance, retries and session length. Changes that raise wins while reducing understanding are not automatically improvements.

### Performance and accessibility

Choose a minimum supported iPhone and a newer device before fixing the asset budget. Aim for stable 60 fps at ordinary play and measure frame-time distributions, memory and heat over a complete busy run. If a lower target is necessary on the minimum device, make that decision explicitly and test timing and readability there.

Verify 320px and 390px browser layouts plus actual devices, large text, colour-safe mode, reduced motion, muted play, keyboard controls, safe areas and left-hand use. Test cold offline launch, backgrounding, force quit, audio interruption and exact resume. Desktop screenshots and timings are useful checks but do not establish device performance.

Keep playtest records local by default, using the existing export approach. Any future automatic analytics upload is a separate product and permission decision.

## 13 Scope and first execution batch

The minimum coherent redesign is one fixed-path map, a satisfying ten-wave act, readable spending and coverage, recoverable mistakes, two useful tower branches, an art sample and a reliable saved game. Bonds only join that minimum if their prototype passes. Commissions, the archive and complete cosmetic progression follow the proven core.

Hold additional towers, currencies, equipment, random loot, energy timers, multiplayer, leaderboards, battle passes and a larger map count outside this roadmap's initial release. They would create separate content and balance problems before the current ones are solved.

The first implementation batch should deliver:

1. A dependency inventory and versioned fixed-path prototype using Millpond.
2. A ten-wave campaign with Wickling, Cracker, Moonbell and Lamp Owl introduced deliberately.
3. Forecasted entrances, affordable armour and concealment answers, planning undo and factual loss feedback.
4. Comparable baseline runs using at least two opening plans, followed by the isolated two-recipe Bond experiment.
5. A mobile composition with measured battlefield space, a contextual build picker and readable upgrade sheet, followed by restrained premium art for Wickling, Cracker, Moonbell and the title composition.
6. Representative save-migration trials, new deterministic fixtures and an observed newcomer session before scaling production.

The decision at the end of that batch is whether the fixed-path defence is understandable, whether its spending choices reward thought and whether Bonds add a choice worth keeping. Full roster art and a long reward catalogue should wait for that evidence.


## Executed follow-up: vibrant city and hero rosters

The player feedback on muted graphics led to a stronger palette, richer architectural scenery, expressive enemy shapes, moving water and weather, tower attack animation, restored combat glow feedback and new title/launch artwork. Three playable heroes now offer eight mechanically distinct tower variants each, with simple descriptions, inspectable stats, permanent run choice, separate records and backwards-compatible saves. See [release details and test evidence](VIBRANT-HEROES-RELEASE.md). Physical-device performance and observed human playtesting remain follow-up validation, rather than claimed automated results.
