import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import {
  SvgXml,
  Svg,
  Defs,
  ClipPath,
  Path,
  Rect,
  G,
} from "react-native-svg";
import { useTheme, easing, useMotion } from "../../design-system";

/**
 * Animated variant of the Fun category icon.
 * A sharp shine glare sweeps top-to-bottom across both 3D-glasses lenses.
 */

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Housing circle (background orb + gradients)
const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="fun-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fun-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#fun-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#fun-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

// Everything except the lenses (face, frame, stars)
const BASE_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <clipPath id="fun-base-clip"><circle cx="24" cy="24" r="24"/></clipPath>
  </defs>
  <g clip-path="url(#fun-base-clip)">
    <path fill="#171420" d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"/>
    <path d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1.3" stroke-linecap="round"/>
    <path fill="#FFF4D8" d="M7.5 16.5h33v11.4c0 1.3-1 2.3-2.3 2.3h-10c-1.2 0-2.2-.9-2.3-2.1l-.3-3.5h-3.2l-.3 3.5a2.3 2.3 0 0 1-2.3 2.1h-10a2.3 2.3 0 0 1-2.3-2.3V16.5Z"/>
    <path fill="#E74D60" d="M10.7 19.3h10.1l-.6 7.7h-8.9l-.6-7.7Z"/>
    <path fill="#4677E8" d="M27.2 19.3h10.1l-.6 7.7h-8.9l-.6-7.7Z"/>
    <path d="M12.2 20.4h5.6" stroke="#FF9EA8" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M29 20.4h5.6" stroke="#84A7FF" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8" opacity="0.95" transform="translate(36.8 7) rotate(12)"/>
    <path d="M0 -1.7 L0.5 -0.5 L1.7 0 L0.5 0.5 L0 1.7 L-0.5 0.5 L-1.7 0 L-0.5 -0.5 Z" fill="#FFFFFF" opacity="0.6" transform="translate(11 7.6)"/>
  </g>
</svg>`;

export const AnimatedFunIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const shine = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    shine.value = withRepeat(
      withSequence(
        withDelay(600, withTiming(1, { duration: 250, easing: easing.out })),
        withDelay(3500, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [reduced, shine]);

  // Animate the y position of two Rects that serve as the glare bars.
  // Red lens spans roughly y 19.3 → 27.  Blue lens same y range.
  // We sweep from y=17 (above lens) down to y=28 (below lens).
  const leftGlareProps = useAnimatedProps(() => ({
    y: interpolate(shine.value, [0, 1], [17, 28]) as number,
  }));

  const rightGlareProps = useAnimatedProps(() => ({
    y: interpolate(shine.value, [0, 1], [17, 28]) as number,
  }));

  // Trailing secondary shine — offset slightly behind the main bar
  const leftTrailProps = useAnimatedProps(() => ({
    y: interpolate(shine.value, [0, 1], [16, 27]) as number,
    opacity: interpolate(shine.value, [0, 0.3, 0.7, 1], [0, 0.9, 0.5, 0]) as number,
  }));

  const rightTrailProps = useAnimatedProps(() => ({
    y: interpolate(shine.value, [0, 1], [16, 27]) as number,
    opacity: interpolate(shine.value, [0, 0.3, 0.7, 1], [0, 0.9, 0.5, 0]) as number,
  }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Housing orb */}
      <SvgXml
        xml={HOUSING_XML}
        width={size}
        height={size}
        color={housing ?? colors.surface.inverse}
      />

      {/* Face, frame, lenses, stars */}
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={BASE_XML} width={size} height={size} />
      </View>

      {/* Animated glare overlay — clipped to each lens shape */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Defs>
            <ClipPath id="left-lens-clip">
              <Path d="M10.7 19.3h10.1l-.6 7.7h-8.9l-.6-7.7Z" />
            </ClipPath>
            <ClipPath id="right-lens-clip">
              <Path d="M27.2 19.3h10.1l-.6 7.7h-8.9l-.6-7.7Z" />
            </ClipPath>
          </Defs>

          {/* Left (red) lens glare */}
          <G clipPath="url(#left-lens-clip)">
            <AnimatedRect
              animatedProps={leftGlareProps}
              x="9"
              width="13"
              height="1.5"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <AnimatedRect
              animatedProps={leftTrailProps}
              x="9"
              width="13"
              height="0.8"
              fill="#FFFFFF"
            />
          </G>

          {/* Right (blue) lens glare */}
          <G clipPath="url(#right-lens-clip)">
            <AnimatedRect
              animatedProps={rightGlareProps}
              x="26"
              width="13"
              height="1.5"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <AnimatedRect
              animatedProps={rightTrailProps}
              x="26"
              width="13"
              height="0.8"
              fill="#FFFFFF"
            />
          </G>
        </Svg>
      </View>
    </View>
  );
};
