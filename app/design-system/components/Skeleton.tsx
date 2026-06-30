import React, { useEffect } from "react";
import { DimensionValue } from "react-native";
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
}

/** Loading placeholder with a gentle pulse (respects reduced motion). */
export const Skeleton: React.FC<SkeletonProps> = ({ width = "100%", height = 16, radius = 8 }) => {
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

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface.row }, style]}
    />
  );
};
