import type { ParsedArticle } from "@/types/article";

import { cleanText, firstImageFromHtml, stripHtml } from "@/lib/strip-html";
import { parseDate } from "@/lib/xml-utils";

type JsonFeedItem = {
  id?: string;
  url?: string;
  title?: string;
  content_html?: string;
  content_text?: string;
  summary?: string;
  image?: string;
  banner_image?: string;
  date_published?: string;
};

type JsonFeedDocument = {
  title?: string;
  items?: JsonFeedItem[];
};

export function parseJsonFeed(raw: string): { title: string | null; articles: ParsedArticle[] } {
  const doc = JSON.parse(raw) as JsonFeedDocument;
  const items = doc.items ?? [];

  const articles: ParsedArticle[] = items.map((item) => {
    const body = item.content_html ?? item.content_text ?? item.summary ?? "";
    const link = item.url ?? "";
    return {
      guid: item.id ?? link,
      title: cleanText(item.title) || "Untitled",
      link,
      summary: stripHtml(item.summary ?? body, 200),
      imageUrl: item.image ?? item.banner_image ?? firstImageFromHtml(item.content_html),
      publishedAt: parseDate(item.date_published),
    };
  });

  return { title: cleanText(doc.title) || null, articles };
}
