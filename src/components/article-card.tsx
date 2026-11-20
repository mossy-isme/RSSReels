import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSQLiteContext } from "expo-sqlite";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { HighlightedText } from "@/components/highlighted-text";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { markSeen, toggleSaved } from "@/lib/articles-repo";
import { deriveFaviconUrl } from "@/lib/favicon";
import { gradientColors } from "@/lib/gradient-key";
import { relativeTime } from "@/lib/relative-time";
import type { ReelArticle } from "@/types/article";

const SEEN_DELAY_MS = 1000;
const DOUBLE_TAP_DELAY_MS = 300;
const HIGHLIGHT_COLOR = "rgba(0,0,0,0.3)";

type Props = {
  article: ReelArticle;
  isActive: boolean;
  height: number;
};

export function ArticleCard({ article, isActive, height }: Props) {
  const db = useSQLiteContext();
  const [saved, setSaved] = useState(article.saved);
  const lastTapAtRef = useRef(0);

  useEffect(() => {
    if (!isActive || article.seen) {
      return;
    }
    const timer = setTimeout(() => {
      markSeen(db, article.id);
    }, SEEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isActive, article.id, article.seen, db]);

  async function handleToggleSave() {
    const nextSaved = await toggleSaved(db, article.id);
    setSaved(nextSaved);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handlePress() {
    const now = Date.now();
    const isDoubleTap = now - lastTapAtRef.current < DOUBLE_TAP_DELAY_MS;
    if (isDoubleTap) {
      lastTapAtRef.current = 0;
      handleToggleSave();
      return;
    }
    lastTapAtRef.current = now;
    setTimeout(() => {
      if (lastTapAtRef.current === now) {
        WebBrowser.openBrowserAsync(article.link);
      }
    }, DOUBLE_TAP_DELAY_MS);
  }

  async function handleShare() {
    await Share.share({ message: article.title, url: article.link });
  }

  const faviconUrl = article.feedFaviconUrl ?? deriveFaviconUrl(article.link);
  const [gradientStart, gradientEnd] = gradientColors(article.feedId);

  return (
    <Pressable style={[styles.card, { height }]} onPress={handlePress}>
      {article.imageUrl ? (
        <Image
          source={{ uri: article.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.bottomOverlay}
      >
        <View style={styles.sourceRow}>
          {faviconUrl ? (
            <Image source={{ uri: faviconUrl }} style={styles.favicon} />
          ) : null}
          <ThemedText style={styles.overlayTextSecondary}>
            {article.feedTitle ?? "Unknown source"} ·{" "}
            {relativeTime(article.publishedAt)}
          </ThemedText>
        </View>
        <HighlightedText
          type="subtitle"
          style={styles.title}
          highlightColor={HIGHLIGHT_COLOR}
          highlightRadius={Spacing.three}
          highlightPaddingX={Spacing.two}
          highlightPaddingY={Spacing.one}
        >
          {article.title}
        </HighlightedText>
        <HighlightedText
          style={styles.summary}
          numberOfLines={3}
          highlightColor={HIGHLIGHT_COLOR}
          highlightRadius={Spacing.three}
          highlightPaddingX={Spacing.two}
          highlightPaddingY={Spacing.one}
        >
          {article.summary}
        </HighlightedText>
        <View style={styles.actionRow}>
          <Pressable onPress={handleShare} style={styles.actionButton}>
            <ThemedText style={styles.overlayText}>Share</ThemedText>
          </Pressable>
          {saved ? (
            <ThemedText style={styles.savedBadge}>Saved</ThemedText>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#000",
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.one,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  overlayText: {
    color: "#ffffff",
  },
  overlayTextSecondary: {
    color: "rgba(255,255,255,0.8)",
  },
  title: {
    color: "#ffffff",
  },
  summary: {
    color: "rgba(255,255,255,0.9)",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  actionButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  savedBadge: {
    color: "#ffffff",
  },
});
