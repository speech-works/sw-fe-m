import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import PressableScale from "../../../../components/PressableScale";
import { getReachSummary } from "../../../../api/programGoals";
import { ReachSummary } from "../../../../api/programGoals/types";
import {
  Text,
  accentEdge,
  mix,
  primaryEdge,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from "../../../../design-system";
import { track } from "../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../util/analytics/analyticsEvents";
import { MAX_DOTS, ReachGlow, countWord, resolveReachRow } from "./state";

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
 * a moment ago, and a grey box is not more honest than nothing.
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

  /**
   * The string is a TINT OF THE SAME HUE, not a neutral grey.
   *
   * Grey was the first attempt and it was wrong: it made three separate blobs
   * with a scratch between them instead of one strung object. The reference
   * binds its row by making the track a tint of the card's own colour, and that
   * shared hue is doing most of the work.
   *
   * It does not break the rule that light is earned. The tint is the MATERIAL
   * the row is made of; what marks a thing as done is the solid bead and the
   * tick in it, and neither of those appears until it is.
   *
   * MIXED INTO THE CARD, not laid over it at low alpha. Alpha-compositing a
   * cool green onto the flat card's warm brown left three muddy blobs that
   * belonged to neither colour. Mixing starts from the card's own surface, so
   * the string reads as part of whichever card it is on.
   *
   * AND IT ONLY GOES GREEN WHEN THE CARD DOES. On a flat card nothing has been
   * done, so three green knobs would be the only colour on it, claiming
   * something none of them earned. There the string is neutral: three empty
   * slots, waiting, saying nothing.
   */
  const quiet = lit
    // The same hue the halo is using, so a warm card does not carry a green
    // string. One card, one colour.
    ? mix(
        cardBg,
        glow === "warm" ? colors.action.primary : colors.accent.success,
        0.22,
      )
    : mix(cardBg, colors.text.primary, 0.13);

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
          <>
            {/* ONE BEAD PER GOAL, STRUNG TOGETHER.
                These were six-point dots, and six points cannot hold a tick or
                read as a sequence — they were punctuation. Beads joined by a
                short bar read as one object with an order to it: done, done,
                and the plain knob where the next one goes.

                It takes only the width it needs and stops. A row stretched to
                the card edge would read as a progress bar, and a progress bar
                implies a deadline, which is the one thing this feature refuses
                to imply.

                Past MAX_DOTS they stop being countable and start being
                texture, and the row becomes a Meter: the same track colour and
                the same hue rule, drawn as one length instead of as parts. */}
            {dots.total > 0 && dots.total <= MAX_DOTS ? (
              <View style={styles.track}>
                {Array.from({ length: dots.total }).map((_, i) => {
                  const done = i < dots.done;
                  return (
                    <React.Fragment key={i}>
                      {i > 0 ? (
                        <View style={[styles.bar, { backgroundColor: quiet }]} />
                      ) : null}
                      {done ? (
                        <View
                          style={[
                            styles.bead,
                            { backgroundColor: colors.accent.success },
                            // On paper a bright green circle on a near-white
                            // card has a hue but no SHAPE: luminance is what
                            // draws an edge, and there is barely any between
                            // them. No-op on ink.
                            accentEdge(colors, "success"),
                          ]}
                        >
                          <Tick color={colors.accentOn.success} />
                        </View>
                      ) : (
                        <View
                          style={[styles.knob, { backgroundColor: quiet }]}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            ) : dots.total > 0 ? (
              <Meter
                done={dots.done}
                total={dots.total}
                track={quiet}
                warm={glow === "warm"}
                colors={colors}
              />
            ) : null}
            {/* SECONDARY, NOT TERTIARY. On paper this sits over the tint, which
                is exactly where tertiary's AA margin runs out. */}
            <Text
              variant="caption"
              color={colors.text.secondary}
              numberOfLines={1}
              style={styles.sub}
            >
              {sub}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
};

/**
 * A BARE CHECK, DRAWN.
 *
 * The obvious move was `icons.success`, which is `circle-check` — a tick inside
 * a ring. Put that in a bead and every one of them is a circle drawn inside a
 * circle: busy at 26 points, and the single thing that made the row look like a
 * cheap copy rather than the reference.
 *
 * So it is a path, with a round cap and a stroke thick enough to hold its own
 * against the bead. A hairline tick in a solid disc reads as a mistake.
 */
const Tick: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24">
    <Path
      d="M5 12.5 L10 17.5 L19 7.5"
      stroke={color}
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

/**
 * ============================================================================
 * PAST SIX, THE STRING BECOMES A LENGTH
 * ----------------------------------------------------------------------------
 * Beads are a picture of a sequence, and that picture holds up to about six.
 * Nine of them is not a sequence any more, it is a stripe with gaps in it: you
 * have to COUNT the row to read it, which is the one job the row exists to
 * save you.
 *
 * So the same material is drawn as one continuous thing. Nothing new is
 * introduced — the track is the identical `quiet` tint the connectors were, the
 * fill is the identical hue the beads were, and the hue still follows the card
 * rather than the feature (warm card, warm fill). A reader who has seen the
 * bead row on one program and this on another should not feel they have moved
 * to a different card.
 *
 * ── IT SAYS THE NUMBER, BECAUSE IT CAN NO LONGER SHOW IT ────────────────────
 * The bead row never printed a count: four filled circles ARE "four". A bar
 * cannot be counted, so the number comes back beside it, in words. Words, not
 * "4/9" and not a percentage — a ratio turns nine real conversations somebody
 * had into a task list at forty-four per cent, which is the tone this whole
 * card is built to avoid.
 *
 * ── THE FILL NEVER VANISHES ────────────────────────────────────────────────
 * One of nine is 11% of the track, which at this width rounds to a couple of
 * points and reads as nothing at all. A `minWidth` of the bar's own height
 * floors it at a round cap, so the first one you did is always visible. It
 * slightly overstates one, and overstating the first is the correct direction:
 * the alternative is telling somebody who did the hardest one that they have
 * done nothing.
 * ============================================================================
 */
const METER_HEIGHT = 12;

const Meter: React.FC<{
  done: number;
  total: number;
  /** The connector's tint, already resolved against this card. */
  track: string;
  warm: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}> = ({ done, total, track, warm, colors }) => {
  const pct = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  const word = countWord(done);

  return (
    <View style={styles.meterRow}>
      <View style={[styles.meterTrack, { backgroundColor: track }]}>
        {done > 0 ? (
          <View
            style={[
              styles.meterFill,
              {
                width: `${pct * 100}%`,
                backgroundColor: warm
                  ? colors.action.primary
                  : colors.accent.success,
              },
              // Same reason the beads carry one: on paper a bright fill has a
              // hue but no edge against a near-white card. No-op on ink.
              warm ? primaryEdge(colors, true) : accentEdge(colors, "success", true),
            ]}
          />
        ) : null}
      </View>

      {done > 0 ? (
        <Text
          variant="label"
          color={colors.text.secondary}
          style={styles.meterCount}
        >
          {`${word.charAt(0).toUpperCase()}${word.slice(1)} done`}
        </Text>
      ) : null}
    </View>
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
  /**
   * `width: "auto"` by virtue of not stretching: the row is only as wide as its
   * beads. Stretched to the card it would read as a progress bar, and this is
   * a list of things somebody chose, not a distance to a deadline.
   */
  track: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: spacing.lg,
  },
  /*
   * LONGER AND LEANER THAN THE REFERENCE, on purpose.
   *
   * Its ratios — connector 47% of the bead's height, 63% of its width — are
   * tuned for a saturated orange card where the row is the loudest thing on it.
   * This card is the opposite: near-canvas, one soft halo, fine type. Three
   * solid discs at that weight were the heaviest object on a quiet card.
   *
   * So the beads come down and the bars stretch: the row covers more width on
   * less ink. The bar can be 31% of a bead here — well under the reference —
   * because HUE is what binds this row, not mass. The first attempt proved the
   * other side of that: a 9pt bar in neutral grey read as a scratch between
   * three buttons, and it was the colour that failed, not the thickness.
   */
  bead: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: { width: 34, height: 8, marginHorizontal: -1 },
  /*
   * Still has to CLEAR the bar it sits on, which is the rule the sausage taught.
   * At 18 against an 8pt bar it clears by more than twice, so the nodes read
   * even though everything shrank.
   */
  knob: { width: 18, height: 18, borderRadius: radius.full },
  /*
   * The bar DOES stretch, where the bead row deliberately did not.
   *
   * A bead row pulled to the card edge would be claiming to be a progress bar
   * while still being a list of three things. A bar that stops short of the
   * edge is worse: it is a progress bar that looks broken. Once the row is a
   * length, the length has to mean something, so it takes the full column and
   * the fraction is read against a constant.
   */
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  meterTrack: {
    flex: 1,
    height: METER_HEIGHT,
    borderRadius: radius.full,
    // Keeps the fill inside the track's round ends. Without it a full fill
    // squares off against the track on Android.
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    minWidth: METER_HEIGHT,
    borderRadius: radius.full,
  },
  meterCount: { marginLeft: spacing.md },
  sub: { marginTop: spacing.sm },
  cta: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
