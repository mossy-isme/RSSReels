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

One release ships to both EAS and F-Droid. In Claude Code, run `/release`;
or by hand:

```bash
node scripts/release.mjs <patch|minor|major> "<changelog, max 500 chars>"
git push origin master --follow-tags      # F-Droid builds from the v<version> tag
git push origin master:expo-updates       # triggers the EAS Release workflow
```

`scripts/release.mjs` bumps `version` and `android.versionCode` in
`app.json`, writes the F-Droid changelog
(`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`), commits and
tags.

### EAS

Pushing to the `expo-updates` branch runs `.eas/workflows/release.yml`. It
compares the native fingerprint with existing `production` builds: if one
matches, the JS ships as an over-the-air update on the `production`
channel; if native code changed, it makes a new production build (APK)
instead. `runtimeVersion` uses the `fingerprint` policy, so version bumps
alone don't cut existing installs off from updates.

| Build profile | Update channel |
| ------------- | -------------- |
| `preview`     | `preview`      |
| `production`  | `production`   |

### F-Droid

F-Droid builds the app from source with `FDROID=1` set (see
`app.config.ts`), which turns EAS Update off — F-Droid doesn't allow apps
to download code it didn't build — and leaves the release APK unsigned so
F-Droid can sign it. Store listing text lives in `fastlane/metadata/android`.
The submission recipe for fdroiddata is in `fdroid/`.

## License

[GPL-3.0](LICENSE)
