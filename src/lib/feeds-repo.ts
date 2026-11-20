import type { SQLiteDatabase } from "expo-sqlite";

import type { Feed, FeedFormat } from "@/types/feed";

type FeedRow = {
  id: string;
  url: string;
  title: string | null;
  favicon_url: string | null;
  format: string | null;
  active: number;
  added_at: number;
  last_fetched_at: number | null;
  last_error: string | null;
};

function rowToFeed(row: FeedRow): Feed {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    faviconUrl: row.favicon_url,
    format: (row.format as FeedFormat | null) ?? null,
    active: row.active === 1,
    addedAt: row.added_at,
    lastFetchedAt: row.last_fetched_at,
    lastError: row.last_error,
  };
}

export async function upsertFeed(
  db: SQLiteDatabase,
  feed: Feed,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO feeds (id, url, title, favicon_url, format, active, added_at, last_fetched_at, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       url = excluded.url,
       title = excluded.title,
       favicon_url = excluded.favicon_url,
       format = excluded.format,
       active = excluded.active,
       added_at = excluded.added_at,
       last_fetched_at = excluded.last_fetched_at,
       last_error = excluded.last_error`,
    feed.id,
    feed.url,
    feed.title,
    feed.faviconUrl,
    feed.format,
    feed.active ? 1 : 0,
    feed.addedAt,
    feed.lastFetchedAt,
    feed.lastError,
  );
}

export async function listFeeds(db: SQLiteDatabase): Promise<Feed[]> {
  const rows = await db.getAllAsync<FeedRow>(
    "SELECT * FROM feeds ORDER BY added_at DESC",
  );
  return rows.map(rowToFeed);
}

export async function listActiveFeeds(db: SQLiteDatabase): Promise<Feed[]> {
  const rows = await db.getAllAsync<FeedRow>(
    "SELECT * FROM feeds WHERE active = 1 ORDER BY added_at DESC",
  );
  return rows.map(rowToFeed);
}

export async function setFeedActive(
  db: SQLiteDatabase,
  id: string,
  active: boolean,
): Promise<void> {
  await db.runAsync(
    "UPDATE feeds SET active = ? WHERE id = ?",
    active ? 1 : 0,
    id,
  );
}

export async function deleteFeed(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM feeds WHERE id = ?", id);
}
