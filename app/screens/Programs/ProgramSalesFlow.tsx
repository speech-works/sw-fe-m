import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AnimatedNumber,
  borderWidth,
  Button,
  easing,
  Gradient,
  Icon,
  IconButton,
  icons,
  radius,
  size,
  space,
  spacing,
  staggerEntering,
  Text,
  useTheme,
  withAlpha,
} from "../../design-system";
import PriceTag from "../../components/PriceTag";
import { OfferItem } from "../../api";
import { PackBrochure } from "../../api/packs/types";

/**
 * The pre-purchase sales experience for one program — an immersive, swipeable
 * multi-page story with a persistent price+Buy bar, so a ready buyer can convert
 * from any page while the undecided one is walked through the value.
 *
 * PRESENTATION ONLY. Every number is server-owned and passed in already resolved:
 * the price/anchor come from the offer, the free-month gift shows ONLY when this
 * user is genuinely `bonusEligible`, and the "matched to you" hook renders ONLY
 * when the server supplied a reason. Nothing here computes a price, invents a
 * rating/testimonial, or promises a gift a repeat buyer won't receive — the same
 * shown-≠-charged honesty rules the old screen enforced.
 *
 * Motion is gated on reduced motion throughout (the ambient nudge goes quiet; the
 * per-page settle keeps opacity, drops translate). The pager is user-driven —
 * dots and parallax interpolate off the live scroll offset, never a timed loop.
 */

export interface ProgramSalesFlowProps {
  brochure: PackBrochure | null;
  offer: OfferItem;
  /** Founder cohort — flips the discount note to "Founder price". */
  isFounder: boolean;
  /** Whether the first-purchase membership month would actually be granted. */
  bonusEligible: boolean;
  purchasing: boolean;
  onBuy: () => void;
  onBack: () => void;
}

/** Ambient drift period (ms) for the hero emblem. Slow — atmosphere, not UI. */
const FLOAT_PERIOD = 3200;

/**
 * Normalise a session title for the timeline: strip a leading "Day 3:" /
 * "Module 3:" (the node owns the number) and any wrapping quotes, so a title
 * that quotes a question ("Tell me about yourself") reads as a heading like
 * every other day instead of being the odd one out. Display-only — the raw
 * server title is untouched everywhere else.
 */
const cleanTitle = (t: string) =>
  t
    .replace(/^(?:Day|Module|Session)\s*\d+\s*[:.\-–—]\s*/i, "")
    .trim()
    .replace(/^[“”"]+|[“”"]+$/g, "")
    .trim();

const ProgramSalesFlow: React.FC<ProgramSalesFlowProps> = ({
  brochure,
  offer,
  isFounder,
  bonusEligible,
  purchasing,
  onBuy,
  onBack,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const ink = colors.action.onPrimary; // dark ink for the bright hero fill

  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Measured pager area — pages must be given an explicit width/height inside a
  // horizontal ScrollView, so we render them only once we know the box.
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [barH, setBarH] = useState(0);

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Settled page index → JS, without a per-frame hop (drives the swipe hint).
  useDerivedValue(() => {
    if (area.w <= 0) return;
    const idx = Math.round(scrollX.value / area.w);
    runOnJS(setActiveIndex)(idx);
  }, [area.w]);

  const dayCount = brochure?.arcDays ?? offer.arcDays ?? null;
  const sessionCount = brochure?.moduleCount ?? 0;
  const modules = brochure?.modules ?? [];
  const title = brochure?.title ?? offer.title;
  const pitch = brochure?.description ?? offer.blurb ?? null;

  const discounted = offer.anchorPriceInr > offer.priceInr;
  const priceNote = discounted
    ? isFounder
      ? "Founder price"
      : "Launch offer"
    : undefined;

  // Content must clear the floating control row (back + dots, which sit at
  // insets.top + spacing.sm and are size.backBtn tall) by the app's standard
  // back-bar→title gap — otherwise the header crams right up against them.
  const topPad = insets.top + spacing.sm + size.backBtn + space.titleGap;
  // The buy bar now floats (inset from the bottom), so content must clear the
  // dock's height PLUS its bottom offset, not just its height.
  const bottomPad = (barH || 88) + insets.bottom + spacing.sm + spacing.lg;

  // ── Build the page list (some pages depend on the data we actually have) ──
  const pages = useMemo(() => {
    const list: React.ReactNode[] = [];

    // 1. HOOK — the cinematic open.
    list.push(
      <HookPage
        key="hook"
        topPad={topPad}
        bottomPad={bottomPad}
        ink={ink}
        eyebrow={dayCount ? `${dayCount}-DAY PROGRAM` : "GUIDED PROGRAM"}
        title={title}
        pitch={pitch}
        matchReason={offer.match?.reason ?? null}
        dayCount={dayCount}
        sessionCount={sessionCount}
        reduceMotion={reduceMotion}
        hintVisible={activeIndex === 0}
      />,
    );

    // 2. THE ARC — the day-by-day timeline (only when we have a curriculum).
    if (modules.length > 0) {
      list.push(
        <PlanPage
          key="plan"
          topPad={topPad}
          title={dayCount ? `Your ${dayCount} days` : "Your plan"}
          modules={modules}
          bottomPad={bottomPad}
        />,
      );
    }

    // 3. THE PAYWALL CLOSE — the offer card + value checklist + reassurance,
    // in the language of a real paywall (a single one-time offer, no invented
    // tiers). This absorbed the old standalone "what you get" page so value and
    // price sit together at the decision point.
    list.push(
      <ClosePage
        key="close"
        topPad={topPad}
        priceInr={offer.priceInr}
        anchorInr={offer.anchorPriceInr}
        note={priceNote}
        dayCount={dayCount}
        credits={offer.creditGrantAmount}
        giftDays={offer.bonusMembershipDays}
        bonusEligible={bonusEligible}
        bottomPad={bottomPad}
      />,
    );

    return list;
  }, [
    topPad,
    ink,
    dayCount,
    title,
    pitch,
    offer,
    sessionCount,
    reduceMotion,
    activeIndex,
    modules,
    bonusEligible,
    bottomPad,
    priceNote,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.canvas }]}>
      <View
        style={styles.pagerArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== area.w || height !== area.h) setArea({ w: width, h: height });
        }}
      >
        {area.w > 0 ? (
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            {pages.map((page, i) => (
              <PagerPage
                key={i}
                index={i}
                width={area.w}
                height={area.h}
                scrollX={scrollX}
                reduceMotion={reduceMotion}
              >
                {page}
              </PagerPage>
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>

      {/* Top scrim — keeps the back button + dots legible over the bright hero. */}
      <Gradient
        token="scrimUp"
        style={[styles.topScrim, { height: topPad + spacing.md }]}
        pointerEvents="none"
      />

      {/* Fixed top controls — back + paging dots, above the pager. */}
      <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <IconButton name={icons.back} onPress={onBack} accessibilityLabel="Go back" />
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={area.w} colors={colors} />
          ))}
        </View>
        {/* Spacer to keep the dots centred against the back button. */}
        <View style={{ width: size.backBtn }} />
      </View>

      {/* Persistent price + Buy dock — a floating capsule (the app's tab-bar
          language), so Buy is never hidden and the bar reads as premium. */}
      <View
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        style={[
          styles.buyBar,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.default,
            shadowColor: colors.shadow,
            bottom: insets.bottom + spacing.sm,
          },
        ]}
      >
        <PriceTag
          priceInr={offer.priceInr}
          anchorInr={offer.anchorPriceInr}
          note={priceNote}
          compact
        />
        <View style={styles.buyBtn}>
          <Button
            label={`Get ${offer.title}`}
            loading={purchasing}
            onPress={onBuy}
            rightIcon={icons.forward}
          />
        </View>
      </View>
    </View>
  );
};

export default ProgramSalesFlow;

/* ────────────────────────────── Pager plumbing ────────────────────────── */

interface PagerPageProps {
  index: number;
  width: number;
  height: number;
  scrollX: Animated.SharedValue<number>;
  reduceMotion: boolean;
  children: React.ReactNode;
}

/** One full-bleed page — content settles (fade + slight rise) as it centres. */
const PagerPage: React.FC<PagerPageProps> = ({
  index,
  width,
  height,
  scrollX,
  reduceMotion,
  children,
}) => {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(scrollX.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP);
    const translateY = reduceMotion
      ? 0
      : interpolate(scrollX.value, input, [20, 0, 20], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={{ width, height }}>
      <Animated.View style={[styles.pageInner, style]}>{children}</Animated.View>
    </View>
  );
};

interface DotProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  width: number;
  colors: ReturnType<typeof useTheme>["colors"];
}

/** Paging dot — width + colour interpolate off the live offset (active = pill). */
const Dot: React.FC<DotProps> = ({ index, scrollX, width, colors }) => {
  const active = colors.action.primary;
  const inactive = colors.text.disabled;
  const style = useAnimatedStyle(() => {
    const pos = width > 0 ? scrollX.value / width : 0;
    const dist = Math.abs(pos - index);
    return {
      width: interpolate(dist, [0, 1], [20, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(dist, [0, 1], [active, inactive]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
};

/* ─────────────────────────────── Page 1: Hook ─────────────────────────── */

interface HookPageProps {
  topPad: number;
  bottomPad: number;
  ink: string;
  eyebrow: string;
  title: string;
  pitch: string | null;
  matchReason: string | null;
  dayCount: number | null;
  sessionCount: number;
  reduceMotion: boolean;
  hintVisible: boolean;
}

const HookPage: React.FC<HookPageProps> = ({
  topPad,
  bottomPad,
  ink,
  eyebrow,
  title,
  pitch,
  matchReason,
  dayCount,
  sessionCount,
  reduceMotion,
  hintVisible,
}) => {
  const nudge = useSharedValue(0);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    nudge.value = withRepeat(
      withTiming(1, { duration: 900, easing: easing.loop }),
      -1,
      true,
    );
    // Slow ambient drift for the hero emblem — atmosphere, not UI.
    drift.value = withRepeat(
      withTiming(1, { duration: FLOAT_PERIOD, easing: easing.loop }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(nudge);
      cancelAnimation(drift);
    };
  }, [reduceMotion, nudge, drift]);
  const nudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value * 6 }],
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -6 + drift.value * 12 },
      { rotate: `${-12 + drift.value * 5}deg` },
    ],
  }));

  return (
    <View style={styles.hookRoot}>
      <Gradient token="sunrise" style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* Depth without an illustration: a soft ink orb for radial glow, a large
          drifting brand-journey emblem as the hero mark, and a top gloss. */}
      <View
        style={[styles.hookBlob, { backgroundColor: withAlpha(ink, 0.08) }]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.hookGlyph, glyphStyle]} pointerEvents="none">
        <Icon name={icons.roadmap} size={216} color={withAlpha(ink, 0.1)} />
      </Animated.View>
      <Gradient token="sheen" style={styles.hookSheen} pointerEvents="none" />

      <View style={[styles.hookFill, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.hookGap} />

        <Animated.View entering={staggerEntering(0, reduceMotion)}>
          <Text variant="label" color={withAlpha(ink, 0.72)}>
            {eyebrow}
          </Text>
        </Animated.View>
        <Animated.View entering={staggerEntering(1, reduceMotion)}>
          <Text variant="display" color={ink} style={styles.hookTitle}>
            {title}
          </Text>
        </Animated.View>
        {pitch ? (
          <Animated.View entering={staggerEntering(2, reduceMotion)}>
            <Text variant="body" color={withAlpha(ink, 0.86)}>
              {pitch}
            </Text>
          </Animated.View>
        ) : null}

        {matchReason ? (
          <Animated.View
            entering={staggerEntering(3, reduceMotion)}
            style={[styles.matchPill, { backgroundColor: withAlpha(ink, 0.12) }]}
          >
            <Icon name={icons.roadmap} size={16} color={ink} />
            <Text variant="bodySm" color={ink} style={styles.flex1}>
              {matchReason}
            </Text>
          </Animated.View>
        ) : null}

        {(dayCount || sessionCount > 0) && (
          <Animated.View
            entering={staggerEntering(4, reduceMotion)}
            style={styles.statsRow}
          >
            {dayCount ? <Stat value={dayCount} label="days" ink={ink} /> : null}
            {dayCount && sessionCount > 0 ? (
              <View style={[styles.statRule, { backgroundColor: withAlpha(ink, 0.24) }]} />
            ) : null}
            {sessionCount > 0 ? (
              <Stat value={sessionCount} label="sessions" ink={ink} />
            ) : null}
          </Animated.View>
        )}

        <View style={styles.hookGap} />

        {hintVisible ? (
          <View style={styles.hint}>
            <Text variant="label" color={withAlpha(ink, 0.72)}>
              Swipe to see your plan
            </Text>
            <Animated.View style={nudgeStyle}>
              <Icon name={icons.chevronRight} size={16} color={withAlpha(ink, 0.72)} />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

interface StatProps {
  value: number;
  label: string;
  ink: string;
}

const Stat: React.FC<StatProps> = ({ value, label, ink }) => (
  <View style={styles.stat}>
    <AnimatedNumber value={value} variant="display" color={ink} />
    <Text variant="label" color={withAlpha(ink, 0.72)}>
      {label}
    </Text>
  </View>
);

/* ───────────────────────────── Page 2: The arc ────────────────────────── */

interface PlanPageProps {
  topPad: number;
  title: string;
  modules: PackBrochure["modules"];
  bottomPad: number;
}

const PlanPage: React.FC<PlanPageProps> = ({ topPad, title, modules, bottomPad }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.pagePadded, { paddingTop: topPad }]}>
      <Text variant="label" color="tertiary">
        THE ARC
      </Text>
      <Text variant="h1" color="primary" style={styles.pageTitle}>
        {title}
      </Text>

      <ScrollView
        style={styles.planScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad, paddingTop: spacing.lg }}
      >
        {modules.map((m, i) => {
          const n = m.dayIndex ?? m.orderIndex ?? i + 1;
          const first = i === 0;
          const last = i === modules.length - 1;
          return (
            <View key={m.id} style={styles.dayRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    first
                      ? { backgroundColor: colors.action.primary }
                      : {
                          backgroundColor: colors.surface.control,
                          borderWidth: 1,
                          borderColor: colors.border.strong,
                        },
                  ]}
                >
                  <Text
                    variant="caption"
                    color={first ? colors.action.onPrimary : "secondary"}
                  >
                    {n}
                  </Text>
                </View>
                {!last ? (
                  <View style={[styles.line, { backgroundColor: colors.border.default }]} />
                ) : null}
              </View>
              <View style={styles.dayBody}>
                <Text variant="title" color="primary">
                  {cleanTitle(m.title)}
                </Text>
                {m.description ? (
                  <Text variant="bodySm" color="secondary" style={styles.dayDesc}>
                    {m.description}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

/* ───────────────────────── Page 3: The paywall close ──────────────────── */

interface ClosePageProps {
  topPad: number;
  priceInr: number;
  anchorInr: number;
  note?: string;
  dayCount: number | null;
  credits: number;
  giftDays: number;
  bonusEligible: boolean;
  bottomPad: number;
}

const ClosePage: React.FC<ClosePageProps> = ({
  topPad,
  priceInr,
  anchorInr,
  note,
  dayCount,
  credits,
  giftDays,
  bonusEligible,
  bottomPad,
}) => {
  const { colors } = useTheme();
  const discounted = anchorInr > priceInr;
  const showGift = giftDays > 0 && bonusEligible;

  return (
    <ScrollView
      style={styles.pageScroll}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.pageScrollContent,
        styles.closeContent,
        { paddingTop: topPad, paddingBottom: bottomPad },
      ]}
    >
      <View>
        <Text variant="label" color="tertiary">
          THE OFFER
        </Text>
        <Text variant="h1" color="primary" style={styles.pageTitle}>
          Ready when you are
        </Text>
      </View>

      {/* The offer card — one real one-time price, featured like a paywall's
          headline plan. The badge is the SERVER discount note; the struck
          original carries the magnitude. No invented tiers, no fake award. */}
      <View
        style={[
          styles.offerCard,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.action.primary,
          },
        ]}
      >
        <View style={styles.offerTop}>
          <Text variant="label" color="tertiary">
            LIFETIME ACCESS
          </Text>
          {discounted && note ? (
            <View style={[styles.dealBadge, { backgroundColor: colors.accent.success }]}>
              <Text variant="caption" color={colors.accentOn.success}>
                {note}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.offerPrice}>
          <PriceTag priceInr={priceInr} anchorInr={anchorInr} />
        </View>
        <Text variant="bodySm" color="secondary">
          One payment. Yours to keep — no subscription.
        </Text>
      </View>

      {/* What you get — the value checklist, sitting right next to the price. */}
      <View style={styles.checkList}>
        {dayCount ? (
          <CheckRow label={`${dayCount}-day guided arc, one session a day`} />
        ) : null}
        {credits > 0 ? (
          <CheckRow label={`${credits} AI practice calls, built in`} />
        ) : null}
        {showGift ? (
          <CheckRow label="First month of membership, free" gift />
        ) : null}
        <CheckRow label="Yours to keep — no subscription" />
      </View>

      <Text variant="caption" color="tertiary" center style={styles.trust}>
        Nothing is charged until you confirm.
      </Text>
    </ScrollView>
  );
};

interface CheckRowProps {
  label: string;
  /** The bonus gift row — gets the gift glyph + brighter ink to draw the eye. */
  gift?: boolean;
}

const CheckRow: React.FC<CheckRowProps> = ({ label, gift }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.checkRow}>
      <Icon
        name={gift ? icons.gift : icons.success}
        size={20}
        color={gift ? colors.text.accent : colors.feedback.successText}
      />
      <Text variant="body" color={gift ? "primary" : "secondary"} style={styles.flex1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pagerArea: {
    flex: 1,
  },
  pageInner: {
    flex: 1,
  },
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    position: "absolute",
    left: space.screenX,
    right: space.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buyBar: {
    position: "absolute",
    left: space.screenX,
    right: space.screenX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.groupGap,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 12,
  },
  buyBtn: {
    flex: 1,
  },
  // ── Hook ──
  hookRoot: {
    flex: 1,
    overflow: "hidden",
  },
  hookFill: {
    flex: 1,
    paddingHorizontal: space.screenX,
  },
  hookGap: {
    flex: 1,
  },
  hookTitle: {
    marginTop: space.inlineGap,
    marginBottom: space.rowGap,
  },
  hookBlob: {
    position: "absolute",
    top: -60,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  hookGlyph: {
    position: "absolute",
    top: 24,
    right: -56,
  },
  hookSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    marginTop: space.groupGap,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    marginTop: space.sectionGap,
  },
  stat: {
    alignItems: "flex-start",
  },
  statRule: {
    width: StyleSheet.hairlineWidth,
    height: 40,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inlineGap,
    paddingBottom: spacing.md,
  },
  // ── Shared page ──
  pagePadded: {
    flex: 1,
    paddingHorizontal: space.screenX,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: space.screenX,
  },
  pageTitle: {
    marginTop: space.titleSub,
  },
  // ── Plan / timeline ──
  planScroll: {
    flex: 1,
    marginTop: space.titleGap,
  },
  dayRow: {
    flexDirection: "row",
    gap: space.iconText,
  },
  rail: {
    width: 28,
    alignItems: "center",
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  dayBody: {
    flex: 1,
    // Wider row rhythm (32 tier) so the timeline breathes — the biggest lever
    // against the congested feel now that each row is a clean title + value.
    paddingBottom: spacing["3xl"],
  },
  dayDesc: {
    marginTop: space.titleSub,
  },
  // ── Paywall close ──
  closeContent: {
    gap: space.sectionGap,
  },
  offerCard: {
    borderRadius: radius.card,
    borderWidth: borderWidth.thick,
    padding: spacing.xl,
  },
  offerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dealBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
  offerPrice: {
    marginTop: space.groupGap,
    marginBottom: space.inlineGap,
  },
  checkList: {
    gap: space.rowGap,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
  },
  trust: {
    marginTop: space.inlineGap,
  },
  flex1: {
    flex: 1,
  },
});
