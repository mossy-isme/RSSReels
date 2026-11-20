import type { ParsedArticle } from "@/types/article";
import type { FeedFormat } from "@/types/feed";

import { parseAtom } from "@/lib/parse-atom";
import { parseJsonFeed } from "@/lib/parse-json-feed";
import { parseRss2 } from "@/lib/parse-rss2";

export function detectFeedFormat(
  raw: string,
  contentType?: string | null,
): FeedFormat | null {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{") || contentType?.includes("json")) {
    return "json";
  }
  if (trimmed.includes("<feed")) {
    return "atom";
  }
  if (trimmed.includes("<rss") || trimmed.includes("<channel")) {
    return "rss2";
  }
  return null;
}

export function parseFeed(
  raw: string,
  format: FeedFormat,
): { title: string | null; articles: ParsedArticle[] } {
  switch (format) {
    case "json":
      return parseJsonFeed(raw);
    case "atom":
      return parseAtom(raw);
    case "rss2":
      return parseRss2(raw);
  }
}
