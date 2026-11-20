import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

import { listReelArticles } from "@/lib/articles-repo";
import { refreshFeeds } from "@/lib/fetch-feed";
import { listActiveFeeds } from "@/lib/feeds-repo";
import type { ReelArticle } from "@/types/article";

export function useReelArticles() {
  const db = useSQLiteContext();
  const [articles, setArticles] = useState<ReelArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSeen, setShowSeen] = useState(false);

  const load = useCallback(async () => {
    const reelArticles = await listReelArticles(db, { includeSeen: showSeen });
    setArticles(reelArticles);
  }, [db, showSeen]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const feeds = await listActiveFeeds(db);
      await refreshFeeds(db, feeds);
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [db, load]);

  // Refresh on app open: the reel is the home screen, so the initial mount
  // doubles as the "app open" refresh trigger. Later changes to `showSeen`
  // only need to re-query local data, not hit the network again.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setIsLoading(true);
      refresh().finally(() => setIsLoading(false));
      return;
    }
    load();
  }, [load, refresh]);

  return { articles, isLoading, isRefreshing, refresh, showSeen, setShowSeen };
}
