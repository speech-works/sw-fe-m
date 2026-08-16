import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { useNavBarInset } from "../useNavBarInset";
import { withAlpha } from "../utils/color";
import { fonts } from "../primitives/fonts";
import { size } from "../primitives/scale";
import { spring, duration } from "../motion";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";
import { notePress } from "../../util/diagnostics/deadTap";

// One spring drives BOTH the active pill's growth (per item) AND the capsule's
// hug/resize (LinearTransition on the bar), so the pill and the dock move together
// — never the pill overflowing first and the dock catching up.
// The dock morph (pill grow + capsule resize) rides the shared `gentle` spring.
const DOCK_SPRING = spring.gentle;

export interface TabDockItem {
  key: string;
  /** Shown only when this tab is active (the expanding pill). */
  label: string;
  /** A DS icon name — prefer an `icons` registry key (e.g. `icons.home`). */
  icon: IconName;
  /** Optional unread/count badge. */
  badge?: number;
  /**
   * Countless attention marker — a plain dot, for "something here needs you"
   * where there is nothing to count. Ignored when `badge` > 0, since a number
   * already says more than a dot can.
   */
  badgeDot?: boolean;
  /**
   * A count carried INSIDE the expanded pill, beside the label, rather than as
   * a corner badge on the icon.
   *
   * For the one case where the count is not a notification about the tab but
   * the SUBJECT of it: the Buddy pill reading "Waiting · 3". The corner badge
   * says "there is something over here"; this says "here is what it is", which
   * is what earns the re-tap that opens the list.
   *
   * Only renders while the tab is focused, because it lives in the part of the
   * pill that only exists when expanded. An unfocused tab still needs its
   * corner marker, so callers set BOTH and `DockItem` suppresses whichever
   * would be the second copy — see `showCorner` below.
   */
  pillCount?: number;
}

export interface TabDockProps {
  items: TabDockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLongPress?: (key: string) => void;
  /** Hug the tabs instead of filling the width (for in-page docks). */
  fitContent?: boolean;
  /** Render in normal flow (e.g. inside a header) instead of floating at the bottom. */
  inline?: boolean;
  /** Horizontally scroll the tabs and keep the SELECTED tab centered — for docks
   *  with more tabs than fit on screen (e.g. the avatar studio's 8 slots), so no
   *  tab is ever stranded at the edge. Opt-in; the bottom nav never sets it. */
  scrollable?: boolean;
  /** Screen-reader label for the whole dock (e.g. "Main navigation" /
   *  "Community page tabs"). Announced politely when it changes. */
  accessibilityLabel?: string;
  /** Override the dock's background capsule color (e.g., when placed inside a Sheet). */
  surfaceColor?: string;
}

/**
 * The floating menu dock — a `surface.elevated` capsule whose active tab is an
 * orange pill (icon + label); inactive tabs are icon-only. This is the single
 * source for the app's bottom nav AND any in-page tab dock, so they never drift.
 * `fitContent` hugs the tabs (in-page) vs. filling the width (bottom nav).
 */
export const TabDock: React.FC<TabDockProps> = ({
  items,
  activeKey,
  onSelect,
  onLongPress,
  fitContent = false,
  inline = false,
  scrollable = false,
  accessibilityLabel,
  surfaceColor,
}) => {
  const { colors, elevation } = useTheme();
  const reduceMotion = useReducedMotion();
  // Under edge-to-edge the window reaches the screen edge, so the dock's fixed
  // 30dp offset would put it under the nav bar. 0 on iOS — see useNavBarInset.
  const navBarInset = useNavBarInset();

  // Center-the-selected-tab scroller. Each item reports its centre within the
  // bar (onLayout); the content is padded by half the viewport so ANY tab —
  // first or last — can sit dead-centre. scrollTo(centre) lands it there.
  const scrollRef = useRef<ScrollView>(null);
  const centersRef = useRef<Record<string, number>>({});
  const [viewport, setViewport] = useState(0);

  const centerOn = (key: string, animated = true) => {
    const c = centersRef.current[key];
    if (c != null && viewport > 0) {
      scrollRef.current?.scrollTo({ x: Math.max(0, c), animated: animated && !reduceMotion });
    }
  };

  // Re-centre on selection, and once the viewport width is known (first layout).
  useEffect(() => {
    if (scrollable) centerOn(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, viewport, scrollable]);

  const bar = (
    <Animated.View
      // The capsule resizes (hug content / nav↔tabs morph) on the SAME spring as
      // the active pill, so they stay locked together.
      layout={
        reduceMotion
          ? undefined
          : LinearTransition.springify()
            .damping(DOCK_SPRING.damping)
            .stiffness(DOCK_SPRING.stiffness)
            .mass(DOCK_SPRING.mass)
      }
      style={[
        styles.bar,
        fitContent ? styles.barFit : styles.barFull,
        { backgroundColor: surfaceColor ?? colors.surface.elevated, shadowColor: colors.shadow },
        !inline && elevation.e3,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      {items.map((item) => (
        <DockItem
          key={item.key}
          isFocused={activeKey === item.key}
          label={item.label}
          iconName={item.icon}
          badge={item.badge ?? 0}
          badgeDot={item.badgeDot ?? false}
          pillCount={item.pillCount ?? 0}
          fitContent={fitContent}
          reduceMotion={reduceMotion}
          onPress={() => onSelect(item.key)}
          onLongPress={onLongPress ? () => onLongPress(item.key) : undefined}
          onItemLayout={
            scrollable
              ? (x, w) => {
                  centersRef.current[item.key] = x + w / 2;
                  // As the active pill grows/shrinks its layout settles here —
                  // re-centre on the FINAL position so scroll + pill land together.
                  if (item.key === activeKey) centerOn(item.key);
                }
              : undefined
          }
        />
      ))}
    </Animated.View>
  );

  if (scrollable) {
    return (
      <View style={styles.scrollContainer} pointerEvents="box-none">
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => setViewport(e.nativeEvent.layout.width)}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: viewport / 2 }]}
        >
          {bar}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={
        inline
          ? styles.containerInline
          : [styles.container, { bottom: DOCK_BOTTOM + navBarInset }]
      }
      pointerEvents="box-none"
    >
      {bar}
    </View>
  );
};

interface DockItemProps {
  isFocused: boolean;
  label: string;
  iconName: IconName;
  badge: number;
  badgeDot: boolean;
  pillCount: number;
  fitContent: boolean;
  reduceMotion: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  /** Reports this item's x + width within the bar (for the centering scroller). */
  onItemLayout?: (x: number, width: number) => void;
}

const DockItem: React.FC<DockItemProps> = ({
  isFocused,
  label,
  iconName,
  badge,
  badgeDot,
  pillCount,
  fitContent,
  reduceMotion,
  onPress,
  onLongPress,
  onItemLayout,
}) => {
  const { colors } = useTheme();
  const activeColor = colors.nav.activePill;
  const activeContentColor = colors.nav.onActive;
  const inactiveColor = colors.nav.inactive;
  const capsuleColor = colors.surface.elevated;

  // The in-pill chip and the corner badge are the SAME fact. Printing both puts
  // "3" twice on one pill, which reads as two different numbers for the half
  // second it takes to check. The chip wins while the pill is open (it sits
  // beside the word it qualifies); the corner takes over the moment the pill
  // closes, because the chip's half of the pill no longer exists.
  const chipText = pillCount > 9 ? "9+" : String(pillCount);
  const chipShowing = isFocused && pillCount > 0;
  const showCorner = !chipShowing;
  // 2 glyphs at most, so an estimate is exact enough and costs no measuring pass.
  const chipWidth = chipText.length * 9 + 16;

  const [labelWidth, setLabelWidth] = useState(0);
  // Estimate until the real width is measured, so the active label never pops in at 0.
  // +12 headroom so the exact-width wrapper can never hairline-clip the glyphs or show ellipsis.
  const targetWidth = labelWidth
    ? labelWidth + 12
    : Math.round(label.length * 10);

  const v = useDerivedValue(
    () => (reduceMotion ? (isFocused ? 1 : 0) : withSpring(isFocused ? 1 : 0, DOCK_SPRING)),
    [isFocused, reduceMotion],
  );

  // Full-width nav distributes space via flex; an in-page dock sizes to content.
  const containerStyle = useAnimatedStyle(() =>
    fitContent ? {} : { flex: interpolate(v.value, [0, 1], [1, 2.5]) },
  );
  const pillStyle = useAnimatedStyle(() => ({
    // Clamp the colour input so spring overshoot can't push it past the fill.
    backgroundColor: interpolateColor(Math.min(1, Math.max(0, v.value)), [0, 1], ["transparent", activeColor]),
    paddingHorizontal: Math.max(0, interpolate(v.value, [0, 1], [0, 18])),
  }));
  const textWrapperStyle = useAnimatedStyle(() => ({
    // max(0, …) absorbs spring undershoot so width/margin never go negative.
    width: Math.max(0, interpolate(v.value, [0, 1], [0, targetWidth])),
    marginLeft: Math.max(0, interpolate(v.value, [0, 1], [0, 8])),
    opacity: Math.max(0, Math.min(1, v.value)),
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(v.value, [0, 1], [0.85, 1]) }],
  }));
  // Rides the same `v` as the label, so the count arrives WITH the word it
  // belongs to instead of chasing it.
  const chipStyle = useAnimatedStyle(() => ({
    width: Math.max(0, interpolate(v.value, [0, 1], [0, chipWidth])),
    marginLeft: Math.max(0, interpolate(v.value, [0, 1], [0, 8])),
    opacity: Math.max(0, Math.min(1, v.value)),
  }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ position: "absolute", opacity: 1 - v.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: v.value, position: "absolute" }));
  const badgeBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(v.value, [0, 1], [capsuleColor, activeColor]),
  }));

  return (
    <Animated.View
      style={[styles.itemContainer, containerStyle]}
      entering={reduceMotion ? undefined : FadeIn.duration(duration.base)}
      // Leaving is what makes a mode change read as a MORPH rather than a swap.
      // Without it a removed tab is simply gone on the next frame while the
      // capsule's `LinearTransition` slides the survivors into the hole it left,
      // which looks like the dock was rebuilt. Faster than the entrance for the
      // usual reason: you already know where it went.
      exiting={reduceMotion ? undefined : FadeOut.duration(duration.fast)}
      onLayout={onItemLayout ? (e) => onItemLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width) : undefined}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        // Reports to the dead-tap detector that this touch reached a control.
        onPressIn={notePress}
        activeOpacity={0.7}
        // The bar is 70 tall with 8 of padding, so a tab only occupies the 54
        // content box — the top and bottom 8dp resolved to the bar itself,
        // which has no press handler, and silently ate those taps. hitSlop
        // reclaims them without changing any layout.
        hitSlop={{ top: 8, bottom: 8 }}
        style={fitContent ? styles.touchableFit : styles.touchable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={
          pillCount > 0
            ? `${label}, ${pillCount} waiting`
            : badge > 0
              ? `${label}, ${badge} unread`
              : badgeDot
                ? `${label}, needs attention`
                : label
        }
      >
        <Animated.View style={[styles.pill, pillStyle]}>
          <View style={styles.iconBox}>
            <Animated.View style={inactiveIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={inactiveColor} />
            </Animated.View>
            <Animated.View style={activeIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={activeContentColor} />
            </Animated.View>
            {showCorner && badge > 0 ? (
              <Animated.View style={[styles.badge, { backgroundColor: colors.nav.badge }, badgeBorderStyle]}>
                <Text variant="caption" color={colors.accentOn.danger} style={styles.badgeText} numberOfLines={1}>
                  {badge > 9 ? "9+" : badge}
                </Text>
              </Animated.View>
            ) : showCorner && badgeDot ? (
              // Same fill and the same animated border as the count badge, so the
              // two read as one family — this is a countless version of it, not a
              // second idea. Deliberately NOT animated on entry: the dock is on
              // screen constantly, and a marker that re-animates on every
              // navigation is noise, not information.
              <Animated.View
                style={[styles.badge, styles.badgeDot, { backgroundColor: colors.nav.badge }, badgeBorderStyle]}
              />
            ) : null}
          </View>

          <Animated.View style={[styles.textWrapper, textWrapperStyle]}>
            <Animated.View style={textStyle}>
              <Text variant="bodySm" color={activeContentColor} numberOfLines={1} ellipsizeMode="clip" style={styles.label}>
                {label}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* THE COUNT, INSIDE THE PILL.
              Placed after the label rather than on the icon because it
              qualifies the WORD ("Waiting", 3) rather than marking the tab.
              `onActive` on a tinted plate: the pill is already the accent fill,
              so a second saturated colour here would fight it, and the danger
              red the corner badge uses would call a person waiting to meet you
              an error. */}
          {pillCount > 0 ? (
            <Animated.View style={[styles.chipWrapper, chipStyle]}>
              <View style={[styles.chip, { backgroundColor: withAlpha(activeContentColor, 0.16) }]}>
                <Text
                  variant="caption"
                  color={activeContentColor}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={styles.chipText}
                >
                  {chipText}
                </Text>
              </View>
            </Animated.View>
          ) : null}

          {/* Invisible measurer — gives the wrapper its expand target. It's given a
              generous fixed width so numberOfLines can never truncate it (the narrow
              pill would otherwise cap it and under-measure long labels like
              "Settings"); onTextLayout then reports the TRUE glyph-run width.

              MUST STAY INSIDE `measureClip`. On Android's New Architecture a
              child's box inflates its ancestors' touch rectangle (overflowInset),
              so this 1000px-wide Text was stretching every tab's tap zone ~950px
              to the RIGHT and 0px to the left: the gap between tabs belonged to
              the tab on its left, blank space past the last tab selected that
              tab, and blank space before the first was dead. A zero-sized parent
              with overflow:"hidden" zeroes that inset — layout (and therefore
              onTextLayout) still runs, so measurement is unaffected.
              `pointerEvents="none"` alone would NOT fix this: it stops the Text
              being a target but still inflates the ancestors. */}
          <View style={styles.measureClip} pointerEvents="none">
            <Text
              variant="bodySm"
              numberOfLines={1}
              style={[styles.label, styles.measure]}
              onTextLayout={(e) => {
                const w = Math.ceil(e.nativeEvent.lines[0]?.width ?? 0);
                if (w && w !== labelWidth) setLabelWidth(w);
              }}
            >
              {label}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/** Floating dock's resting offset from the bottom of the CONTENT area. Under
 *  edge-to-edge the window reaches the screen edge, so the live `bottom` adds
 *  `useNavBarInset()` on top of this to hold the same visual position. */
const DOCK_BOTTOM = 30;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: DOCK_BOTTOM,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  containerInline: {
    alignItems: "flex-start",
  },
  scrollContainer: {
    alignSelf: "stretch",
  },
  scrollContent: {
    // Half-viewport padding on each side lets the first/last tab reach centre.
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    borderRadius: 35,
    height: 70,
    padding: 8,
  },
  barFull: {
    width: "100%",
    justifyContent: "space-between",
  },
  barFit: {
    justifyContent: "center",
    gap: 8,
  },
  itemContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
  },
  touchable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  touchableFit: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pill: {
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    minWidth: 48,
    alignSelf: "center",
  },
  iconBox: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrapper: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  // Zero-sized clipping host for the invisible measurer. `overflow: "hidden"`
  // is what makes RN report a zero overflowInset for this subtree, so the
  // 1000px Text inside can no longer inflate the tab's Android touch rect.
  measureClip: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  measure: {
    position: "absolute",
    left: 0,
    opacity: 0,
    // Wide enough that the single line never wraps/truncates; it's out of flow +
    // opacity 0, so it neither shows nor widens the pill.
    width: 1000,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 10,
  },
  badgeText: {
    fontFamily: fonts.extrabold,
  },
  // Same shape as `textWrapper`: a clipping box the animation opens, so the
  // chip is revealed by the pill rather than sliding in over it.
  chipWrapper: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontFamily: fonts.extrabold,
    fontVariant: ["tabular-nums"],
  },
  // Overrides the count badge's box: no text, so it collapses to a true circle.
  //
  // The offsets are not arbitrary — they place this dot's centre on exactly the
  // same point as the numeric badge's (4 below the icon box top, 1 inside its
  // right edge). Same red, same 2px border, same anchor: the countless marker
  // and the counted one are the same object, and a tab gaining a number never
  // makes its marker jump.
  badgeDot: {
    minWidth: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    paddingHorizontal: 0,
    top: -2,
    right: -5,
  },
});
