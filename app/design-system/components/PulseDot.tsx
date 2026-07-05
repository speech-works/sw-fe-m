import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { radius } from "../primitives/scale";
import { easing } from "../motion";
import { useTheme } from "../useTheme";

/** Pulse-ring breathing period (ms) — an ambient loop, deliberately slower than UI motion. */
const PULSE_PERIOD = 1100;

export interface PulseDotProps {
  /** Dot + ring colour (default `action.primary`). */
  color?: string;
  /** Diameter of the solid dot (default 8). */
  size?: number;
}

/**
 * A small "live"/freshness indicator — a solid dot with a slowly expanding, fading
 * ring. Under reduced motion the ring is hidden and only the solid dot remains.
 */
export const PulseDot: React.FC<PulseDotProps> = ({ color, size = 8 }) => {
  const { colors } = useTheme();
  const c = color ?? colors.action.primary;
  const reduceMotion = useReducedMotion();
  const s = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    // Ambient breathing loop (intentionally slow, separate from UI motion).
    s.value = withRepeat(withTiming(2, { duration: PULSE_PERIOD, easing: easing.loop }), -1, false);
    return () => cancelAnimation(s);
  }, [reduceMotion, s]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 0.5 * (2 - s.value),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {!reduceMotion ? (
        <Animated.View style={[styles.pulse, { width: size, height: size, backgroundColor: c }, ring]} />
      ) : null}
      <View style={[styles.dot, { width: size, height: size, backgroundColor: c }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", borderRadius: radius.full },
  dot: { borderRadius: radius.full },
});
