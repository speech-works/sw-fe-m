import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
} from "react-native-reanimated";
import {
  Text,
  typography,
  Icon,
  icons,
  size,
  spacing,
  useTheme,
  duration,
  easing,
  withAlpha,
} from "../../design-system";
import { MarkedHeadline, type MarkShape } from "../../components/membership/MarkedHeadline";
import {
  BenefitRows,
  benefitRowsHeight,
  type BenefitRowsDensity,
} from "../../components/membership/BenefitRows";
import { CallLengthHero } from "../../components/membership/CallLengthHero";
import { PlanPills } from "../../components/membership/PlanPills";
import { PROGRAMS_NOTE } from "../../services/membershipOffer";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * ===========================================================================
 * THE PAYWALL, AS THREE PAGES AND ONE ROOM
 * ---------------------------------------------------------------------------
 * ── THE RULE THIS OBEYS ────────────────────────────────────────────────────
 * The buy control lives OUTSIDE the pager, so it is on every page by
 * construction rather than by being repeated three times. Somebody who never
 * swipes can still see the price and buy. That is what separates a safe
 * stepped offer from the carousel this replaced, where three co-equal reasons
 * were shown one at a time and most readers only ever saw one of them.
 *
 * Page one therefore carries the complete argument on its own. Pages two and
 * three are depth, never a missing piece.
 *
 * ── THE GROUND TRAVELS ─────────────────────────────────────────────────────
 * The canvas, the wash, the ledge and both orbs interpolate off the LIVE
 * scroll offset, not off the settled page index. Snapping the colour at the
 * page boundary would make it a consequence of the swipe; interpolating makes
 * the swipe feel like it is turning the room. It is one shared value driving
 * five properties, all on the UI thread, so it holds 60fps while the offers
 * request is still in flight.
 *
 * The journey is deliberate: warm ink while the case is being made, a
 * graphite while the list is read, and MEMBERSHIP'S OWN OBSIDIAN at the moment
 * money is asked for, so the buy step arrives already wearing the tier's
 * identity.
 *
 * ── AND THE ROOM STAYS DARK IN BOTH SCHEMES ────────────────────────────────
 * All three grounds above are scheme-invariant, and the screen is wrapped in
 * `ForceDark` at its root (see `Payments/index.tsx`) so every token this
 * subtree reads resolves to its dark value.
 *
 * That wrapper is not a convenience, it is the fix for a shipped bug. Pages
 * two and three were ALREADY painted on invariant dark grounds while their
 * headline and body asked for `text.primary` and `text.tertiary`, which are a
 * warm near-black on paper. A light-scheme reader got the poster at 1.1:1 and
 * the plan block at 3.1:1, which is to say they got neither.
 *
 * Fixing it one component at a time would have meant threading an ink family
 * through `MarkedHeadline`, `BenefitRows`, `CallLengthHero`, `PlanPills` and
 * the dock, and leaving the same trap set for the next thing added here. A
 * paywall is a dark room by design, which is exactly what `ForceDark` is for.
 *
 * ── WHY THE BUY BUTTON NEVER CHANGES COLOUR ────────────────────────────────
 * It stays premium gold on all three pages while the page accent shifts
 * around it. The thing being bought is the constant, and a control that keeps
 * its colour is findable without looking for it.
 *
 * ── THE LEDGE IS NOT ONE HEIGHT FOR THREE PAGES ────────────────────────────
 * It used to be. One `drop` was computed, anchored on the tallest page, and
 * the other two centred whatever was left over underneath a curve that did not
 * belong to them. That is what left a 17 Pro Max with a small island of
 * content floating in a large empty band: the air was INSIDE the composition,
 * between the poster and the body, where it reads as a mistake.
 *
 * Now each page reports how tall its own body is and the curve DESCENDS until
 * that body sits on the dock. The slack all ends up ABOVE the curve, in the
 * wash, and the poster centres in it — which is the one zone on this screen
 * that is supposed to be large, because it is a colour field holding a
 * headline rather than a gap between two things.
 *
 * The three drops are interpolated off the same live scroll offset as the
 * colours, so the curve travels while you swipe. The layout is authored ONCE
 * at drop zero and moved by transforms only; nothing here animates a layout
 * property. See `drops`/`lifts` below.
 *
 * ── THE SWIPE CUE IS NOT A BUTTON ──────────────────────────────────────────
 * Three things carry it: a 3pt rim at the right edge painted in the NEXT
 * page's accent, the segment bar, and a caption that appears once. There is
 * no arrow. An arrow is a control for doing what the drag already does, and
 * it costs a 64pt hole in a layout that has no room to spare.
 * ===========================================================================
 */

/** The caption retires permanently on the first drag. A hint that keeps
 *  arriving is a nag, and somebody who has swiped has learned the gesture. */
const CUE_TEXT = "Swipe to see the rest";

export interface PaywallPagerProps {
  /** Rendered under the pages: price, CTA and the legal block. Never moves. */
  dock: React.ReactNode;
  /** Measured dock height, so the pages know where their floor is. */
  dockHeight: number;
  monthlyLabel: string;
  annualPerMonthLabel: string;
  annualLabel: string;
  annualSavingsPct: number;
  plan: "monthly" | "annual";
  onPickMonthly: () => void;
  onPickAnnual: () => void;
  /** Hides the plan tiles when no real price is known (Guideline 3.1.2). */
  priceKnown: boolean;
  disabled?: boolean;
  isMember?: boolean;
  memberPlan?: "annual" | "monthly" | null;
  renewalDateText?: string | null;
}

interface PageSkin {
  bg: string;
  accent: string;
  wash: string;
  eyebrow: string;
  line1: string;
  line2Lead: string;
  marked: string;
  tail?: string;
  shape: MarkShape;
}

export const PaywallPager: React.FC<PaywallPagerProps> = ({
  dock,
  dockHeight,
  monthlyLabel,
  annualPerMonthLabel,
  annualLabel,
  annualSavingsPct,
  plan,
  onPickMonthly,
  onPickAnnual,
  priceKnown,
  disabled,
  isMember = false,
  memberPlan = null,
  renewalDateText = null,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [cueGone, setCueGone] = useState(false);
  const [dockH, setDockH] = useState(dockHeight);

  /* ── THE JOURNEY IS A DEEPENING, NOT TWO JUMPS ─────────────────────────────
     It used to run warm canvas, cool ink, then a navy slate: two hue changes
     in opposite directions, with the gold accent having to work over both. Now
     it runs warm ink, graphite, obsidian. One family, three depths, and the
     page that asks for money is the darkest and the warmest of them, so the
     gold on it is the most luminous thing on the whole screen.

     Dropping the navy is what let the wash stop being a compromise. The old
     note here explained at length that the wash could not be the accent,
     because gold is a yellow and slate is a navy and a warm tint over a cool
     ground makes olive. On obsidian a gold-cast wash is simply a deeper gold,
     which is why page three's `groundMid` is a bronze rather than a grey.

     `wash` is still A LIGHTER SHADE OF THE SAME GROUND, never the accent: the
     upper zone reads as raised rather than coloured, and the accent stays where
     it earns its keep, in the eyebrow, the mark, the figure, the segments and
     the rim.

     Only page two's pair is a literal. Page one is the app's own canvas and
     page three is the tier's, and both should follow their tokens; the middle
     page belongs to neither and exists to get you from one to the other. */
  const SKINS: PageSkin[] = [
    {
      bg: colors.background.canvas,
      accent: colors.action.primary,
      wash: colors.surface.default,
      eyebrow: "Membership",
      line1: "Long enough",
      line2Lead: "to get past ",
      marked: "hello",
      tail: ".",
      shape: "ellipse",
    },
    {
      bg: "#16171A",
      accent: colors.accent.info,
      wash: "#232529",
      eyebrow: "What you get",
      line1: "Three things,",
      // WAS "all of them yours". A program somebody buys IS theirs forever;
      // membership access is not, and the day-28 sheet leans on exactly that
      // distinction ("The program you bought stays yours either way"). Calling
      // both "yours" quietly dissolves the line we work hardest to keep.
      line2Lead: "all ",
      marked: "included",
      shape: "underline",
    },
    {
      bg: colors.premium.ground,
      accent: colors.premium.gold,
      wash: colors.premium.groundMid,
      eyebrow: "Your plan",
      line1: "Two ways",
      line2Lead: "to keep ",
      marked: "going",
      tail: ".",
      shape: "ellipse",
    },
  ];

  const inputRange = [0, width, width * 2];

  /* Derived, never a constant. The first build hardcoded 180 and 100, which
     are right on a 844pt iPhone and badly wrong on a 667pt SE, where the
     figure ran into the swipe cue. The headline is always two lines, so the
     ledge belongs just under it and the body just under the ledge. */
  const short = height < 700;
  /* Top clearance for the poster inside the card. Clearance for the poster
     so it sits comfortably under the sheet header. 32pt on SE, 44pt on tall phones. */
  const BASE_TOP = short ? 32 : 44;
  // eyebrow + gap + two poster lines
  const HEAD_H = typography.eyebrow.lineHeight + spacing.md + typography.poster.lineHeight * 2;
  // Retain the rich, full-size roomy density on standard and tall phones
  const density: BenefitRowsDensity = short ? "compact" : "roomy";

  /* THE RESTING GEOMETRY — the layout as authored, before anything moves.
     Identical on all three pages, and the only geometry the style sheet ever
     sees. Everything that differs per page is a transform. */
  const LEDGE_TOP = BASE_TOP + HEAD_H + spacing.sm;
  const BODY_TOP = LEDGE_TOP + LEDGE_H - spacing.lg;

  /* THE FLOOR, measured rather than derived.
     `height - dockH` was close but never right: it is the WINDOW, and this
     component does not own the window — the screen puts a sheet header above
     it. Being wrong in this direction is the expensive one, because it inflates
     every drop below and pushes content under the dock, where it is simply
     gone. So the pager asks its own root how tall it is, and until it knows,
     every drop is zero and the pages sit exactly where they used to. */
  const [rootH, setRootH] = useState(0);
  const PAGE_H = rootH > 0 ? rootH - dockH : 0;
  const MAX_DROP = Math.round(PAGE_H * DROP_MAX);

  /* WHAT EACH PAGE'S BODY ACTUALLY MEASURES.
     Measured, not derived, and this is a deliberate departure from the rest of
     this file. A derived height has to predict how a paragraph wraps, which
     depends on the width, the locale and the reader's text size — and being
     wrong by one line here does not misplace the text by a line, it misplaces
     the CURVE by a line on a page that is mostly curve. `benefitRowsHeight`
     stands in for page two until the first layout lands, because it is exact
     and page two is the tallest, so the one page that could overshoot never
     starts from a guess of zero. */
  const [bodyH, setBodyH] = useState<number[]>([0, 0, 0]);
  const measureBody = useCallback((i: number, h: number) => {
    setBodyH((prev) =>
      Math.abs(prev[i] - h) < 1 ? prev : prev.map((v, n) => (n === i ? h : v)),
    );
  }, []);

  /* How far each page's curve descends, and how far its poster follows.
     Clamped at both ends: never negative, never past DROP_MAX. A body that
     measures taller than the band simply gets no drop, which is the old
     top-anchored layout — the safe failure, not a hidden one. */
  const drops = bodyH.map((measured, i) => {
    const contentH = measured > 0 ? measured : i === 1 ? benefitRowsHeight(density) : 0;
    if (short || PAGE_H <= 0 || contentH <= 0) return 0;
    // `spacing.lg` short of the floor, not flush against it. The dock's first
    // element is the swipe cue, which carries a bottom margin and no top one,
    // so a drop computed to the exact floor lands a bar or a plan row directly
    // on that caption.
    return Math.max(0, Math.min(PAGE_H - BODY_TOP - contentH - spacing.lg, MAX_DROP));
  });

  /* The poster centres in the field it now owns: the card's top edge down to
     the middle of the curve's sweep. Half the drop would be close enough on a
     16 Pro and visibly top-heavy on a Max, because the field grows from a base
     that is not zero. Clamped so the headline can never climb above its own
     top padding, nor come within `spacing.sm` of the curve. */
  const lifts = drops.map((drop) => {
    if (drop <= 0) return 0;
    const field = LEDGE_TOP + drop + LEDGE_H / 2;
    const centred = Math.round((field - HEAD_H) / 2) - BASE_TOP;
    return Math.max(0, Math.min(centred, drop - spacing.sm));
  });

  const onSettle = useCallback((i: number) => {
    setPage(i);
    if (i > 0) setCueGone(true);
  }, []);

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const near = Math.round(e.contentOffset.x / width);
      // Only when genuinely settled, so a drag that is passing over page two
      // does not replay page two's annotation on its way to page three.
      if (Math.abs(e.contentOffset.x / width - near) < 0.02) {
        runOnJS(onSettle)(near);
      }
    },
  });

  const groundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      inputRange,
      SKINS.map((s) => s.bg),
    ),
  }));

  const washStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      inputRange,
      SKINS.map((s) => s.wash),
    ),
  }));

  /* The ledge is filled with the LIVE ground, not a fixed canvas colour.
     Filling it with a constant is the bug that makes the curve appear as a
     visible seam the instant the background starts moving. */
  const ledgeProps = useAnimatedProps(() => ({
    fill: interpolateColor(scrollX.value, inputRange, SKINS.map((s) => s.bg)),
  }));

  /* ── THE THREE SHIFTS ──────────────────────────────────────────────────
     One number per page, interpolated off the same offset as every colour on
     this screen, and applied as `translateY` only. `drops` moves the curve and
     the body it sits on; `lifts` moves the poster.

     They are separate because they are different distances: the body travels
     the full drop so it lands on the dock, the poster travels roughly half so
     it stays centred in the field that just grew above it. Locking the poster
     to the same value as the curve is what an earlier draft did, and it dragged
     the headline down into the curve on the pages with the biggest drop.

     They are interpolated rather than set per page ON PURPOSE. Per-page static
     padding is cheaper and looks identical when settled — and wrong mid-drag,
     because the curve is ONE element spanning all three pages while the poster
     is three. Page one's headline would sit still while the curve rose past it
     toward page two's height, and on a long drag the curve cuts through it. */
  const ledgeShift = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, drops, Extrapolation.CLAMP) },
    ],
  }));

  const headShift = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, lifts, Extrapolation.CLAMP) },
    ],
  }));

  const bodyShift = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, inputRange, drops, Extrapolation.CLAMP) },
    ],
  }));

  /* The rim shows the NEXT page's accent and fades as you arrive at it, so it
     is brightest while you are settled and have not yet been told there is
     more. On the last page there is nothing to promise, so it goes to zero. */
  const rimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      inputRange,
      [SKINS[1].accent, SKINS[2].accent, SKINS[2].accent],
    ),
    opacity: interpolate(
      scrollX.value,
      [0, width * 1.98, width * 2],
      [0.8, 0.35, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const cueStyle = useAnimatedStyle(() => ({
    opacity: withTiming(cueGone ? 0 : 1, { duration: duration.slow, easing: easing.out }),
  }));

  /** One segment of the progress bar, filling off the live offset. */
  const Segment: React.FC<{ index: number }> = ({ index }) => {
    const fill = useAnimatedStyle(() => ({
      width: `${
        interpolate(
          scrollX.value / width,
          [index - 1, index],
          [0, 100],
          Extrapolation.CLAMP,
        )
      }%`,
      backgroundColor: interpolateColor(
        scrollX.value,
        inputRange,
        SKINS.map((s) => s.accent),
      ),
    }));
    return (
      <View style={[styles.seg, { backgroundColor: withAlpha(colors.text.primary, 0.15) }]}>
        <Animated.View style={[styles.segFill, fill]} />
      </View>
    );
  };

  return (
    <Animated.View
      style={[styles.root, groundStyle]}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (Math.abs(h - rootH) > 1) setRootH(h);
      }}
    >
      {/* ── atmosphere ───────────────────────────────────────────────────
          A flat tint above the ledge, and the ledge is the boundary.

          Two earlier attempts failed for the same reason, so they are worth
          recording. First, two Views with a huge borderRadius, ported from the
          web prototype where they carried `filter: blur(72px)` — a React Native
          View CANNOT blur, so they rendered as hard-edged circles of flat
          colour: the muddy blob, not a glow.

          Then an SVG gradient fading the tint back into the ground. That looked
          right on page one and wrong on page three, because an SVG gradient
          STOP cannot take an animated value: the fade was painted in the warm
          canvas colour while the ground underneath had already travelled to
          slate, leaving a brown band on a navy page.

          So the tint does not fade at all. It ends at the curve, and the curve
          is filled with the LIVE ground — one animated value, no second colour
          to keep in sync, and closer to the reference besides. */}
      {/* THE WASH AND THE CURVE ARE ONE OBJECT NOW.

          They were two absolutely-positioned siblings, which was correct while
          the curve sat at one height forever. It does not any more: the whole
          assembly slides down by the live drop, and a separately-positioned
          wash would have to animate its HEIGHT to keep its bottom edge on the
          curve — a layout property, on every frame of a drag.

          So the group is over-tall by exactly MAX_DROP and hangs off the top of
          the card. Sliding it down extends the wash from the top edge for free,
          because the extra is already drawn up there, and the curve is pinned
          to the group's BOTTOM so it travels without anything being kept in
          sync by hand. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ledgeGroup,
          { top: -MAX_DROP, height: MAX_DROP + LEDGE_TOP + LEDGE_H },
          ledgeShift,
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, washStyle]} />
        <Svg
          style={styles.ledge}
          width="100%"
          height={LEDGE_H}
          viewBox="0 0 390 72"
          preserveAspectRatio="none"
        >
          <AnimatedPath
            d="M0 4 C 96 54, 214 -8, 390 34 L390 72 L0 72 Z"
            animatedProps={ledgeProps}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.rim, rimStyle]} pointerEvents="none" />

      {/* ── the pages ───────────────────────────────────────────────────── */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handler}
        scrollEventThrottle={16}
        style={[styles.pager, { bottom: dockH }]}
        contentContainerStyle={{ width: width * SKINS.length }}
      >
        {SKINS.map((skin, i) => (
          <View key={i} style={[styles.page, { width, paddingTop: BASE_TOP }]}>
            <Animated.View style={headShift}>
              <Text variant="eyebrow" style={{ color: skin.accent }}>
                {skin.eyebrow}
              </Text>

              <View style={styles.headline}>
              <MarkedHeadline
                line1={skin.line1}
                line2Lead={skin.line2Lead}
                marked={skin.marked}
                tail={skin.tail}
                shape={skin.shape}
                accent={skin.accent}
                // Only the ACTIVE page replays. Keying every page off the same
                // value would draw all three marks at once behind the scenes,
                // and the two off-screen ones would already be finished when
                // the reader arrives.
                playKey={page === i ? `${i}-on` : `${i}-off`}
              />
              </View>
            </Animated.View>

            {/* TOP-ANCHORED, and no longer centred on tall phones.

                Centring was the old answer to a band that was too big: split
                the leftover evenly above and below so at least the island sat
                in the middle of it. There is no leftover to split now — the
                curve came down to meet this block, so the block starts where
                the curve leaves off and ends on the dock. Centring here would
                only re-introduce the gap, in halves.

                `flex: 1` still runs it to the dock so nothing below can be
                pushed off; the inner wrapper is what actually reports the
                content's own height back up. */}
            <Animated.View
              style={[styles.body, { marginTop: BODY_TOP - BASE_TOP - HEAD_H }, bodyShift]}
            >
              {i === 1 ? (
                <ScrollView
                  style={styles.midScroll}
                  contentContainerStyle={styles.midScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  bounces
                >
                  <BenefitRows
                    animate
                    compact={density === "compact"}
                    roomy={density === "roomy"}
                  />
                </ScrollView>
              ) : (
                <View onLayout={(e) => measureBody(i, e.nativeEvent.layout.height)}>
                  {i === 0 ? (
                    <>
                      <Text variant="body" color="secondary" style={styles.lead}>
                        Your free weekly call stops at three minutes. Usually right
                        when it starts to matter.
                      </Text>
                      {/* THE SE KEEPS THE PAIR.
                          Two labelled tracks are 140pt against the figure's 54, and
                          a 667pt screen has about 168pt of band in total — the bars
                          would put the member track under the dock. `short` gets no
                          drop either, so there is no height coming to rescue it.
                          The taller phones, which are the ones that had a hole to
                          fill, get the version that fills it. */}
                      <View style={styles.figure}>
                        {short ? (
                          <CallLengthHero framed={false} align="left" />
                        ) : (
                          <CallLengthHero variant="bars" />
                        )}
                      </View>
                    </>
                  ) : null}

                  {i === 2 ? (
                    <>
                      {/* Compact only where there is no height to spare — see the
                          figure above. Roomy is 186pt, compact is 118. */}
                      {priceKnown ? (
                        <PlanPills compact={short}>
                          <PlanPills.Card
                            compact={short}
                            title="Monthly"
                            price={monthlyLabel}
                            priceSuffix="/mo"
                            selected={isMember ? memberPlan === "monthly" : plan === "monthly"}
                            footnote={
                              isMember && memberPlan === "monthly" && renewalDateText
                                ? `Renews ${renewalDateText}`
                                : isMember
                                  ? "Switch in App Store"
                                  : undefined
                            }
                            tag={
                              isMember && memberPlan === "monthly"
                                ? "CURRENT PLAN"
                                : undefined
                            }
                            onPress={onPickMonthly}
                            disabled={disabled || isMember}
                          />
                          <PlanPills.Card
                            compact={short}
                            title="Yearly"
                            price={annualLabel}
                            priceSuffix="/yr"
                            // Apple Guideline 3.1.2(c): The total billed amount must be the
                            // primary headline figure. The calculated per-month breakdown
                            // is subordinate in size/position as a footnote.
                            footnote={
                              isMember && memberPlan === "annual" && renewalDateText
                                ? `Renews ${renewalDateText}`
                                : priceKnown
                                  ? `${annualPerMonthLabel}/mo`
                                  : undefined
                            }
                            tag={
                              isMember && memberPlan === "annual"
                                ? "CURRENT PLAN"
                                : annualSavingsPct > 0
                                  ? `SAVE ${annualSavingsPct}%`
                                  : undefined
                            }
                            selected={isMember ? memberPlan === "annual" : plan === "annual"}
                            onPress={onPickAnnual}
                            disabled={disabled || isMember}
                          />
                        </PlanPills>
                      ) : null}
                      <Text variant="caption" color="tertiary" style={styles.aside}>
                        {PROGRAMS_NOTE} A program you buy stays yours either way.
                      </Text>
                    </>
                  ) : null}
                </View>
              )}
            </Animated.View>
          </View>
        ))}
      </Animated.ScrollView>

      <Animated.View
        style={[styles.dock, groundStyle]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (Math.abs(h - dockH) > 1) setDockH(h);
        }}
      >
        {/* The cue lives INSIDE the dock, above the segments. It was absolutely
            positioned over the pages, which put "Swipe to see what is included"
            straight through the 3 to 10 figure on a short screen. Anything that
            floats over the content will eventually land on some of it. */}
        {/* Mounted for the whole life of the sheet, and only FADED once it has
            been answered. It used to be `cueGone ? null : …`, which unmounted
            it the moment the reader reached page two and took its 28pt out of
            the dock. The dock re-measured, `setDockH` fired, and the segment
            bar plus every page's floor jumped up by that much: the visible
            hitch on the first swipe. The opacity animation never played
            either, because the node was gone before it could run.

            The reserved 28pt is the price of a stable floor. Do not swap this
            back for a conditional, and do not animate its HEIGHT instead: a
            collapsing height is the same reflow, just slower. */}
        <Animated.View style={[styles.cue, cueStyle]} pointerEvents="none">
          <Text variant="caption" color="tertiary">
            {CUE_TEXT}
          </Text>
          <Icon
            name={icons.chevronRight}
            size={size.iconXs}
            color={withAlpha(colors.text.tertiary, 0.7)}
          />
        </Animated.View>
        <View style={styles.segs}>
          {SKINS.map((_, i) => (
            <Segment key={i} index={i} />
          ))}
        </View>
        {dock}
      </Animated.View>
    </Animated.View>
  );
};

export default PaywallPager;

/** The curve's own height. Where it SITS is derived per screen — see LEDGE_TOP. */
const LEDGE_H = 72;

/**
 * Ceiling on the poster's drop, as a share of the page. The derived half-the-
 * leftover is the right answer on every phone that exists today, but it is
 * arithmetic on a number the dock reports, and a dock that ever measures very
 * short would walk the curve into the middle of the screen. This stops that.
 */
const DROP_MAX = 0.22;

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  // Hangs off the top of the card by MAX_DROP so sliding it down extends the
  // wash rather than resizing it. `top`/`height` are set at the call site,
  // where MAX_DROP is known.
  ledgeGroup: { position: "absolute", left: 0, right: 0, zIndex: 1 },
  // Pinned to the group's bottom edge, so it travels with the wash it ends.
  // The 2pt bleed hides the antialiased seam at the screen edges.
  ledge: { position: "absolute", left: -2, right: -2, bottom: 0, height: LEDGE_H },
  rim: {
    position: "absolute",
    right: 0,
    top: 96,
    bottom: 190,
    width: 3,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    zIndex: 6,
  },
  pager: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 3 },
  page: { paddingHorizontal: spacing["2xl"], height: "100%" },
  headline: { marginTop: spacing.md },
  body: { flex: 1 },
  lead: { maxWidth: 320 },
  figure: { marginTop: spacing.xl },
  aside: { marginTop: spacing.lg },
  cue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 8 },
  segs: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  seg: { height: 3, flex: 1, borderRadius: 2, overflow: "hidden" },
  segFill: { height: "100%", borderRadius: 2 },
  midScroll: { flex: 1 },
  midScrollContent: { paddingBottom: spacing["2xl"] },
});
