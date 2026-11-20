# RSSReels

Read your RSS feeds as a vertical, swipeable reel — one article per screen.

- RSS 2.0, Atom and JSON Feed support
- Swipe up/down between articles; tap to open, double-tap to save
- Import your subscriptions from an OPML file
- Everything is stored on your device (SQLite) — no account, no tracking

## Development

```bash
npm install
npx expo start      # run in Expo Go or a development build
npx expo lint
npx tsc --noEmit
```

## Releases and updates

Builds are made with [EAS Build](https://docs.expo.dev/build/introduction/)
and receive over-the-air JavaScript updates through
[EAS Update](https://docs.expo.dev/eas-update/introduction/):

| Build profile | Update channel |
| ------------- | -------------- |
| `preview`     | `preview`      |
| `production`  | `production`   |

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli update --channel preview --environment preview --message "…"
```

`runtimeVersion` follows the app `version`, so an update only reaches builds
with the same `version`. Bump `version` (and `android.versionCode`) in
`app.json` whenever native code or dependencies change.

### F-Droid

F-Droid builds the app from source with `FDROID=1` set, which turns EAS
Update off (see `app.config.ts`) — F-Droid doesn't allow apps to download
code it didn't build. Store listing text lives in `fastlane/metadata/android`.

To release: bump `version` and `android.versionCode` in `app.json`, add
`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`, commit, and
tag the commit `v<version>`.

## License

[GPL-3.0](LICENSE)
