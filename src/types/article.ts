export type Article = {
  id: string;
  feedId: string;
  guid: string;
  title: string;
  link: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: number;
  fetchedAt: number;
  seen: boolean;
  seenAt: number | null;
  saved: boolean;
  savedAt: number | null;
};

export type ParsedArticle = Pick<
  Article,
  "guid" | "title" | "link" | "summary" | "imageUrl" | "publishedAt"
>;

export type ReelArticle = Article & {
  feedTitle: string | null;
  feedFaviconUrl: string | null;
};
