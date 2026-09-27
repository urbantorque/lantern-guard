# Positioning and routing recommendation

Status: original proposal, September 2026. The user selected **Lantern Guard: Tower Defense**. The first routing and tower refinement pass is now implemented; see [the implementation and results](LANTERN-GUARD.md). The discussion below records the original alternatives and the remaining observed-playtest decision.

## Name shortlist (Lantern Guard selected)

Lanternlocks makes the canal switches sound like the main attraction and leaves the genre unclear. The game's stronger promise is building a defence, watching it grow and protecting the Great Lantern.

| Candidate | Judgment |
|---|---|
| **Lantern Keep: Tower Defense** | Original recommendation; superseded by the user's choice. |
| **Lantern Guard: Tower Defense** | Selected. A clear emphasis on the defenders and an explicit genre. |
| **Wickwater: Tower Defense** | Preserves the setting's existing name, but requires more explanation and is less immediate to say and remember. |

Suggested store pitch: **Build your towers. Grow your defence. Keep the lantern lit.** Lead screenshots with the visible board and a growing established defence. Routing can be a supporting feature if playtests justify it.

These are working candidates, not confirmed available names. Preliminary web and storefront searches do not establish availability. Avoid Lanternfall: [an existing Steam listing](https://store.steampowered.com/app/5090630) already uses that name for a tower defence game. Test the shortlisted names with the same icon and gameplay screenshot, asking people what game they expect and which name they remember later.

## What the switches currently contribute

The implemented routes do change tower exposure, rewards and survival. Long loops offer more firing time. Short runs double the reward for enemies defeated on that segment and double the light lost by escapees who have travelled it. The bridge reveals hidden enemies and the mill removes armour.

There is a useful strategic foundation here, but several rules push toward a prescribed answer:

- Shells favour the mill; hidden enemies favour the bridge. The reference bot explicitly follows those rules before checking whether a short route can safely earn more glow (`scripts/bot.ts`, `wantDir`).
- Repeating that decision for incoming enemies can become sorting work. Charms automate some of it, which reduces input but does not itself create a richer choice.
- The short-route reward only applies while the enemy is on that segment, while its doubled escape penalty persists afterward (`src/game/sim.ts`, `kill` and `leak`). That asymmetry is difficult to infer by watching the board.
- Fixed pad positions mean the interesting question should be how a route serves the player's particular tower layout. Extra mandatory flips do not guarantee that interaction.

The existing balance matrix shows stronger results for several routing strategies, but those bots also make different spending and placement decisions. It is not an isolated test of routing, and it cannot measure enjoyment.

## Recommended prototype: plan the route around your defence

Use the existing locks and between-wave pause. Give each lock a persistent default route. Tap the lock to preview the alternative path, highlight the towers covering it and explain the concrete trade-off in one short line. Starting a wave accepts the current layout; it should not require a separate confirmation flow.

Keep live switching as an optional tactical intervention. A stable, well-built route should remain viable. The player should switch because the incoming group exposes a weakness or creates an opportunity in their own build.

Examples to prove in a prototype:

- A Moonbell and Cracker cover one bend. Send a crowd through that coverage for repeated splash hits.
- Invest heavily in a Lighthouse, then route a tough target through more of its firing arc.
- Strengthen the short branch enough to deliberately accept a higher-reward route; choose the longer branch when more firing time matters.

These are intended decisions to test, not claims that all are currently viable. Start with existing tower abilities and path geometry. Adjust pad coverage or route rules only where the experiment exposes a specific problem. Hidden enemies and armour need viable tower answers so landmarks provide alternatives instead of prescribing every route choice.

Prototype simpler reward rules alongside the route preview. One candidate is a clearly marked short-route status with both the reward and escape multiplier lasting for the same duration. Its economy would need rebalancing. Avoid adding another gate currency, charge meter or lock upgrade tree in the first experiment.

## Decide whether to keep routing

Compare three short versions with the same early waves, followed by a later mixed wave:

1. Current live switches.
2. Planning-first routing with a clear preview and optional live overrides.
3. Fixed routes, balanced to offer a comparable challenge.

First compare identical seeds, starting towers and budgets to understand the mechanical effect. Then tune each version to comparable difficulty for an observed player preference test. Alternate the order people try the versions to reduce familiarity bias.

Record whether newcomers can explain where enemies are going, whether players choose different routes for different builds, what they think caused a loss, and which version they choose to play again. Flip count alone is not a success metric. A small test is directional evidence, not a retention estimate.

Keep the redesigned switches if they improve understandable, repeatable decisions. If fixed routes are equally or more enjoyable and easier to read, remove the switches from new nights and put the effort into tower combinations, upgrade choices and canal expansions. Preserve old saves through explicit versioning.

## Place in the roadmap

Run this experiment inside [priority 1](NEXT-PRIORITIES.md). Use priority 2 to establish several viable builds and a fair late game, and priority 3 to verify the result on real iPhones. Repeat play should initially come from refining a persistent defence, trying another viable build and pursuing the existing journal, bloom and challenge rewards.
