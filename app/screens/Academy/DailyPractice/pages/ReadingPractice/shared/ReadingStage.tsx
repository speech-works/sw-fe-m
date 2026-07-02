import React, { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
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
  Gradient,
  Icon,
  PageHeader,
  Text,
  icons,
  makeStyles,
  radius,
  space,
  spacing,
  useTheme,
  zIndex,
} from "../../../../../../design-system";
import { FocusConfig, FocusControl } from "./FocusControl";

/** Bottom clearance for the floating dock (pill 70 + ~34 safe margin + gap). */
const DOCK_RESERVE = 120;
/** Extra clearance for the fixed control deck (focus + nav row) above the dock. */
const DECK_RESERVE = 52;

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
  /** "center" (default) for a single short item; "top" for long / paginated reading. */
  align?: "center" | "top";
  /** Advance to the next item — a "Next" pill in the fixed deck (single-item screens). */
  onNext?: () => void;
  /** Page navigation for paginated reading (poem/story) — replaces the Next pill. */
  pagination?: Pagination;
  /** Hard-mode ("Focus on your sounds") control. Omit on screens with no hard mode. */
  focus?: FocusConfig;
  /** The floating recorder dock (each page keeps its own recording wiring). */
  dock: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The shared "Clean Focus" stage for every reading-style practice screen.
 *
 * Two separated surfaces so NO action can ever cause layout shift:
 *  1. A SCROLLING reading surface (header + eyebrow + metadata + body) with nothing
 *     interactive in it, so its variable length can't move any control.
 *  2. A FIXED control deck pinned above the mic dock holding every control as a solid
 *     pill — the focus toggle (left) and Next / page-nav (right). Content fades into the
 *     canvas via a `scrimDown` scrim before it reaches the deck, so nothing overlaps.
 */
export function ReadingStage({
  title,
  onBack,
  category,
  accent,
  align = "center",
  onNext,
  pagination,
  focus,
  dock,
  children,
}: ReadingStageProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const accentColor = accent ?? colors.accent.info;

  // Soft blue ambient that breathes in when focus is on (behind the opaque text).
  const wash = useSharedValue(focus?.active ? 1 : 0);
  useEffect(() => {
    const target = focus?.active ? 1 : 0;
    wash.value = reduceMotion ? target : withTiming(target, { duration: 260 });
  }, [focus?.active, reduceMotion, wash]);
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value * 0.6 }));

  const eyebrow = focus?.active ? "FOCUS · YOUR SOUNDS" : category;
  const hasDeck = !!(focus || pagination || onNext);
  const bottomReserve = DOCK_RESERVE + (hasDeck ? DECK_RESERVE : 0);

  const renderNav = () => {
    if (pagination) {
      const first = pagination.page <= 0;
      const last = pagination.page >= pagination.count - 1;
      return (
        <View style={styles.pageNav}>
          <PressableScale
            onPress={first ? undefined : pagination.onPrev}
            style={[styles.pageBtn, first && styles.pageBtnOff]}
          >
            <Icon name="chevron-left" size={18} color={accentColor} />
          </PressableScale>
          <Text variant="label" color="secondary" style={styles.pageCount}>
            {pagination.page + 1} / {pagination.count}
          </Text>
          <PressableScale
            onPress={last ? undefined : pagination.onNext}
            style={[styles.pageBtn, last && styles.pageBtnOff]}
          >
            <Icon name="chevron-right" size={18} color={accentColor} />
          </PressableScale>
        </View>
      );
    }
    if (onNext) {
      return (
        <PressableScale onPress={onNext} style={styles.nextPill}>
          <Text variant="label" color="secondary">
            Next
          </Text>
          <Icon name={icons.chevronRight} size={16} color={accentColor} />
        </PressableScale>
      );
    }
    return null;
  };

  return (
    <ScreenView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={[StyleSheet.absoluteFillObject, styles.canvas]} />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.accentTint.info },
          washStyle,
        ]}
      />

      {/* SCROLLING reading surface — nothing interactive lives here, so nothing shifts. */}
      <CustomScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.inlineGap, paddingBottom: bottomReserve },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title={title} onBack={onBack} />
        <View style={[styles.stage, align === "top" && styles.stageTop]}>
          <Text variant="label" color={accentColor} style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <View style={styles.content}>{children}</View>
        </View>
      </CustomScrollView>

      {/* Bottom fade — content dissolves into the canvas before the fixed deck. */}
      <View
        style={[styles.scrim, { height: bottomReserve + spacing["4xl"] }]}
        pointerEvents="none"
      >
        <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
      </View>

      {/* FIXED control deck + dock — pinned; every control here is solid + never moves. */}
      <View style={styles.deckFloat} pointerEvents="box-none">
        {hasDeck ? (
          <View style={styles.deck} pointerEvents="box-none">
            <View style={styles.deckSide}>{focus ? <FocusControl {...focus} /> : null}</View>
            <View style={styles.deckSide}>{renderNav()}</View>
          </View>
        ) : null}
        {dock}
      </View>

      {insets.top > 0 ? (
        <View style={[styles.statusCap, { height: insets.top }]} />
      ) : null}
    </ScreenView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { paddingBottom: 0, backgroundColor: c.background.canvas },
  canvas: { backgroundColor: c.background.canvas },
  scroll: {
    paddingHorizontal: space.screenX,
    flexGrow: 1,
  },
  // flexGrow (never flex:1 — flex:1 sets flexBasis 0, so tall content overflows the
  // fixed height, overlaps the header and can't scroll). flexGrow keeps base = content.
  stage: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing["2xl"],
    paddingVertical: spacing["3xl"],
  },
  stageTop: {
    justifyContent: "flex-start",
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
  deckFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  deck: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginHorizontal: space.screenX,
    marginBottom: spacing.sm,
  },
  deckSide: {
    flexShrink: 1,
  },
  nextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border.strong,
    backgroundColor: c.surface.elevated,
  },
  pageNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border.strong,
    backgroundColor: c.surface.elevated,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: {
    opacity: 0.3,
  },
  pageCount: {
    minWidth: 42,
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
