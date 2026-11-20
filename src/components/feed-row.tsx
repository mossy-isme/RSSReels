import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { deriveFaviconUrl } from "@/lib/favicon";
import type { Feed } from "@/types/feed";

type Props = {
  feed: Feed;
  onToggleActive: (id: string) => void;
  onRemove: (id: string) => void;
};

export function FeedRow({ feed, onToggleActive, onRemove }: Props) {
  const theme = useTheme();
  const faviconUrl = feed.faviconUrl ?? deriveFaviconUrl(feed.url);

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      {faviconUrl ? (
        <Image source={{ uri: faviconUrl }} style={styles.favicon} />
      ) : (
        <View style={styles.favicon} />
      )}
      <View style={styles.textColumn}>
        <ThemedText numberOfLines={1}>{feed.title ?? feed.url}</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
        >
          {feed.lastError ? `Error: ${feed.lastError}` : feed.url}
        </ThemedText>
      </View>
      <Switch
        value={feed.active}
        onValueChange={() => onToggleActive(feed.id)}
      />
      <Pressable
        onPress={() => onRemove(feed.id)}
        hitSlop={8}
        style={styles.removeButton}
      >
        <SymbolView
          tintColor={theme.textSecondary}
          name={{ ios: "trash", android: "delete", web: "delete" }}
          size={18}
        />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  favicon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  removeButton: {
    paddingLeft: Spacing.one,
  },
});
