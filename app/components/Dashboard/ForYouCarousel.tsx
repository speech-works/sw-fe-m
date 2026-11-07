import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getOffers, Offers, OfferItem } from "../../api/users";
import { selectForYou, ForYouSelection } from "../../util/packs/forYou";
import {
  buildShelf,
  ownerPickSubtitle,
  OWNER_PICK_TITLE,
  shownOffers,
  type ShelfSlide,
  type ShelfView,
} from "../../util/packs/forYouShelf";
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
import MoreProgramsTile from "./MoreProgramsTile";
import InProgressSlide from "./InProgressSlide";
import {
  COVER_CTA_BOTTOM_FROM_CARD_TOP,
  COVER_SLIDE_HEIGHT,
} from "./CoverSlide";
import { programCoverFor } from "../../util/packs/programCover";
import AllCompleteSlide from "./AllCompleteSlide";
import { useActiveProgram, type ActiveProgram } from "./useActiveProgram";
import { restartPack } from "../../api/packs";
import PressableScale from "../PressableScale";
import {
  offerStoreIds,
  storePriceFor,
  useStorePrices,
} from "../../hooks/useStorePrices";
import RecHeroCard from "./RecHeroCard";
import CrisisSupportCard from "../CrisisSupportCard";
import {
  Carousel,
  Icon,
  icons,
  Skeleton,
  Text,
  duration,
  easing,
  radius,
  size,
  space,
  spacing,
  typography,
  useInView,
  useMotion,
  usePageScroll,
  useTheme,
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
 * Where the card sits inside the section — the "For you" heading and the gap
 * under it. Lets one rect for the whole section answer questions about the CARD,
 * which is the thing whose visibility we actually care about. (There used to be
 * a third term here for the badge's overhang; the claim is a stamp inside the
 * card now, so the card starts exactly where the heading's gap ends.)
 */
const SHELF_GEOMETRY: ShelfGeometry = {
  cardTopInSection: typography.h3.lineHeight + space.rowGap,
  cardHeight: SLIDE_CARD_HEIGHT,
  ctaBottomFromCardTop: CTA_BOTTOM_FROM_CARD_TOP,
};

/**
 * The same, for a shelf whose slides carry covers. Same height as the plain
 * slides; the action sits in the strip under the cover rather than at the
 * plain card's bottom padding.
 */
const COVER_SHELF_GEOMETRY: ShelfGeometry = {
  cardTopInSection: SHELF_GEOMETRY.cardTopInSection,
  cardHeight: COVER_SLIDE_HEIGHT,
  ctaBottomFromCardTop: COVER_CTA_BOTTOM_FROM_CARD_TOP,
};

/** Paging dots: `Carousel`'s own `marginTop: spacing.lg` plus their 8pt height. */
const DOTS_BLOCK = spacing.lg + 8;

/**
 * The height the settled carousel actually occupies — heading, card and dots,
 * not just the card.
 *
 * THE SKELETON USED TO RESERVE ONLY THE CARD (260). The section settles at 320,
 * so every first open shoved everything below it down a second or two after the
 * person started reading — and it made "was this visible" unanswerable, because
 * the answer changed after the measurement.
 *
 * It used to carry a fourth term, `MORE_BLOCK`, for the "Show more programs"
 * link that sat under the dots. That link is now the heading's right-hand action
 * and the last slide of the carousel, so the 48pt it reserved goes back to the
 * fold. The heading row is unchanged in height: its action is sized to sit
 * inside `h3.lineHeight` precisely so this stays a two-term sum.
 */
const SECTION_HEIGHT =
  typography.h3.lineHeight + space.rowGap + SLIDE_MIN_HEIGHT + DOTS_BLOCK;

/**
 * Which door into the shop somebody used.
 *
 * `source` is not decoration: the shelf now has two ways through to the same
 * screen, and one shared value would make them indistinguishable — the exact
 * problem the old code called out when the link and the browse-fallback CTA
 * shared an untracked function.
 *
 * `home_for_you_more` (the link under the dots) RETIRED on this change. A
 * dashboard whose series stops there should read `home_for_you_header` plus
 * `home_for_you_end_tile` from that date on.
 */
type ProgramsSource =
  | "home_for_you_header"
  | "home_for_you_end_tile"
  | "home_browse_fallback"
  /** The "Pick one to start" card for somebody who owns every program. */
  | "home_owner_pick"
  /** The "You finished all" card. */
  | "home_all_complete";

/**
 * What the carousel renders. The offers are the shelf; the tile is the way out.
 *
 * Kept as a tagged union rather than by padding `selection.items`, and that is
 * load-bearing for measurement: the slide impression tracker reads the slide,
 * so an extra entry in the offers would file the shop door as a program that
 * somebody looked at. `forYou.ts` also forbids padding a ranked list to reach
 * N, for the same family of reasons. The union and the decision about which
 * slides to show live in `forYouShelf.ts`, where they are tested.
 */
type Slide = ShelfSlide;

/** Whether a slide draws a cover, which decides where its action sits. */
const slideHasCover = (slide: Slide): boolean =>
  slide.kind === "offer"
    ? !!programCoverFor(slide.item.key, slide.item.coverImage)
    : slide.kind === "inProgress"
      ? !!programCoverFor(slide.program.catalogKey, slide.program.coverImage)
      : false;

const ForYouCarousel: React.FC<ForYouCarouselProps> = ({ style }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  /** A settled fetch whose `recommendation_shown` has not been sent yet. */
  const shownPendingRef = useRef(false);
  const m = useMotion();
  const page = usePageScroll();

  // Live answer to "can the user actually see Home right now" — focus, app
  // state, our own sheets, the OS's dialogs, and a quiet period so the moment
  // has proved itself. Read continuously, not once: it going false mid-slam is
  // the abort signal.

  const load = useCallback(async () => {
    try {
      const data = await getOffers();
      setOffers(data);

      // ── Funnel: recommendation_shown ────────────────────────────────────
      // Armed here, once per settled fetch, and fired by the effect below once
      // the active program has settled too. The shelf now depends on both, and
      // firing on the offers alone would name a variant before we knew which
      // card the person would get. NOT on render (this component re-renders on
      // every parent update) and NOT on carousel settle (`onIndexChange` fires
      // on every swipe).
      //
      // Kept deliberately, and deliberately NOT renamed: it answers "did we
      // have something to offer", which is a real question. It just is not the
      // question everyone was reading it as. See `for_you_shelf_viewed`.
      shownPendingRef.current = true;
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

  /**
   * The program they are in the middle of, which now leads this shelf instead
   * of sitting in its own card above it.
   */
  const active = useActiveProgram();

  /**
   * ── ONE DECISION FOR THE RENDER AND BOTH EVENTS ───────────────────────────
   * Every state of the shelf (new user, owner, finished, crisis, failed fetch)
   * comes out of `buildShelf`. The render below and the two analytics events
   * read this one object, so neither event can name a card that is not shown.
   */
  const view: ShelfView = buildShelf({
    offers,
    offersLoading: loading && !offers,
    active,
    selection,
  });
  const viewRef = useRef<ShelfView>(view);
  viewRef.current = view;
  // One lookup for the whole carousel rather than one per slide, covering each
  // offer's charged tier AND its anchor tier. The anchor prices are what let a
  // struck "was" be a real store price instead of a backend constant — used by
  // the slides right here, and already warm in the shared cache by the time the
  // buyer taps through to the sales flow. `offerStoreIds` dedupes via the hook,
  // so two offers anchoring against the same tier still cost one lookup.
  const { prices: storePrices } = useStorePrices(
    offerStoreIds(selection.items),
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
  /**
   * WHAT THE CAROUSEL IS ACTUALLY SHOWING, for the impression tracker to read.
   *
   * A ref rather than state because the tracker is built once and never rebuilt
   * — the same reason `selectionRef` exists a few lines up. Kept in step with
   * the rendered list at the bottom of this component.
   */
  const carouselSlidesRef = useRef<Slide[]>([]);
  carouselSlidesRef.current = view.kind === "carousel" ? view.slides : [];


  const slidesRef = useRef<SlideImpressionTracker | null>(null);
  if (slidesRef.current === null) {
    slidesRef.current = createSlideImpressionTracker({
      dwellMs: SLIDE_DWELL_MS,
      /**
       * ── READ THE SLIDE, NOT THE OFFER LIST ──────────────────────────────
       * This used to be `selection.items[index]`, which was correct while every
       * slide was an offer. It is not any more: the program somebody is in the
       * middle of leads the shelf, so slide 1 is offer 0, and the old lookup
       * would have filed every impression one position along — the same class
       * of fault that once gave this funnel a denominator nobody had seen.
       *
       * A non-offer slide returns null, so the in-progress card and the end
       * tile are never counted as programs somebody considered buying.
       */
      keyFor: (index) => {
        const slide = carouselSlidesRef.current[index];
        return slide?.kind === "offer" ? slide.item.key : null;
      },
      emit: (index, trigger: SlideTrigger, dwellMs) => {
        const slide = carouselSlidesRef.current[index];
        if (slide?.kind !== "offer") return;
        const v = viewRef.current;
        const { item, offerIndex } = slide;
        track(ANALYTICS_EVENTS.FOR_YOU_SLIDE_VIEWED, {
          surface: "home_for_you",
          /** Its rank among offers, so the series survives a leading slide. */
          index: offerIndex,
          /** Where it actually sat, for anyone reading position effects. */
          slideIndex: index,
          catalogKey: item.key,
          packId: item.packId,
          priceInr: item.priceInr,
          highlight:
            offerIndex === 0 && v.kind === "carousel" && v.highlightFirst,
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
    const v = viewRef.current;
    if (v.kind === "skeleton") return;
    const isCarousel = v.kind === "carousel";
    // The browse fallback reports no card, as it always has: a zero would
    // read as a card that nobody saw.
    const hasCard = isCarousel && v.variant !== "browse_fallback";
    const shown = shownOffers(v);
    const first = shown[0];
    // The section rect plus a known offset gives us the card's box, so we report
    // on the thing that sells rather than on the heading above it.
    const seen = cardVisibility(
      rect,
      carouselSlidesRef.current.some(slideHasCover)
        ? COVER_SHELF_GEOMETRY
        : SHELF_GEOMETRY,
    );

    track(ANALYTICS_EVENTS.FOR_YOU_SHELF_VIEWED, {
      surface: "home_for_you",
      variant: v.variant,
      trigger: rect.atRest ? "at_rest" : "scroll",
      msToVisible: Date.now() - focusStartRef.current,
      cardVisiblePct: hasCard ? seen.cardVisiblePct : null,
      ctaVisible: hasCard ? seen.ctaVisible : null,
      signalLevel: offersRef.current?.signalLevel ?? null,
      count: shown.length,
      remaining: sel.remaining,
      catalogKey: first?.key ?? null,
      packId: first?.packId ?? null,
      hasMatchReason: isCarousel && v.highlightFirst,
    });

    // Arms slide tracking and records slide 0 — the one the carousel can never
    // report, because it only reports index CHANGES from a start of 0.
    if (isCarousel) slides.seed();
  }, []);

  const hasContent = view.kind !== "skeleton";

  // ── Funnel: recommendation_shown, once both fetches have settled ──────────
  useEffect(() => {
    if (!shownPendingRef.current || !offers || active.loading) return;
    const v = viewRef.current;
    if (v.kind === "skeleton") return;
    shownPendingRef.current = false;
    const shown = shownOffers(v);
    track(ANALYTICS_EVENTS.RECOMMENDATION_SHOWN, {
      surface: "home_for_you",
      variant: v.variant,
      state: null,
      signalLevel: offers.signalLevel ?? null,
      count: shown.length,
      catalogKey: shown[0]?.key ?? null,
      packId: shown[0]?.packId ?? null,
      priceInr: shown[0]?.priceInr ?? null,
      hasMatchReason: v.kind === "carousel" && v.highlightFirst,
      remaining: selection.remaining,
    });
  }, [offers, active.loading, active.program, active.allComplete, selection.remaining]);

  const { ref: shelfRef, onLayout: measureShelf, hasQualified } = useInView({
    threshold: 0.5,
    enabled: hasContent,
    onEnter: onShelfVisible,
  });

  // Kept, and doing only the job it was named for: arming `useInView` so the
  // shelf-viewed impression can fire. It also used to record the shelf's width,
  // which existed solely to position the flying stamp die.
  const onShelfLayout = useCallback(() => measureShelf(), [measureShelf]);

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

  /**
   * Straight into the day they are on. The card this replaced opened a "Ready
   * to start?" sheet that named the module and then navigated — the module's
   * own screen names it too, so the sheet spent a tap repeating a title.
   */
  const openProgram = async (program: ActiveProgram) => {
    track(ANALYTICS_EVENTS.PACK_CLICKED, {
      source: program.isRefresher
        ? "home_for_you_refresher"
        : "home_for_you_in_progress",
      catalogKey: null,
      packId: program.packId,
      priceInr: null,
      hasMatchReason: false,
      position: 0,
    });

    /**
     * ── A REFRESHER HAS TO ACTUALLY RESTART ────────────────────────────────
     * Opening a module does not reset anything, so a finished pack stayed
     * finished: every module COMPLETED, nothing for "the first module that is
     * not completed" to find, and the card offering day 1 for ever — even
     * immediately after somebody completed day 1 again.
     *
     * `restartPack` is the only thing that clears it. It is free and unlimited
     * by design, and it is what "start again" has always meant.
     *
     * AWAITED, not fired alongside the navigation: PackModule reads progress on
     * open, and racing the reset against that read is how it would show a
     * completed day 1 anyway. A failure is swallowed — landing on day 1 without
     * the reset is exactly today's behaviour, and better than a dead button.
     */
    if (program.isRefresher) {
      try {
        await restartPack(program.packId);
      } catch (err) {
        console.error("Failed to restart the pack", err);
      }
    }

    navigation.navigate("ExploreStack", {
      screen: "PackModule",
      params: {
        packId: program.packId,
        moduleId: program.nextModule?.id,
      },
    });
  };

  const goToPrograms = (source: ProgramsSource) => {
    track(ANALYTICS_EVENTS.PROGRAMS_LIST_OPENED, { source });
    navigation.navigate("ExploreStack", { screen: "Programs" });
  };

  /**
   * ── EVERY STATE COMES FROM `buildShelf` ───────────────────────────────────
   * The active program outranks the offers, crisis outranks everything, and
   * Home is never blank for somebody who owns programs. Those rules, and why,
   * are written down and tested in `forYouShelf.ts`. This only draws.
   */
  let inner: React.ReactNode;

  if (view.kind === "skeleton") {
    // First load. Deliberately no heading over the skeleton — a heading claims a
    // section that may never appear (a failed fetch gets the browse card, which
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
  } else if (view.kind === "crisis") {
    // In crisis: support in the slot, never a program to buy.
    inner = <CrisisSupportCard resource={view.resource} />;
  } else if (view.kind === "browse") {
    // A failed fetch, or nothing openable. No second error card, no eyebrow
    // claim, no badge — we have nothing to back one.
    inner = (
      <RecHeroCard
        eyebrow="PROGRAMS"
        title="Find your next program"
        subtitle="Guided, day-by-day plans for the situations that feel hardest."
        ctaLabel="Browse programs"
        onPress={() => goToPrograms("home_browse_fallback")}
      />
    );
  } else if (view.kind === "ownerPick") {
    // They own every program and have started none. This used to be a blank
    // space: nothing to sell, and no program on the shelf.
    inner = (
      <RecHeroCard
        eyebrow="YOUR PROGRAMS"
        title={OWNER_PICK_TITLE}
        subtitle={ownerPickSubtitle(view.count)}
        ctaLabel="See programs"
        onPress={() => goToPrograms("home_owner_pick")}
      />
    );
  } else if (view.kind === "allComplete") {
    inner = (
      <AllCompleteSlide
        count={view.count}
        onPress={() => goToPrograms("home_all_complete")}
      />
    );
  } else {
    const carouselSlides = view.slides;
    const action = view.headerAction;

    inner = (
      <>
        <View style={styles.headingRow}>
          <Text variant="h3" color="primary">
            {view.heading}
          </Text>

          {/* NOT `TextLink`, and not for looks. TextLink pads 8pt above and
              below, which would push this row past `h3.lineHeight` and quietly
              invalidate `SHELF_GEOMETRY.cardTopInSection` — the constant that
              tells the impression code where the card starts. `hitSlop` buys the
              tap target back without touching layout.

              No underline either. TextLink's rule is that the underline goes
              only where POSITION already makes the action unmistakable, and a
              right-aligned accent label with a chevron on a section heading is
              the one arrangement nobody reads as body copy. */}
          {action ? (
            <PressableScale
              scaleTo={0.97}
              onPress={() => goToPrograms("home_for_you_header")}
              accessibilityRole="link"
              accessibilityLabel={action.a11y}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headingAction}
            >
              {/* `bodySm`, the variant every other link in the app uses, rather
                  than the smaller `label`. This is the first section header in
                  the app to carry an action, so it sets the pattern: quiet
                  enough that the heading still leads, familiar enough to read
                  as the same kind of thing as every other link. */}
              <Text variant="bodySm" color="link">
                {action.label}
              </Text>
              <Icon
                name={icons.chevronRight}
                size={size.iconInline}
                color={colors.text.link}
              />
            </PressableScale>
          ) : null}
        </View>

        <Carousel
          data={carouselSlides}
          keyExtractor={(s, i) =>
            s.kind === "offer" ? s.item.key : `${s.kind}-${i}`
          }
          onIndexChange={onIndexChange}
          bleedRight={space.screenX}
          renderItem={({ item: slide }) => {
            if (slide.kind === "inProgress") {
              return (
                <InProgressSlide
                  program={slide.program}
                  onPress={openProgram}
                />
              );
            }
            if (slide.kind === "allComplete") {
              return (
                <AllCompleteSlide
                  count={slide.count}
                  onPress={() => goToPrograms("home_all_complete")}
                />
              );
            }
            if (slide.kind === "offer") {
              return (
                <OfferSlide
                  item={slide.item}
                  store={storePrices[slide.item.tierProductId]}
                  storeAnchor={storePriceFor(
                    storePrices,
                    slide.item.anchorTierProductId,
                  )}
                  // `offerIndex`, not the slide's position. The top match is
                  // still the top match when something sits in front of it.
                  highlight={slide.offerIndex === 0 && view.highlightFirst}
                  eyebrow={slide.eyebrow}
                  onPress={openDetail}
                />
              );
            }
            return (
              <MoreProgramsTile
                variant={slide.variant}
                count={slide.count}
                onPress={() => goToPrograms("home_for_you_end_tile")}
              />
            );
          }}
        />
      </>
    );
  }

  return (
    // Two boxes on purpose. The OUTER one is what gets measured, and it never
    // moves — putting the ref on the animated child would mean measuring a box
    // mid-reveal and asking "is it visible" of something that is 12pt away from
    // where it will settle.
    <View
      ref={shelfRef}
      onLayout={onShelfLayout}
      collapsable={false}
      style={[styles.shelf, style]}
    >
      <Animated.View style={revealStyle}>{inner}</Animated.View>
    </View>
  );
};

export default ForYouCarousel;

const styles = StyleSheet.create({
  shelf: {
    position: "relative",
  },
  // Fixed to the heading's own line height, not left to grow with its contents:
  // `SHELF_GEOMETRY.cardTopInSection` is this height plus the gap, and the
  // impression maths is only true while that stays so.
  headingRow: {
    height: typography.h3.lineHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.inlineGap,
    marginBottom: space.rowGap,
  },
  headingAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  skeletonCard: {
    marginTop: space.rowGap,
  },
});
