import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getOffers, Offers, OfferItem } from "../../api/users";
import { selectForYou, ForYouSelection } from "../../util/packs/forYou";
import {
  cardVisibility,
  createSlideImpressionTracker,
  type ShelfGeometry,
  type SlideImpressionTracker,
  type SlideTrigger,
} from "../../util/packs/forYouImpressions";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import OfferSlide, {
  SLIDE_MIN_HEIGHT,
  SLIDE_CARD_HEIGHT,
  CTA_BOTTOM_FROM_CARD_TOP,
} from "./OfferSlide";
import { BADGE_OVERHANG } from "./TopMatchBadge";
import { useStorePrices } from "../../hooks/useStorePrices";
import RecHeroCard from "./RecHeroCard";
import {
  Carousel,
  Skeleton,
  Text,
  TextLink,
  duration,
  easing,
  radius,
  space,
  spacing,
  typography,
  useInView,
  useMotion,
  usePageScroll,
  type InViewRect,
} from "../../design-system";

/**
 * The programs shelf on Home — three, not one.
 *
 * Home used to show a single pack, because it asked an endpoint that returns
 * exactly one. The shop endpoint has always returned all ten, already ranked,
 * each tagged `match: { level, reason }` — and the `"strong"` tier was read
 * NOWHERE in the app. We ranked ten and sold one.
 *
 * THIS COMPONENT IS THE ONLY THING ON HOME THAT SELLS. `SmartRecommendationCard`
 * keeps "what to do today" (your in-progress pack, or "today's work is done")
 * and no longer offers anything. One owner means no coordination to get wrong:
 * the alternative — keeping its top-pick card and starting this carousel at
 * `items[1]` — is exactly the positional shortcut `offers.ts` forbids after it
 * once shipped the wrong pack at the wrong price.
 *
 * WHAT "SHOWN" MEANS HERE. `recommendation_shown` fires when the FETCH settles,
 * which says nothing about whether anybody saw this. On a cold open the dock
 * covers the bottom of the card, and for somebody with a pack in progress the
 * whole shelf starts below the fold — both counted as impressions, so every
 * click-through rate built on it was divided by a number nobody had looked at.
 * `for_you_shelf_viewed` measures instead: half the section inside the viewport
 * MINUS the band the dock covers, once per focus, carrying whether it was
 * visible on arrival and whether the price/CTA cleared the dock. That event is
 * the denominator; the old one stays only so existing dashboards keep resolving.
 */

export interface ForYouCarouselProps {
  style?: StyleProp<ViewStyle>;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * How long a slide has to stay settled before it counts as seen. `onIndexChange`
 * fires for every index the scroll passes through, so a flick from the first
 * slide to the third reports the second — which was on screen for a few frames
 * and read by nobody.
 */
const SLIDE_DWELL_MS = 600;

/** Travel on the reveal. Small enough to read as arrival, not as a slide-in. */
const REVEAL_RISE = 12;

/**
 * Where the card sits inside the section — the "For you" heading, the gap under
 * it, and the overhang `OfferSlide`'s wrapper pads in for the badge. Lets one
 * rect for the whole section answer questions about the CARD, which is the thing
 * whose visibility we actually care about.
 */
const SHELF_GEOMETRY: ShelfGeometry = {
  cardTopInSection: typography.h3.lineHeight + space.rowGap + BADGE_OVERHANG,
  cardHeight: SLIDE_CARD_HEIGHT,
  ctaBottomFromCardTop: CTA_BOTTOM_FROM_CARD_TOP,
};

/** Paging dots: `Carousel`'s own `marginTop: spacing.lg` plus their 8pt height. */
const DOTS_BLOCK = spacing.lg + 8;

/** The "Show more" line: its `marginTop` plus TextLink's 8pt padding either side. */
const MORE_BLOCK = space.rowGap + space.inlineGap * 2 + typography.bodySm.lineHeight;

/**
 * The height the settled carousel actually occupies — heading, card, dots and
 * link, not just the card.
 *
 * THE SKELETON USED TO RESERVE ONLY THE CARD (260). The section settles at 368,
 * so every first open shoved everything below it down by 108pt a second or two
 * after the person started reading — and it made "was this visible" unanswerable,
 * because the answer changed after the measurement.
 */
const SECTION_HEIGHT =
  typography.h3.lineHeight +
  space.rowGap +
  SLIDE_MIN_HEIGHT +
  DOTS_BLOCK +
  MORE_BLOCK;

type ProgramsSource = "home_for_you_more" | "home_browse_fallback";

const ForYouCarousel: React.FC<ForYouCarouselProps> = ({ style }) => {
  const navigation = useNavigation<any>();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  const m = useMotion();
  const page = usePageScroll();

  const load = useCallback(async () => {
    try {
      const data = await getOffers();
      setOffers(data);

      // ── Funnel: recommendation_shown ────────────────────────────────────
      // Fired here, once per settled fetch — NOT on render (this component
      // re-renders on every parent update) and NOT on carousel settle
      // (`onIndexChange` fires through runOnJS on every swipe and would spam
      // one event per flick). `mode` comes from the same call the render uses,
      // so the event can never claim a card that wasn't shown.
      //
      // Kept deliberately, and deliberately NOT renamed: it answers "did we
      // have something to offer", which is a real question. It just is not the
      // question everyone was reading it as. See `for_you_shelf_viewed`.
      const shown = selectForYou(data);
      if (shown.mode !== "hidden") {
        track(ANALYTICS_EVENTS.RECOMMENDATION_SHOWN, {
          surface: "home_for_you",
          variant: shown.mode === "carousel" ? "carousel" : "browse_fallback",
          state: null,
          signalLevel: data.signalLevel ?? null,
          count: shown.items.length,
          catalogKey: shown.items[0]?.key ?? null,
          packId: shown.items[0]?.packId ?? null,
          priceInr: shown.items[0]?.priceInr ?? null,
          hasMatchReason: shown.highlightFirst,
          remaining: shown.remaining,
        });
      }
    } catch (err) {
      // Deliberately does NOT clear `offers`. The sibling card learned this the
      // hard way: a refetch that set an error state on failure replaced a
      // perfectly good recommendation with an error card on one flaky request.
      // Keeping the last good data means a dropped connection changes nothing
      // on screen.
      console.error("[ForYou] Failed to load offers", err);
    } finally {
      setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Do NOT add `&& !loading` here. `load` is useCallback(..., []) and
      // therefore permanently stable, so this callback is built once and
      // captures `loading` at its initial `true` forever — the guard would
      // become dead code and every focus would refetch. (Documented at length
      // on SmartRecommendationCard, where it was a live bug.)
      if (Date.now() - lastFetchRef.current < STALE_THRESHOLD_MS) return;
      load();
    }, [load]),
  );

  const selection = selectForYou(offers);
  // One lookup for the whole carousel rather than one per slide.
  const { prices: storePrices } = useStorePrices(
    selection.items.map((i) => i.tierProductId),
  );

  // Read by the impression callbacks, which have to stay stable across renders
  // or they would re-arm the measurement loop on every parent update.
  const selectionRef = useRef<ForYouSelection>(selection);
  selectionRef.current = selection;
  const offersRef = useRef<Offers | null>(offers);
  offersRef.current = offers;

  // ── Impression bookkeeping ────────────────────────────────────────────────
  const focusStartRef = useRef<number>(Date.now());
  const shelfSeenRef = useRef(false);

  // Built once, lazily — `useRef(create(...))` would run the factory on every
  // render and throw the result away, allocating a Set and three closures each
  // time. It reads `selectionRef`, so the tracker never goes stale despite
  // never being rebuilt. Dedup, the dwell gate and the slide-0 seed all live in
  // `forYouImpressions`, which is where they can be tested — see its header.
  const slidesRef = useRef<SlideImpressionTracker | null>(null);
  if (slidesRef.current === null) {
    slidesRef.current = createSlideImpressionTracker({
      dwellMs: SLIDE_DWELL_MS,
      keyFor: (index) => selectionRef.current.items[index]?.key ?? null,
      emit: (index, trigger: SlideTrigger, dwellMs) => {
        const sel = selectionRef.current;
        const item = sel.items[index];
        if (!item) return;
        track(ANALYTICS_EVENTS.FOR_YOU_SLIDE_VIEWED, {
          surface: "home_for_you",
          index,
          catalogKey: item.key,
          packId: item.packId,
          priceInr: item.priceInr,
          highlight: index === 0 && sel.highlightFirst,
          dwellMs,
          trigger,
        });
      },
    });
  }
  const slides = slidesRef.current;

  useFocusEffect(
    useCallback(() => {
      focusStartRef.current = Date.now();
      return () => {
        // A return visit is a new impression — of the shelf and of every slide.
        shelfSeenRef.current = false;
        slides.reset();
      };
    }, []),
  );

  const onShelfVisible = useCallback((rect: InViewRect) => {
    if (shelfSeenRef.current) return;
    shelfSeenRef.current = true;

    const sel = selectionRef.current;
    const isCarousel = sel.mode === "carousel";
    const first = sel.items[0];
    // The section rect plus a known offset gives us the card's box, so we report
    // on the thing that sells rather than on the heading above it.
    const seen = cardVisibility(rect, SHELF_GEOMETRY);

    track(ANALYTICS_EVENTS.FOR_YOU_SHELF_VIEWED, {
      surface: "home_for_you",
      variant: isCarousel ? "carousel" : "browse_fallback",
      trigger: rect.atRest ? "at_rest" : "scroll",
      msToVisible: Date.now() - focusStartRef.current,
      // Null rather than 0 on the browse fallback: it has no card, and a zero
      // would read as one that nobody saw.
      cardVisiblePct: isCarousel ? seen.cardVisiblePct : null,
      ctaVisible: isCarousel ? seen.ctaVisible : null,
      signalLevel: offersRef.current?.signalLevel ?? null,
      count: sel.items.length,
      remaining: sel.remaining,
      catalogKey: first?.key ?? null,
      packId: first?.packId ?? null,
      hasMatchReason: sel.highlightFirst,
    });

    // Arms slide tracking and records slide 0 — the one the carousel can never
    // report, because it only reports index CHANGES from a start of 0.
    if (isCarousel) slides.seed();
  }, []);

  const hasContent = !!offers && selection.mode !== "hidden";

  const { ref: shelfRef, onLayout: measureShelf, hasQualified } = useInView({
    threshold: 0.5,
    enabled: hasContent,
    onEnter: onShelfVisible,
  });

  const onIndexChange = useCallback((index: number) => {
    slides.settleAt(index);
  }, []);

  // ── Reveal ────────────────────────────────────────────────────────────────
  // Tied to the section actually arriving on screen, not to mount: a shelf that
  // renders below the fold has nothing to announce until somebody scrolls to it.
  // Starts revealed when there is no Page to measure against, so a screen that
  // doesn't provide the context can never end up with invisible content.
  const reveal = useSharedValue(page ? 0 : 1);

  useEffect(() => {
    if (!hasQualified) return;
    reveal.value = withTiming(1, {
      duration: duration.reveal,
      easing: easing.out,
    });
  }, [hasQualified, reveal]);

  // Failsafe for the one case that would otherwise hide this section for good:
  // a viewport that never measures means nothing can ever qualify, and the
  // shelf would sit at opacity 0 forever. A missing animation is a far cheaper
  // failure than a missing card.
  useEffect(() => {
    const id = setTimeout(() => {
      if ((page?.viewportHeight ?? 0) <= 0) reveal.value = 1;
    }, 1500);
    return () => clearTimeout(id);
  }, [page, reveal]);

  const rise = m.reduced ? 0 : REVEAL_RISE;
  // Reduced motion keeps the fade and drops the travel — but `translateY` stays
  // in the object either way. A worklet that returns different KEYS on different
  // passes is the "Cannot set property of undefined" crash this app has already
  // shipped once.
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * rise }],
  }));

  const openDetail = (item: OfferItem) => {
    track(ANALYTICS_EVENTS.PACK_CLICKED, {
      source: "home_for_you",
      catalogKey: item.key,
      packId: item.packId,
      priceInr: item.priceInr,
      hasMatchReason: !!item.match?.reason,
      position: selection.items.findIndex((i) => i.key === item.key),
    });
    navigation.navigate("ExploreStack", {
      screen: "ProgramDetail",
      params: { catalogKey: item.key, packId: item.packId },
    });
  };

  // `source` is not decoration: the link under the dots and the browse-fallback
  // CTA shared one untracked function, so the shop had two front doors and no
  // way to tell which one anybody came through.
  const goToPrograms = (source: ProgramsSource) => {
    track(ANALYTICS_EVENTS.PROGRAMS_LIST_OPENED, { source });
    navigation.navigate("ExploreStack", { screen: "Programs" });
  };

  // `selectForYou` already decided which of the three this is — deliberately,
  // so this cannot drift from the analytics above.
  if (selection.mode === "hidden") return null;

  let inner: React.ReactNode;

  if (loading && !offers) {
    // First load. Deliberately no heading over the skeleton — a heading claims a
    // section that may never appear (a no-signal user gets the browse card, which
    // has none). The bars mirror the settled section's SHAPE and total height so
    // nothing below jumps when the offers land; a neutral bar where the heading
    // will go promises a section, not a claim.
    inner = (
      <View style={{ height: SECTION_HEIGHT }}>
        <Skeleton width={92} height={typography.h3.lineHeight} radius={radius.sm} />
        <Skeleton
          height={SLIDE_MIN_HEIGHT}
          radius={radius.card}
          style={styles.skeletonCard}
        />
      </View>
    );
  } else if (selection.mode === "browse") {
    // No second error card even when the fetch failed: SmartRecommendationCard
    // already owns that, and two red cards on Home is worse than one honest
    // fallback. No eyebrow claim, no badge — we have nothing to back one.
    inner = (
      <RecHeroCard
        eyebrow="PROGRAMS"
        title="Find your next program"
        subtitle="Guided, day-by-day plans for the situations that feel hardest."
        ctaLabel="Browse programs"
        onPress={() => goToPrograms("home_browse_fallback")}
      />
    );
  } else {
    inner = (
      <>
        <Text variant="h3" color="primary" style={styles.heading}>
          For you
        </Text>

        <Carousel
          data={selection.items}
          keyExtractor={(i) => i.key}
          onIndexChange={onIndexChange}
          renderItem={({ item, index }) => (
            <OfferSlide
              item={item}
              store={storePrices[item.tierProductId]}
              highlight={index === 0 && selection.highlightFirst}
              onPress={openDetail}
            />
          )}
        />

        {selection.remaining > 0 ? (
          <View style={styles.more}>
            {/* No underline: it is the lone centred line directly under the paging
                dots, which already reads as "there's more this way" — nothing here
                could be mistaken for body copy. */}
            <TextLink
              label="Show more programs"
              onPress={() => goToPrograms("home_for_you_more")}
              underline={false}
            />
          </View>
        ) : null}
      </>
    );
  }

  return (
    // Two boxes on purpose. The OUTER one is what gets measured, and it never
    // moves — putting the ref on the animated child would mean measuring a box
    // mid-reveal and asking "is it visible" of something that is 12pt away from
    // where it will settle.
    <View ref={shelfRef} onLayout={measureShelf} collapsable={false} style={style}>
      <Animated.View style={revealStyle}>{inner}</Animated.View>
    </View>
  );
};

export default ForYouCarousel;

const styles = StyleSheet.create({
  heading: {
    marginBottom: space.rowGap,
  },
  more: {
    marginTop: space.rowGap,
  },
  skeletonCard: {
    marginTop: space.rowGap,
  },
});
