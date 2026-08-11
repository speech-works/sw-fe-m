import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import {
  useThemeContext,
  borderWidth,
  duration,
  easing,
  fonts,
  Gradient,
  spacing,
  Text,
  withAlpha,
  mix,
} from "../../design-system";
import PressableScale from "../PressableScale";
import { UserAvatar } from "../UserAvatar";
import { illustrativeCrowd } from "../../util/functions/crowdAvatars";
import { buildRoom, GAP, type Band } from "./geometry";
import type { AvatarManifest } from "../../types/avatar";

/**
 * The Community hero — a room, not a banner.
 *
 * ILLUSTRATION WITH ONE REAL PERSON IN IT. Every face here is generated
 * on-device from a fixed seed; they are not users, this component talks to no
 * endpoint, and the copy beside it must never imply otherwise — no count, no
 * "looking right now", no live dot. The single exception is the lit tile, which
 * is the VIEWER'S OWN avatar. That is the whole idea: an illustrated room, you
 * in it, and a gap beside you.
 *
 * WHY IT OWNS THE SCREEN. Every earlier version put art in the top third and
 * left the controls floating in a dark void underneath. The void was never a
 * gap to fill — it was the evidence that the picture and the page were two
 * different objects. Here the crowd runs edge to edge and under the dock, so
 * there is no empty region left on the page for controls to be stranded in.
 * This is also why it cannot be a `Page` `hero`: `Page` caps the status bar
 * with an opaque strip and paints its body on solid canvas, either of which
 * would put a hard edge across the top of the room.
 *
 * DEPTH IS HAZE, NOT BLUR. RN cannot cheaply blur an SVG, so distance is
 * carried by three cooperating things — tiles grow toward the viewer (see
 * ./geometry), the crowd sits at a low opacity, and each band takes a
 * canvas-coloured wash that thins as it comes forward. Less soft than a lens,
 * but it costs one View per band.
 *
 * THE SUBJECT IS DRAWN OVER THE SCRIM, deliberately. Everything else is
 * atmosphere and gets dimmed by it; the lit pair must not be, or the one part
 * of the picture that means something goes grey with the set dressing.
 */

/** The crowd is set dressing. Low enough to be atmosphere, high enough that the
 *  faces still resolve — below ~0.22 it reads as noise rather than people. */
const CROWD_OPACITY = 0.3;

/** Air between the two subject tiles. Wider than the crowd's `GAP` so the pair
 *  reads as two objects with a space between them, which is the entire point. */
const SUBJECT_GAP = 16;

/**
 * How long the screen waits before offering a hint.
 *
 * Long enough to read the headline and look at the button — if you have acted by
 * now you never see it, which is the point. Short enough that someone genuinely
 * hesitating gets help while they are still deciding rather than after they have
 * given up and left.
 */
const IDLE_MS = 4000;

/** Half a breath. Ambient, so exempt from the sub-300ms UI rule the way
 *  `duration.shimmer` is — a fast pulse reads as an alert, not an invitation. */
const BREATH = 900;

/** One dot's hop, and the beat between neighbours as a fraction of it. Tuned to
 *  a chat typing indicator, which is where the shape's meaning comes from. */
const DOT_CYCLE = 1400;
const DOT_STAGGER = 0.16;
/** How many hops the dots take before settling. Bounded for the same reason
 *  `invite` is: see the motion note below. */
const DOT_RUNS = 4;

/**
 * One of the seat's three dots.
 *
 * A child component rather than three animated styles in the parent because
 * `useAnimatedStyle` is a hook and cannot be called in a loop. All three read
 * ONE clock a beat apart — three dots rising together is a pulse; the stagger
 * is what makes it "somebody is on their way".
 */
const SeatDot: React.FC<{
  index: number;
  clock: SharedValue<number>;
  size: number;
  color: string;
}> = ({ index, clock, size, color }) => {
  const style = useAnimatedStyle(() => {
    const phase = (clock.value + 1 - index * DOT_STAGGER) % 1;
    // The hop occupies the first 45% of the cycle; the rest is rest, which is
    // what keeps it a typing indicator rather than a wave.
    const hop = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) : 0;
    // Movement only — no opacity in the hop. The dots are STILL almost all the
    // time, so the resting state is the one that has to carry contrast, and the
    // plus this replaced was a full-strength mark. Fading the resting dots to
    // make the hop pop would trade the legibility of the default state for a
    // flourish on the rare one, and it is the light scheme (accent on a pale
    // tint, ~2.2:1) that would pay for it.
    return { transform: [{ translateY: -hop * size * 0.5 }] };
  });
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
};

/** The seat label's box. Wider than the seat on purpose so the line never wraps
 *  — a two-line hint under a square reads as a caption on artwork rather than as
 *  a label on a control. Clamped to the viewport by the caller. */
const HINT_WIDTH = 200;

export interface CommunityRoomProps {
  /** The viewer's own avatar. Undefined renders the default — never an empty tile. */
  manifest?: AvatarManifest | null;
  /** Pressing the empty seat. Same destination as the primary action; people
   *  reach for the thing the screen is about. */
  onSeatPress?: () => void;
}

export const CommunityRoom: React.FC<CommunityRoomProps> = ({
  manifest,
  onSeatPress,
}) => {
  const { colors } = useThemeContext();
  const { width, height } = useWindowDimensions();

  const room = useMemo(() => buildRoom(width, height), [width, height]);

  // One deterministic crowd, sliced per band — so a tile never changes identity
  // when the viewport changes and neighbours never repeat.
  const faces = useMemo(() => illustrativeCrowd(room.total), [room.total]);

  const canvas = colors.background.canvas;
  const accent = colors.action.primary;

  const rows = useMemo(() => {
    const out: { band: Band; faces: AvatarManifest[] }[] = [];
    let cursor = 0;
    for (const band of room.bands) {
      out.push({ band, faces: faces.slice(cursor, cursor + band.count) });
      cursor += band.count;
    }
    return out;
  }, [room.bands, faces]);

  const pairWidth = room.subjectSize * 2 + SUBJECT_GAP;
  const glowSize = room.subjectSize * 2.6;

  /**
   * The seat's four pieces of motion, and why none of them is a loop.
   *
   * The seat is the SUBJECT of the screen's sentence; the orange button below is
   * the verb. Motion has to support that sentence rather than compete with it,
   * and a permanently pulsing seat competes — it is the secondary path, and a
   * loop would have it outbidding the primary one forever.
   *
   * `arrive` — a one-shot bloom just after the room paints. Says "this is an
   *   object", not "this is a gap in the artwork".
   * `invite` — two slow breaths, fired ONLY after {@link IDLE_MS} of no input.
   *   This is the honest version of "animate it to invite taps": motion appears
   *   exactly when somebody is stuck and never while they are already acting, so
   *   by construction it can only run when nothing else has won their attention.
   *   Capped at two, then silent for the rest of the visit.
   * `bob` — the three dots hopping, on the SAME idle trigger as `invite` and
   *   bounded the same way ({@link DOT_RUNS} hops, then still).
   *
   *   The dots are the one mark here whose meaning is carried by movement, so
   *   the obvious build is an endless typing indicator — and that is exactly the
   *   loop this component has always refused. It does not need one: three dots
   *   in a row read as "pending" standing perfectly still (every chat app has
   *   taught that), and the hop is what upgrades "pending" to "someone is on
   *   their way" at the moment somebody has stalled. Still by default, alive
   *   when it can help.
   * `press` — the wash under your thumb.
   *
   * The breath is SCALE-led, not opacity-led, on purpose. A soft shape fading in
   * and out is what every skeleton loader in this app looks like
   * (`duration.shimmer`), and a pulsing empty square that reads as "loading" is
   * worse than no invitation at all.
   *
   * All three are gated on reduced motion, where they resolve to their REST
   * values rather than to nothing — the light still falls on the seat, it just
   * doesn't travel to get there.
   */
  const reduceMotion = useReducedMotion();
  const isFocused = useIsFocused();
  const arrive = useSharedValue(reduceMotion ? 1 : 0);
  const invite = useSharedValue(0);
  const bob = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !isFocused) {
      cancelAnimation(invite);
      cancelAnimation(bob);
      invite.value = 0;
      // Rest is phase 0 — every dot down, evenly spaced. Reduced motion gets
      // three still dots, which is the readable state, not a blank square.
      bob.value = 0;
      if (reduceMotion) arrive.value = 1;
      return;
    }

    // Re-armed on FOCUS, not on mount: this is a tab screen and stays mounted
    // behind the others, so a mount-only sequence would burn itself off while
    // the user was on Home and never play on the visit that needed it.
    arrive.value = withDelay(
      duration.reveal,
      withTiming(1, { duration: 520, easing: easing.out }),
    );

    invite.value = withDelay(
      IDLE_MS,
      withSequence(
        withTiming(1, { duration: BREATH, easing: easing.loop }),
        withTiming(0, { duration: BREATH, easing: easing.loop }),
        withTiming(1, { duration: BREATH, easing: easing.loop }),
        withTiming(0, { duration: BREATH, easing: easing.loop }),
      ),
    );

    // A linear clock, because SeatDot shapes the hop itself — easing this would
    // ease the whole three-dot sequence rather than each individual hop.
    bob.value = withDelay(
      IDLE_MS,
      withRepeat(
        withTiming(1, { duration: DOT_CYCLE, easing: easing.linear }),
        DOT_RUNS,
        false,
      ),
    );

    return () => {
      cancelAnimation(invite);
      cancelAnimation(bob);
    };
  }, [reduceMotion, isFocused, arrive, invite, bob]);

  /** Stops the invitation for good once the seat has been touched — it has done
   *  its job, and a hint that keeps arriving after you've answered is nagging. */
  const answerInvite = () => {
    cancelAnimation(invite);
    cancelAnimation(bob);
    invite.value = withTiming(0, { duration: duration.base, easing: easing.out });
    // Straight to rest rather than eased: mid-hop, an eased return reads as a
    // fourth dot movement instead of as the animation stopping.
    bob.value = 0;
  };

  const glowStyle = useAnimatedStyle(() => ({
    // Rest sits BELOW full so the breath has somewhere to go without the glow
    // ever exceeding the intensity the composition was tuned at.
    opacity: arrive.value * (0.85 + 0.15 * invite.value),
    transform: [
      {
        scale:
          0.86 + 0.14 * arrive.value + 0.1 * invite.value + 0.06 * press.value,
      },
    ],
  }));

  const pressStyle = useAnimatedStyle(() => ({ opacity: press.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── The crowd ─────────────────────────────────────────────────────── */}
      {rows.map(({ band, faces: rowFaces }, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[styles.band, { top: band.top, height: band.size }]}
        >
          <View style={[styles.row, { opacity: CROWD_OPACITY }]}>
            {rowFaces.map((face, c) => (
              <View key={c} style={{ marginRight: GAP }}>
                <UserAvatar manifest={face} size={band.size} animate={false} shape="square" />
              </View>
            ))}
          </View>
          {/* Distance. Painted per band rather than as one gradient so the wash
              steps with the tiles it belongs to instead of cutting across them. */}
          {band.haze > 0 ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(canvas, band.haze) }]}
            />
          ) : null}
        </View>
      ))}

      {/* ── Vignette ──────────────────────────────────────────────────────────
          userSpaceOnUse with an explicit radius, NOT objectBoundingBox: the
          bounding-box form is a hard Android crash whenever the element it
          measures has zero extent, and react-native-svg's own guard rethrows.
          An explicit radius can never be zero here. */}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="cr-vignette"
            cx={width / 2}
            cy={height * 0.32}
            r={width * 0.95}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0.38" stopColor={canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={canvas} stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#cr-vignette)" />
      </Svg>

      {/* ── The scrim ─────────────────────────────────────────────────────────
          Long, vertical, and resolving to the EXACT canvas colour well before
          the bottom edge so there is no line anywhere for the eye to catch.
          `start`/`end` are explicit on purpose: `Gradient` falls back to the
          brand token's DIAGONAL direction when they're omitted, which silently
          runs a "bottom" ramp corner to corner. */}
      <Gradient
        colors={[
          withAlpha(canvas, 0),
          withAlpha(canvas, 0),
          withAlpha(canvas, 0.35),
          withAlpha(canvas, 0.78),
          withAlpha(canvas, 0.95),
          canvas,
          canvas,
        ]}
        locations={[0, 0.26, 0.44, 0.6, 0.72, 0.84, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── The subject ───────────────────────────────────────────────────── */}
      <View
        style={[
          styles.subject,
          { top: room.subjectTop, left: (width - pairWidth) / 2, width: pairWidth },
        ]}
        pointerEvents="box-none"
      >
        {/* Light falling ON THE SEAT — not centred on the pair. The seat is what
            the headline points at, so it is what the light is for; centring the
            glow between the two tiles lit the avatar and left the gap flat.

            IT ARRIVES. The light blooms once, shortly after the room paints, and
            then holds still. That single beat is what tells you the seat is a
            thing rather than a gap in the artwork — and it does the job without
            a permanent pulse, which on a screen you open several times a day
            would stop reading as an invitation and start reading as an alarm.
            One-shot, ease-out, and it also brightens under your thumb (below).*/}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            glowStyle,
            {
              width: glowSize,
              height: glowSize,
              left: pairWidth - room.subjectSize / 2 - glowSize / 2,
              top: (room.subjectSize - glowSize) / 2,
            },
          ]}
        >
        <Svg width={glowSize} height={glowSize} pointerEvents="none">
          <Defs>
            <RadialGradient
              id="cr-glow"
              cx={glowSize / 2}
              cy={glowSize / 2}
              r={glowSize / 2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
              <Stop offset="1" stopColor={accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={glowSize} height={glowSize} fill="url(#cr-glow)" />
        </Svg>
        </Animated.View>

        <UserAvatar manifest={manifest} size={room.subjectSize} animate={false} shape="square" />

        {/* THE SEAT.
            A hole in the wall, not a button and not a placeholder — but no
            longer an unmarked one. It used to share the screen with a filled
            "Find someone" CTA that did the same thing, and the redundancy was
            silent: two doors into the same room with nothing saying so. The CTA
            is gone, which promotes this from the shortcut to the ONLY route
            into discovery, and a route has to be readable. Hence the plus and
            the label below. Everything else about the shape is unchanged.

            The first build filled it with `background.sunken` and hairlined it in accent,
            which at 130pt square read as a failed image load — pure black is
            what a broken tile looks like, and a hairline is invisible at that
            scale. So: a warm tint rather than black (the light is falling on
            it), a rim thick enough to be read as a rim, and a second inset ring
            so the shape has depth instead of being a flat cutout.
            The fill is an OPAQUE mix, not a translucent accent wash. A wash let
            the crowd show through, so the empty seat had two faces sitting in
            it — the one thing it must never contain. */}
        <PressableScale
          onPress={onSeatPress}
          onPressIn={() => {
            answerInvite();
            press.value = withTiming(1, { duration: duration.fast, easing: easing.out });
          }}
          onPressOut={() => {
            press.value = withTiming(0, { duration: duration.base, easing: easing.out });
          }}
          accessibilityRole="button"
          accessibilityLabel="Find someone to pair with"
          accessibilityHint="Opens buddy search"
          style={{ marginLeft: SUBJECT_GAP }}
        >
          <View
            style={{
              width: room.subjectSize,
              height: room.subjectSize,
              borderRadius: room.subjectSize * 0.23,
              backgroundColor: mix(colors.background.canvas, accent, 0.08),
              borderWidth: borderWidth.thin,
              borderColor: withAlpha(accent, 0.5),
              padding: room.subjectSize * 0.11,
            }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: room.subjectSize * 0.14,
                borderWidth: borderWidth.hairline,
                borderColor: withAlpha(accent, 0.2),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* THE ONE MARK THE SHAPE NEEDED.
                  The seat is the screen's only route into discovery — the
                  filled button that used to carry it is gone — so it cannot
                  afford to be a shape you have to guess at.

                  It was a plus, which was legible and wrong: a plus is the verb
                  ADD, and it turned a person-shaped absence into an operation on
                  a list. Three dots are borrowed from the one place everybody
                  has already learned them — a chat typing indicator — where they
                  mean a PERSON is about to appear. That is the sentence this
                  screen is trying to say, and the dots say it without a label.

                  Still by default; they hop only when someone stalls (see the
                  motion note above). Sizing follows the plus it replaces: the
                  row spans the same optical width the 0.26 glyph did.

                  `text.accent`, NOT the bright `action.primary` the rim uses.
                  This mark carries meaning rather than decorating, and at this
                  size it is under the threshold where a hero glyph gets to stay
                  a fill — the brand orange sits at roughly 2.2:1 on the seat's
                  pale light-scheme tint, which is exactly the dark→light
                  collapse the per-scheme foreground cut exists to prevent. */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Math.round(room.subjectSize * 0.068),
                }}
              >
                {[0, 1, 2].map((i) => (
                  <SeatDot
                    key={i}
                    index={i}
                    clock={bob}
                    size={Math.round(room.subjectSize * 0.075)}
                    color={colors.text.accent}
                  />
                ))}
              </View>
            </View>
            {/* PRESS FEEDBACK THE SHAPE CAN ACTUALLY SHOW.
                `PressableScale` already springs to 0.97, but a 3% scale needs
                internal detail to read against and this square is deliberately
                empty — the tap worked and did not FEEL like it worked. A wash
                across the whole face is the one thing an empty shape can do.
                Slow out (200ms) against a fast in (120ms): the system responds
                instantly and releases gently. */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                pressStyle,
                {
                  borderRadius: room.subjectSize * 0.23,
                  backgroundColor: withAlpha(accent, 0.16),
                },
              ]}
            />
          </View>
        </PressableScale>
      </View>

      {/* THE SEAT'S LABEL.
          A separate absolutely-positioned line rather than a child of the
          subject row, because the row is sized to the two tiles and anything
          hung below it would be clipped on Android.

          The halo is the CANVAS colour rather than a literal black, which makes
          it invert for free: on dark it deepens, on the cream light canvas it
          lightens. A fixed black glow behind dark ink on cream reads as a
          smudge, which is the bug the stage copy's halo already had to solve. */}
      <View
        pointerEvents="none"
        style={[
          styles.seatHint,
          {
            top: room.subjectTop + room.subjectSize + spacing.sm,
            left: Math.max(
              0,
              Math.min(
                width - HINT_WIDTH,
                (width - pairWidth) / 2 +
                  room.subjectSize +
                  SUBJECT_GAP +
                  room.subjectSize / 2 -
                  HINT_WIDTH / 2,
              ),
            ),
          },
        ]}
      >
        <Text
          variant="caption"
          color="accent"
          style={[
            styles.seatHintText,
            { textShadowColor: withAlpha(canvas, 0.9) },
          ]}
        >
          Tap to find someone
        </Text>
      </View>
    </View>
  );
};

export default CommunityRoom;

const styles = StyleSheet.create({
  band: { position: "absolute", left: 0, right: 0, overflow: "hidden" },
  // Negative left margin so the extra tile hangs off screen and the row shows
  // no start or end — a crowd with visible ends is a row of icons.
  row: { flexDirection: "row", marginLeft: -GAP * 2 },
  subject: { position: "absolute", flexDirection: "row" },
  glow: { position: "absolute" },
  seatHint: { position: "absolute", width: HINT_WIDTH, alignItems: "center" },
  seatHintText: {
    fontFamily: fonts.bold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
