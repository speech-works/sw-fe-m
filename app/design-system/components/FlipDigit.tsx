import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { duration, easing, spring } from "../motion";
import { TypographyVariant } from "../primitives/typography";
import { Text, TextProps } from "./Text";

export interface FlipDigitProps {
  /** The number on the face. */
  value: number;
  /** The face it leans toward. Defaults to `value - 1` — these are countdowns. */
  towards?: number;
  variant?: TypographyVariant;
  color?: TextProps["color"];
  /**
   * Change this to play it again.
   *
   * Without it the flap fires once and never again: `value` is stable within a
   * session, and React Navigation keeps a screen mounted behind whatever you
   * push on top of it — so returning to the card replayed nothing. Pass a
   * counter bumped on focus and every visit gets the animation.
   */
  playKey?: string | number;
}

/** How far the flap gets before gravity wins. Far enough to read as an attempt,
 *  short of the 90° that would complete the flip and tell a lie. */
const TIP_DEG = 62;

/**
 * Wait for the screen to arrive before moving.
 *
 * This used to start the moment the wallet resolved — about 50ms — which put
 * the whole flip UNDERNEATH the navigation transition that was still sliding
 * the card into place. Two things moving at once and you register neither.
 * The delay is not sluggishness: nothing here is responding to a tap, so there
 * is no input latency to protect. It is just waiting until somebody is looking.
 */
const ENTRANCE_MS = 420;
/** Lower = stronger foreshortening. Tuned against the body type size. */
const PERSPECTIVE = 260;

/**
 * A DEPARTURE-BOARD FLAP THAT TRIES, AND DOESN'T QUITE MAKE IT.
 *
 * The digit sits on a tile hinged along its top edge. On appearance it tips
 * forward as though about to flip to the next number — the number behind
 * showing through the gap — hangs there a moment, then falls back.
 *
 * It never completes the flip, and that is the point: this renders a countdown
 * that moves once a day. A flap that landed on the next digit would be telling
 * the user the number just changed, every single time they opened the screen.
 * Leaning and failing says the thing that is actually true — it is counting,
 * but not yet.
 *
 * Plays once per appearance and once per value change, never on a loop. It is
 * one expressive moment on a card the user may sit and read; a tic that
 * repeated every few seconds would be decoration, and decoration on a screen
 * telling somebody they cannot practise yet is the wrong instinct.
 *
 * Reduced motion gets a plain digit — no transform, no second face.
 */
export const FlipDigit: React.FC<FlipDigitProps> = ({
  value,
  towards,
  variant = "body",
  color,
  playKey,
}) => {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const next = towards ?? value - 1;

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withDelay(
      ENTRANCE_MS,
      withSequence(
        // The attempt: quick, ease-out, so the movement is felt immediately.
        withTiming(1, { duration: duration.reveal, easing: easing.out }),
        // The hesitation — long enough to read as "stuck", not as a stumble —
        // then the fall back. Spring rather than timing so it settles with a
        // little weight instead of arriving on a schedule.
        withDelay(180, withSpring(0, spring.gentle)),
      ),
    );
  }, [value, playKey, reduceMotion, t]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${-t.value * TIP_DEG}deg` },
    ],
    // The face turning away from the light, not a fade — it stays legible
    // through the whole arc.
    opacity: 1 - t.value * 0.2,
  }));

  // Only visible through the gap the front flap opens. At rest it is fully
  // transparent, so the two digits never sit stacked on top of each other.
  const behindStyle = useAnimatedStyle(() => ({ opacity: t.value * 0.72 }));

  if (reduceMotion) {
    return (
      <Text variant={variant} color={color} style={styles.figures}>
        {value}
      </Text>
    );
  }

  return (
    <View>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.behind, behindStyle]}
        pointerEvents="none"
      >
        <Text variant={variant} color={color} style={styles.figures}>
          {next}
        </Text>
      </Animated.View>

      {/* In flow, so it is what gives the container its size. */}
      <Animated.View style={[styles.hinge, frontStyle]}>
        <Text variant={variant} color={color} style={styles.figures}>
          {value}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  hinge: {
    // Hinged along the TOP edge — a flap falling forward, not a card spinning
    // about its middle. RN 0.74+ supports this; FocusLamp uses it too.
    transformOrigin: "50% 0%",
    backfaceVisibility: "hidden",
  },
  behind: {
    alignItems: "center",
    justifyContent: "center",
  },
  figures: {
    // Tabular figures: 7 and 6 occupy the same box, so neither the flap nor
    // tomorrow's countdown reflows the sentence around it.
    fontVariant: ["tabular-nums"],
  },
});

export default FlipDigit;
