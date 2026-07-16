import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { useTheme, easing, useMotion } from "../../design-system";

/**
 * Animated variant of the Roleplay practice icon: the clapperboard snaps shut,
 * lets out a small spark, and slowly opens back up in an ambient loop.
 * The SVG layers are extracted from the generated registry.
 * Ambient loops go fully quiet under reduced motion.
 */

/** Housing disc + finishing layers (glow, vignette, rim), from the icon system. */
const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="roleplay-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="roleplay-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#roleplay-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#roleplay-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

/** The bottom static board of the clapperboard. */
const BOARD_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <g fill="#B53B51" transform="translate(0 2.5)">
    <rect x="8.7" y="19.2" width="31" height="17.6" rx="3"/>
  </g>
  <rect x="8.7" y="19.2" width="31" height="17.6" rx="3" fill="#FF6B6B"/>
  <path d="M13 24.5 h21.5" stroke="#FFF4D8" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M13 29.5 h9 M25.5 29.5 h6" stroke="#FFAF98" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

/** The top hinged arm that snaps down. */
const ARM_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <g fill="#B53B51" transform="translate(0 2.5)">
    <path d="M9 13.8 L38.2 7.4 L39.7 13.1 L10.5 19.5 Z"/>
  </g>
  <path d="M9 13.8 L38.2 7.4 L39.7 13.1 L10.5 19.5 Z" fill="#B53B51"/>
  <g fill="#FFF4D8">
    <path d="M14.6 12.5 L18.9 11.55 L20.1 16.75 L15.8 17.7 Z"/>
    <path d="M22.9 10.7 L27.2 9.75 L28.4 14.95 L24.1 15.9 Z"/>
    <path d="M31.2 8.85 L35.5 7.9 L36.7 13.1 L32.4 14.05 Z"/>
  </g>
  <circle cx="10.7" cy="16.6" r="1.5" fill="#FFF4D8"/>
</svg>`;

/** The static background stars (from the original icon). */
const BACKGROUND_STARS_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8" opacity="0.95" transform="translate(10.4 41.9) rotate(-12)"/>
  <path d="M0 -1.7 L0.5 -0.5 L1.7 0 L0.5 0.5 L0 1.7 L-0.5 0.5 L-1.7 0 L-0.5 -0.5 Z" fill="#FFFFFF" opacity="0.6" transform="translate(42.6 18.6)"/>
</svg>`;

/** A bright spark that appears when the clapper snaps. */
const SPARK_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3.2 -3.2 6.4 6.4">
  <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8"/>
</svg>`;

const CLAP_ANGLE = 12; // degrees to rotate down
const PIVOT_X = 10.7; // cx of the hinge
const PIVOT_Y = 16.6; // cy of the hinge

export const AnimatedRoleplayIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // 0 = fully open, 1 = snapped shut
  const clap = useSharedValue(0);
  // 0 = invisible, 1 = full spark burst
  const spark = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    // Slow ambient loop:
    // Wait open -> snap shut (fast) -> wait shut -> open slowly
    clap.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1, { duration: 150, easing: easing.inOut })),
        withDelay(400, withTiming(0, { duration: 800, easing: easing.out }))
      ),
      -1,
      false
    );

    // Spark triggers slightly after the clap starts, peaking when it hits
    spark.value = withRepeat(
      withSequence(
        withDelay(1900, withTiming(1, { duration: 100, easing: easing.out })),
        withDelay(100, withTiming(0, { duration: 400, easing: easing.in })),
        withDelay(650, withTiming(0, { duration: 0 })) // padding to match total 3150ms sequence
      ),
      -1,
      false
    );
  }, [reduced, clap, spark]);

  const pivotPxX = (PIVOT_X / 48 - 0.5) * size;
  const pivotPxY = (PIVOT_Y / 48 - 0.5) * size;

  const armStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pivotPxX },
      { translateY: pivotPxY },
      { rotate: `${clap.value * CLAP_ANGLE}deg` },
      { translateX: -pivotPxX },
      { translateY: -pivotPxY },
    ],
  }));

  // Spark emerges from the far end of the clapper
  const sparkPx = (6.4 / 48) * size;
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: spark.value,
    transform: [
      { scale: 0.5 + 1.2 * spark.value },
      { rotate: `${spark.value * 45}deg` } // slight rotation as it bursts
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
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={BOARD_XML} width={size} height={size} />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, armStyle]}>
        <SvgXml xml={ARM_XML} width={size} height={size} />
      </Animated.View>
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={BACKGROUND_STARS_XML} width={size} height={size} />
      </View>

      {/* Burst spark at the snapping point */}
      <Animated.View
        style={[
          styles.spark,
          {
            left: (41 / 48) * size - sparkPx / 2,
            top: (18.5 / 48) * size - sparkPx / 2,
            width: sparkPx,
            height: sparkPx,
          },
          sparkStyle,
        ]}
      >
        <SvgXml xml={SPARK_XML} width={sparkPx} height={sparkPx} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  spark: {
    position: "absolute",
  },
});
