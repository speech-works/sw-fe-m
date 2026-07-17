import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
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
} from "../../../../../../../design-system";

type MeditationAuraProps = {
  size?: number;
};

/** Bespoke ambient loop periods. Slow on purpose: this sits under a meditation
 *  timer, so it should read as atmosphere you stop noticing, not as a thing
 *  asking to be watched. The swell is roughly a calm breath; the drift is slow
 *  enough that you only register it if you look for it. */
const SWELL_PERIOD = 7000;
const DRIFT_PERIOD = 44000;

const DEFAULT_SIZE = 240;

/**
 * The ambient aura behind Meditation's timer — replaces `MeditationFace`.
 *
 * Deliberately NOT the Breathing pacer. Breathing has phases to hit, so its orb
 * is a clock you follow; meditation has nothing to pace, so this one only
 * breathes gently and drifts. It's the concept that was rejected for the pacer
 * (no phase timing, no countdown) — which is exactly what makes it right here.
 */
export const MeditationAura: React.FC<MeditationAuraProps> = ({
  size = DEFAULT_SIZE,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const swell = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      // Ambient loops go fully quiet under reduced motion — nothing here is
      // load-bearing, so a still aura loses the user nothing.
      cancelAnimation(swell);
      cancelAnimation(drift);
      swell.value = 0.5;
      drift.value = 0;
      return;
    }
    swell.value = withRepeat(
      withTiming(1, { duration: SWELL_PERIOD, easing: easing.loop }),
      -1,
      true, // reverse — a swell that snaps back isn't calm
    );
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_PERIOD, easing: easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(swell);
      cancelAnimation(drift);
    };
  }, [reduced, swell, drift]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + swell.value * 0.1 }],
  }));

  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.06 + swell.value * 0.16 }],
    opacity: 0.16 + swell.value * 0.12,
  }));

  // Counter-rotating so the aura never resolves into one turning object.
  const ringOuterStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${drift.value * 360}deg` }],
  }));
  const ringInnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${drift.value * -360}deg` }],
  }));

  const core = size * 0.5;
  const ringOuterR = size / 2 - 4;
  const ringInnerR = size / 2 - 22;

  return (
    <View style={[styles.slot, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.disc,
          {
            width: core,
            height: core,
            backgroundColor: withAlpha(colors.accent.purple, 0.5),
          },
          bloomStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.disc,
          {
            width: core,
            height: core,
            backgroundColor: withAlpha(colors.accent.purple, 0.9),
          },
          coreStyle,
        ]}
      />

      {/* accentText, not the accent base: these are thin strokes, and a bright
          fill hue collapses on the paper canvas. Decorative either way, but
          there's no reason to leave it invisible in light mode. */}
      <Animated.View style={[StyleSheet.absoluteFill, ringOuterStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={ringOuterR}
            stroke={withAlpha(colors.accentText.purple, 0.35)}
            strokeWidth={1.5}
            strokeDasharray="34 22"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, ringInnerStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={ringInnerR}
            stroke={withAlpha(colors.accentText.purple, 0.22)}
            strokeWidth={1.5}
            strokeDasharray="12 30"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    position: "absolute",
    borderRadius: radius.full,
  },
});
