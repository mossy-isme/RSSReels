const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "\u2019",
  lsquo: "\u2018",
  sbquo: "\u201A",
  rdquo: "\u201D",
  ldquo: "\u201C",
  bdquo: "\u201E",
  laquo: "\u00AB",
  raquo: "\u00BB",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  bull: "\u2022",
  middot: "\u00B7",
  prime: "\u2032",
  deg: "\u00B0",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  euro: "\u20AC",
  pound: "\u00A3",
  yen: "\u00A5",
  cent: "\u00A2",
  times: "\u00D7",
  divide: "\u00F7",
  shy: "",
  zwj: "\u200D",
  zwnj: "\u200C",
  thinsp: "\u2009",
  ensp: "\u2002",
  emsp: "\u2003",
};

// Feeds routinely leave HTML entities (&#8217;, &rsquo;) in text, and
// fast-xml-parser only decodes the five XML ones, so decode the rest here.
export function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1]?.toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (Number.isNaN(code) || code < 1 || code > 0x10ffff) {
        return match;
      }
      return String.fromCodePoint(code);
    }
    return ENTITIES[entity] ?? ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Decode entities and collapse whitespace for plain-text fields like titles. */
export function cleanText(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

export function stripHtml(html: string | null | undefined, maxLength = 200): string {
  if (!html) {
    return "";
  }
  const withoutTags = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(withoutTags);
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  return `${collapsed.slice(0, maxLength).trimEnd()}…`;
}

export function firstImageFromHtml(html: string | null | undefined): string | null {
  if (!html) {
    return null;
  }
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}
