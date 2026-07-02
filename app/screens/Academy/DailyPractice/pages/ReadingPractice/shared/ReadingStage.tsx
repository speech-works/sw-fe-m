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

/** First-paint estimate of the fixed cluster height (deck row + dock); replaced by the
 *  measured value on layout so the scroll always reserves the exact right space. */
const CLUSTER_ESTIMATE = 168;
/** Soft fade above the fixed cluster. Content must clear this whole zone to stay crisp. */
const SCRIM_FADE = 40;

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
  /** Advance to the next item — a "Next" pill in the fixed deck. */
  onNext?: () => void;
  /** Page navigation for paginated reading (poem/story) — sits beside the Next pill. */
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

  // Measure the real deck+dock height so the scroll reserves exactly enough for content
  // to clear the entire scrim fade (not just the deck) — otherwise the last lines dim.
  const [clusterH, setClusterH] = useState(CLUSTER_ESTIMATE);
  const onDeckLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - clusterH) > 1) setClusterH(h);
  };
  const scrimH = clusterH + SCRIM_FADE;
  const bottomReserve = scrimH + spacing.lg; // last line lands above the fade

  const eyebrow = focus?.active ? "FOCUS · YOUR SOUNDS" : category;

  // TEMP DEBUG (remove): real scroll numbers to diagnose the can't-scroll-past-deck bug.
  const [dbg, setDbg] = useState({ c: 0, l: 0 });

  const renderNav = () => {
    const parts: React.ReactNode[] = [];
    if (pagination) {
      const first = pagination.page <= 0;
      const last = pagination.page >= pagination.count - 1;
      parts.push(
        <View key="page" style={styles.pageNav}>
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
        </View>,
      );
    }
    if (onNext) {
      parts.push(
        <PressableScale key="next" onPress={onNext} style={styles.nextPill}>
          <Text variant="label" color="secondary">
            Next
          </Text>
          <Icon name={icons.chevronRight} size={16} color={accentColor} />
        </PressableScale>,
      );
    }
    if (!parts.length) return null;
    return <View style={styles.navGroup}>{parts}</View>;
  };

  const hasDeck = !!(focus || pagination || onNext);

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
        onContentSizeChange={(_w: number, h: number) =>
          setDbg((s) => ({ ...s, c: h }))
        }
        onLayout={(e: LayoutChangeEvent) => {
          const h = e.nativeEvent.layout.height;
          setDbg((s) => ({ ...s, l: h }));
        }}
      >
        <PageHeader title={title} onBack={onBack} />
        <View style={[styles.stage, align === "center" && styles.stageCenter]}>
          <Text variant="label" color={accentColor} style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <View style={styles.content}>{children}</View>
        </View>
      </CustomScrollView>

      {/* Bottom fade — sized to the measured cluster so content dissolves before it. */}
      <View style={[styles.scrim, { height: scrimH }]} pointerEvents="none">
        <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
      </View>

      {/* FIXED control deck + dock — measured; every control here is solid + never moves. */}
      <View style={styles.deckFloat} pointerEvents="box-none" onLayout={onDeckLayout}>
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

      {/* TEMP DEBUG (remove) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 4,
          right: 6,
          backgroundColor: "rgba(0,0,0,0.8)",
          paddingHorizontal: 6,
          paddingVertical: 3,
          zIndex: 9999,
        }}
      >
        <Text variant="caption" color="#00ff88">
          {`c:${Math.round(dbg.c)} l:${Math.round(dbg.l)} r:${Math.round(bottomReserve)} k:${Math.round(clusterH)}`}
        </Text>
      </View>
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
  navGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.md,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnOff: {
    opacity: 0.3,
  },
  pageCount: {
    minWidth: 30,
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
