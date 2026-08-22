import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import PressableScale from "../../../../components/PressableScale";
import { getReachSummary } from "../../../../api/programGoals";
import { ReachSummary } from "../../../../api/programGoals/types";
import {
  Text,
  mix,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from "../../../../design-system";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";
import { MAX_DOTS, ReachGlow, resolveReachRow } from "./state";

/**
 * ============================================================================
 * THE ONE THING ON HOME THAT IS ABOUT THEIR LIFE
 * ----------------------------------------------------------------------------
 * Replaces GrowthSummary and takes over its slot: the single high-contrast
 * thing on this screen, in the same place, at the same weight.
 *
 * GrowthSummary showed three counts under words the app invented — Braver,
 * Wider, Regular. A count of practices dressed up as a quality. This shows a
 * sentence the USER wrote, and whether it happened. Nobody has to be taught a
 * vocabulary to read it.
 *
 * ── ATMOSPHERE INSTEAD OF A FILL ───────────────────────────────────────────
 * The card is nearly the canvas colour. A soft halo bleeds out of its top-left
 * corner, and that light is the ONLY thing marking the card as special.
 *
 * Which makes the light load-bearing, so it has to be earned:
 *
 *     the halo appears only when something was actually DONE,
 *     and it strengthens when everything was.
 *
 * Before that the card is flat. A green glow over "you have done none of them
 * yet" would be the app being pleased with itself at somebody's expense, and
 * for people whose presenting problem is avoidance that is the exact tone they
 * came here to get away from. `resolveReachRow` owns that rule; this file only
 * draws what it is told.
 *
 * ── NOTHING MOVES ──────────────────────────────────────────────────────────
 * No pulse, no shimmer, no entrance. This is on Home, which people open many
 * times a day, and an animation at that frequency stops being delight and
 * becomes a delay. The light is static.
 *
 * ── NOTHING AT ALL BEFORE THERE IS SOMETHING TRUE TO SAY ───────────────────
 * No skeleton and no zeros while the request is in flight. This slot was empty
 * a moment ago, and a grey box is not more honest than nothing. TodayStrip set
 * that rule and this follows it.
 * ============================================================================
 */
const ReachRow: React.FC<{
  /**
   * Home fetches this once and hands it to both surfaces that need it, so the
   * row and the waiting-goal card can never disagree about what is
   * outstanding. Omit it and the row fetches for itself, which is the fallback
   * for any other screen that wants to mount it.
   */
  summary?: ReachSummary | null;
}> = ({ summary: provided }) => {
  const { colors, scheme } = useTheme();
  const navigation = useNavigation<any>();
  const [fetched, setFetched] = useState<ReachSummary | null>(null);
  const summary = provided ?? fetched;

  useFocusEffect(
    useCallback(() => {
      if (provided !== undefined) return;
      let alive = true;
      getReachSummary()
        .then((s) => alive && setFetched(s))
        .catch(() => {
          /* The row is absent rather than broken. */
        });
      return () => {
        alive = false;
      };
    }, [provided]),
  );

  const state = resolveReachRow(summary ?? null);
  if (!state) return null;

  const { eyebrow, said, sub, glow, dots, cta, kind } = state;
  const lit = glow !== "none";
  const dark = scheme !== "light";

  /**
   * ── THE CARD, AND WHY PAPER GETS A DIFFERENT ONE ──────────────────────────
   * On ink the lit card sits a hair above the canvas and lets the halo do the
   * separating. On paper there is no darkness for light to sit in: the whole
   * scheme has about 1.16:1 of headroom, so a near-canvas card is simply an
   * invisible one. There the card takes a normal surface and the halo becomes a
   * tint over it rather than a glow behind it. Same idea, different physics.
   */
  const cardBg =
    lit && dark
      ? mix(colors.background.canvas, colors.surface.elevated, 0.16)
      : colors.surface.elevated;

  const eyebrowColor =
    glow === "warm"
      ? colors.text.accent
      : lit
        ? colors.accentText.success
        : colors.text.tertiary;

  const open = () => {
    track(ANALYTICS_EVENTS.REACH_ROW_TAPPED, {
      total: summary!.total,
      done: summary!.done,
      waiting: summary!.waiting,
      state: kind,
    });
    navigation.navigate("ExploreStack", { screen: "Reach" });
  };

  // Their own words get the bigger size. Ours — the empty state's explanation
  // and the prediction line — get the smaller one, because a sentence the app
  // wrote has not earned the same room as one they did.
  const ours = kind === "empty" || kind === "predictions";

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Reach. ${eyebrow}. ${said}. ${sub || cta || ""}`}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: colors.border.hairline },
      ]}
    >
      {lit ? <Halo glow={glow} dark={dark} colors={colors} /> : null}

      {/* Everything sits above the light. Without its own stacking context the
          halo paints over the type on Android. */}
      <View style={styles.inner}>
        <Text variant="eyebrow" color={eyebrowColor}>
          {eyebrow}
        </Text>

        {/* THEIR WORDS, AT HEADLINE SIZE. The whole point of the card is that
            this line was written by the person reading it, so it is the second
            largest thing on Home. Answers are capped at 120 characters and
            people use all of them: two lines, then it truncates. The record
            screen has the full text, and three lines of this would own the
            entire fold. */}
        <Text
          variant={ours ? "h3" : "h2"}
          color={ours && kind === "empty" ? colors.text.secondary : colors.text.primary}
          numberOfLines={2}
          style={styles.said}
        >
          {said}
        </Text>

        {cta ? (
          <View
            style={[
              styles.cta,
              { backgroundColor: withAlpha(colors.text.primary, 0.09) },
            ]}
          >
            <Text variant="label" color={colors.text.primary}>
              {cta}
            </Text>
          </View>
        ) : (
          <View style={styles.row}>
            {/* ONE DOT PER GOAL, filled for done — the whole history in a line
                you read without counting. Past MAX_DOTS they stop being
                countable and start being texture, so the row drops them and
                keeps the sentence. */}
            {dots.total > 0 && dots.total <= MAX_DOTS
              ? Array.from({ length: dots.total }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i < dots.done
                            ? colors.accent.success
                            : colors.text.disabled,
                      },
                    ]}
                  />
                ))
              : null}
            {/* SECONDARY, NOT TERTIARY. This line carries the only count on the
                card, and on paper it would sit over the tint, which is exactly
                where tertiary's AA margin runs out. */}
            <Text
              variant="caption"
              color={colors.text.secondary}
              numberOfLines={1}
              style={dots.total > 0 ? styles.subAfterDots : undefined}
            >
              {sub}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
};

export default ReachRow;

/**
 * The light itself: a radial bleeding in from off the card's top-left corner,
 * clipped by the card.
 *
 * Drawn on a Rect with real width and height rather than on a path, so the
 * gradient's bounding box can never collapse — an objectBoundingBox radial on a
 * zero-extent element is a hard process death on Android, not a blank fill.
 *
 * TEN STOPS ON A SMOOTH CURVE, not the two or three a radial usually gets. A
 * short stop list on a dark ground bands: each stop is a straight ramp between
 * two opacities, so the joins between them show up as concentric rings and the
 * light reads as a disc with soft edges instead of as air. Sampling a bell
 * curve often enough puts every join below the eye's threshold.
 */
/**
 * The falloff, sampled.
 *
 * Near-linear to zero at 70% of the box, then nothing. Two numbers doing two
 * different jobs:
 *
 * `0.7` keeps the light TIGHT. A falloff that runs all the way to the box edge
 * covers most of the card and stops reading as light at all — it becomes a
 * gradient fill, and the card is back to being coloured furniture. Most of the
 * card has to stay dark for the lit part to mean anything.
 *
 * `1.25` is barely off linear, and deliberately so: linear interpolation
 * between stops reproduces a straight ramp EXACTLY, so a straight ramp is the
 * one shape that cannot band. The small exponent softens the outer edge, where
 * a pure ramp leaves a faint ring at the point its slope stops, and stays close
 * enough to straight that ten samples hide every join.
 */
const HALO_RADIUS = 0.7;
const HALO_STOPS = [
  ...Array.from({ length: 10 }, (_, i) => {
    const t = (i / 9) * HALO_RADIUS;
    return { offset: t, weight: Math.pow(1 - t / HALO_RADIUS, 1.25) };
  }),
  // Beyond the falloff, explicitly nothing. Without a terminal stop the fill
  // holds its last value out to the edge of the box, which is the one thing
  // that would make the rect visible.
  { offset: 1, weight: 0 },
];

const Halo: React.FC<{
  glow: ReachGlow;
  dark: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}> = ({ glow, dark, colors }) => {
  const strong = glow === "strong";
  const color = glow === "warm" ? colors.action.primary : colors.accent.success;

  // Paper carries less of it. On ink the halo is light in a dark room; on paper
  // it is pigment on white, where the same alpha reads as a stain and, worse,
  // eats the contrast headroom the text above it is standing on.
  const peak = dark
    ? strong
      ? 0.46
      : glow === "warm"
        ? 0.2
        : 0.3
    : strong
      ? 0.2
      : glow === "warm"
        ? 0.1
        : 0.14;

  const w = strong ? 260 : 230;
  const h = strong ? 215 : 190;
  // One gradient per glow level. Two ids colliding in one SVG tree resolve to
  // whichever was defined last, and these differ in colour.
  const id = `reach-halo-${glow}`;

  return (
    <View style={[styles.halo, { width: w, height: h }]} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {HALO_STOPS.map((s) => (
              <Stop
                key={s.offset}
                offset={s.offset}
                stopColor={color}
                stopOpacity={peak * s.weight}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    // Clips the halo to the card's corners. Without it the light escapes onto
    // the canvas as a rectangle with hard edges.
    overflow: "hidden",
  },
  /** Off the corner on both axes, so the card is lit from outside itself. */
  halo: { position: "absolute", left: -30, top: -70 },
  inner: { position: "relative" },
  said: { marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: spacing.lg,
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  subAfterDots: { marginLeft: spacing.xs, flex: 1 },
  cta: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
