# Continuous watch and expressive district

This revision implements five improvements to Nightward's pacing, clarity, art, music and sense of progression.

## 1. Keep the watch moving

Combat runs at one authored tempo, 1.3 times the former default. Pause, Resume, Speed, Auto and Undo controls are removed. The player places the first tower without a deadline; four seconds later the watch starts. Subsequent waves follow after the same short countdown, including milestone waves. Browsing, selecting plots and buying upgrades do not cancel it.

Construction, plot unlocks, upgrades, selling, relocation and Bonds work during combat. Panels reserve space beside or below the battlefield and leave it interactive. The footer shows remaining arrivals and the next wave's forecast. Escape closes panels, without affecting combat.

Backgrounding saves the watch, freezes the simulation and countdown, and suspends audio. Foregrounding resets the frame clock and continues, without a catch-up burst. Audio resumes when the platform permits; a gesture can be required. Silent QA URLs continue to override sound without changing the saved preference.

## 2. Make upgrades readable at a glance

Path roles such as **Crowd volleys** and **Piercing sparks** replace decorative names as the decision headings. Two concrete benefits appear above each purchase, with remaining changes inside a disclosure. Bundled specialisations compare against the actual tower, including the foundation cost and effect.

Hero traits are shorter and state a strength and tradeoff. Garden cards omit irrelevant generic reload statistics. A purchase returns the inspector to its top so the new tier remains visible. Mobile cards retain both 44-pixel purchase buttons; the smallest phone sheet was adjusted after testing found them partly below its edge.

## 3. Give the district more character

Towers have richer role colours, glazed faces, sharper roof edges and new signature machinery: faceted embers, rocket tips, chime crystals, glass conservatories and a sweeping lighthouse lens. Existing recoil, aiming, wings and bell movement remain attached to the corresponding attacks. Bosses gain broad shoulder fins and a stronger silhouette.

Water has a brighter centre and deeper banks. Fine stone seams add scale without placing obstacles near build sites. Night shifts to blue and violet, with warm windows and contrasting tower lights. After waves 10, 20 and 30, existing houses gain bunting, roof gardens and lamps. The scenery count remains sparse. Reduced motion still suppresses continuous motion and softens combat effects; flying currency rewards remain absent.

## 4. Let the score develop

The synthesised score now has a 32-bar opening, answer, bridge and return, plus second-pass variations. Sol, Mira and Ivo have different melodic phrases and timbres. Chapters introduce accompaniment, crowds bring a restrained rhythmic layer, and bosses add a bass response and pulse. Night changes to a glassier arrangement at a bar boundary instead of restarting the tune.

Filtered plucks, bell partials, stereo placement, bass, pads and soft percussion share an audio-clock scheduler. Voices are bounded and oscillator/filter connections are disconnected after their tails. Audio tests exercise the scheduler without playing sound. These checks establish timing, variation and mute behaviour, not subjective listening quality on a physical device.

## 5. Make threats and progress visible

A compact wave progress line replaces transport controls. The adjacent forecast previews what comes next while the current wave runs. Boss health appears in a small bar near the water, without a modal announcement. Wave summaries mention newly unlocked towers. Together with the evolving arrangement and district details, these give a watch clearer chapters without interrupting play.

## Economy and save continuity

Gardens now accumulate income at the rate of the tier actually present during each simulated moment. Wave-end income divides that accumulated work by the full wave duration. A late build or upgrade cannot receive a full wave at its new rate. Light restoration requires enough whole-wave work; selling discards unpaid harvest. Relocation preserves accrued work and all attack timers.

Optional `harvest` and `healing` values persist in fixed-edition saves. Older saves migrate from their existing exposure totals. Historical routing runs retain their previous snapshots and rules. Forming a Bond during combat has a four-second readiness period, so removing and reconnecting it cannot bypass its trigger cooldown.

## Verification

- Regression coverage: continuous countdown, hidden-tab time, live actions, 48 hero/path purchase sequences, exact mid-wave saves, old-save migration, harvest timing and upgrade benefit accuracy.
- Audio coverage: first gesture, clock scheduling, rests, no backlog, mute/background suspension, separate music preference, musical sections, heroes, chapters, bosses and voice budgets.
- Browser review: desktop, phone portrait and phone landscape; first placement, automatic wave transitions with an open panel, live shop, specialisation, late night and boss state. All browser work uses a silent session.
- Reviewed at 320×568, 390×844, 844×390, 768×1024, 1280×720 and 1440×900. No horizontal page overflow was observed. On the smallest phone, both specialisation buttons are fully inside the viewport. Escape returns focus to the selected plot; Enter reopens its inspector while combat continues.
- Release gates: the existing gameplay, save, legacy integrity, fixed-map balance, hero balance, environment and rendering suites; TypeScript, production build and native asset sync.
- Results: 96 fixed-map reference campaigns plus three commissions met the existing balance gates. All 48 Standard/Relaxed hero campaigns won; Sol and Mira won 24/24 each across difficulties, Ivo 23/24 with the same Millpond Nightfall wave-40 loss as the preceding release. The environment comparison retained eight mixed-strategy wins versus two early-greed wins. Fifteen historical routing runs retained exact snapshots and outcomes.

Physical iPhone installation and subjective soundtrack listening remain device checks.

The changed controls were also reviewed against the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Resolved findings:

- `src/fixed-app.ts:99` — preserve the selected plot's keyboard focus when closing and resizing a panel.
- `src/fixed-app.ts:253` — give each specialisation button a distinct accessible name, including its role and cost.
- `src/fixed-style.css:103` — add a visible keyboard focus treatment to disclosure controls.

The game's existing reduced-motion setting, labelled plot buttons and live wave announcements remain available. Continuous gameplay is intentional; this review does not certify full nonvisual playability.
