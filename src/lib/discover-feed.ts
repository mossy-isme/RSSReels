import { fetchWithTimeout } from "@/lib/fetch-feed";
import { detectFeedFormat } from "@/lib/parse-feed";
import type { FeedFormat } from "@/types/feed";

const CANDIDATE_PATHS = ["/feed", "/rss", "/rss.xml", "/atom.xml", "/feed.xml"];

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function findAlternateFeedLink(html: string, baseUrl: string): string | null {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const type = tag.match(/type=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    const isFeedType = !!type && /rss\+xml|atom\+xml|feed\+json/.test(type);
    if (rel === "alternate" && isFeedType && href) {
      return resolveUrl(href, baseUrl);
    }
  }
  return null;
}

async function detectFeedAt(url: string): Promise<FeedFormat | null> {
  try {
    const response = await fetchWithTimeout(url, 8000);
    if (!response.ok) {
      return null;
    }
    const raw = await response.text();
    return detectFeedFormat(raw, response.headers.get("content-type"));
  } catch {
    return null;
  }
}

export async function discoverFeedUrl(
  inputUrl: string,
): Promise<{ feedUrl: string; format: FeedFormat } | null> {
  const normalizedUrl = /^https?:\/\//i.test(inputUrl)
    ? inputUrl
    : `https://${inputUrl}`;

  const directFormat = await detectFeedAt(normalizedUrl);
  if (directFormat) {
    return { feedUrl: normalizedUrl, format: directFormat };
  }

  let html: string;
  let origin: string;
  try {
    const response = await fetchWithTimeout(normalizedUrl, 8000);
    html = await response.text();
    origin = new URL(normalizedUrl).origin;
  } catch {
    return null;
  }

  const alternateUrl = findAlternateFeedLink(html, normalizedUrl);
  if (alternateUrl) {
    const format = await detectFeedAt(alternateUrl);
    if (format) {
      return { feedUrl: alternateUrl, format };
    }
  }

  for (const path of CANDIDATE_PATHS) {
    const candidateUrl = `${origin}${path}`;
    const format = await detectFeedAt(candidateUrl);
    if (format) {
      return { feedUrl: candidateUrl, format };
    }
  }

  return null;
}
