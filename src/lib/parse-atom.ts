import { XMLParser } from "fast-xml-parser";

import type { ParsedArticle } from "@/types/article";

import { cleanText, firstImageFromHtml, stripHtml } from "@/lib/strip-html";
import { parseDate, textOf, toArray } from "@/lib/xml-utils";

type AtomLink = { "@_href"?: string; "@_rel"?: string };

type AtomEntry = {
  title?: unknown;
  id?: unknown;
  link?: AtomLink | AtomLink[];
  updated?: string;
  published?: string;
  summary?: unknown;
  content?: unknown;
};

function entryLink(entry: AtomEntry): string {
  const links = toArray(entry.link);
  const alternate = links.find((l) => !l["@_rel"] || l["@_rel"] === "alternate");
  return alternate?.["@_href"] ?? links[0]?.["@_href"] ?? "";
}

export function parseAtom(raw: string): { title: string | null; articles: ParsedArticle[] } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(raw);
  const feed = doc?.feed ?? {};
  const entries = toArray<AtomEntry>(feed.entry);

  const articles: ParsedArticle[] = entries.map((entry) => {
    const body = textOf(entry.content) || textOf(entry.summary);
    const link = entryLink(entry);
    return {
      guid: textOf(entry.id) || link,
      title: cleanText(textOf(entry.title)) || "Untitled",
      link,
      summary: stripHtml(body, 200),
      imageUrl: firstImageFromHtml(body),
      publishedAt: parseDate(entry.published ?? entry.updated),
    };
  });

  return { title: cleanText(textOf(feed.title)) || null, articles };
}
