import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  radius,
  easing,
  useTheme,
  useMotion,
  withAlpha,
} from "../../../design-system";

const { width, height } = Dimensions.get("window");

/** Bespoke ambient loop periods — deliberately mismatched so the orbs never
 *  line up into one pulsing rhythm. */
const FLOAT_PERIOD_1 = 6000;
const FLOAT_PERIOD_2 = 7000;
const FLOAT_PERIOD_3 = 8000;

/**
 * Ambient backdrop for the auth screens: soft brand-tinted orbs drifting behind
 * a glass wash.
 *
 * Was three legacy `Animated` loops that ran regardless of the OS reduce-motion
 * preference, one near-invisible face watermark, and — in the bottom-right slot
 * — a 300×300 view whose only child was commented out, so it drifted around
 * animating nothing at all. Now: reanimated, gated, and every orb is real.
 */
const LoginBackground = () => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      // Pure ambience — it goes fully quiet, and the orbs simply sit still.
      [float1, float2, float3].forEach((v) => {
        cancelAnimation(v);
        v.value = 0;
      });
      return;
    }
    const loop = (v: typeof float1, period: number) =>
      withRepeat(withTiming(1, { duration: period, easing: easing.loop }), -1, true);
    float1.value = loop(float1, FLOAT_PERIOD_1);
    float2.value = loop(float2, FLOAT_PERIOD_2);
    float3.value = loop(float3, FLOAT_PERIOD_3);
    return () => {
      [float1, float2, float3].forEach(cancelAnimation);
    };
  }, [reduced, float1, float2, float3]);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -100 + float1.value * 30 },
      { translateY: -80 + float1.value * 40 },
    ],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: width - 200 + float2.value * -40 },
      { translateY: height - 250 + float2.value * 20 },
    ],
  }));
  const orb3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -50 + float3.value * 20 },
      { translateY: height - 200 + float3.value * -30 },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base canvas — the scheme's own ground (replaces the legacy cream gradient). */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background.canvas }]}
      />

      {/* Top-left presence — where the face watermark used to sit. A warm brand
          wash reads the same at a glance and costs nothing to render. */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: 340,
            height: 340,
            backgroundColor: withAlpha(colors.action.primary, 0.1),
          },
          orb1Style,
        ]}
      />

      {/* Bottom-right — a cool counterweight so the backdrop has depth rather
          than one orange note. */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: 300,
            height: 300,
            backgroundColor: withAlpha(colors.accent.purple, 0.09),
          },
          orb2Style,
        ]}
      />

      {/* Bottom-left brand glow — the subtle orange wash that keeps the canvas
          warm now that the cream gradient is gone. */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: 350,
            height: 350,
            backgroundColor: colors.action.primaryTint,
          },
          orb3Style,
        ]}
      />

      {/* Glass overlay to smooth everything out */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: withAlpha(colors.background.canvas, 0.3) },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: radius.full,
    // RN has no CSS blur for Views (expo-blur blurs what's BEHIND a view, not
    // the view itself), so the soft-blob look comes from low-alpha fills
    // overlapping under the glass wash.
  },
});

export default LoginBackground;
