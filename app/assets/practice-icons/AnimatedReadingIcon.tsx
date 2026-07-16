import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { SvgXml, Svg, Defs, ClipPath, Circle, Rect, G } from "react-native-svg";
import { useTheme, easing, useMotion } from "../../design-system";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Animated variant of the Reading category icon.
 * The dark face tilts forward slightly and the glasses lift up,
 * like a reader peering over their spectacles.
 */

// Housing circle (background orb)
const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="reading-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="reading-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#reading-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#reading-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

// The dark face squircle + forehead highlight
const FACE_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <clipPath id="reading-face-clip"><circle cx="24" cy="24" r="24"/></clipPath>
  </defs>
  <g clip-path="url(#reading-face-clip)">
    <path fill="#171420" d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"/>
    <path d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.16" stroke-width="1.3" stroke-linecap="round"/>
  </g>
</svg>`;

// Glasses (circles + bridge + arms) + highlight + stars
const GLASSES_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <clipPath id="reading-glasses-clip"><circle cx="24" cy="24" r="24"/></clipPath>
  </defs>
  <g clip-path="url(#reading-glasses-clip)">
    <g fill="none" stroke="#FFF4D8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="16" cy="22" r="6.1"/>
      <circle cx="32" cy="22" r="6.1"/>
      <path d="M22.1 21.7c1.3-1 2.5-1 3.8 0M9.9 21.5H7M38.1 21.5H41"/>
    </g>
    <path d="M12.2 18.7c1.9-2.2 5.7-2.8 8.1-.8" fill="none" stroke="#D89B2B" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</svg>`;

// Stars (decorative, stay static)
const STARS_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8" opacity="0.95" transform="translate(13 5.6) rotate(-14)"/>
  <path d="M0 -1.7 L0.5 -0.5 L1.7 0 L0.5 0.5 L0 1.7 L-0.5 0.5 L-1.7 0 L-0.5 -0.5 Z" fill="#FFFFFF" opacity="0.6" transform="translate(36.5 7.2)"/>
</svg>`;

export const AnimatedReadingIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // 0 → 1: glare sweep across lenses
  const shine = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    // Glare fires periodically — sweeps across lenses
    shine.value = withRepeat(
      withSequence(
        withDelay(1500, withTiming(1, { duration: 400, easing: easing.out })),
        withDelay(5000, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [reduced, shine]);

  // Glare bar x position — sweeps left to right across both lens circles
  // Expanding range from -10 to 60 to ensure the skewed shape fully enters and exits
  const glareProps = useAnimatedProps(() => ({
    x: interpolate(shine.value, [0, 1], [-10, 60]) as number,
  }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {/* Housing orb — stays completely static */}
      <SvgXml
        xml={HOUSING_XML}
        width={size}
        height={size}
        color={housing ?? colors.surface.inverse}
      />

      {/* Circular mask — clips all animated content inside the orb */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            overflow: "hidden",
          },
        ]}
      >
        {/* Face — static */}
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={FACE_XML} width={size} height={size} />
        </View>

        {/* Glasses — static */}
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={GLASSES_XML} width={size} height={size} />
        </View>

        {/* Stars — stay static */}
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={STARS_XML} width={size} height={size} />
        </View>

        {/* Glare sweep across both lens circles */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size} viewBox="0 0 48 48">
            <Defs>
              <ClipPath id="reading-left-lens">
                <Circle cx="16" cy="22" r="5" />
              </ClipPath>
              <ClipPath id="reading-right-lens">
                <Circle cx="32" cy="22" r="5" />
              </ClipPath>
            </Defs>
            <G clipPath="url(#reading-left-lens)">
              <AnimatedRect
                animatedProps={glareProps}
                y="14"
                width="8"
                height="16"
                fill="#FFFFFF"
                opacity="0.9"
                transform="skewX(-20)"
              />
            </G>
            <G clipPath="url(#reading-right-lens)">
              <AnimatedRect
                animatedProps={glareProps}
                y="14"
                width="8"
                height="16"
                fill="#FFFFFF"
                opacity="0.9"
                transform="skewX(-20)"
              />
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
};
