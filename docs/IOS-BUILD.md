# iOS build handoff

The local project is `ios/App/App.xcodeproj`. The game, font, procedural art and sound are bundled; play does not require a server or an internet connection. The project uses Capacitor 8.5.2 and Swift Package Manager.

## Build on a Mac

1. Install Node 22+ and a current Xcode supported by Capacitor 8.
2. Copy this project to the Mac, including `ios/`, `package.json` and `package-lock.json`.
3. Run `npm ci`, `npm run check`, then `npm run ios:sync`.
4. Run `npm run ios:open`. Let Xcode resolve the Swift packages.
5. Select the App target. Set the Apple development team and the final bundle identifier in Signing & Capabilities. The current identifier, `com.lanternlocks.game`, is a local project default, not a registered App Store listing.
6. Build on a connected iPhone. Complete the device checks below before making a Release archive and distributing it through TestFlight.

The web build and native asset sync pass on Windows. Swift compilation, device installation, signing, archive validation and TestFlight distribution have **not** been performed.

## Included

- Native foreground/background hook plus browser visibility/page-hide saves. Returning during a wave leaves the game paused.
- A complete checkpoint every five seconds during play, plus action and background checkpoints.
- Primary and previous save, checksum and schema validation, original v1/v2 save support, and visible save failure/recovery messages.
- An extra device-local Preferences copy of game saves, journal, settings and progress, restored when newer than WebKit storage.
- Audio suspension on background and audio-context resume from player interaction. Native audio uses the ambient category, respecting Silent Mode and other audio.
- Native light/medium haptics, rate limited and controlled by the existing Vibration setting.
- Existing safe-area layout, larger text, reduced motion, colour-safe palette and left-hand controls.
- Lantern app icon, matching launch artwork, and a privacy manifest included in the app target. UserDefaults is declared for app-local storage using CA92.1. There are no analytics or advertising SDKs in this build.

## Device gates before TestFlight

Use a small iPhone and a current device with a home indicator. Record device model, iOS build, game build and result.

| Check | Expected result |
|---|---|
| First install, airplane mode | The growing canal, fonts, menus and sound work offline |
| Build, upgrade, route and sell | Correct targets respond; no purchase from a preview tap |
| Portrait, landscape and safe areas | No clipped controls or home-indicator collisions |
| Larger text and left-hand dock | Costs, upgrade descriptions and lock buttons remain reachable |
| Home screen / lock screen during waves 1, 16 and 25 | Save retained; returning stays paused |
| Force quit, relaunch, Continue | At most the interval since the last checkpoint is lost |
| Incoming call / Siri / headphones / Silent Mode | No background game audio; sound can resume after interaction |
| Storage pressure and damaged primary save | Previous checkpoint recovered, or an explicit failure message |
| Haptics on/off | Appropriate feedback when enabled; none when disabled |
| Wave 24, final boss, free play at 1x/3x | Stable frame pacing and acceptable heat over a full session |
| Expansion, dawn, free play, restart, relaunch | Correct canal section and towers retained; one reward per completed night |

The desktop browser late-wave measurement is not evidence of device frame rate, battery life or thermal behavior. Those remain physical-device gates.

## Reproducible commands

```sh
npm run check
npm run balance:growth
npm run ios:sync
```

`npm run qa:fixtures` rebuilds development fixtures from actual winning runs. Start Vite and open `/qa/` on a disposable local test origin to exercise busy-wave reloads, the victory/reward screen and a 300-frame rendering sample. This page is excluded from the production build and backs up test data before replacing it.

Official references: [Capacitor iOS](https://capacitorjs.com/docs/ios), [Preferences and the privacy manifest](https://capacitorjs.com/docs/apis/preferences), [App Store deployment](https://capacitorjs.com/docs/ios/deploying-to-app-store).
