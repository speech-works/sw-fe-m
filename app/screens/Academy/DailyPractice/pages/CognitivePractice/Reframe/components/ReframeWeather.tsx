import React, { useEffect, useRef } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Gradient } from "../../../../../../../design-system";

const { width, height } = Dimensions.get("window");
const NUM_DROPS = 30;
const SUN = 260;

interface DropCfg {
  x: number;
  delay: number;
  duration: number;
  len: number;
  w: number;
}

/** One rain streak — a transform-only reanimated fall loop (GPU-composited). */
const RainDrop: React.FC<{ cfg: DropCfg }> = ({ cfg }) => {
  const y = useSharedValue(-40);
  useEffect(() => {
    y.value = withDelay(
      cfg.delay,
      withRepeat(
        withTiming(height + 40, { duration: cfg.duration, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [cfg.delay, cfg.duration, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[styles.drop, { left: cfg.x, height: cfg.len, width: cfg.w }, style]}
    />
  );
};

interface BirdCfg {
  top: number;
  size: number;
  delay: number;
  duration: number;
  bob: number;
  staticX: number;
}

/**
 * One soft gull silhouette — drifts across the sky (translateX loop) with a gentle
 * bob and a wing "flap" (scaleY), all transform-only. Visible only once the sky has
 * cleared (`sun` progress drives opacity). Under reduced motion it simply fades in
 * at a fixed spot with no drift.
 */
const Bird: React.FC<{ cfg: BirdCfg; sun: SharedValue<number>; reduced: boolean }> = ({
  cfg,
  sun,
  reduced,
}) => {
  const tx = useSharedValue(-80);
  const by = useSharedValue(0);
  const flap = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    tx.value = withDelay(
      cfg.delay,
      withRepeat(
        withTiming(width + 80, { duration: cfg.duration, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    by.value = withRepeat(
      withTiming(cfg.bob, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    flap.value = withRepeat(
      withTiming(0.55, { duration: 340, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [cfg, reduced, tx, by, flap]);

  const style = useAnimatedStyle(() => ({
    opacity: sun.value,
    transform: reduced
      ? []
      : [
          { translateX: tx.value },
          { translateY: by.value },
          { scaleY: flap.value },
        ],
  }));

  return (
    <Animated.View
      style={[
        styles.bird,
        { top: cfg.top, left: reduced ? cfg.staticX : 0 },
        style,
      ]}
      pointerEvents="none"
    >
      <Svg width={cfg.size} height={cfg.size * 0.5} viewBox="0 0 24 12">
        <Path
          d="M1 8 Q6 1.5 12 7 Q18 1.5 23 8"
          stroke="rgba(255,244,226,0.85)"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

const BIRDS: BirdCfg[] = [
  { top: height * 0.16, size: 30, delay: 0, duration: 12000, bob: 10, staticX: width * 0.62 },
  { top: height * 0.22, size: 22, delay: 1600, duration: 15000, bob: 8, staticX: width * 0.3 },
  { top: height * 0.12, size: 20, delay: 3200, duration: 17000, bob: 7, staticX: width * 0.78 },
  { top: height * 0.27, size: 26, delay: 5200, duration: 13500, bob: 9, staticX: width * 0.46 },
];

/**
 * Ambient weather behind the Reframe canvas. It starts as a moody dusk with gentle
 * rain; the moment the user picks a better perspective (`sunshine`) the rain clears,
 * a warm sun rises, and a few birds drift across the whole screen — the mood shift
 * made literal. Deliberately DARK (plus a flat wash) so white text stays legible.
 * Rain/sun-rise/bird-drift are transform-only and gated behind reduced motion, while
 * the mood still changes via opacity (reduced-motion-safe).
 */
export const ReframeWeather: React.FC<{ sunshine: boolean }> = ({ sunshine }) => {
  const reduced = useReducedMotion();
  const drops = useRef<DropCfg[]>(
    Array.from({ length: NUM_DROPS }).map(() => ({
      x: Math.random() * width,
      delay: Math.random() * 2500,
      duration: 2600 + Math.random() * 1600,
      len: 14 + Math.random() * 22,
      w: Math.random() < 0.25 ? 2 : 1,
    })),
  ).current;

  // 1 = rainy (negative thought), 0 = cleared; sun is the inverse (warm dawn).
  const rain = useSharedValue(sunshine ? 0 : 1);
  const sun = useSharedValue(sunshine ? 1 : 0);
  useEffect(() => {
    rain.value = withTiming(sunshine ? 0 : 1, { duration: 900 });
    sun.value = withTiming(sunshine ? 1 : 0, { duration: 1600 });
  }, [sunshine, rain, sun]);

  const rainStyle = useAnimatedStyle(() => ({ opacity: rain.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.12 + sun.value * 0.4 }));
  const sunStyle = useAnimatedStyle(() => ({
    opacity: sun.value,
    transform: reduced ? [] : [{ translateY: (1 - sun.value) * 90 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Moody dusk sky. */}
      <Gradient
        colors={["#10151F", "#161C27", "#0E100D"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Rising sun — fades + climbs into view as the sky clears. */}
      <Animated.View style={[styles.sun, sunStyle]} pointerEvents="none">
        <Svg width={SUN} height={SUN} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="rf-sun" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFE7B0" stopOpacity={1} />
              <Stop offset="42%" stopColor="#FFB86E" stopOpacity={0.9} />
              <Stop offset="68%" stopColor="#FF9040" stopOpacity={0.45} />
              <Stop offset="100%" stopColor="#FF9040" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={100} fill="url(#rf-sun)" />
        </Svg>
      </Animated.View>

      {/* Warm dawn light from the top — brightens as it clears. */}
      <Animated.View style={[styles.glow, glowStyle]}>
        <Gradient
          colors={["rgba(255,176,110,0.6)", "rgba(255,176,110,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Gentle rain — fades out as a reframe is chosen; skipped under reduced motion. */}
      {reduced ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, rainStyle]}>
          {drops.map((cfg, i) => (
            <RainDrop key={i} cfg={cfg} />
          ))}
        </Animated.View>
      )}

      {/* Birds drifting across the cleared sky. */}
      {BIRDS.map((cfg, i) => (
        <Bird key={i} cfg={cfg} sun={sun} reduced={reduced} />
      ))}

      {/* Flat legibility wash so white body text stays readable over the scene. */}
      <View style={styles.wash} />
    </View>
  );
};

export default ReframeWeather;

const styles = StyleSheet.create({
  sun: {
    position: "absolute",
    top: height * 0.06,
    left: (width - SUN) / 2,
    width: SUN,
    height: SUN,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  drop: {
    position: "absolute",
    top: 0,
    borderRadius: 1,
    backgroundColor: "rgba(150,185,230,0.4)",
  },
  bird: {
    position: "absolute",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,10,14,0.3)",
  },
});
