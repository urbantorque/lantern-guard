# Battlefield and quick-upgrade revision

Delivered 1 October 2026. This revision addresses excessive empty margins, oversized upgrade cards, distracting currency trails and avoidable targeting micromanagement.

## Five improvements

1. **Give the battlefield the space.** Wide displays show a shallow, horizontal diorama with upright buildings, creatures and text. Phones retain the vertical map. The control bar runs below the battlefield; the desktop inspector takes 280 pixels and only the height its contents need. Phone inspection keeps the original map scale and frames the selected tower. Closing restores the overview. Hit areas extend over tower bodies.
2. **Make upgrading immediate.** Two small cards compare specialisations. After choosing, only that path and its next purchase remain. Numeric upgrade details, sky effects, Bonds, moving and selling are available in disclosures. Purchases remain live, with wave locks and affordability checked continuously. The original five stages and one-path commitment remain intact.
3. **Let tower roles handle aiming.** Sparks and beams defend the front; heavy bolts favour durable enemies; scouts seek hidden foes; blasts and chains favour groups. Every aimed role rescues an imminent leak first. Visibility, range, target exclusion and deterministic tie-breaking still apply. The historical routing edition retains its original priorities.
4. **Keep rewards local and legible.** Defeats and Garden income no longer send balls into the HUD. Glow changes immediately. A short wave recap sits in the control bar, leaving the map clear. Small impact cues, recoil, creature reactions and restrained death bursts remain.
5. **Reduce repetition between waves.** Optional Auto gives a six-second break between ordinary waves. It stops before new threats and unlocks, when a planning action is taken, when a panel is open, or when the app backgrounds. The soundtrack now has an eight-bar call-and-response structure, softer minor night instrumentation, rests and a quiet filtered echo. All background QA remains muted without changing saved sound preferences.

## Verification

- Production build and TypeScript checks pass. Capacitor iOS web assets synced.
- 96 paid-build fixed-edition campaigns: 32/32 Relaxed, 32/32 Standard and 26/32 Nightfall wins. Three fixed commissions pass; a neglected single-tower defence still fails at wave 5.
- 72 hero campaigns: all 48 Standard/Relaxed reference runs complete. Sol and Mira complete 24/24 each; Ivo completes 23/24 (the remaining Nightfall seed reaches wave 40). These are reference strategies, not a measurement of human difficulty.
- Eight mixed economy campaigns complete; two of eight deliberately greedy strategies complete. Income timing, phase boundaries and save restoration pass.
- All nine hero commissions, progression records, storage recovery, live upgrades and four-map scenery clearance pass. Fifteen historical routing runs match their original snapshots and outcomes exactly.
- New regression checks cover role targeting, hidden enemies, exclusions, urgent leaks, camera coordinate reversibility and reward-particle removal. Audio tests cover scheduling, arrangement changes, rate limits, independent music controls, mute and background suspension.
- Browser checks use a muted local build: desktop 1280×720 and 1440×900; portrait phone 390×844 and 320×568; landscape phone 844×390; tablet 768×1024. Verified quick specialisation during a running wave, Auto from wave 1 into wave 2, the deliberate stop before wave 3, scrollable compact details and contained controls.

Route geometry, tower prices, enemy budgets and save formats are unchanged. Projection is presentation only. Physical iPhone performance and subjective soundtrack listening were not validated during silent browser QA.
