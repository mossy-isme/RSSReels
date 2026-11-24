import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { deriveFaviconUrl } from "@/lib/favicon";
import type { DirectoryFeed } from "@/lib/feed-directory";
import { fetchFeed } from "@/lib/fetch-feed";
import { relativeTime } from "@/lib/relative-time";

type Preview =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: { title: string; publishedAt: number }[] };

type Props = {
  feed: DirectoryFeed;
  regionLabel: string;
  isFollowed: boolean;
  isAdding: boolean;
  error: string | null;
  onAdd: (feed: DirectoryFeed) => void;
};

export function DirectoryFeedCard({
  feed,
  regionLabel,
  isFollowed,
  isAdding,
  error,
  onAdd,
}: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const faviconUrl = deriveFaviconUrl(feed.site);

  async function loadPreview(): Promise<void> {
    setPreview({ status: "loading" });
    const result = await fetchFeed(feed.url);
    if (!result.ok) {
      setPreview({ status: "error", message: result.error });
      return;
    }
    const items = [...result.articles]
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, 3)
      .map((article) => ({
        title: article.title,
        publishedAt: article.publishedAt,
      }));
    setPreview({ status: "ready", items });
  }

  function toggleExpanded(): void {
    const next = !expanded;
    setExpanded(next);
    if (next && (preview.status === "idle" || preview.status === "error")) {
      loadPreview();
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${feed.title}. ${expanded ? "Hide" : "Show"} latest headlines`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        {faviconUrl ? (
          <Image source={{ uri: faviconUrl }} style={styles.favicon} />
        ) : (
          <View style={styles.favicon} />
        )}
        <View style={styles.textColumn}>
          <ThemedText numberOfLines={1}>{feed.title}</ThemedText>
          {feed.description ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}
            >
              {feed.description}
            </ThemedText>
          ) : null}
          <View style={styles.tags}>
            <Tag label={feed.category} />
            <Tag label={regionLabel} />
          </View>
        </View>
        <SymbolView
          tintColor={theme.textSecondary}
          name={{
            ios: expanded ? "chevron.up" : "chevron.down",
            android: expanded ? "expand_less" : "expand_more",
            web: expanded ? "expand_less" : "expand_more",
          }}
          size={16}
        />
      </Pressable>

      {expanded ? (
        <View
          style={[styles.preview, { borderTopColor: theme.backgroundSelected }]}
        >
          {preview.status === "loading" ? (
            <ActivityIndicator
              color={theme.textSecondary}
              style={styles.loading}
            />
          ) : null}
          {preview.status === "error" ? (
            <ThemedText type="small" themeColor="textSecondary">
              Couldn&apos;t load a preview: {preview.message}
            </ThemedText>
          ) : null}
          {preview.status === "ready" && preview.items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              This feed has no recent articles.
            </ThemedText>
          ) : null}
          {preview.status === "ready"
            ? preview.items.map((item, index) => (
                <View key={`${index}-${item.title}`} style={styles.previewItem}>
                  <ThemedText type="small" numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {relativeTime(item.publishedAt)}
                  </ThemedText>
                </View>
              ))
            : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        {error ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.error}
            numberOfLines={2}
          >
            {error}
          </ThemedText>
        ) : (
          <View style={styles.error} />
        )}
        <Pressable
          onPress={() => onAdd(feed)}
          disabled={isFollowed || isAdding}
          accessibilityRole="button"
          accessibilityLabel={
            isFollowed ? `${feed.title} already added` : `Add ${feed.title}`
          }
          style={({ pressed }) => [
            styles.addButton,
            isFollowed
              ? { borderColor: theme.backgroundSelected, borderWidth: 1 }
              : { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <ThemedText
              type="smallBold"
              style={{
                color: isFollowed ? theme.textSecondary : theme.background,
              }}
            >
              {isFollowed ? "Added ✓" : "Add"}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.tag}>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.tagText}
      >
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  favicon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginTop: 2,
  },
  textColumn: {
    flex: 1,
    gap: Spacing.one,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 18,
  },
  preview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  previewItem: {
    gap: 0,
  },
  loading: {
    alignSelf: "flex-start",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  error: {
    flex: 1,
  },
  addButton: {
    minWidth: 84,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
