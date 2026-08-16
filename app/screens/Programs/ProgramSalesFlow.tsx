import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "../../components/PressableScale";

import {
  AnimatedNumber,
  borderWidth,
  castShadow,
  easing,
  Gradient,
  Icon,
  IconButton,
  icons,
  mix,
  radius,
  Sheet,
  size,
  space,
  spacing,
  staggerEntering,
  Text,
  useTheme,
  accentEdge,
  primaryEdge,
  withAlpha,
} from "../../design-system";
import PriceTag from "../../components/PriceTag";
import { useStorePrices } from "../../hooks/useStorePrices";
import {
  resolvePriceDisplay,
  savingLabelFor,
  type StorePrice,
} from "../../services/priceDisplay";
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

/** Buy-button light sweep: one glide, then a rest, on repeat. Premium, not a nag. */
const SHIMMER_SWEEP = 1100;
const SHIMMER_GAP = 2400;
const SHEEN_W = 84;

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

  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Measured pager area — pages must be given an explicit width/height inside a
  // horizontal ScrollView, so we render them only once we know the box.
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [barH, setBarH] = useState(0);
  // The "Get" button opens a review sheet; the real purchase fires only once
  // that sheet has fully closed (confirmRef gate + Sheet.onDismissed), so its
  // success/error sheet never stacks over ours — the iOS two-modal freeze.
  const [sheetOpen, setSheetOpen] = useState(false);
  const confirmRef = useRef(false);

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
  const { prices: storePrices } = useStorePrices([offer.tierProductId]);
  const storePrice = storePrices[offer.tierProductId];
  // The saving must be quoted in the SAME currency as the price above it.
  // savingLabelFor returns null when there is no honest saving to state, and the
  // whole line is then withheld rather than shown in the wrong money.
  const savingLabel = savingLabelFor(
    resolvePriceDisplay({
      store: storePrice,
      inr: offer.priceInr,
      usd: offer.priceUsd,
      anchorInr: offer.anchorPriceInr,
      anchorUsd: offer.anchorPriceUsd,
    }),
  );
  const priceNote = discounted
    ? isFounder
      ? "Founder price"
      : "Launch offer"
    : undefined;

  // Content must clear the floating control row (back + dots, which sit at
  // insets.top + spacing.sm and are size.backBtn tall) by the app's standard
  // back-bar→title gap — otherwise the header crams right up against them.
  const topPad = insets.top + spacing.sm + size.backBtn + space.titleGap;
  // Content must clear the full-height buy dock (its measured height already
  // includes the fade headroom and the safe-area padding).
  const bottomPad = (barH || 176) + spacing.md;

  // ── Build the page list (some pages depend on the data we actually have) ──
  const pages = useMemo(() => {
    const list: React.ReactNode[] = [];

    // 1. HOOK — the cinematic open.
    list.push(
      <HookPage
        key="hook"
        topPad={topPad}
        bottomPad={bottomPad}
        eyebrow={dayCount ? `${dayCount}-DAY PROGRAM` : "GUIDED PROGRAM"}
        title={title}
        pitch={pitch}
        matchReason={offer.match?.reason ?? null}
        dayCount={dayCount}
        sessionCount={sessionCount}
        reduceMotion={reduceMotion}
        hintVisible={activeIndex === 0 && modules.length > 0}
      />,
    );

    // 2. THE ARC — the day-by-day timeline (only when we have a curriculum).
    // The offer + value + confirm now live in the review sheet the "Get" button
    // opens, so there is no separate paywall page to duplicate them.
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

    return list;
  }, [
    topPad,
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

      {/* Persistent buy dock — the premium paywall pattern: content fades out
          beneath a centered price and ONE full-width glowing CTA. No container
          chrome, so the button is the only bright object at the bottom. */}
      <View
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        style={styles.buyBar}
        pointerEvents="box-none"
      >
        {/* Transparent → SOLID canvas: the fade completes above the price, so
            scrolling content dissolves cleanly and never ghosts through it. */}
        <Gradient
          colors={[
            withAlpha(colors.background.canvas, 0),
            colors.background.canvas,
            colors.background.canvas,
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.buyFade}
          pointerEvents="none"
        />
        <View style={[styles.buyBarInner, { paddingBottom: insets.bottom + spacing.md }]}>
          <PriceTag
            priceInr={offer.priceInr}
            anchorInr={offer.anchorPriceInr}
            priceUsd={offer.priceUsd}
            anchorUsd={offer.anchorPriceUsd}
            store={storePrice}
            center
          />
          {discounted && priceNote && savingLabel ? (
            // The REAL saving, derived from the two server prices — the honest
            // loss-aversion line, in the success green that pairs with brand orange.
            <Text variant="caption" color={colors.feedback.successText} center>
              {priceNote} · Save {savingLabel}
            </Text>
          ) : null}
          <BuyButton
            label={`Get ${offer.title}`}
            loading={purchasing}
            onPress={() => setSheetOpen(true)}
            reduceMotion={reduceMotion}
          />
        </View>
      </View>

      <PurchaseSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onDismissed={() => {
          if (confirmRef.current) {
            confirmRef.current = false;
            onBuy();
          }
        }}
        onConfirm={() => {
          confirmRef.current = true;
          setSheetOpen(false);
        }}
        reduceMotion={reduceMotion}
        eyebrow={dayCount ? `${dayCount}-DAY PROGRAM` : "GUIDED PROGRAM"}
        title={title}
        matchReason={offer.match?.reason ?? null}
        dayCount={dayCount}
        credits={offer.creditGrantAmount}
        giftDays={offer.bonusMembershipDays}
        bonusEligible={bonusEligible}
        priceInr={offer.priceInr}
        anchorInr={offer.anchorPriceInr}
        priceUsd={offer.priceUsd}
        anchorUsd={offer.anchorPriceUsd}
        store={storePrice}
        savingLabel={savingLabel}
        note={priceNote}
      />
    </View>
  );
};

export default ProgramSalesFlow;

/* ─────────────────────────────── The buy button ───────────────────────── */

interface BuyButtonProps {
  label: string;
  loading: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}

/**
 * The one CTA worth making feel alive: a brand-gradient fill with a glossy top,
 * a warm orange glow that lifts it off the dock, and a slow light sweep that
 * says "tap me" without nagging (it glides once, then rests). A purchase CTA is
 * a rare, high-stakes surface — the one place this much motion earns its keep.
 * Press-scale + loading are preserved; the sweep is fully reduced-motion gated.
 */
const BuyButton: React.FC<BuyButtonProps> = ({
  label,
  loading,
  onPress,
  reduceMotion,
}) => {
  const { colors, scheme } = useTheme();
  const ink = colors.action.onPrimary;
  // Soft-edged shine ink. On dark, surface.inverse is white → a crisp glint;
  // on the light "paper" canvas it flips dark, so there we lean on the scheme-
  // aware sheen gloss instead of a dark streak.
  const shine = scheme === "dark" ? colors.surface.inverse : null;
  const [w, setW] = useState(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || w === 0) return;
    shimmer.value = withRepeat(
      withDelay(
        SHIMMER_GAP,
        withTiming(1, { duration: SHIMMER_SWEEP, easing: easing.inOut }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shimmer);
  }, [reduceMotion, w, shimmer]);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-SHEEN_W, w + SHEEN_W]) },
      { rotate: "18deg" },
    ],
  }));

  return (
    <PressableScale
      scaleTo={0.97}
      onPress={loading ? undefined : onPress}
      disabled={loading}
      style={[
        styles.buyCta,
        { backgroundColor: colors.action.primary },
        // Brand-coloured lift under the buy CTA. `blur: 24` is the CSS form of
        // the `shadowRadius: 12` this used to carry.
        castShadow(colors.action.primary, { y: 4, blur: 24, alpha: 0.5, elevation: 8 }),
        primaryEdge(colors),
      ]}
    >
      <View
        style={styles.buyClip}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
      >
        <Gradient token="brand" style={StyleSheet.absoluteFill} pointerEvents="none" />
        {!reduceMotion && w > 0 ? (
          <Animated.View style={[styles.buySweep, sweepStyle]} pointerEvents="none">
            {shine ? (
              <Gradient
                colors={[withAlpha(shine, 0), withAlpha(shine, 0.5), withAlpha(shine, 0)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Gradient token="sheen" style={StyleSheet.absoluteFill} />
            )}
          </Animated.View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <Text variant="title" color={ink} numberOfLines={1}>
            {label}
          </Text>
        )}
      </View>
    </PressableScale>
  );
};

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
  eyebrow,
  title,
  pitch,
  matchReason,
  dayCount,
  sessionCount,
  reduceMotion,
  hintVisible,
}) => {
  const { colors } = useTheme();
  const glow = colors.action.primary;
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
      {/* Premium dark hero — the constitution's "dark + orange accents, never an
          orange flood": warm light falls from the top, an orange orb glow and the
          drifting brand emblem give atmosphere, and the content speaks in accents. */}
      <Gradient
        colors={[withAlpha(glow, 0.16), withAlpha(glow, 0)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.hookWarmth}
        pointerEvents="none"
      />
      <View
        style={[styles.hookBlob, { backgroundColor: withAlpha(glow, 0.08) }]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.hookGlyph, glyphStyle]} pointerEvents="none">
        <Icon name={icons.roadmap} size={216} color={withAlpha(glow, 0.14)} />
      </Animated.View>

      <View style={[styles.hookFill, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.hookGap} />

        <Animated.View entering={staggerEntering(0, reduceMotion)}>
          <Text variant="label" color="accent">
            {eyebrow}
          </Text>
        </Animated.View>
        <Animated.View entering={staggerEntering(1, reduceMotion)}>
          <Text variant="display" color="primary" style={styles.hookTitle}>
            {title}
          </Text>
        </Animated.View>
        {pitch ? (
          <Animated.View entering={staggerEntering(2, reduceMotion)}>
            <Text variant="body" color="secondary">
              {pitch}
            </Text>
          </Animated.View>
        ) : null}

        {matchReason ? (
          <Animated.View
            entering={staggerEntering(3, reduceMotion)}
            style={[
              styles.matchPill,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Icon name={icons.roadmap} size={size.iconSm} color={colors.text.accent} />
            <Text variant="bodySm" color="secondary" style={styles.flex1}>
              {matchReason}
            </Text>
          </Animated.View>
        ) : null}

        {(dayCount || sessionCount > 0) && (
          <Animated.View
            entering={staggerEntering(4, reduceMotion)}
            style={styles.statsRow}
          >
            {dayCount ? <Stat value={dayCount} label="days" /> : null}
            {dayCount && sessionCount > 0 ? (
              <View style={[styles.statRule, { backgroundColor: colors.border.strong }]} />
            ) : null}
            {sessionCount > 0 ? (
              <Stat value={sessionCount} label="sessions" />
            ) : null}
          </Animated.View>
        )}

        <View style={styles.hookGap} />

        {hintVisible ? (
          <View style={styles.hint}>
            <Text variant="label" color="tertiary">
              Swipe to see your plan
            </Text>
            <Animated.View style={nudgeStyle}>
              <Icon name={icons.chevronRight} size={size.iconSm} color={colors.text.tertiary} />
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
}

const Stat: React.FC<StatProps> = ({ value, label }) => (
  <View style={styles.stat}>
    <AnimatedNumber value={value} variant="display" color="primary" />
    <Text variant="label" color="tertiary">
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
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // The top dissolve reveals only as the list moves — day 1 stays crisp at rest,
  // then content melts into the canvas under the header as you scroll up.
  const topFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <View style={[styles.pagePadded, { paddingTop: topPad }]}>
      <Text variant="eyebrow" color="tertiary">
        THE ARC
      </Text>
      <Text variant="h1" color="primary" style={styles.pageTitle}>
        {title}
      </Text>

      <View style={styles.planScrollWrap}>
      <Animated.ScrollView
        style={styles.planScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
                      ? { backgroundColor: colors.action.primary, ...primaryEdge(colors) }
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
      </Animated.ScrollView>
        {/* Top dissolve — the mirror of the buy-dock fade. A tall canvas gradient
            whose opacity ramps in with scroll, so the list melts into the canvas
            under the header exactly as it melts into the dock at the bottom. */}
        <Animated.View
          style={[styles.planTopFade, topFadeStyle]}
          pointerEvents="none"
        >
          <Gradient
            colors={[colors.background.canvas, withAlpha(colors.background.canvas, 0)]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

/* ─────────────────────────── The purchase sheet ───────────────────────── */

interface PurchaseSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires after the sheet has FULLY closed — where the real purchase runs, so
   *  its success/error sheet never stacks over this one (iOS two-modal freeze). */
  onDismissed: () => void;
  /** Confirm tapped — flag the deferred buy and start closing. */
  onConfirm: () => void;
  reduceMotion: boolean;
  eyebrow: string;
  title: string;
  matchReason: string | null;
  dayCount: number | null;
  credits: number;
  giftDays: number;
  bonusEligible: boolean;
  priceInr: number;
  anchorInr: number;
  priceUsd: number;
  anchorUsd: number;
  store?: StorePrice | null;
  /** Pre-formatted saving in the displayed currency; null ⇒ withhold the line. */
  savingLabel: string | null;
  note?: string;
}

/**
 * The commit surface — a focused review sheet that earns the tap. Persuasion is
 * white-hat only (Octalysis, done honestly): OWNERSHIP ("yours forever, not a
 * subscription"), the REAL saving vs the standing price (loss-aversion with a
 * true anchor), a GENUINE gift (reciprocity — only when actually eligible), real
 * "matched to you" personalisation, and risk-reversal. No fabricated countdowns,
 * scarcity, or social proof — every line is server-owned truth.
 */
const PurchaseSheet: React.FC<PurchaseSheetProps> = ({
  visible,
  onClose,
  onDismissed,
  onConfirm,
  reduceMotion,
  eyebrow,
  title,
  matchReason,
  dayCount,
  credits,
  giftDays,
  bonusEligible,
  priceInr,
  anchorInr,
  priceUsd,
  anchorUsd,
  store,
  savingLabel,
  note,
}) => {
  const { colors } = useTheme();
  const discounted = anchorInr > priceInr;
  const showGift = giftDays > 0 && bonusEligible;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      // The gutter moves off the card and onto the body below, so the sheet's
      // scroller runs edge-to-edge. Otherwise its bounds sit exactly on the
      // CTA's edges and clip the button's glow into a flat-sided slab.
      contentStyle={styles.sheetSurface}
    >
      <View style={styles.sheetBody}>
        {/* Identity — compact on purpose, so the offer and CTA stay above the
            fold (the single biggest conversion lever on a small screen). */}
        <View>
          <Text variant="label" color="tertiary">
            {eyebrow}
          </Text>
          <Text variant="h1" color="primary" style={styles.pageTitle}>
            {title}
          </Text>
          {/* Matched to you — real personalisation, as a slim line, not a box. */}
          {matchReason ? (
            <View style={styles.sheetMatched}>
              <Icon name={icons.roadmap} size={size.iconSm} color={colors.text.accent} />
              <Text variant="bodySm" color="secondary" style={styles.flex1}>
                {matchReason}
              </Text>
            </View>
          ) : null}
        </View>

        {/* The offer — one real one-time price, the saving carried by the badge
            + the struck original. Ownership framing, honest anchor. */}
        <View
          style={[
            styles.offerCard,
            {
              // A warm brand-tinted surface (flattened with mix, per the tint
              // rule) + the orange border = a clearly "selected plan" card.
              backgroundColor: mix(colors.surface.default, colors.action.primary, 0.1),
              borderColor: colors.action.primary,
            },
          ]}
        >
          <View style={styles.offerTop}>
            <Text variant="eyebrow" color="tertiary">
              LIFETIME ACCESS
            </Text>
            {discounted && note ? (
              <View style={[styles.dealBadge, { backgroundColor: colors.accent.success }, accentEdge(colors, "success")]}>
                <Text variant="caption" color={colors.accentOn.success}>
                  {note}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.offerPrice}>
            <PriceTag
              priceInr={priceInr}
              anchorInr={anchorInr}
              priceUsd={priceUsd}
              anchorUsd={anchorUsd}
              store={store}
            />
          </View>
          {discounted && savingLabel ? (
            <Text
              variant="bodySm"
              color={colors.feedback.successText}
              style={styles.saveLine}
            >
              You save {savingLabel}
            </Text>
          ) : null}
          <Text variant="bodySm" color="secondary">
            One payment. Yours to keep. No subscription.
          </Text>
        </View>

        {/* What you get — the value checklist. Ownership already lives in the
            offer card, so it is not repeated here. */}
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
        </View>

        {/* Commit — the premium button, then the risk-reverser, then an easy out. */}
        <View style={styles.sheetActions}>
          <BuyButton
            label="Unlock now"
            loading={false}
            onPress={onConfirm}
            reduceMotion={reduceMotion}
          />
          <Text variant="caption" color="tertiary" center>
            Nothing is charged until you confirm.
          </Text>
          <PressableScale onPress={onClose} style={styles.maybeLater}>
            <Text variant="bodySm" color="tertiary">
              Maybe later
            </Text>
          </PressableScale>
        </View>
      </View>
    </Sheet>
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
        size={size.icon}
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
    borderRadius: radius.full,
  },
  buyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Headroom for the fade — content dissolves before it reaches the price.
    paddingTop: spacing["3xl"],
  },
  buyFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Start the dissolve above the dock so the fade has room to finish before
    // the price line — behind price + CTA the backing is fully opaque.
    top: -spacing["4xl"],
  },
  buyBarInner: {
    paddingHorizontal: space.screenX,
    gap: space.inlineGap,
  },
  buyCta: {
    height: 56,
    borderRadius: radius.pill,
    alignSelf: "stretch",
    // Shadow applied inline via `castShadow` — it is the brand hue, not a
    // static colour, and the legacy shadow* props never reached Android.
  },
  buyClip: {
    flex: 1,
    borderRadius: radius.pill,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
  },
  buySweep: {
    position: "absolute",
    top: -24,
    bottom: -24,
    width: SHEEN_W,
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
    borderRadius: radius.full,
  },
  hookGlyph: {
    position: "absolute",
    top: 24,
    right: -56,
  },
  hookWarmth: {
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
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
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
  pageTitle: {
    marginTop: space.titleSub,
  },
  // ── Plan / timeline ──
  planScrollWrap: {
    flex: 1,
    marginTop: space.groupGap,
  },
  planScroll: {
    flex: 1,
  },
  planTopFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Tall + gradual, to match the generous dissolve of the buy-dock fade.
    height: spacing["6xl"],
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
    borderRadius: radius.full,
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
  // ── Offer card + checklist (shared by the purchase sheet) ──
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
  // ── Purchase sheet ──
  sheetSurface: {
    paddingHorizontal: 0,
  },
  sheetBody: {
    gap: space.groupGap,
    // Carries the sheet's own gutter — same inset as before, but now inside the
    // scroller, so the CTA's glow has room to spread before anything clips it.
    paddingHorizontal: space.screenX,
  },
  sheetMatched: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    marginTop: space.rowGap,
  },
  saveLine: {
    marginBottom: space.inlineGap,
  },
  sheetActions: {
    gap: space.rowGap,
  },
  maybeLater: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  flex1: {
    flex: 1,
  },
});
