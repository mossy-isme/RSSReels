export type FeedFormat = "rss2" | "atom" | "json";

export type Feed = {
  id: string;
  url: string;
  title: string | null;
  faviconUrl: string | null;
  format: FeedFormat | null;
  active: boolean;
  addedAt: number;
  lastFetchedAt: number | null;
  lastError: string | null;
};
