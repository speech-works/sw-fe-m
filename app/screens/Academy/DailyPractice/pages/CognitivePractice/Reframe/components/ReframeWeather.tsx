import React, { useEffect, useRef, useState } from "react";
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
import { Gradient, useTheme } from "../../../../../../../design-system";

const { width, height } = Dimensions.get("window");
const NUM_DROPS = 30;
const SUN = 260;

/**
 * Art colours for the scene. These stay local raw values on purpose — they're an
 * ILLUSTRATION (a sky, rain, a sun), not UI surfaces, so they don't belong in the
 * semantic palette. But they DO have to respect the scheme, because the text that
 * sits over them flips ink with it.
 *
 * Both palettes are constrained so the scene can never swallow the copy on top:
 *  - dark: white primary ≥ 9:1 at the sun's brightest point
 *  - light: near-black ink ≥ 13:1 everywhere, tertiary ≥ 4.5:1
 * `sunPeak` is the cap that keeps that true — on dark a warm sun is a mid-tone
 * that muted grey text cannot clear, so it stays a bloom rather than a floodlight.
 * On paper a bright sun only RAISES contrast for dark ink, so it runs at full.
 */
const WEATHER = {
  dark: {
    sky: ["#10151F", "#161C27", "#0E100D"] as const,
    sunCore: "#FFE7B0",
    sunMid: "#FFB86E",
    sunEdge: "#FF9040",
    // 0.22 is the ceiling at which every bare text role on the screen still clears
    // AA if it scrolls over the horizon at full sun (the blue eyebrow is the
    // tightest, at 4.72:1). Above ~0.28 that label drops under 4.5.
    sunPeak: 0.22,
    glow: ["rgba(255,176,110,0)", "rgba(255,176,110,0.55)"] as const,
    rain: "rgba(150,185,230,0.4)",
    bird: "rgba(255,244,226,0.85)",
    wash: "rgba(8,10,14,0.30)",
  },
  light: {
    // Overcast paper — a cool, pale sky that clears to warm. Kept close to the
    // canvas luminance so `text.tertiary` still clears AA over it.
    sky: ["#E6ECF4", "#EAEFF5", "#F5F1E9"] as const,
    sunCore: "#FFF6DC",
    sunMid: "#FFE3A8",
    sunEdge: "#FFD9A0",
    sunPeak: 1,
    glow: ["rgba(255,217,160,0)", "rgba(255,217,160,0.55)"] as const,
    // Rain reads as darker streaks against a bright sky, not lighter ones.
    rain: "rgba(88,118,158,0.35)",
    // ...and birds are silhouettes, for the same reason.
    bird: "rgba(60,70,90,0.7)",
    wash: "rgba(255,253,248,0.30)",
  },
} as const;

type Weather = (typeof WEATHER)[keyof typeof WEATHER];

/**
 * The sky's colour at the very top of the scene. The screen's status-bar cap fades
 * from this, so it has to track the scheme too — it used to be a hardcoded dusk
 * hex, which painted a dark band across a light sky.
 */
export const reframeSkyTop = (scheme: string): string =>
  (scheme === "light" ? WEATHER.light : WEATHER.dark).sky[0];

interface DropCfg {
  x: number;
  delay: number;
  duration: number;
  len: number;
  w: number;
}

/** One rain streak — a transform-only reanimated fall loop (GPU-composited). */
const RainDrop: React.FC<{ cfg: DropCfg; color: string }> = ({ cfg, color }) => {
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
      style={[
        styles.drop,
        { left: cfg.x, height: cfg.len, width: cfg.w, backgroundColor: color },
        style,
      ]}
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
const Bird: React.FC<{
  cfg: BirdCfg;
  sun: SharedValue<number>;
  reduced: boolean;
  color: string;
}> = ({ cfg, sun, reduced, color }) => {
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
          stroke={color}
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
 * Ambient weather behind the Reframe canvas. It starts as a moody overcast with
 * gentle rain; the moment the user picks a better perspective (`sunshine`) the rain
 * clears, a warm sun rises, and a few birds drift across the whole screen — the mood
 * shift made literal. Rain/sun-rise/bird-drift are transform-only and gated behind
 * reduced motion, while the mood still changes via opacity (reduced-motion-safe).
 *
 * Two things keep the copy on top legible, because this layer sits behind BARE text
 * (no card):
 *  1. It follows the scheme (see `WEATHER`). It used to be hardcoded dark, which was
 *     invisible-by-construction in light mode — dark ink on a dark sky, 1.14:1.
 *  2. The sun rises at the HORIZON, not overhead. It used to sit at 6% from the top,
 *     i.e. directly behind the negative thought, and a bright warm core is a mid-tone
 *     that no muted text clears — white over it measured 2.43:1. Low, it lands behind
 *     the opaque option cards and the reserved floating-control band instead, which
 *     is also what a sunrise actually looks like.
 */
export const ReframeWeather: React.FC<{ sunshine: boolean }> = ({ sunshine }) => {
  const reduced = useReducedMotion();
  const { scheme } = useTheme();
  const w: Weather = scheme === "light" ? WEATHER.light : WEATHER.dark;
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

  // Park the invisible layers: 30 drop + 12 bird infinite loops would otherwise
  // keep the UI thread busy at opacity 0 for the rest of the session. Each layer
  // stays mounted just long enough to finish its fade (900ms rain / 1600ms sun).
  const [rainMounted, setRainMounted] = useState(!sunshine);
  const [birdsMounted, setBirdsMounted] = useState(sunshine);
  useEffect(() => {
    if (sunshine) {
      setBirdsMounted(true);
      const t = setTimeout(() => setRainMounted(false), 950);
      return () => clearTimeout(t);
    }
    setRainMounted(true);
    const t = setTimeout(() => setBirdsMounted(false), 1650);
    return () => clearTimeout(t);
  }, [sunshine]);

  const rainStyle = useAnimatedStyle(() => ({ opacity: rain.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.12 + sun.value * 0.4 }));
  // `peak` caps how bright the sun is ever allowed to get — see WEATHER.
  const peak = w.sunPeak;
  const sunStyle = useAnimatedStyle(() => ({
    opacity: sun.value * peak,
    transform: reduced ? [] : [{ translateY: (1 - sun.value) * 90 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The sky — moody overcast, warming as it clears. */}
      <Gradient
        colors={w.sky}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Rising sun — fades + climbs into view at the horizon as the sky clears. */}
      <Animated.View style={[styles.sun, sunStyle]} pointerEvents="none">
        <Svg width={SUN} height={SUN} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="rf-sun" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={w.sunCore} stopOpacity={1} />
              <Stop offset="42%" stopColor={w.sunMid} stopOpacity={0.9} />
              <Stop offset="68%" stopColor={w.sunEdge} stopOpacity={0.45} />
              <Stop offset="100%" stopColor={w.sunEdge} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={100} fill="url(#rf-sun)" />
        </Svg>
      </Animated.View>

      {/* Warm dawn light off the horizon — brightens from below as it clears. */}
      <Animated.View style={[styles.glow, glowStyle]}>
        <Gradient
          colors={w.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Gentle rain — fades out as a reframe is chosen; skipped under reduced motion. */}
      {reduced || !rainMounted ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, rainStyle]}>
          {drops.map((cfg, i) => (
            <RainDrop key={i} cfg={cfg} color={w.rain} />
          ))}
        </Animated.View>
      )}

      {/* Birds drifting across the cleared sky. */}
      {birdsMounted
        ? BIRDS.map((cfg, i) => (
            <Bird key={i} cfg={cfg} sun={sun} reduced={reduced} color={w.bird} />
          ))
        : null}

      {/* Flat legibility wash so body text stays readable over the scene. */}
      <View style={[styles.wash, { backgroundColor: w.wash }]} />
    </View>
  );
};

export default ReframeWeather;

const styles = StyleSheet.create({
  // At the HORIZON, not overhead: the bright core lands behind the opaque option
  // cards and the reserved floating-control band, never behind the bare negative
  // thought at the top. See the component doc for the measured reason.
  sun: {
    position: "absolute",
    top: height * 0.62,
    left: (width - SUN) / 2,
    width: SUN,
    height: SUN,
  },
  glow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
  },
  drop: {
    position: "absolute",
    top: 0,
    borderRadius: 1,
    // colour comes from the scheme's WEATHER.rain
  },
  bird: {
    position: "absolute",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    // colour comes from the scheme's WEATHER.wash
  },
});
