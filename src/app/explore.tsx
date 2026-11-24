import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DirectoryFeedCard } from "@/components/directory-feed-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useFeedDirectory } from "@/hooks/use-feed-directory";
import { useFeeds } from "@/hooks/use-feeds";
import { useTheme } from "@/hooks/use-theme";
import {
  looksLikeUrl,
  normalizeFeedUrl,
  type DirectoryFeed,
} from "@/lib/feed-directory";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matchesQuery(
  feed: DirectoryFeed,
  regionLabel: string,
  query: string,
): boolean {
  if (!query) {
    return true;
  }
  const haystack = [
    feed.title,
    feed.description,
    feed.category,
    regionLabel,
    hostOf(feed.site),
  ]
    .join(" ")
    .toLowerCase();
  // Every word must match somewhere, so "bbc tech" finds BBC Technology.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { feeds, addFeed } = useFeeds();
  const { directory, isRefreshing, refresh } = useFeedDirectory();
  const regionLabel = (code: string) => directory.regions[code] ?? code;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [hideFollowed, setHideFollowed] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlAddMessage, setUrlAddMessage] = useState<string | null>(null);

  const followedUrls = useMemo(
    () => new Set(feeds.map((feed) => normalizeFeedUrl(feed.url))),
    [feeds],
  );

  const trimmedQuery = query.trim();
  const queryIsUrl = looksLikeUrl(trimmedQuery);

  const results = useMemo(
    () =>
      directory.feeds.filter(
        (feed) =>
          (!category || feed.category === category) &&
          (!region || feed.region === region) &&
          (!hideFollowed || !followedUrls.has(normalizeFeedUrl(feed.url))) &&
          (queryIsUrl ||
            matchesQuery(
              feed,
              directory.regions[feed.region] ?? feed.region,
              trimmedQuery,
            )),
      ),
    [
      directory,
      category,
      region,
      hideFollowed,
      followedUrls,
      queryIsUrl,
      trimmedQuery,
    ],
  );

  const filtersActive =
    !!category || !!region || hideFollowed || !!trimmedQuery;

  function clearFilters(): void {
    setQuery("");
    setCategory(null);
    setRegion(null);
    setHideFollowed(false);
  }

  async function runAdd(key: string, url: string): Promise<boolean> {
    setAdding((prev) => new Set(prev).add(key));
    setErrors(({ [key]: _removed, ...rest }) => rest);
    try {
      const result = await addFeed(url);
      if (result.ok) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return true;
      }
      setErrors((prev) => ({ ...prev, [key]: result.reason }));
      return false;
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function handleAddDirectoryFeed(feed: DirectoryFeed): void {
    runAdd(feed.url, feed.url);
  }

  async function handleAddUrl(): Promise<void> {
    setUrlAddMessage(null);
    const ok = await runAdd("__url__", trimmedQuery);
    if (ok) {
      setUrlAddMessage(`Added ${trimmedQuery}`);
      setQuery("");
    }
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <ThemedText type="subtitle">Explore</ThemedText>
        <ThemedText themeColor="textSecondary">
          Find new feeds to add to your reel.
        </ThemedText>
      </View>

      <View
        style={[styles.searchBox, { backgroundColor: theme.backgroundElement }]}
      >
        <SymbolView
          tintColor={theme.textSecondary}
          name={{ ios: "magnifyingglass", android: "search", web: "search" }}
          size={16}
        />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setUrlAddMessage(null);
          }}
          placeholder="Search feeds, or paste a website URL"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={queryIsUrl ? handleAddUrl : undefined}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel="Search feeds"
        />
        {query ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <SymbolView
              tintColor={theme.textSecondary}
              name={{
                ios: "xmark.circle.fill",
                android: "close",
                web: "close",
              }}
              size={16}
            />
          </Pressable>
        ) : null}
      </View>

      {queryIsUrl ? (
        <ThemedView type="backgroundElement" style={styles.urlCard}>
          <View style={styles.urlText}>
            <ThemedText type="smallBold">Add from a website</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
            >
              {trimmedQuery}
            </ThemedText>
            {errors.__url__ ? (
              <ThemedText type="small" themeColor="textSecondary">
                {errors.__url__}
              </ThemedText>
            ) : null}
          </View>
          <Pressable
            onPress={handleAddUrl}
            disabled={adding.has("__url__")}
            style={({ pressed }) => [
              styles.urlButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}
          >
            {adding.has("__url__") ? (
              <ActivityIndicator size="small" color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Find feed
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      ) : null}
      {urlAddMessage ? (
        <ThemedText type="small" themeColor="textSecondary">
          {urlAddMessage}
        </ThemedText>
      ) : null}

      <ChipRow
        label="Topic"
        options={directory.categories.map((c) => ({ value: c, label: c }))}
        selected={category}
        onSelect={setCategory}
      />
      <ChipRow
        label="Region"
        options={Object.entries(directory.regions)
          .filter(([code]) =>
            directory.feeds.some((feed) => feed.region === code),
          )
          .map(([code, label]) => ({ value: code, label }))}
        selected={region}
        onSelect={setRegion}
      />

      <View style={styles.toggleRow}>
        <ThemedText type="small">Hide feeds I&apos;ve added</ThemedText>
        <Switch
          value={hideFollowed}
          onValueChange={setHideFollowed}
          accessibilityLabel="Hide feeds already added"
        />
      </View>

      <View style={styles.resultsRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {results.length} {results.length === 1 ? "feed" : "feeds"}
        </ThemedText>
        {filtersActive ? (
          <Pressable onPress={clearFilters} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Clear filters
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={results}
        keyExtractor={(feed) => feed.url}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={theme.textSecondary}
            progressViewOffset={insets.top}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              No feeds match those filters.
            </ThemedText>
            <Pressable
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="small">Clear filters</ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <DirectoryFeedCard
            feed={item}
            regionLabel={regionLabel(item.region)}
            isFollowed={followedUrls.has(normalizeFeedUrl(item.url))}
            isAdding={adding.has(item.url)}
            error={errors[item.url] ?? null}
            onAdd={handleAddDirectoryFeed}
          />
        )}
        ItemSeparatorComponent={Separator}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: insets.bottom + Spacing.five,
          },
        ]}
      />
    </ThemedView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

type ChipRowProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T | null) => void;
};

function ChipRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: ChipRowProps<T>) {
  return (
    <View style={styles.chipSection}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label="All"
          active={selected === null}
          onPress={() => onSelect(null)}
        />
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={selected === option.value}
            // Tapping the active chip again goes back to "All".
            onPress={() =>
              onSelect(selected === option.value ? null : option.value)
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active
          ? { backgroundColor: theme.text }
          : { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: active ? theme.background : theme.text }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  titleBlock: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  urlCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  urlText: {
    flex: 1,
    gap: 2,
  },
  urlButton: {
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
  },
  chipSection: {
    gap: Spacing.two,
  },
  chipRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  separator: {
    height: Spacing.three,
  },
  empty: {
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  centerText: {
    textAlign: "center",
  },
  clearButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
