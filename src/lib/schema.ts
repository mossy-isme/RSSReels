import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON");

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      favicon_url TEXT,
      format TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      added_at INTEGER NOT NULL,
      last_fetched_at INTEGER,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      guid TEXT NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      published_at INTEGER NOT NULL,
      fetched_at INTEGER NOT NULL,
      seen INTEGER NOT NULL DEFAULT 0,
      seen_at INTEGER,
      saved INTEGER NOT NULL DEFAULT 0,
      saved_at INTEGER,
      UNIQUE(feed_id, guid)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed_published
      ON articles(feed_id, published_at DESC);

    CREATE INDEX IF NOT EXISTS idx_articles_seen_published
      ON articles(seen, published_at DESC);
  `);
  }

  if (currentVersion < 2) {
    // Small key/value store, e.g. the cached Explore feed directory.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
