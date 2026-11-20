import type { SQLiteDatabase } from "expo-sqlite";

import type { ParsedArticle } from "@/types/article";
import type { Feed } from "@/types/feed";

import { upsertArticles } from "@/lib/articles-repo";
import { upsertFeed } from "@/lib/feeds-repo";
import { detectFeedFormat, parseFeed } from "@/lib/parse-feed";

export type FetchFeedResult =
  | { ok: true; title: string | null; articles: ParsedArticle[] }
  | {
      ok: false;
      error: string;
      /** The URL answered, but with something other than a feed (e.g. HTML). */
      notAFeed?: boolean;
    };

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFeed(
  url: string,
  timeoutMs = 10000,
): Promise<FetchFeedResult> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const raw = await response.text();
    const format = detectFeedFormat(raw, response.headers.get("content-type"));
    if (!format) {
      const isHtml =
        response.headers.get("content-type")?.includes("html") ||
        /^\s*(<!doctype html|<html)/i.test(raw);
      return {
        ok: false,
        notAFeed: true,
        error: isHtml
          ? `Got a web page instead of a feed (${response.url || url}) — the feed may have moved or been removed`
          : "Unrecognised feed format",
      };
    }
    const { title, articles } = parseFeed(raw, format);
    return { ok: true, title, articles };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Timed out" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

export async function refreshFeeds(
  db: SQLiteDatabase,
  feeds: Feed[],
): Promise<void> {
  await Promise.allSettled(
    feeds.map(async (feed) => {
      const result = await fetchFeed(feed.url);
      const now = Date.now();
      if (result.ok) {
        await upsertArticles(db, feed.id, result.articles);
        await upsertFeed(db, {
          ...feed,
          title: result.title ?? feed.title,
          lastFetchedAt: now,
          lastError: null,
        });
      } else {
        await upsertFeed(db, {
          ...feed,
          lastFetchedAt: now,
          lastError: result.error,
        });
      }
    }),
  );
}
