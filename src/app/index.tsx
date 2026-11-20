import { useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";

import { ReelPager, type ReelPagerHandle } from "@/components/reel-pager";
import { ThemedView } from "@/components/themed-view";
import { useReelArticles } from "@/hooks/use-reel-articles";

export default function ReelsScreen() {
  const { articles, isRefreshing, refresh } = useReelArticles();
  const navigation = useNavigation();
  const pagerRef = useRef<ReelPagerHandle>(null);

  // Tapping the Home tab while already on it jumps back to the first
  // article and pulls fresh items from the feeds.
  useEffect(() => {
    return navigation.addListener("tabPress" as never, () => {
      if (!navigation.isFocused()) {
        return;
      }
      pagerRef.current?.scrollToTop();
      refresh();
    });
  }, [navigation, refresh]);

  return (
    <ThemedView style={styles.container}>
      <ReelPager
        ref={pagerRef}
        articles={articles}
        refreshing={isRefreshing}
        onRefresh={refresh}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
