import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BUNDLED_DIRECTORY,
  DIRECTORY_URL,
  newestDirectory,
  parseDirectory,
  type FeedDirectory,
} from "@/lib/feed-directory";
import { fetchWithTimeout } from "@/lib/fetch-feed";
import { getKv, setKv } from "@/lib/kv-repo";

const CACHE_KEY = "feedDirectory";

export type DirectorySource = "bundled" | "cached" | "remote";

/**
 * Serves the Explore directory: the bundled copy immediately, then the
 * device cache, then the latest copy from GitHub. Whichever has the newest
 * `updatedAt` is shown. A failed download just keeps the current copy.
 */
export function useFeedDirectory() {
  const db = useSQLiteContext();
  const [directory, setDirectory] = useState<FeedDirectory>(BUNDLED_DIRECTORY);
  const [source, setSource] = useState<DirectorySource>("bundled");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const currentRef = useRef<FeedDirectory>(BUNDLED_DIRECTORY);

  const apply = useCallback(
    (next: FeedDirectory, nextSource: DirectorySource) => {
      if (next === currentRef.current) {
        return;
      }
      currentRef.current = next;
      setDirectory(next);
      setSource(nextSource);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetchWithTimeout(DIRECTORY_URL, 10000);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const raw = await response.text();
      const remote = parseDirectory(JSON.parse(raw));
      if (!remote) {
        throw new Error(
          "Downloaded directory is invalid or from a newer app version",
        );
      }
      setLastError(null);
      const best = newestDirectory(currentRef.current, remote);
      if (best === remote) {
        await setKv(db, CACHE_KEY, JSON.stringify(remote));
        apply(remote, "remote");
      }
    } catch (error) {
      console.warn("Feed directory download failed", error);
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshing(false);
    }
  }, [apply, db]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getKv(db, CACHE_KEY);
        const cached = raw ? parseDirectory(JSON.parse(raw)) : null;
        if (!cancelled && cached) {
          const best = newestDirectory(cached);
          if (best === cached) {
            apply(cached, "cached");
          }
        }
      } catch (error) {
        console.warn("Feed directory cache unreadable", error);
      }
      if (!cancelled) {
        await refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply, db, refresh]);

  return { directory, source, isRefreshing, lastError, refresh };
}
