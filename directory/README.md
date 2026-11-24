# Explore feed directory

`feeds.json` is the list of feeds shown on the app's Explore tab.

- A copy is **bundled into each app build**, so Explore works offline.
- The app also **downloads the latest version** from
  `https://raw.githubusercontent.com/mossy-isme/RSSReels/master/directory/feeds.json`
  each time Explore opens (and on pull-to-refresh), and caches it on the device.
- Whichever copy has the newest `updatedAt` wins.

So to add, change or remove feeds for everyone, edit this file and push to
`master`. No app release is needed. GitHub's CDN can take about 5 minutes
to serve the new version.

## Editing

1. Add or edit entries in `feeds`:

   ```json
   {
     "title": "Example News",
     "url": "https://example.com/feed.xml",
     "site": "https://example.com",
     "description": "One short line about the feed.",
     "category": "News",
     "region": "au"
   }
   ```

   - `category` must be listed in `categories` (that list sets the order of the Topic filter).
   - `region` must be a key in `regions` (the value is the label shown in the app).
   - RSS 2.0, Atom and JSON Feed work. RSS 1.0 / RDF feeds don't.

2. **Bump `updatedAt`** to the current time, or devices that already cached
   a copy with a later timestamp will ignore your change.

3. Check it, then commit and push:

   ```bash
   npm run directory:check
   ```

## Changing the format

Only add optional fields. Older app versions ignore fields they don't know.
If you ever need a breaking change, bump `schemaVersion` here and
`DIRECTORY_SCHEMA_VERSION` in `src/lib/feed-directory.ts`. Older apps will
then keep using their own copy instead of breaking.
