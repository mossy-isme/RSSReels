/**
 * The Explore tab's feed directory.
 *
 * The source of truth is `directory/feeds.json` in the repo. A copy is
 * bundled into the app (so Explore works offline and on first launch), and
 * the app also fetches the latest version from GitHub, so feeds can be added
 * by pushing to master without shipping an app update.
 */

import bundledJson from "../../directory/feeds.json";

export const DIRECTORY_URL =
  "https://raw.githubusercontent.com/mossy-isme/RSSReels/master/directory/feeds.json";

/** Bump only for breaking changes to the JSON shape; older apps then ignore it. */
export const DIRECTORY_SCHEMA_VERSION = 1;

export type DirectoryFeed = {
  url: string;
  title: string;
  /** Site homepage, used for the favicon. */
  site: string;
  description: string;
  category: string;
  /** A key of `FeedDirectory.regions`. */
  region: string;
};

export type FeedDirectory = {
  schemaVersion: number;
  /** ISO timestamp; the newest of bundled / cached / remote copies wins. */
  updatedAt: string;
  /** Display order for the Topic filter. */
  categories: string[];
  /** Region key → label, in display order for the Region filter. */
  regions: Record<string, string>;
  feeds: DirectoryFeed[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  return isNonEmptyString(value) && /^https?:\/\//i.test(value);
}

/**
 * Checks untrusted JSON (from the network or the cache) and returns a clean
 * directory, or null if it's unusable. Individual bad feed entries are
 * dropped rather than rejecting the whole file.
 */
export function parseDirectory(input: unknown): FeedDirectory | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const doc = input as Record<string, unknown>;
  if (doc.schemaVersion !== DIRECTORY_SCHEMA_VERSION) {
    return null;
  }
  if (
    !isNonEmptyString(doc.updatedAt) ||
    Number.isNaN(Date.parse(doc.updatedAt))
  ) {
    return null;
  }
  if (
    !Array.isArray(doc.feeds) ||
    typeof doc.regions !== "object" ||
    doc.regions === null
  ) {
    return null;
  }

  const regions: Record<string, string> = {};
  for (const [key, label] of Object.entries(
    doc.regions as Record<string, unknown>,
  )) {
    if (isNonEmptyString(label)) {
      regions[key] = label;
    }
  }

  const seenUrls = new Set<string>();
  const feeds: DirectoryFeed[] = [];
  for (const entry of doc.feeds as unknown[]) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const f = entry as Record<string, unknown>;
    if (
      !isHttpUrl(f.url) ||
      !isNonEmptyString(f.title) ||
      !isNonEmptyString(f.category) ||
      !isNonEmptyString(f.region)
    ) {
      continue;
    }
    const key = normalizeFeedUrl(f.url);
    if (seenUrls.has(key)) {
      continue;
    }
    seenUrls.add(key);
    feeds.push({
      url: f.url.trim(),
      title: f.title.trim(),
      site: isHttpUrl(f.site) ? f.site.trim() : f.url.trim(),
      description: isNonEmptyString(f.description) ? f.description.trim() : "",
      category: f.category.trim(),
      region: f.region.trim(),
    });
  }
  if (feeds.length === 0) {
    return null;
  }

  // Keep the declared order, then append any categories/regions that feeds
  // use but the lists forgot, so every feed stays reachable by filter.
  const declared = Array.isArray(doc.categories)
    ? (doc.categories as unknown[]).filter(isNonEmptyString)
    : [];
  const categories = [
    ...new Set([...declared, ...feeds.map((f) => f.category)]),
  ].filter((category) => feeds.some((f) => f.category === category));
  for (const feed of feeds) {
    regions[feed.region] ??= feed.region;
  }

  return {
    schemaVersion: DIRECTORY_SCHEMA_VERSION,
    updatedAt: doc.updatedAt,
    categories,
    regions,
    feeds,
  };
}

/** The copy built into this app version. */
export const BUNDLED_DIRECTORY: FeedDirectory = (() => {
  const parsed = parseDirectory(bundledJson);
  if (!parsed) {
    throw new Error(
      "directory/feeds.json is invalid — run `npm run directory:check`",
    );
  }
  return parsed;
})();

/** Picks the most recently updated directory; on a tie the later argument wins. */
export function newestDirectory(
  ...candidates: (FeedDirectory | null)[]
): FeedDirectory {
  let best = BUNDLED_DIRECTORY;
  for (const candidate of candidates) {
    if (
      candidate &&
      Date.parse(candidate.updatedAt) >= Date.parse(best.updatedAt)
    ) {
      best = candidate;
    }
  }
  return best;
}

/** Compare feed URLs loosely: ignore scheme, `www.`, and a trailing slash. */
export function normalizeFeedUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/** True when the search text looks like a URL the user wants to add directly. */
export function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  return (
    /^https?:\/\//i.test(trimmed) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)
  );
}
