import {
  FlashList,
  type FlashListRef,
  type ViewToken,
} from "@shopify/flash-list";
import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { ArticleCard } from "@/components/article-card";
import type { ReelArticle } from "@/types/article";

/** Fraction of the screen height a slow drag must cover to change page. */
const DRAG_THRESHOLD = 0.12;
/** Flick speed (points/ms) that changes page regardless of distance. */
const FLICK_VELOCITY = 0.3;
/** Minimum drag distance for a flick to count, so taps don't page. */
const FLICK_MIN_DISTANCE = 8;

export type ReelPagerHandle = {
  scrollToTop: () => void;
};

type Props = {
  articles: ReelArticle[];
  refreshing: boolean;
  onRefresh: () => void;
  ref?: Ref<ReelPagerHandle>;
};

export function ReelPager({ articles, refreshing, onRefresh, ref }: Props) {
  const listRef = useRef<FlashListRef<ReelArticle>>(null);

  useImperativeHandle(ref, () => ({
    scrollToTop: () =>
      listRef.current?.scrollToOffset({ offset: 0, animated: true }),
  }));
  const dragStartIndexRef = useRef(0);
  const [height, setHeight] = useState(() => Dimensions.get("window").height);
  const [activeId, setActiveId] = useState<string | null>(
    articles[0]?.id ?? null,
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<ReelArticle>[] }) => {
      const first = viewableItems[0];
      if (first?.item) {
        setActiveId(first.item.id);
      }
    },
    [],
  );

  function handleScrollBeginDrag(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    dragStartIndexRef.current = Math.round(
      event.nativeEvent.contentOffset.y / height,
    );
  }

  function handleScrollEndDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const startIndex = dragStartIndexRef.current;
    const delta = event.nativeEvent.contentOffset.y - startIndex * height;
    // Velocity sign differs between iOS and Android, so only use its size
    // and take the direction from the drag itself.
    const speed = Math.abs(event.nativeEvent.velocity?.y ?? 0);
    const distance = Math.abs(delta);

    const shouldPage =
      distance > height * DRAG_THRESHOLD ||
      (speed > FLICK_VELOCITY && distance > FLICK_MIN_DISTANCE);

    const direction = shouldPage ? Math.sign(delta) : 0;
    const targetIndex = Math.min(
      Math.max(startIndex + direction, 0),
      Math.max(articles.length - 1, 0),
    );

    listRef.current?.scrollToOffset({
      offset: targetIndex * height,
      animated: true,
    });
  }

  return (
    <FlashList
      ref={listRef}
      data={articles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ArticleCard
          article={item}
          isActive={item.id === activeId}
          height={height}
        />
      )}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      onViewableItemsChanged={onViewableItemsChanged}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
