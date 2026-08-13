import React, { useEffect } from "react";
import { DimensionValue, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { useTheme } from "../useTheme";
import { duration, easing } from "../motion";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  /** Extra layout (margins, overrides) — applied over the base size/shape. */
  style?: StyleProp<ViewStyle>;
}

/** Loading placeholder with a gentle pulse (respects reduced motion). */
export const Skeleton: React.FC<SkeletonProps> = ({ width = "100%", height = 16, radius = 8, style }) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.6);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: duration.shimmer, easing: easing.loop }), -1, true);
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      // `surface.skeleton`, NOT `surface.row`. On ink the two are the same value
      // and this changes nothing; on paper `row` was #FFFEFB on a #FFFDF8 card —
      // ΔE 1.1 — so the loading state rendered and showed nothing, and every
      // first paint in light mode looked like the app had hung.
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface.skeleton }, style, pulse]}
    />
  );
};
