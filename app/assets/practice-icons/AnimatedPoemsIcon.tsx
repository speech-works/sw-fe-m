import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { useTheme, easing, useMotion } from "../../design-system";

/**
 * Animated variant of the Poems practice icon: the quill wiggles gently
 * around its nib (swinging its tip beyond the circular housing) while small
 * stars twinkle around it. The registry SVG stays static — react-native-svg
 * cannot run SMIL — so this component layers the same art and drives it with
 * reanimated, like the sw-faces pattern. Ambient loops go fully quiet under
 * reduced motion.
 */

/** Ambient loop periods (ms) — bespoke named consts per the motion rules. */
const WIGGLE_HALF_PERIOD = 1300;
const TWINKLE_HALF_PERIOD = 900;
const TWINKLE_STAGGER = 450;
/** Wiggle amplitude; the nib pivot turns this into a visible tip swing. */
const WIGGLE_DEG = 3.5;
/** Quill nib position in the 48-unit icon box — the wiggle pivot. */
const NIB_X = 8.1;
const NIB_Y = 40.1;

/** Housing disc + finishing layers (glow, vignette, rim), from the icon system. */
const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="poems-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="poems-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#poems-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#poems-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

/** The quill alone (no housing, no baked sparkles) — the wiggling layer. */
const FEATHER_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M9.4 41.8c2.2-11 6.7-21.6 15.7-30.4C30.2 6.3 36.4 4.3 42 5.5c.8 5.7-1.2 11.8-6.4 16.9-5 4.8-11.3 7.6-18.5 8.6-2.4 3.7-4.5 7.5-6.1 11.5l-1.6-.7Z" fill="#306FC8"/>
  <path d="M8 39.8c2.2-11 6.7-21.6 15.7-30.4C28.8 4.3 35 2.3 40.6 3.5c.8 5.7-1.2 11.8-6.4 16.9-5 4.8-11.3 7.6-18.5 8.6-2.4 3.7-4.5 7.5-6.1 11.5L8 39.8Z" fill="#171420"/>
  <path d="M9.2 40.2C15.7 25.6 24.6 14 36.8 6.3" fill="none" stroke="#FFF4D8" stroke-width="2.1" stroke-linecap="round"/>
  <path d="M16.3 27.8 15.6 20M20.6 22.1l-.2-7.3M25 17.3l.5-6.2M20.7 22.1l8.7-.8M25 17.2l8.2-1.5M29.2 12.9l7.2-2" fill="none" stroke="#FFF4D8" stroke-width="1.7" stroke-linecap="round" opacity="0.86"/>
  <path d="M8.1 40.1 6.7 44l4-2.6" fill="#A03F52"/>
</svg>`;

/** The set's four-point sparkle, normalized to a small standalone canvas. */
const starXml = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3.2 -3.2 6.4 6.4">
    <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="${fill}"/>
  </svg>`;

/** Star sprinkle layout, in 48-unit icon coordinates. `u` is the star's box size. */
const STARS = [
  { x: 40.5, y: 7.5, u: 6.4, fill: "#FFF4D8", delay: 0 }, // near the tip, pokes past the rim
  { x: 8.6, y: 10.7, u: 4.4, fill: "#FFFFFF", delay: TWINKLE_STAGGER },
  { x: 40.2, y: 35.8, u: 7.4, fill: "#FFF4D8", delay: TWINKLE_STAGGER * 2 },
] as const;

const TwinkleStar: React.FC<{
  size: number;
  x: number;
  y: number;
  u: number;
  fill: string;
  delay: number;
  reduced: boolean;
}> = ({ size, x, y, u, fill, delay, reduced }) => {
  // 0 → dim/small, 1 → bright/full. Static mid-glow when motion is reduced.
  const t = useSharedValue(reduced ? 0.8 : 0.15);

  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: TWINKLE_HALF_PERIOD, easing: easing.loop }),
        -1,
        true,
      ),
    );
  }, [reduced, delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.15 + 0.85 * t.value,
    transform: [{ scale: 0.6 + 0.45 * t.value }],
  }));

  const px = (u / 48) * size;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          left: (x / 48) * size - px / 2,
          top: (y / 48) * size - px / 2,
          width: px,
          height: px,
        },
        style,
      ]}
    >
      <SvgXml xml={starXml(fill)} width={px} height={px} />
    </Animated.View>
  );
};

export const AnimatedPoemsIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    rotate.value = -WIGGLE_DEG;
    rotate.value = withRepeat(
      withTiming(WIGGLE_DEG, {
        duration: WIGGLE_HALF_PERIOD,
        easing: easing.loop,
      }),
      -1,
      true,
    );
  }, [reduced, rotate]);

  // Pivot the rotation on the quill nib instead of the view centre, so the
  // feather tip sweeps out past the housing while the nib stays planted.
  const pivotX = (NIB_X / 48 - 0.5) * size;
  const pivotY = (NIB_Y / 48 - 0.5) * size;
  const featherStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pivotX },
      { translateY: pivotY },
      { rotate: `${rotate.value}deg` },
      { translateX: -pivotX },
      { translateY: -pivotY },
    ],
  }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <SvgXml
        xml={HOUSING_XML}
        width={size}
        height={size}
        color={housing ?? colors.surface.inverse}
      />
      <Animated.View style={[StyleSheet.absoluteFill, featherStyle]}>
        <SvgXml xml={FEATHER_XML} width={size} height={size} />
      </Animated.View>
      {STARS.map((s, i) => (
        <TwinkleStar key={i} size={size} reduced={reduced} {...s} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  star: {
    position: "absolute",
  },
});
