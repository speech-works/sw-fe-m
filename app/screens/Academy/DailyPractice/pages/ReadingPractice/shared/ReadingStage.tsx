import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomScrollView from "../../../../../../components/CustomScrollView";
import PressableScale from "../../../../../../components/PressableScale";
import ScreenView from "../../../../../../components/ScreenView";
import {
  Icon,
  Gradient,
  Text,
  makeStyles,
  size,
  space,
  spacing,
  useTheme,
  duration,
  easing,
  onColor,
  withAlpha,
  zIndex,
  FloatingControls,
  FloatingControlItem,
  floatingControlSurface,
  FLOATING_CONTROL_SIZE,
} from "../../../../../../design-system";
import { FocusConfig, FocusControl } from "./FocusControl";
import FocusLamp from "../../../components/FocusLamp";

/** First-paint estimate of the fixed cluster height (control stack + dock); replaced by
 *  the measured value on layout so the scroll always reserves the exact right space. */
const CLUSTER_ESTIMATE = 260;
/** Soft fade above the fixed cluster. Content must clear this whole zone to stay crisp. */
const SCRIM_FADE = 100;

export interface Pagination {
  /** 0-based current page. */
  page: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}

interface ReadingStageProps {
  title: string;
  onBack: () => void;
  /** Small accent eyebrow above the content (e.g. "WORD"). */
  category: string;
  /** Accent colour for the eyebrow + nav chevrons. Defaults to the reading blue. */
  accent?: string;
  /** AA-safe foreground that sits on the accent page background. */
  onAccent?: string;
  /** "center" (default) for a single short item; "top" for long / paginated reading. */
  align?: "center" | "top";
  /** Advance to the next item — a "Next" pill in the fixed deck. */
  onNext?: () => void;
  /** Page navigation for paginated reading (poem/story) — sits beside the Next pill. */
  pagination?: Pagination;
  /** Hard-mode ("Focus on your sounds") control. Omit on screens with no hard mode. */
  focus?: FocusConfig;
  /** Vertical scroll-offset callback (bucketed ~6px). Used by paginated reading to
   *  auto-track the on-screen page from scroll position instead of pager buttons. */
  onScrollY?: (y: number) => void;
  /** The floating recorder dock (each page keeps its own recording wiring). */
  dock: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The shared "Clean Focus" stage for every reading-style practice screen.
 *
 * Two separated surfaces so NO action can ever cause layout shift:
 *  1. A SCROLLING reading surface (header + eyebrow + metadata + body) with nothing
 *     interactive in it, so its variable length can't move a control.
 *  2. A FIXED control deck pinned above the mic dock holding every control as a solid
 *     pill — focus (left), page-nav + Next (right). The scroll reserves the MEASURED
 *     cluster height + the scrim fade, so the last line always clears the fade fully.
 */
export function ReadingStage({
  title,
  onBack,
  category,
  accent,
  onAccent,
  align = "center",
  onNext,
  pagination,
  focus,
  onScrollY,
  dock,
  children,
}: ReadingStageProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const accentColor = accent ?? colors.accent.info;
  const foregroundColor = onAccent ?? onColor(accentColor, colors);
  const foregroundMuted = withAlpha(foregroundColor, 0.68);

  // Focus is an occasional, explicit state change: animate opacity/transform only.
  const focusProgress = useSharedValue(focus?.active ? 1 : 0);
  useEffect(() => {
    const target = focus?.active ? 1 : 0;
    focusProgress.value = reduceMotion
      ? target
      : withTiming(target, { duration: duration.reveal, easing: easing.out });
  }, [focus?.active, focusProgress, reduceMotion]);
  const focusGradientStyle = useAnimatedStyle(() => {
    const progress = focusProgress.value;
    return {
      opacity: progress,
      transform: [
        { scale: reduceMotion ? 1 : 1.05 - progress * 0.05 },
        { translateY: reduceMotion ? 0 : -18 + progress * 18 },
      ],
    };
  });

  // Measure the real deck+dock height so the scroll reserves exactly enough for content
  // to clear the entire scrim fade (not just the deck) — otherwise the last lines dim.
  const [clusterH, setClusterH] = useState(CLUSTER_ESTIMATE);
  const onDeckLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    console.log(`[ReadingStage] deckFloat measured height: ${h}`);
    if (h > 0 && Math.abs(h - clusterH) > 1) setClusterH(h);
  };
  const scrimH = clusterH + SCRIM_FADE;
  const bottomReserve = scrimH + spacing["6xl"]; // extra generous clearance (64px instead of 16px)
  console.log(`[ReadingStage] clusterH=${clusterH} scrimH=${scrimH} bottomReserve=${bottomReserve} SCRIM_FADE=${SCRIM_FADE}`);

  const eyebrow = focus?.active ? "FOCUS · YOUR SOUNDS" : category;
  const focusGradientColors: readonly [string, string, string] = [
    withAlpha(foregroundColor, 0.02),
    withAlpha(foregroundColor, 0.2),
    withAlpha(foregroundColor, 0.06),
  ];
  // Ease-in curve: stays nearly invisible at the top, ramps up near the controls.
  const scrimColors: readonly [string, string, string, string] = [
    withAlpha(accentColor, 0),
    withAlpha(accentColor, 0.05),
    withAlpha(accentColor, 0.4),
    accentColor,
  ];
  const scrimLocations: readonly [number, number, number, number] = [0, 0.35, 0.7, 1];

  const hasDeck = !!(focus || pagination || onNext);

  // Every control lives in one right-aligned floating stack above the dock (shared
  // `FloatingControls`). column-reverse means items[0] sits at the bottom (thumb),
  // so the primary FORWARD control anchors it: the pager on paginated screens, else
  // Next. Focus stacks in the middle; Next rides the top on paginated screens.
  const renderControls = () => {
    if (!hasDeck) return null;
    const items: FloatingControlItem[] = [];

    if (pagination) {
      const first = pagination.page <= 0;
      const last = pagination.page >= pagination.count - 1;
      items.push({
        key: "pager",
        render: (
          <View
            style={[
              styles.pager,
              { backgroundColor: colors.surface.elevated, shadowColor: colors.shadow },
            ]}
          >
            <PressableScale
              onPress={first ? undefined : pagination.onPrev}
              style={[styles.pagerBtn, first && styles.pagerOff]}
              accessibilityLabel="Previous page"
            >
              <Icon name="chevron-up" size={20} color={accentColor} />
            </PressableScale>
            <Text variant="label" color="secondary" style={styles.pagerCount}>
              {pagination.page + 1}/{pagination.count}
            </Text>
            <PressableScale
              onPress={last ? undefined : pagination.onNext}
              style={[styles.pagerBtn, last && styles.pagerOff]}
              accessibilityLabel="Next page"
            >
              <Icon name="chevron-down" size={20} color={accentColor} />
            </PressableScale>
          </View>
        ),
      });
    }

    if (focus) {
      items.push({
        key: "focus",
        render: <FocusControl {...focus} accentColor={accentColor} />,
      });
    }

    if (onNext) {
      const nextButton: FloatingControlItem = {
        icon: "arrow-right",
        onPress: onNext,
        accessibilityLabel: "Next",
        accentColor: colors.surface.elevated,
        onAccentColor: accentColor,
      };
      if (pagination) items.push(nextButton);
      else items.unshift(nextButton);
    }

    return <FloatingControls inline items={items} style={styles.deckStack} />;
  };

  return (
    <ScreenView style={[styles.screen, { backgroundColor: accentColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={accentColor} />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          styles.canvas,
          { backgroundColor: accentColor },
        ]}
      />

      {/* SCROLLING reading surface — nothing interactive lives here, so nothing shifts. */}
      <CustomScrollView
        contentContainerStyle={[
          styles.scroll,
          align === "center" && { flexGrow: 1 },
          { paddingTop: insets.top + space.inlineGap },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollY={onScrollY}
      >
        <View style={styles.header}>
          <PressableScale
            onPress={onBack}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.surface.control,
                borderColor: colors.border.strong,
              },
            ]}
          >
            <Icon name="arrow-left" size={20} color={colors.text.primary} />
          </PressableScale>
          <Text variant="h1" color={foregroundColor} style={styles.title}>
            {title}
          </Text>
        </View>
        <View style={[styles.stage, align === "center" && styles.stageCenter]}>
          <Text variant="label" color={foregroundMuted} style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <View style={styles.content}>{children}</View>
        </View>
        
        {/* Explicit spacer guarantees the scrollable area extends past the fade/dock,
            avoiding iOS flex padding miscalculations that cause bounce-back. */}
        <View style={{ height: bottomReserve }} />
      </CustomScrollView>

      {/* Bottom fade — sized to the measured cluster so content dissolves before it. */}
      <View style={[styles.scrim, { height: scrimH }]} pointerEvents="none">
        <Gradient colors={scrimColors} locations={scrimLocations} style={StyleSheet.absoluteFill} />
      </View>

      {/* Focus gradient rendered ABOVE the scrim so it tints the scrim area uniformly,
          eliminating the visible line where the scrim's raw accentColor meets the
          focus-tinted background. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, focusGradientStyle]}
      >
        <Gradient
          colors={focusGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Focus-mode lamp — drops in from the top-right while focus is engaged and
          casts a mild reading light; eases in/out with the toggle. Sits ABOVE the
          status cap (so the dim + cord reach the very top) but below the controls,
          which stay crisp via a higher zIndex. */}
      <View style={styles.lampLayer} pointerEvents="none">
        <FocusLamp focus={!!focus?.active} />
      </View>

      {/* FIXED control stack + dock — measured; every control here is solid + never moves. */}
      <View style={styles.deckFloat} pointerEvents="box-none" onLayout={onDeckLayout}>
        {renderControls()}
        {dock}
      </View>

      {insets.top > 0 ? (
        <View style={[styles.statusCap, { height: insets.top, backgroundColor: accentColor }]} />
      ) : null}
    </ScreenView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { paddingBottom: 0, backgroundColor: c.background.canvas },
  canvas: { backgroundColor: c.background.canvas },
  scroll: {
    paddingHorizontal: space.screenX,
  },
  header: {
    gap: space.titleGap,
  },
  backButton: {
    width: size.backBtn,
    height: size.backBtn,
    borderRadius: size.backBtn / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  title: {
    maxWidth: "92%",
  },
  // Natural flow by default (top-aligned) so LONG/paginated content measures its true
  // height and scrolls fully. `stageCenter` adds flexGrow only for short single items
  // (word/quote) that should vertically centre — they never overflow, so no scroll issue.
  // Do NOT put flexGrow here: a flexGrow child inside a flexGrow scroll container is
  // flex-resolved to viewport height, clipping overflow and breaking scroll (RN gotcha).
  stage: {
    alignItems: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing["3xl"],
  },
  stageCenter: {
    flexGrow: 1,
    justifyContent: "center",
  },
  eyebrow: {
    letterSpacing: 1.2,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  lampLayer: {
    ...StyleSheet.absoluteFillObject,
    // Above the status cap (zIndex.sticky) so the dim + cord reach the top edge.
    zIndex: zIndex.sticky + 1,
  },
  deckFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Above the lamp layer so the controls + dock never get dimmed.
    zIndex: zIndex.sticky + 2,
  },
  // The floating control stack, right-aligned above the dock (gutter + gap).
  deckStack: {
    alignSelf: "stretch",
    paddingRight: space.screenX,
    marginBottom: spacing.md,
  },
  // Vertical pager pill — same footprint as the icon FABs, taller to house
  // prev / count / next in one consistent control.
  pager: {
    ...floatingControlSurface,
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  pagerBtn: {
    width: FLOATING_CONTROL_SIZE,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerOff: {
    opacity: 0.3,
  },
  pagerCount: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: c.background.canvas,
    zIndex: zIndex.sticky,
  },
}));
