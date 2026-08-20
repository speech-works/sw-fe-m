import React, { useCallback, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
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
  IconButton,
  icons,
  size,
  spacing,
  useTheme,
  duration,
  easing,
  withAlpha,
} from "../../design-system";
import { MarkedHeadline, type MarkShape } from "../../components/membership/MarkedHeadline";
import { BenefitRows } from "../../components/membership/BenefitRows";
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
 * The journey is deliberate: warm ink while the case is being made, a cooler
 * ink while the list is read, and MEMBERSHIP'S OWN SLATE at the moment money
 * is asked for, so the buy step arrives already wearing the tier's identity.
 *
 * ── WHY THE BUY BUTTON NEVER CHANGES COLOUR ────────────────────────────────
 * It stays premium gold on all three pages while the page accent shifts
 * around it. The thing being bought is the constant, and a control that keeps
 * its colour is findable without looking for it.
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
  onClose: () => void;
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
  onClose,
  monthlyLabel,
  annualPerMonthLabel,
  annualLabel,
  annualSavingsPct,
  plan,
  onPickMonthly,
  onPickAnnual,
  priceKnown,
  disabled,
}) => {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  const [cueGone, setCueGone] = useState(false);
  const [dockH, setDockH] = useState(dockHeight);

  /* Every colour below is a real token bar the two middle-page grounds, which
     are the one derived pair: a cool ink sitting between the warm canvas and
     the premium slate, so the journey reads as one movement rather than two
     unrelated jumps.

     `wash` is A LIGHTER SHADE OF THE SAME GROUND, never the accent. It was the
     accent at 22-26%, which is fine on page one (orange over warm ink) and
     wrong on page three: gold is a yellow, slate is a navy, and a warm tint
     over a cool ground makes olive. The upper zone now reads as raised rather
     than coloured, and the accent stays where it earns its keep — the eyebrow,
     the mark, the figure, the segments and the rim. */
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
      bg: "#15161C",
      accent: colors.accent.info,
      wash: "#20222C",
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
      bg: colors.premium.slate,
      accent: colors.premium.gold,
      wash: colors.premium.slateMid,
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
  const HEAD_TOP = short ? 44 : 64;
  // eyebrow + gap + two poster lines
  const HEAD_H = typography.eyebrow.lineHeight + spacing.md + typography.poster.lineHeight * 2;
  const LEDGE_TOP = HEAD_TOP + HEAD_H + spacing.sm;
  const BODY_TOP = LEDGE_TOP + LEDGE_H - spacing.lg;

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
    <Animated.View style={[styles.root, groundStyle]}>
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
      <Animated.View
        style={[styles.wash, { height: LEDGE_TOP + LEDGE_H }, washStyle]}
        pointerEvents="none"
      />

      <Svg
        style={[styles.ledge, { top: LEDGE_TOP }]}
        width="100%"
        height={LEDGE_H}
        viewBox="0 0 390 72"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <AnimatedPath
          d="M0 4 C 96 54, 214 -8, 390 34 L390 72 L0 72 Z"
          animatedProps={ledgeProps}
        />
      </Svg>

      <Animated.View style={[styles.rim, rimStyle]} pointerEvents="none" />

      {/* ── the app's own close control ─────────────────────────────────── */}
      <View style={styles.topBar}>
        <IconButton
          name={icons.close}
          onPress={onClose}
          accessibilityLabel="Close"
        />
      </View>

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
          <View key={i} style={[styles.page, { width, paddingTop: HEAD_TOP }]}>
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

            {/* On a tall phone the body is top-anchored under the ledge and
                leaves a 450pt void above the dock, because `flex: 1` grows the
                container and not the space above the content. Centring the
                content in the band it actually has closes that gap without
                moving the headline, which stays pinned to the ledge.

                A short phone keeps flex-start: there is no slack to
                distribute, and centring would only risk pushing the last row
                under the dock. */}
            <View
              style={[
                styles.body,
                {
                  marginTop: BODY_TOP - HEAD_TOP - HEAD_H,
                  justifyContent: short ? "flex-start" : "center",
                  // Pull the block up off the dock so it reads as content with
                  // room under it, not as a second dock.
                  paddingBottom: short ? 0 : spacing["4xl"],
                },
              ]}
            >
              {i === 0 ? (
                <>
                  <Text variant="body" color="secondary" style={styles.lead}>
                    Your free weekly call stops at three minutes. Usually right
                    when it starts to matter.
                  </Text>
                  <View style={styles.figure}>
                    <CallLengthHero framed={false} align="left" />
                  </View>
                </>
              ) : null}

              {i === 1 ? <BenefitRows animate compact={short} /> : null}

              {i === 2 ? (
                <>
                  {priceKnown ? (
                    <PlanPills>
                      <PlanPills.Pill
                        title="Monthly"
                        price={monthlyLabel}
                        surface={skin.wash}
                        selected={plan === "monthly"}
                        onPress={onPickMonthly}
                        disabled={disabled}
                      />
                      <PlanPills.Pill
                        title="Yearly"
                        price={annualPerMonthLabel}
                        surface={skin.wash}
                        priceSuffix="/mo"
                        // "billed once" said the opposite of the renewal
                        // disclosure four lines below it, which reads "Renews
                        // automatically unless cancelled". The annual plan is
                        // an auto-renewing subscription; telling a buyer they
                        // pay once is the expectation mismatch that produces a
                        // refund request and a one-star review.
                        //
                        // Compared against `priceKnown` rather than the em-dash
                        // sentinel, which lives in another file: if that glyph
                        // ever changes this silently rendered "— a year".
                        footnote={priceKnown ? `${annualLabel} a year` : undefined}
                        tag={
                          annualSavingsPct > 0 ? `SAVE ${annualSavingsPct}%` : undefined
                        }
                        selected={plan === "annual"}
                        onPress={onPickAnnual}
                        disabled={disabled}
                      />
                    </PlanPills>
                  ) : null}
                  <Text variant="caption" color="tertiary" style={styles.aside}>
                    {PROGRAMS_NOTE} A program you buy stays yours either way.
                  </Text>
                </>
              ) : null}
            </View>
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
        {cueGone ? null : (
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
        )}
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

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  wash: { position: "absolute", left: 0, right: 0, top: 0 },
  ledge: { position: "absolute", left: -2, right: -2, zIndex: 1 },
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
  topBar: {
    zIndex: 7,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "flex-end",
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
});
