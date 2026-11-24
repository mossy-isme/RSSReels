# RSSReels

Read your RSS feeds as a vertical, swipeable reel: one article per screen,
with its image, title and summary.

## Features

- **Reel reader:** swipe up and down between articles, tap to open one, double-tap to save it
- **Explore:** browse a curated directory of news, tech, science, sport and culture feeds, filtered by topic and region, with a preview of each feed's latest headlines
- **Add any site:** paste a website or feed address and RSSReels finds the feed
- **OPML import:** bring your subscriptions from another reader
- **Formats:** RSS 2.0, Atom and JSON Feed
- **Private:** no account, no analytics, no tracking. Your feeds and articles are stored only on your device.

## Install

- **F-Droid:** coming soon.
- **From source:** see [Development](#development).

## Privacy

RSSReels contacts only:

- the sites whose feeds you add (and their favicons)
- the feeds you preview on Explore
- `raw.githubusercontent.com`, to download the latest Explore directory ([`directory/feeds.json`](directory/feeds.json) in this repo)
- Expo's update server, for over-the-air updates (not in F-Droid builds)

Nothing about you or your reading is sent anywhere.

## Development

You need Node.js 22 or later.

```bash
npm install
npx expo start      # open in Expo Go or a development build
npx expo lint
npx tsc --noEmit
```

The app is built with [Expo](https://expo.dev) and Expo Router. Screens are
in `src/app/`, and feed fetching, parsing and storage are in `src/lib/`.

## Suggesting feeds for Explore

The Explore tab reads [`directory/feeds.json`](directory/feeds.json). Changes
merged to `master` reach the app without a new release. To suggest a feed,
open an issue or a pull request. [`directory/README.md`](directory/README.md)
describes the format. Before you submit, run:

```bash
npm run directory:check
```

## Releases

A release ships to both EAS and F-Droid:

```bash
node scripts/release.mjs <patch|minor|major> "<changelog, max 500 chars>"
git push origin master --follow-tags      # F-Droid builds from the v<version> tag
git push origin master:expo-updates       # triggers the EAS Release workflow
```

`scripts/release.mjs` bumps `version` and `android.versionCode` in
`app.json`, writes the F-Droid changelog
(`fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`), then
commits and tags.

### EAS

Pushing to the `expo-updates` branch runs `.eas/workflows/release.yml`,
which compares the native fingerprint with existing `production` builds:

- If one matches, the JavaScript ships as an over-the-air update on the `production` channel.
- If native code changed, it makes a new production build (APK).

`runtimeVersion` uses the `fingerprint` policy, so a version bump on its own
doesn't cut existing installs off from updates.

| Build profile | Update channel |
| ------------- | -------------- |
| `preview`     | `preview`      |
| `production`  | `production`   |

### F-Droid

F-Droid builds the app from source with `FDROID=1` set (see
`app.config.ts`). That setting:

- turns EAS Update off, because F-Droid doesn't allow apps to download code it didn't build
- leaves the release APK unsigned, so F-Droid can sign it

The store listing text is in `fastlane/metadata/android`, and the build
recipe for fdroiddata is in `fdroid/`.

## License

[GPL-3.0](LICENSE)
