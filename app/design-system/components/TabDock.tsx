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
   * A count that is the SUBJECT of the tab rather than a notification about it:
   * the Waiting tab reading 5, meaning five people are waiting on you.
   *
   * Distinct from `badge`, which is the unread marker and is drawn in the error
   * red. Somebody waiting to meet you is not an error, so this one takes the
   * accent and inverts on the active pill to stay legible on the fill.
   *
   * It rode INSIDE the pill for a while, as a plate beside the label. That cost
   * 36pt of a 302pt control, about 12&#37;, on a thing whose whole job is to be
   * small. As a corner badge on the icon it is absolutely positioned and costs
   * nothing. Setting it suppresses `badge` and `badgeDot`, which would
   * otherwise stack a second marker on the same icon.
   */
  count?: number;
}

export interface TabDockProps {
  items: TabDockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onLongPress?: (key: string) => void;
  /** Hug the tabs instead of filling the width (for in-page docks). */
  fitContent?: boolean;
  /**
   * Render in normal flow (e.g. inside a header) instead of floating at the
   * bottom — and, with it, the COMPACT geometry: a 56pt capsule around a 44pt
   * pill instead of 70 around 48.
   *
   * The size is part of what `inline` means rather than a separate flag. The
   * floating dock is 70 tall because it is a bar hovering over a screen and has
   * to hold its own against everything behind it. A switcher sitting in a
   * header is not competing with anything, and at 70 it read as the bottom nav
   * dropped at the top of the page: same fill, same radius, same pill, one
   * sixth of an SE screen spent before any content.
   */
  inline?: boolean;
  /**
   * Name every tab, not just the active one.
   *
   * Icon-only inactive tabs are right for the bottom nav, which has four fixed
   * destinations you learn once. They are wrong for a two-way in-page switcher,
   * where the icon IS the label and you cannot read the half you are not on: a
   * person-plus glyph is not the word "Waiting".
   *
   * It also stops the capsule resizing on every tap. `fitContent` hugs its
   * content, so with one label showing at a time the control grows and shrinks
   * by a whole word as you switch.
   *
   * OPT-IN, because it costs width. Three labelled tabs at 56pt measure about
   * 348pt and an SE's content box is 343, so the crowded cases (and anything
   * `scrollable`) must keep the icon-only treatment.
   */
  labelAll?: boolean;
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
  labelAll = false,
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
        inline ? styles.barInline : styles.barFloating,
        fitContent ? styles.barFit : styles.barFull,
        { backgroundColor: surfaceColor ?? colors.surface.elevated, shadowColor: colors.shadow },
        !inline && elevation.e3,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="polite"
    >
      {items.map((item, index) => (
        <DockItem
          key={item.key}
          isFocused={activeKey === item.key}
          label={item.label}
          iconName={item.icon}
          badge={item.badge ?? 0}
          badgeDot={item.badgeDot ?? false}
          count={item.count ?? 0}
          fitContent={fitContent}
          inline={inline}
          labelAll={labelAll}
          // Only the full-width nav needs this. A `fitContent` dock hugs its
          // tabs, so its outer inset is already the padding and nothing else.
          edge={
            fitContent || items.length < 2
              ? undefined
              : index === 0
                ? "start"
                : index === items.length - 1
                  ? "end"
                  : undefined
          }
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
  count: number;
  fitContent: boolean;
  inline: boolean;
  labelAll: boolean;
  /**
   * The FIRST or LAST tab of the full-width nav: pin its pill to the padding
   * box's edge, and take a half share of the leftover space rather than a full
   * one (see `containerStyle`).
   *
   * The two halves are one mechanism. Pinning alone puts the outer inset at
   * exactly `padding`, but it also dumps this slot's whole share of the
   * leftover on the inside — so the first gap came out 1.5× every other gap.
   * Halving the share is what makes them all equal again.
   *
   * Centred and full-share, which is what this replaced, the dock's edge inset
   * was `padding + (slot - pill) / 2`: a REMAINDER that moved with which tab
   * was selected, how long that tab's word was, and how wide the phone was.
   */
  edge?: "start" | "end";
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
  count,
  fitContent,
  inline,
  labelAll,
  edge,
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

  // Two glyphs at most, same rule the unread badge follows, because an 18pt
  // circle holds two and no more.
  const countText = count > 9 ? "9+" : String(count);
  // The subject-count and the unread badge are two markers on one icon. Never
  // both: a number and a dot in the same corner reads as two facts when it is
  // one, and the subject-count is always the more specific of the two.
  const countShowing = count > 0;
  const showCorner = !countShowing;

  const [labelWidth, setLabelWidth] = useState(0);
  // Estimate until the real width is measured, so the active label never pops in at 0.
  // Headroom so the exact-width wrapper can never hairline-clip the glyphs or show
  // ellipsis. 12 for the animated case, where the wrapper is being interpolated and
  // the label is scaling inside it; 4 is enough once both are static, and width is
  // the scarce resource on a control that has to name every tab.
  const targetWidth = labelWidth
    ? labelWidth + (labelAll ? 4 : 12)
    : Math.round(label.length * 10);

  const v = useDerivedValue(
    () => (reduceMotion ? (isFocused ? 1 : 0) : withSpring(isFocused ? 1 : 0, DOCK_SPRING)),
    [isFocused, reduceMotion],
  );

  // ── HOW THE FULL-WIDTH NAV DIVIDES ITSELF UP ──
  //
  // It used to be `flex: 1` resting and `flex: 2.5` focused, and 2.5 was a GUESS
  // at how much room a grown pill needs. The guess is never right, and every
  // pixel of the miss came out as slack that the pill was then centred inside —
  // so the slack landed in a different place in every state. That is what made
  // both the edge inset and the gaps between the icons wander.
  //
  // Now each slot is sized to the pill it holds (`flexBasis`) and the leftover
  // is what gets shared out (`flexGrow`). The edge tabs take a HALF share and
  // pin their pill outward, so their half lands entirely on the inside; every
  // other tab takes a full share and centres. Total grow is therefore n - 1,
  // and the arithmetic falls out exactly:
  //
  //     outer inset  = padding, always
  //     every gap    = (content - Σ pill widths) / (n - 1), all equal
  //
  // The slots still tile the whole bar, so there is no dead strip between tabs
  // for a tap to fall into — the gaps are drawn, not laid out.
  const restWidth = inline ? 44 : 48;
  // The pill's own width, rebuilt from the values that draw it below, so the
  // slot tracks the pill on the SAME spring instead of trailing it:
  // 2 × paddingHorizontal(18) + iconBox(24) + marginLeft(8) + label(targetWidth).
  const growWeight = edge ? 0.5 : 1;
  const containerStyle = useAnimatedStyle(() => {
    if (fitContent) return {};
    const width = 24 + Math.max(0, v.value) * (44 + targetWidth);
    return {
      flexBasis: Math.max(restWidth, width),
      flexGrow: growWeight,
      // Only bites if the labels outgrow the bar. Slots then give way in
      // proportion, which crowds the middle rather than bursting the ends.
      flexShrink: 1,
    };
  });
  const pillStyle = useAnimatedStyle(() => ({
    // Clamp the colour input so spring overshoot can't push it past the fill.
    backgroundColor: interpolateColor(Math.min(1, Math.max(0, v.value)), [0, 1], ["transparent", activeColor]),
    // A named inactive tab keeps padding, or its label would run into the
    // capsule's edge and into its neighbour. Only the icon-only treatment can
    // collapse to nothing.
    paddingHorizontal: Math.max(0, interpolate(v.value, [0, 1], [labelAll ? 14 : 0, 18])),
  }));
  const textWrapperStyle = useAnimatedStyle(() => {
    // Named tabs hold their width open at all times: this wrapper is the thing
    // that used to animate 0 → label, which is exactly what made the capsule
    // grow and shrink by a word on every tap.
    if (labelAll) return { width: targetWidth, marginLeft: 8, opacity: 1 };
    // max(0, …) absorbs spring undershoot so width/margin never go negative.
    return {
      width: Math.max(0, interpolate(v.value, [0, 1], [0, targetWidth])),
      marginLeft: Math.max(0, interpolate(v.value, [0, 1], [0, 8])),
      opacity: Math.max(0, Math.min(1, v.value)),
    };
  });
  const textStyle = useAnimatedStyle(() => ({
    // The scale is the label's ENTRANCE: it grows in as the pill opens around
    // it. A permanent label has no entrance, and leaving this on left every
    // resting tab's word rendered at 85%, so the two halves of the switcher
    // were set in visibly different sizes.
    transform: [{ scale: labelAll ? 1 : interpolate(v.value, [0, 1], [0.85, 1]) }],
  }));
  // TWO COPIES OF THE LABEL, CROSSFADED — the same thing the icon above already
  // does, and for the same reason: `onActive` is near-black, which is legible on
  // the orange fill and invisible the moment the fill is not there. Crossfading
  // two Texts keeps the colour change on the same spring as the pill, without
  // animating a colour through a component that does not take an animated one.
  const labelActiveStyle = useAnimatedStyle(() => ({
    opacity: labelAll ? Math.max(0, Math.min(1, v.value)) : 1,
  }));
  const labelRestStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, 1 - v.value)),
  }));
  /**
   * The subject-count badge INVERTS as the pill fills under it.
   *
   * Resting it sits on the capsule, so it is the accent with dark digits.
   * Focused it sits on an orange fill, where an orange plate would vanish, so
   * the two swap: dark plate, accent digits. Both directions measured, 7.71:1
   * and 10.08:1.
   *
   * The plate is a View and can take an animated colour directly. The digits
   * cannot, so they crossfade as two copies, the same way the icon and the
   * label above already do.
   */
  const countPlateStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.min(1, Math.max(0, v.value)),
      [0, 1],
      [activeColor, activeContentColor],
    ),
  }));
  const countActiveStyle = useAnimatedStyle(() => ({
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
        // A tab only occupies the bar's content box (54 floating, 44 inline) —
        // the padding band above and below resolved to the bar itself, which
        // has no press handler, and silently ate those taps. hitSlop reclaims
        // them without changing any layout, and 8 covers either padding.
        hitSlop={{ top: 8, bottom: 8 }}
        style={fitContent ? styles.touchableFit : styles.touchable}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={
          count > 0
            ? `${label}, ${count} waiting`
            : badge > 0
              ? `${label}, ${badge} unread`
              : badgeDot
                ? `${label}, needs attention`
                : label
        }
      >
        <Animated.View
          style={[
            styles.pill,
            inline && styles.pillInline,
            edge === "start" && styles.pillStart,
            edge === "end" && styles.pillEnd,
            pillStyle,
          ]}
        >
          <View style={styles.iconBox}>
            <Animated.View style={inactiveIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={inactiveColor} />
            </Animated.View>
            <Animated.View style={activeIconStyle}>
              <Icon name={iconName} size={size.tabIcon} color={activeContentColor} />
            </Animated.View>
            {countShowing ? (
              // THE SUBJECT-COUNT, ON THE ICON. Same box, same anchor and the
              // same animated ring as the unread badge below, because it is the
              // same object wearing a different colour. It used to be a plate
              // beside the label, which put a 36pt price on one digit.
              <Animated.View style={[styles.badge, countPlateStyle, badgeBorderStyle]}>
                {/* `activeColor`, NOT `text.accent`. The badge inverts the
                    pill's own fill/on-fill pair — orange plate with dark digits
                    while resting, dark plate with orange digits once the fill
                    is under it — and that pair is guaranteed legible in both
                    directions by the design system, in both schemes.
                    `text.accent` only looked right on ink: it is a BRIGHT
                    orange there and a DARK amber on paper, so on the dark plate
                    it measured 10.08:1 on ink and 2.93:1 on paper, where the
                    digit simply disappeared. This is 7.71:1 in both. */}
                <Animated.View style={countActiveStyle}>
                  <Text
                    variant="caption"
                    color={activeColor}
                    numberOfLines={1}
                    style={styles.badgeText}
                  >
                    {countText}
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelRest, labelRestStyle]}
                  pointerEvents="none"
                >
                  <Text
                    variant="caption"
                    color={activeContentColor}
                    numberOfLines={1}
                    style={styles.badgeText}
                  >
                    {countText}
                  </Text>
                </Animated.View>
              </Animated.View>
            ) : showCorner && badge > 0 ? (
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
              <Animated.View style={labelActiveStyle}>
                <Text variant="bodySm" color={activeContentColor} numberOfLines={1} ellipsizeMode="clip" style={styles.label}>
                  {label}
                </Text>
              </Animated.View>
              {labelAll ? (
                <Animated.View
                  style={[StyleSheet.absoluteFill, styles.labelRest, labelRestStyle]}
                  pointerEvents="none"
                >
                  <Text variant="bodySm" color={inactiveColor} numberOfLines={1} ellipsizeMode="clip" style={styles.label}>
                    {label}
                  </Text>
                </Animated.View>
              ) : null}
            </Animated.View>
          </Animated.View>

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
  },
  // The floating nav: a bar hovering over a whole screen, sized to hold its own
  // against it.
  barFloating: {
    borderRadius: 35,
    height: 70,
    // 11, NOT 8 — it is (70 - 48) / 2, the inset the 48pt pill already has above
    // and below it. At 8 the pill sat 11 from the top and 8 from the side, and
    // the place that reads is the CORNER, where the capsule's 35pt arc is
    // turning: the pill's own cap crowds it on the way round and the whole
    // corner looks mis-struck. Matching them also makes the nesting properly
    // concentric — outer 35 minus an 11 inset is 24, which is exactly the
    // radius of a 48pt capsule, so the two arcs are now parallel the whole way.
    padding: 11,
  },
  // In a header, where it is competing with nothing. Radius stays exactly half
  // the height, so the capsule is the same shape at both sizes rather than a
  // differently-rounded rectangle.
  barInline: {
    borderRadius: 28,
    height: 56,
    padding: 6,
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
  // The first and last pill sit against the padding box rather than floating in
  // the middle of their slot — see `edge` on DockItem for why.
  pillStart: {
    alignSelf: "flex-start",
  },
  pillEnd: {
    alignSelf: "flex-end",
  },
  // 44, which is the touch minimum exactly — it is the floor, not a preference,
  // so the compact capsule cannot shrink any further than this.
  pillInline: {
    height: 44,
    minWidth: 44,
  },
  // The resting label, stacked on the active one and revealed as the fill goes.
  // Centred both ways so the two copies sit on precisely the same baseline; any
  // offset between them would show up as the word jittering during the swap.
  labelRest: {
    alignItems: "center",
    justifyContent: "center",
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
    // Tabular, so a count crossing from 9 to 9+ or 1 to 2 does not shift the
    // digit inside a badge that is only 18 wide.
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
