import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { easing } from "../motion";
import { palette } from "../primitives/palette";
import { Gradient } from "./Gradient";
import { Text } from "./Text";

export interface FlipDigitProps {
  /** The number on the block. */
  value: number;
  /** Milliseconds the block sits still between leans. */
  restMs?: number;
}

/** The face. Square, small enough to sit inside a sentence without shouting. */
const SIZE = 26;
/** How much of the top surface a full lean reveals. */
const TOP = 10;

const OUT_MS = 450;
const HOLD_MS = 500;
const BACK_MS = 580;

const AnimatedGradient = Animated.createAnimatedComponent(Gradient);

/**
 * A SOLID BLOCK WITH THE DAY COUNT ON IT, LEANING FORWARD AND BACK.
 *
 * It tips just far enough to show its top surface, holds, and settles back — a
 * physical object on a shelf, nudged.
 *
 * HOW IT IS BUILT, AND WHY NOT WITH 3D. React Native's transform system has no
 * `translateZ`, no parent-level `perspective` and no `preserve-3d`, so faces
 * are projected independently and adjacent ones will not meet along a shared
 * edge — build a cube corner that way and it visibly comes apart mid-rotation.
 * I tried; it does.
 *
 * So the top is not a rotated face, it is a DRAWN surface that grows out of the
 * shared edge: a strip above the face, scaled on Y from its bottom edge. The
 * gradient is what sells it — lit along the front edge and falling away toward
 * the back, which is how a real top surface catches light. Scale-only, so it
 * stays on the GPU and never touches layout.
 *
 * WHY IT ONLY LEANS. A full turn puts a flat face edge-on and unreadable for
 * most of every cycle, which is a poor trade on a countdown whose entire job is
 * to be read. Leaning keeps the number legible the whole time.
 *
 * BLACK AND WHITE IN BOTH SCHEMES, on purpose. It sits on a solid vivid card
 * beside the illustration, so it belongs with the artwork rather than with the
 * surfaces around it — the same reason the card's icon does not re-tint in
 * light mode.
 *
 * Reduced motion gets the block, sitting flat. The number is the point; the
 * lean is not load-bearing.
 */
export const FlipDigit: React.FC<FlipDigitProps> = ({
  value,
  restMs = 1600,
}) => {
  const reduceMotion = useReducedMotion();
  /** 0 = flat on, 1 = leaned far enough to show the whole top. */
  const lean = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    lean.value = 0;
    lean.value = withRepeat(
      withSequence(
        // Out on ease-out so the movement is felt at once, back on ease-in-out
        // so it settles rather than snaps — the asymmetry is what makes it read
        // as weight rather than as a blink.
        withDelay(
          restMs,
          withTiming(1, { duration: OUT_MS, easing: easing.out }),
        ),
        withDelay(
          HOLD_MS,
          withTiming(0, { duration: BACK_MS, easing: easing.inOut }),
        ),
      ),
      -1,
      false,
    );
  }, [reduceMotion, restMs, lean]);

  const topStyle = useAnimatedStyle(() => ({
    // Grows out of the edge it shares with the face, so the two never part.
    transform: [{ scaleY: lean.value }],
  }));

  const face = (
    <View style={styles.face}>
      <Text variant="h2" color={palette.white} style={styles.digit}>
        {value}
      </Text>
    </View>
  );

  if (reduceMotion) return <View style={styles.stage}>{face}</View>;

  return (
    <View style={styles.stage}>
      <AnimatedGradient
        colors={TOP_SURFACE}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[styles.top, topStyle]}
        pointerEvents="none"
      />
      {face}
    </View>
  );
};

/** Lit along the front edge, falling away toward the back. */
const TOP_SURFACE = ["#46434F", "#2A2831", "#1E1C24"] as const;

const styles = StyleSheet.create({
  stage: {
    width: SIZE,
    // Room for the top surface, reserved whether or not it is showing — so the
    // sentence around it never reflows as the block leans.
    height: SIZE + TOP,
    justifyContent: "flex-end",
  },
  top: {
    position: "absolute",
    left: 0,
    bottom: SIZE,
    width: SIZE,
    height: TOP,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    transformOrigin: "50% 100%",
  },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ink.sunken,
  },
  digit: {
    // h2 for its bold face, sized down to fit the block. Overriding the size
    // and line box only; the font family stays the variant's.
    fontSize: 15,
    lineHeight: 17,
    fontVariant: ["tabular-nums"],
  },
});

export default FlipDigit;
