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
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  useThemeContext,
  borderWidth,
  duration,
  easing,
  Gradient,
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
   * The seat's three pieces of motion, and why there are exactly three.
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
  const press = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !isFocused) {
      cancelAnimation(invite);
      invite.value = 0;
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

    return () => cancelAnimation(invite);
  }, [reduceMotion, isFocused, arrive, invite]);

  /** Stops the invitation for good once the seat has been touched — it has done
   *  its job, and a hint that keeps arriving after you've answered is nagging. */
  const answerInvite = () => {
    cancelAnimation(invite);
    invite.value = withTiming(0, { duration: duration.base, easing: easing.out });
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
            A hole in the wall, not a button and not a placeholder. The first
            build filled it with `background.sunken` and hairlined it in accent,
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
              }}
            />
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
});
