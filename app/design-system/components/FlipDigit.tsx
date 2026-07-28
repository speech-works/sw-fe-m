import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { easing } from "../motion";
import { palette } from "../primitives/palette";
import { Text } from "./Text";

export interface FlipDigitProps {
  /** The number on the block. */
  value: number;
  /** Milliseconds the readable face is held before each turn. */
  restMs?: number;
}

/** Square, like a die. Small enough to sit inside a sentence without shouting. */
const SIZE = 26;
/** Lower = stronger foreshortening, so the turn reads as depth rather than squash. */
const PERSPECTIVE = 200;
const FLIP_MS = 940;

/**
 * A SOLID BLOCK WITH THE DAY COUNT ON IT, TURNING OVER.
 *
 * Matte black tile, white bold numeral, resting face-on and then turning fast —
 * a desk-calendar block, not a styled number.
 *
 * WHY IT IS NOT A CUBE. The reference for this was a rendered 3D die showing
 * two faces at once. React Native cannot draw that: its transform system has no
 * `translateZ`, no parent-level `perspective` and no `preserve-3d`, so every
 * face is projected independently and adjacent faces will not meet along a
 * shared edge — they visibly drift apart mid-rotation. Two faces 180° apart
 * with backface culling is the honest version: one block, always upright,
 * turning over.
 *
 * WHY IT RESTS. The first version turned at a constant speed, and a flat face
 * spinning steadily is edge-on and unreadable for most of every cycle. This is
 * a countdown; the number is there to be read. So the readable pose gets ~64%
 * of the cycle and the turn happens fast, which is also what a real departure
 * board does.
 *
 * Both faces carry the SAME number. The block turns; the day count does not,
 * and a face showing a different digit would claim otherwise.
 *
 * BLACK AND WHITE IN BOTH SCHEMES, on purpose. It sits on a solid vivid card
 * beside the illustration, so it belongs with the artwork rather than with the
 * surfaces around it — the same reason the card's icon does not re-tint in
 * light mode.
 *
 * Reduced motion gets the block, standing still. The number is the point; the
 * turning is not load-bearing.
 */
export const FlipDigit: React.FC<FlipDigitProps> = ({
  value,
  restMs = 1660,
}) => {
  const reduceMotion = useReducedMotion();
  /** 0 → 1 is one full turn. */
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = 0;
    spin.value = withRepeat(
      // Hold, then whip through. Repeating forwards rather than reversing:
      // 360° and 0° are the same pose, so the wrap is invisible, where a
      // reverse would visibly rock back the way it came.
      withDelay(
        restMs,
        withTiming(1, { duration: FLIP_MS, easing: easing.inOut }),
      ),
      -1,
      false,
    );
  }, [reduceMotion, restMs, spin]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${spin.value * 360}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${spin.value * 360 + 180}deg` },
    ],
  }));

  const face = (
    <Text variant="h2" color={palette.white} style={styles.digit}>
      {value}
    </Text>
  );

  if (reduceMotion) return <View style={styles.block}>{face}</View>;

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.block, styles.face, frontStyle]}>
        {face}
      </Animated.View>
      <Animated.View style={[styles.block, styles.face, backStyle]}>
        {face}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { width: SIZE, height: SIZE },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    // Exactly one face points at the viewer at any moment; the other is culled.
    // Without this the far side's mirrored digit bleeds through the block.
    backfaceVisibility: "hidden",
  },
  block: {
    width: SIZE,
    height: SIZE,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ink.sunken,
    // A lit top edge. One highlight is all it takes to say "solid object" —
    // the turn supplies the rest of the depth.
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
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
