import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { easing, useMotion, useTheme, withAlpha } from "../../design-system";

/**
 * Blob wash, per scheme — and the two are NOT the same number.
 *
 * An identical alpha behaves completely differently over the two canvases. Over
 * warm paper, 0.14 orange is a soft peach that reads as light. Over near-black
 * the same value turns into an opaque muddy brown that reads as a stain on the
 * screen, because the canvas contributes almost nothing to the blend. Dark mode
 * therefore gets roughly half.
 *
 * The DS `action.primaryTint` token can't do this job: it is 0.12 in BOTH
 * schemes, so it lands on the wrong side of exactly this problem.
 */
export const BLOB_ALPHA = { dark: 0.075, light: 0.14 } as const;

/**
 * Organic, hand-drawn-feeling backdrop — the "color field" a character stands
 * on. A circle would read as a logo lockup or an avatar frame; an irregular
 * shape reads as illustration, which is the whole difference in feel.
 *
 * Each quadrant bulges by a different amount on purpose. The first version of
 * this path was near-circular and, tilted or not, still just looked like a
 * circle — asymmetry is the entire effect, so it has to be big enough to see.
 */
export const BLOB_PATH =
  "M104 4 C146 2 184 30 190 70 C196 110 168 132 164 162 " +
  "C160 192 122 198 86 192 C50 186 18 166 8 132 " +
  "C-2 98 14 62 40 38 C66 14 62 6 104 4 Z";

/** The blob's resting tilt — drift happens AROUND this. */
export const BLOB_BASE_ROTATE = -12;

/**
 * The drifting colour field, on its own so a second stage can stand on the
 * same ground.
 *
 * Lifted out of WelcomeStage unchanged — same path, same four pendulums, same
 * per-scheme wash. The call-offer screen sits directly after the teaser in the
 * same flow, and a blob that drifted even slightly differently would read as a
 * different app rather than the next page of the same one. One implementation
 * is the only way that stays true after the next edit.
 */
export const StageBlobs: React.FC<{
  size: number;
  /**
   * How many blobs. Two overlap into a liquid, morphing field — right behind a
   * character with three chips around it, where the extra depth reads as
   * illustration. ONE is right behind a single centred object: the second
   * shape's edge crosses the first's and the pair reads as a smudge with a
   * seam rather than as one soft wash. Default stays two so the welcome stage
   * is untouched.
   */
  layers?: 1 | 2;
}> = ({ size, layers = 2 }) => {
  const { colors, scheme } = useTheme();
  const { reduced } = useMotion();

  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);
  const driftC = useSharedValue(0);
  const driftD = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      [driftA, driftB, driftC, driftD].forEach((v) => {
        cancelAnimation(v);
        v.value = 0.5;
      });
      return;
    }
    const loop = (period: number) =>
      withRepeat(withTiming(1, { duration: period, easing: easing.loop }), -1, true);

    driftA.value = loop(13000);
    driftB.value = loop(17000);
    driftC.value = loop(11000);
    driftD.value = loop(19000);

    return () => {
      [driftA, driftB, driftC, driftD].forEach(cancelAnimation);
    };
  }, [reduced, driftA, driftB, driftC, driftD]);

  const frontBlobStyle = useAnimatedStyle(() => {
    const a = (driftA.value - 0.5) * 2;
    const b = (driftB.value - 0.5) * 2;
    const c = (driftC.value - 0.5) * 2;
    return {
      transform: [
        { translateX: a * 12 + c * 4 },
        { translateY: b * 13 + a * 4 },
        { rotate: `${BLOB_BASE_ROTATE + c * 6 + b * 3}deg` },
        { scaleX: 1 + a * 0.045 + b * 0.02 },
        { scaleY: 1 - a * 0.04 + c * 0.02 },
      ],
    };
  });

  const backBlobStyle = useAnimatedStyle(() => {
    const b = (driftB.value - 0.5) * 2;
    const c = (driftC.value - 0.5) * 2;
    const d = (driftD.value - 0.5) * 2;
    return {
      transform: [
        { translateX: d * 15 + b * 5 },
        { translateY: c * 16 + d * 4 },
        { rotate: `${BLOB_BASE_ROTATE + 32 + d * 7 + c * 3}deg` },
        { scaleX: 1.07 + c * 0.05 + d * 0.02 },
        { scaleY: 1.07 + b * 0.05 + d * 0.02 },
      ],
    };
  });

  // Written out per layer rather than as a multiplier, so the two numbers are
  // the same two numbers this always used and a reader can check them at a
  // glance. See BLOB_ALPHA for why the schemes differ by more than a factor.
  const dark = scheme === "dark";
  const backFill = withAlpha(
    colors.action.primary,
    dark ? BLOB_ALPHA.dark * 0.55 : BLOB_ALPHA.light * 0.45,
  );
  const frontFill = withAlpha(
    colors.action.primary,
    dark ? BLOB_ALPHA.dark : BLOB_ALPHA.light,
  );

  return (
    <>
      {layers === 2 ? (
        <Animated.View style={[styles.blob, backBlobStyle]}>
          <Svg width={size} height={size} viewBox="0 0 200 200" pointerEvents="none">
            <Path d={BLOB_PATH} fill={backFill} />
          </Svg>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.blob, frontBlobStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200" pointerEvents="none">
          <Path d={BLOB_PATH} fill={frontFill} />
        </Svg>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
  },
});
