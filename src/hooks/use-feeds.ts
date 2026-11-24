import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { upsertArticles } from "@/lib/articles-repo";
import { discoverFeedUrl } from "@/lib/discover-feed";
import { fetchFeed } from "@/lib/fetch-feed";
import {
  deleteFeed,
  listFeeds,
  setFeedActive,
  upsertFeed,
} from "@/lib/feeds-repo";
import type { Feed } from "@/types/feed";
import type { OpmlFeedEntry } from "@/lib/parse-opml";

function generateFeedId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type AddFeedResult =
  | { ok: true; feed: Feed }
  | { ok: false; reason: string };

export type ImportOpmlResult = {
  added: number;
  skipped: number;
  failed: number;
};

export function useFeeds() {
  const db = useSQLiteContext();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFeeds(await listFeeds(db));
  }, [db]);

  // Reload whenever the screen gains focus, so a feed added on one tab
  // (e.g. Explore) shows up on the others (e.g. Settings).
  useFocusEffect(
    useCallback(() => {
      listFeeds(db).then(setFeeds);
    }, [db]),
  );

  const addFeed = useCallback(
    async (inputUrl: string): Promise<AddFeedResult> => {
      setIsAdding(true);
      setAddError(null);
      try {
        const discovered = await discoverFeedUrl(inputUrl.trim());
        if (!discovered) {
          const reason = "Couldn't find a feed at that address.";
          setAddError(reason);
          return { ok: false, reason };
        }

        const result = await fetchFeed(discovered.feedUrl);
        if (!result.ok) {
          setAddError(result.error);
          return { ok: false, reason: result.error };
        }

        const feed: Feed = {
          id: generateFeedId(),
          url: discovered.feedUrl,
          title: result.title,
          faviconUrl: null,
          format: discovered.format,
          active: true,
          addedAt: Date.now(),
          lastFetchedAt: Date.now(),
          lastError: null,
        };
        await upsertFeed(db, feed);
        await upsertArticles(db, feed.id, result.articles);
        await load();
        return { ok: true, feed };
      } finally {
        setIsAdding(false);
      }
    },
    [db, load],
  );

  const removeFeed = useCallback(
    async (id: string) => {
      await deleteFeed(db, id);
      await load();
    },
    [db, load],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const feed = feeds.find((f) => f.id === id);
      if (!feed) {
        return;
      }
      await setFeedActive(db, id, !feed.active);
      await load();
    },
    [db, feeds, load],
  );

  const importOpml = useCallback(
    async (entries: OpmlFeedEntry[]): Promise<ImportOpmlResult> => {
      setIsAdding(true);
      const existingUrls = new Set(feeds.map((feed) => feed.url));
      let added = 0;
      let skipped = 0;
      let failed = 0;
      try {
        for (const entry of entries) {
          if (existingUrls.has(entry.xmlUrl)) {
            skipped += 1;
            continue;
          }
          let feedUrl = entry.xmlUrl;
          let result = await fetchFeed(feedUrl);
          if (!result.ok && result.notAFeed) {
            // The feed may have moved: look for one advertised on the page
            // the old URL now points to, like the "Add feed" box does.
            const discovered = await discoverFeedUrl(entry.xmlUrl);
            if (discovered && discovered.feedUrl !== entry.xmlUrl) {
              feedUrl = discovered.feedUrl;
              result = await fetchFeed(feedUrl);
            }
          }
          if (!result.ok) {
            console.warn("OPML feed fetch failed", entry.xmlUrl, result.error);
            failed += 1;
            continue;
          }
          if (existingUrls.has(feedUrl)) {
            // Moved to a feed the user already follows.
            skipped += 1;
            continue;
          }
          const feed: Feed = {
            id: generateFeedId(),
            url: feedUrl,
            title: result.title ?? entry.title,
            faviconUrl: null,
            format: null,
            active: true,
            addedAt: Date.now(),
            lastFetchedAt: Date.now(),
            lastError: null,
          };
          try {
            await upsertFeed(db, feed);
            await upsertArticles(db, feed.id, result.articles);
          } catch (error) {
            // One bad feed shouldn't abort the rest of the import.
            console.warn("OPML feed save failed", entry.xmlUrl, error);
            failed += 1;
            continue;
          }
          existingUrls.add(entry.xmlUrl);
          existingUrls.add(feedUrl);
          added += 1;
        }
        await load();
      } finally {
        setIsAdding(false);
      }
      return { added, skipped, failed };
    },
    [db, feeds, load],
  );

  return {
    feeds,
    addFeed,
    removeFeed,
    toggleActive,
    importOpml,
    isAdding,
    addError,
  };
}
