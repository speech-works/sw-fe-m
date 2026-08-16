import React, { useCallback, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
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
  useTheme,
  duration,
  easing,
  fonts,
  Gradient,
  Icon,
  icons,
  Text,
  withAlpha,
  mix,
} from "../../design-system";
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

/**
 * The crowd is set dressing.
 *
 * IT USED TO BE 0.30, with a note that below ~0.22 the faces stop resolving as
 * people. That was the right floor for the intent at the time, which was a room
 * full of readable strangers. The intent changed: with a headline and a control
 * stack sitting over it, a wall of legible faces is not atmosphere, it is a
 * second thing to read — and the type was landing on it. So this is now tuned
 * for a backdrop rather than for a crowd. If you ever want the faces back as
 * subject matter, raise this AND take the copy off them; the two go together.
 */
const CROWD_OPACITY = 0.18;

/**
 * A real lens blur over the crowd, on top of the opacity drop.
 *
 * THE ONE THING TO KNOW BEFORE TOUCHING THIS. This file's own header says depth
 * here is haze rather than blur because "RN cannot cheaply blur an SVG", and
 * that is still true: the crowd is ~30 live SVG tiles at the back band and the
 * geometry file calls tile count "the whole performance story on this screen".
 * `expo-blur` puts one native layer over all of them. On iOS that is a
 * UIVisualEffectView and costs little; on Android it is a shim and is the
 * platform to measure on before trusting this.
 *
 * Kept as a single constant so it is one edit to turn off, and so the reason
 * lives next to the switch rather than in a commit message.
 */
const CROWD_BLUR = 14;

/**
 * Air between the two subject tiles.
 *
 * Tightened from 16 when the tiles started leaning. Two upright squares need a
 * clear gap or they read as one wide block; two tilted ones already separate
 * themselves at the corners, and the extra air just pushed them apart.
 */
const SUBJECT_GAP = 14;

/**
 * WHAT `size` ACTUALLY DRAWS.
 *
 * `UserAvatar` renders `viewBox="-8 -8 64 64"` and its tile path occupies units
 * 0 to 48, so the squircle you SEE is 75&#37; of the size you asked for, sitting
 * 12.5&#37; in from every edge. The remaining ring is transparent padding that
 * hair and collars overflow into.
 *
 * This matters twice here. A background or shadow on a full-size wrapper draws
 * a plate 33&#37; larger than the avatar and frames it. And the seat, which was
 * built at the full size, has always been a third bigger than the face beside
 * it — which is part of why the two never read as a matched pair.
 */
const TILE_SCALE = 0.75;
const TILE_INSET = 0.125;
/** The tile's own corner radius: 11 units of the same 64-unit viewBox. */
const TILE_RADIUS = 11 / 64;

/**
 * How far each tile leans, in degrees, and which way.
 *
 * FIVE DEGREES IS THE WHOLE ARGUMENT. Controls are axis-aligned; objects in a
 * photograph are not. A rectangle rotated even slightly stops offering itself
 * as a button, which is the cheapest possible answer to "why does that look
 * tappable" and costs one transform.
 *
 * Opposite directions, so they lean toward each other. Same direction reads as
 * a skewed layout; mirrored reads as two things placed side by side by hand.
 */
const LEAN = 5;

/**
 * When the seat starts moving: as the arrival bloom finishes, not seconds later.
 *
 * THIS REPLACED A 4-SECOND IDLE WAIT, for two reasons.
 *
 * Behaviour: the old wait did not reliably happen. Coming back to this screen,
 * the hint often never played at all. It was armed inside a focus effect, and
 * anything that cancelled it during those four seconds silently lost the whole
 * sequence, so the one piece of motion meant to help a stuck person was the
 * piece most likely to be missing.
 *
 * Design: a hint you have to earn by hesitating is only worth it if it is
 * dependable. A short, bounded, immediate one is easier to trust, and it still
 * cannot nag: the breath runs twice, then the seat is still for the rest of
 * the visit.
 *
 * Timed to the arrival rather than to zero, so the room paints, settles, and
 * THEN the seat speaks. All at once reads as a page that cannot sit still.
 */
const INVITE_AT = duration.reveal + 520;

/** Half a breath. Ambient, so exempt from the sub-300ms UI rule the way
 *  `duration.shimmer` is — a fast pulse reads as an alert, not an invitation. */
const BREATH = 900;

export interface CommunityRoomProps {
  /** The viewer's own avatar. Undefined renders the default — never an empty tile. */
  manifest?: AvatarManifest | null;
  /**
   * How many people are waiting on an answer, drawn on the seat itself.
   *
   * On the seat rather than anywhere else because the seat IS the subject of
   * the sentence: this many people have asked for that space. Zero renders
   * nothing at all — a badge showing "0" is a control reporting its own
   * emptiness.
   */
  seatCount?: number;
}

export const CommunityRoom: React.FC<CommunityRoomProps> = ({
  manifest,
  seatCount = 0,
}) => {
  const { colors, scheme, elevation } = useTheme();
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

  /**
   * The pair's real width, and where the seat's centre lands in it.
   *
   * Derived rather than assumed: the avatar occupies a full `subjectSize` box
   * of which only the middle 75% is drawn, and the seat is now that drawn size.
   * The old `subjectSize * 2 + gap` described a layout where both tiles filled
   * their boxes, which was never true of the avatar.
   */
  const subjectTile = room.subjectSize * TILE_SCALE;
  const seatOffset = SUBJECT_GAP - room.subjectSize * TILE_INSET;
  const pairWidth = room.subjectSize + seatOffset + subjectTile;
  const seatCenterX = room.subjectSize + seatOffset + subjectTile / 2;
  const seatTile = subjectTile;
  const seatRadius = room.subjectSize * TILE_RADIUS;
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
   * `invite` — two slow breaths, starting as the arrival settles
   *   ({@link INVITE_AT}). Capped at two, then silent for the rest of the
   *   visit: it introduces the seat without competing for the whole session.
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
  const arrive = useSharedValue(reduceMotion ? 1 : 0);
  const invite = useSharedValue(0);

  /*
   * ARMED FROM THE FOCUS EVENT, NOT FROM A `useIsFocused()` BOOLEAN.
   *
   * That boolean is render state, and this screen never re-rendered with it
   * false, so the effect ran exactly once — at mount — and never again. The
   * seat played its hint on the first visit of the session and was dead for
   * every visit after, which is the bug this fixes.
   *
   * It was invisible for two reasons. `arrive` is armed in the same effect and
   * is NOT cancelled on blur, so the seat still bloomed in and looked alive.
   * And a one-shot that fails to start looks exactly like a one-shot that has
   * already finished, so the screen never appeared broken.
   *
   * `useFocusEffect` fires off the navigator's own focus/blur events, so it
   * does not depend on the screen choosing to re-render.
   */
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        arrive.value = 1;
        invite.value = 0;
        return;
      }

      // Explicit reset before arming. `withRepeat(..., n, false)` restarts from
      // whatever the value IS, and a bounded run ends at 1 — so re-arming
      // without this would animate 1 to 1 and show nothing at all.
      invite.value = 0;

      arrive.value = withDelay(
        duration.reveal,
        withTiming(1, { duration: 520, easing: easing.out }),
      );

      invite.value = withDelay(
        INVITE_AT,
        withSequence(
          withTiming(1, { duration: BREATH, easing: easing.loop }),
          withTiming(0, { duration: BREATH, easing: easing.loop }),
          withTiming(1, { duration: BREATH, easing: easing.loop }),
          withTiming(0, { duration: BREATH, easing: easing.loop }),
        ),
      );

      return () => {
        cancelAnimation(invite);
        invite.value = 0;
      };
    }, [reduceMotion, arrive, invite]),
  );

  const glowStyle = useAnimatedStyle(() => ({
    // Rest sits BELOW full so the breath has somewhere to go without the glow
    // ever exceeding the intensity the composition was tuned at.
    opacity: arrive.value * (0.85 + 0.15 * invite.value),
    transform: [
      {
        scale:
          0.86 + 0.14 * arrive.value + 0.1 * invite.value,
      },
    ],
  }));

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

      {/* ── The lens ──────────────────────────────────────────────────────────
          Over the crowd, UNDER the scrim and under the subject. Order matters:
          a blur blurs what is behind it, so anything that must stay sharp — the
          lit pair, the seat, every word of the copy — has to be drawn after it.
          `pointerEvents` none, like everything else in the picture. */}
      {CROWD_BLUR > 0 ? (
        <BlurView
          intensity={CROWD_BLUR}
          tint={scheme === "dark" ? "dark" : "light"}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}

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
              left: seatCenterX - glowSize / 2,
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

        {/* YOU, LEANING. The wrapper carries the tilt; the avatar itself is
            untouched, so nothing in the faces kit has to know about any of this.

            The shadow goes on a PLATE inset to the drawn tile rather than on
            this box. On the box it would trace the transparent padding and
            frame the avatar in a larger square. The plate is also opaque
            (canvas) because Android renders no `elevation` behind a transparent
            view, and the avatar covers it exactly, so it is never seen. */}
        <View
          style={{
            width: room.subjectSize,
            height: room.subjectSize,
            transform: [{ rotate: `-${LEAN}deg` }],
          }}
        >
          <View
            style={[
              {
                position: "absolute",
                left: room.subjectSize * TILE_INSET,
                top: room.subjectSize * TILE_INSET,
                width: room.subjectSize * TILE_SCALE,
                height: room.subjectSize * TILE_SCALE,
                borderRadius: room.subjectSize * TILE_RADIUS,
                backgroundColor: colors.background.canvas,
              },
              elevation.e3,
            ]}
          />
          <UserAvatar manifest={manifest} size={room.subjectSize} animate={false} shape="square" />
        </View>

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
        {/* NOT A CONTROL, AND NO LONGER ABLE TO BECOME ONE.
            This was wrapped in a `PressableScale` with no handler behind it:
            it sprang under your finger, flashed a press wash and told screen
            readers it was a button that "opens buddy search", while doing
            nothing. Worse, its `onPressIn` permanently cancelled the ambient
            invitation, so touching the picture killed the one thing drawing
            your eye to it.

            The wrapper kept a `pressable` branch for a caller that might want
            it back. No caller ever did, so the branch was unreachable code
            carrying a press animation, a press wash and an `onSeatPress` prop
            with it. The seat is the picture; the button below it is the
            control. That is the whole design, and now it is the whole code.

            `accessible={false}`, because every fact this shape carries is said
            in text directly beneath it. */}
        <View
          pointerEvents="none"
          accessible={false}
          // The gap is measured between the DRAWN tiles, so the avatar's
          // transparent 12.5% ring is subtracted back out of it.
          style={{
            marginLeft: SUBJECT_GAP - room.subjectSize * TILE_INSET,
            transform: [{ rotate: `${LEAN}deg` }],
          }}
        >
          {/* HOW MANY PEOPLE WANT THIS SEAT.
              Overhanging the corner rather than sitting inside it: the seat's
              interior is the one place on this screen that must stay empty, and
              a number in the middle of it would fill the absence the whole
              picture is about.

              COUNTER-ROTATED. The tile leans; the number does not. A tilted
              digit reads as a mistake rather than as a design, and this badge is
              the one piece of UI attached to the picture, so it should sit level
              like a label pinned on rather than lean like part of the object. */}
          {seatCount > 0 ? (
            <View
              style={[
                styles.seatBadge,
                {
                  backgroundColor: accent,
                  borderColor: colors.background.canvas,
                  transform: [{ rotate: `-${LEAN}deg` }],
                },
              ]}
            >
              <Text variant="caption" color={colors.action.onPrimary} style={styles.seatBadgeText}>
                {seatCount > 9 ? "9+" : seatCount}
              </Text>
            </View>
          ) : null}
          {/* THE SEAT, AS AN OBJECT RATHER THAN A FRAME.
              No rim and no inset ring. Both were UI conventions for
              "interactive", and both were doing badly what light does well: a
              highlight along the top and a shadow underneath separate this from
              the crowd far more convincingly than a 1px accent line, and they
              say "solid thing" instead of "control".

              THREE VIEWS, NOT ONE, AND THE MIDDLE ONE IS WHY THE CORNERS ARE
              ROUND. `Gradient` passes `style` straight through to
              `LinearGradient`, whose own painted background does not reliably
              clip to a `borderRadius` set on itself — so the radius was correct
              (11/64 of the size, the avatar's exact ratio) and the tile still
              came out nearly square. A plain `View` always clips. So: the outer
              view owns the shadow, the middle owns the shape and the clip, and
              the gradient just fills.

              Shadow and clip are also kept on SEPARATE views on purpose. On iOS
              `overflow: "hidden"` and a shadow on one view fight each other, and
              the shadow is the half that loses. */}
          <View
            style={[
              {
                width: seatTile,
                height: seatTile,
                borderRadius: seatRadius,
              },
              elevation.e3,
            ]}
          >
            <View
              style={{
                flex: 1,
                borderRadius: seatRadius,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Lit from the top left in both schemes, but "deeper" means
                  something different in each. On ink the seat falls to near
                  black; on paper the same mix is a grey card, which is the one
                  thing the paper scheme cannot afford (its whole ramp lives
                  inside about 1.16:1, so a cold grey reads as dirt). Paper
                  falls to a warm tan instead. */}
              <Gradient
                colors={
                  scheme === "dark"
                    ? [
                        mix(colors.background.canvas, "#FFFFFF", 0.07),
                        mix(colors.background.canvas, accent, 0.08),
                        mix(colors.background.canvas, "#000000", 0.4),
                      ]
                    : [
                        mix(colors.background.canvas, "#FFFFFF", 0.7),
                        mix(colors.background.canvas, accent, 0.06),
                        mix(colors.background.canvas, accent, 0.22),
                      ]
                }
                locations={[0, 0.38, 1]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* THE MARK, AT THE SIZE A MARK SHOULD BE.
                  It was three dots borrowed from a chat typing indicator. In a
                  square tile beside a real avatar the nearer reading was a
                  spinner, or an image that had not finished loading. One person
                  glyph at 58% of the tile cannot be read as either.

                  Very low contrast on purpose: this is somebody who is NOT here.
                  A confident mark would be a person; a faint one is the shape of
                  where a person goes. */}
              <Icon
                name={icons.person}
                size={Math.round(seatTile * 0.58)}
                color={withAlpha(colors.text.primary, 0.1)}
              />

            </View>
          </View>
        </View>
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
  subject: { position: "absolute", flexDirection: "row", alignItems: "center" },
  glow: { position: "absolute" },
  // Overhangs the seat's top-right corner. The ring is canvas-coloured rather
  // than transparent so the badge reads as a separate object sitting in front
  // of the seat, not as a notch cut out of its rim.
  seatBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 1,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  seatBadgeText: { fontFamily: fonts.bold },
});
