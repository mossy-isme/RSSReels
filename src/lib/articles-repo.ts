import type { SQLiteDatabase } from "expo-sqlite";

import type { Article, ParsedArticle, ReelArticle } from "@/types/article";

type ArticleRow = {
  id: string;
  feed_id: string;
  guid: string;
  title: string;
  link: string;
  summary: string;
  image_url: string | null;
  published_at: number;
  fetched_at: number;
  seen: number;
  seen_at: number | null;
  saved: number;
  saved_at: number | null;
};

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    feedId: row.feed_id,
    guid: row.guid,
    title: row.title,
    link: row.link,
    summary: row.summary,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    seen: row.seen === 1,
    seenAt: row.seen_at,
    saved: row.saved === 1,
    savedAt: row.saved_at,
  };
}

function articleId(feedId: string, guid: string): string {
  return `${feedId}:${guid}`;
}

export async function upsertArticles(
  db: SQLiteDatabase,
  feedId: string,
  articles: ParsedArticle[],
): Promise<void> {
  const fetchedAt = Date.now();
  for (const article of articles) {
    await db.runAsync(
      `INSERT INTO articles (id, feed_id, guid, title, link, summary, image_url, published_at, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(feed_id, guid) DO UPDATE SET
         title = excluded.title,
         link = excluded.link,
         summary = excluded.summary,
         image_url = excluded.image_url,
         published_at = excluded.published_at,
         fetched_at = excluded.fetched_at`,
      articleId(feedId, article.guid),
      feedId,
      article.guid,
      article.title,
      article.link,
      article.summary,
      article.imageUrl,
      article.publishedAt,
      fetchedAt,
    );
  }
}

type ReelArticleRow = ArticleRow & {
  feed_title: string | null;
  feed_favicon_url: string | null;
};

function toReelArticle(row: ReelArticleRow): ReelArticle {
  return {
    ...rowToArticle(row),
    feedTitle: row.feed_title,
    feedFaviconUrl: row.feed_favicon_url,
  };
}

function shuffleAcrossFeeds(rows: ReelArticleRow[]): ReelArticle[] {
  const queues = new Map<string, ReelArticleRow[]>();
  for (const row of rows) {
    const queue = queues.get(row.feed_id);
    if (queue) {
      queue.push(row);
    } else {
      queues.set(row.feed_id, [row]);
    }
  }

  const feedIds = Array.from(queues.keys());
  const result: ReelArticle[] = [];
  while (feedIds.length > 0) {
    const pickIndex = Math.floor(Math.random() * feedIds.length);
    const feedId = feedIds[pickIndex];
    const queue = queues.get(feedId);
    const next = queue?.shift();
    if (next) {
      result.push(toReelArticle(next));
    }
    if (!queue || queue.length === 0) {
      feedIds.splice(pickIndex, 1);
    }
  }
  return result;
}

export async function listReelArticles(
  db: SQLiteDatabase,
  opts: { includeSeen: boolean },
): Promise<ReelArticle[]> {
  const rows = await db.getAllAsync<ReelArticleRow>(
    `SELECT articles.*, feeds.title AS feed_title, feeds.favicon_url AS feed_favicon_url
     FROM articles
     JOIN feeds ON feeds.id = articles.feed_id
     WHERE feeds.active = 1 ${opts.includeSeen ? "" : "AND articles.seen = 0"}
     ORDER BY articles.feed_id, articles.published_at DESC`,
  );

  const activeFeedCount = new Set(rows.map((row) => row.feed_id)).size;
  if (activeFeedCount <= 1) {
    return rows
      .slice()
      .sort((a, b) => b.published_at - a.published_at)
      .map(toReelArticle);
  }
  return shuffleAcrossFeeds(rows);
}

export async function markSeen(
  db: SQLiteDatabase,
  articleId: string,
): Promise<void> {
  await db.runAsync(
    "UPDATE articles SET seen = 1, seen_at = ? WHERE id = ? AND seen = 0",
    Date.now(),
    articleId,
  );
}

export async function toggleSaved(
  db: SQLiteDatabase,
  articleId: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ saved: number }>(
    "SELECT saved FROM articles WHERE id = ?",
    articleId,
  );
  const nextSaved = row?.saved === 1 ? 0 : 1;
  await db.runAsync(
    "UPDATE articles SET saved = ?, saved_at = ? WHERE id = ?",
    nextSaved,
    nextSaved === 1 ? Date.now() : null,
    articleId,
  );
  return nextSaved === 1;
}

export async function listSaved(db: SQLiteDatabase): Promise<Article[]> {
  const rows = await db.getAllAsync<ArticleRow>(
    "SELECT * FROM articles WHERE saved = 1 ORDER BY saved_at DESC",
  );
  return rows.map(rowToArticle);
}
