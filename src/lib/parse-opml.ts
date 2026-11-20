import { XMLParser } from "fast-xml-parser";

import { toArray } from "@/lib/xml-utils";

export type OpmlFeedEntry = {
  title: string;
  xmlUrl: string;
};

type OpmlOutline = {
  "@_xmlUrl"?: string;
  "@_title"?: string;
  "@_text"?: string;
  outline?: OpmlOutline | OpmlOutline[];
};

function collectFeeds(outlines: OpmlOutline[], results: OpmlFeedEntry[]): void {
  for (const outline of outlines) {
    const xmlUrl = outline["@_xmlUrl"];
    if (xmlUrl) {
      results.push({
        title: outline["@_title"] ?? outline["@_text"] ?? xmlUrl,
        xmlUrl,
      });
    }
    if (outline.outline) {
      collectFeeds(toArray(outline.outline), results);
    }
  }
}

export function parseOpml(raw: string): OpmlFeedEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(raw);
  const body = doc?.opml?.body;
  if (!body) {
    return [];
  }
  const results: OpmlFeedEntry[] = [];
  collectFeeds(toArray(body.outline), results);
  return results;
}
