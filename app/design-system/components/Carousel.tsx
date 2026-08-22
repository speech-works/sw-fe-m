import React, { useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";

import { spacing } from "../primitives/scale";
import { useTheme } from "../useTheme";

export interface CarouselProps<T> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  /** Gap between slides. Default `spacing.md`. */
  gap?: number;
  /** Width of the next slide left peeking in — the "there's more" hint. Default `spacing.xl`. */
  peek?: number;
  /**
   * How much page gutter to escape on the RIGHT, so the peeking slide runs off
   * the screen edge instead of stopping short of it. Pass the screen's
   * horizontal padding (`space.screenX`) when this sits inside a padded `Page`.
   *
   * Ignored for a lone slide, deliberately — see the note in the body.
   */
  bleedRight?: number;
  /** Show the paging dots (active dot stretches into a pill). Default true. */
  dots?: boolean;
  /** Active dot colour. Default `action.primary`. */
  dotColor?: string;
  /** Fires when the settled slide changes. */
  onIndexChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reusable, snap-paging carousel. Each slide fills the width minus a `peek` of the
 * next slide (so it's obvious there's more), snaps crisply, and the paging dots below
 * are driven by the live scroll offset — the active dot smoothly stretches into a pill
 * and colours in as you swipe. Self-measuring, so it adapts to any container width.
 */
export function Carousel<T>({
  data,
  renderItem,
  keyExtractor,
  gap = spacing.md,
  peek = spacing.xl,
  bleedRight = 0,
  dots = true,
  dotColor,
  onIndexChange,
  style,
}: CarouselProps<T>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const scrollX = useSharedValue(0);
  const lastIndex = useSharedValue(0);

  // A lone slide has nothing to peek to — collapse the peek/gap so it fills the width.
  const single = data.length <= 1;
  const effPeek = single ? 0 : peek;
  const effGap = single ? 0 : gap;

  /**
   * ESCAPING THE PAGE GUTTER, RIGHT SIDE ONLY.
   *
   * Inside a padded `Page` the scroll viewport ends at the gutter, so the
   * peeking slide gets clipped by padding a few points before the screen edge —
   * and a card sliced off with a strip of empty page beside it does not read as
   * "there is more this way", it reads as a layout mistake. Pulling the viewport
   * out by the gutter width lets that slide run off the physical edge, which is
   * the thing the peek was always trying to say.
   *
   * LEFT IS UNTOUCHED. The settled slide still starts on the page's gutter, in
   * line with every heading and card above it. Only the overflow side moves.
   *
   * AND IT IS SUPPRESSED FOR A LONE SLIDE. With nothing to peek to, the single
   * slide fills the viewport — so bleeding would drag that card off the screen
   * edge and leave it with a gutter on the left and none on the right. Home's
   * lower carousel is a single card most days, so this is the common case, not
   * the corner one.
   */
  const effBleed = single ? 0 : bleedRight;

  /**
   * `width` is the OUTER box — the page's content width — because that is what
   * the paging dots must centre on. The scroll viewport is that plus the bleed,
   * since only the ScrollView carries the negative margin. Measuring the outer
   * box and deriving the viewport (rather than bleeding the whole component)
   * is what keeps the dots on the page's true centre instead of pushing them
   * half the bleed to the right.
   */
  const viewport = width + effBleed;
  const itemWidth = Math.max(0, viewport - effPeek - effGap);
  const interval = itemWidth + effGap;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Report the settled index without a per-frame JS hop.
  useDerivedValue(() => {
    if (interval <= 0) return;
    const idx = Math.round(scrollX.value / interval);
    if (idx !== lastIndex.value) {
      lastIndex.value = idx;
      if (onIndexChange) runOnJS(onIndexChange)(idx);
    }
  }, [interval, onIndexChange]);

  const active = dotColor ?? colors.action.primary;
  const inactive = colors.text.disabled; // solid muted dot, visible in both schemes (control too faint on paper)

  return (
    <View style={style} onLayout={onLayout}>
      {itemWidth > 0 ? (
        <>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={interval}
            snapToAlignment="start"
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            // The bleed lives here and nowhere else, so the dots below stay
            // centred on the page rather than on the widened scroll viewport.
            style={{ marginRight: -effBleed }}
            // `alignItems: "stretch"` is the flex DEFAULT, and it is written
            // out because it is load-bearing here: it is what lets a row of
            // slides take the height of its tallest member, with the shorter
            // ones growing to match rather than leaving a gap beneath them.
            // Slides opt in by setting `flex: 1` on their own card.
            contentContainerStyle={{
              paddingRight: effPeek,
              alignItems: "stretch",
            }}
          >
            {data.map((item, i) => (
              <View
                key={keyExtractor ? keyExtractor(item, i) : String(i)}
                style={{ width: itemWidth, marginRight: effGap }}
              >
                {renderItem({ item, index: i })}
              </View>
            ))}
          </Animated.ScrollView>

          {dots && data.length > 1 ? (
            <View style={styles.dots}>
              {data.map((item, i) => (
                <Dot
                  key={keyExtractor ? keyExtractor(item, i) : String(i)}
                  index={i}
                  scrollX={scrollX}
                  interval={interval}
                  active={active}
                  inactive={inactive}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

interface DotProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  interval: number;
  active: string;
  inactive: string;
}

/** One paging dot — width + colour interpolate off the live scroll offset. */
function Dot({ index, scrollX, interval, active, inactive }: DotProps) {
  const style = useAnimatedStyle(() => {
    const pos = interval > 0 ? scrollX.value / interval : 0;
    const dist = Math.abs(pos - index);
    return {
      width: interpolate(dist, [0, 1], [20, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(dist, [0, 1], [active, inactive]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
