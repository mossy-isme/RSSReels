import { XMLParser } from "fast-xml-parser";

import type { ParsedArticle } from "@/types/article";

import { firstImageFromHtml, stripHtml } from "@/lib/strip-html";
import { parseDate, textOf, toArray } from "@/lib/xml-utils";

type Rss2Item = {
  title?: unknown;
  link?: unknown;
  guid?: unknown;
  pubDate?: string;
  description?: unknown;
  "content:encoded"?: unknown;
  enclosure?: { "@_url"?: string; "@_type"?: string };
  "media:content"?: { "@_url"?: string; "@_medium"?: string };
  "media:thumbnail"?: { "@_url"?: string };
};

function itemImage(item: Rss2Item, description: string): string | null {
  if (item.enclosure?.["@_type"]?.startsWith("image")) {
    return item.enclosure["@_url"] ?? null;
  }
  if (item["media:content"]?.["@_url"]) {
    return item["media:content"]["@_url"];
  }
  if (item["media:thumbnail"]?.["@_url"]) {
    return item["media:thumbnail"]["@_url"];
  }
  return firstImageFromHtml(description) ?? firstImageFromHtml(textOf(item["content:encoded"]));
}

export function parseRss2(raw: string): { title: string | null; articles: ParsedArticle[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(raw);
  const channel = doc?.rss?.channel ?? {};
  const items = toArray<Rss2Item>(channel.item);

  const articles: ParsedArticle[] = items.map((item) => {
    const description = textOf(item.description) || textOf(item["content:encoded"]);
    const link = textOf(item.link);
    const guid = textOf(item.guid) || link;
    return {
      guid,
      title: textOf(item.title) || "Untitled",
      link,
      summary: stripHtml(description, 200),
      imageUrl: itemImage(item, description),
      publishedAt: parseDate(item.pubDate),
    };
  });

  return { title: textOf(channel.title) || null, articles };
}
