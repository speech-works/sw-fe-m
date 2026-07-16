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
import { SvgXml, Svg, Defs, ClipPath, Ellipse, Line, G } from "react-native-svg";
import { useTheme, easing, useMotion } from "../../design-system";

/**
 * Animated variant of the Mirror Work practice icon: a sharp shine sweeps across the mirror glass.
 */

const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="mirror-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mirror-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#mirror-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#mirror-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

const MIRROR_BASE_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <g transform="translate(1.8 2.4)" fill="#A03F52">
    <path d="M18.2 5.8 24 1.8l5.8 4-2.1 3H20.3l-2.1-3Z"/>
    <ellipse cx="24" cy="20.4" rx="13.8" ry="16.1"/>
    <path d="M20.2 34.7h7.6v9.1c0 2.2-1.7 4-3.8 4s-3.8-1.8-3.8-4v-9.1Z"/>
  </g>
  <path d="m17.6 6.3 2-4.3L24 5.1 28.4 2l2 4.3-2.4 3.4h-8l-2.4-3.4Z" fill="#FFF4D8"/>
  <circle cx="24" cy="5.2" r="1.7" fill="#A9F0D1"/>
  <ellipse cx="24" cy="20.4" rx="13.8" ry="16.1" fill="#FFF4D8"/>
  <ellipse cx="24" cy="20.4" rx="10.4" ry="12.7" fill="#A03F52"/>
  <ellipse cx="24" cy="19.2" rx="8.5" ry="10.8" fill="#CDEFE4"/>
</svg>`;

const MIRROR_HIGHLIGHT_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M18.2 15.8c2.2-3.4 6-5.1 9.6-4.1" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>
  <path d="M20.2 34.7h7.6v9.1c0 2.2-1.7 4-3.8 4s-3.8-1.8-3.8-4v-9.1Z" fill="#FFF4D8"/>
  <path d="M21.8 36.7h4.4M21.8 40.1h4.4" stroke="#A03F52" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="44.1" r="1.4" fill="#A9F0D1"/>
  <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8" opacity="0.95" transform="translate(40.1 10.2) rotate(15)"/>
  <path d="M0 -1.7 L0.5 -0.5 L1.7 0 L0.5 0.5 L0 1.7 L-0.5 0.5 L-1.7 0 L-0.5 -0.5 Z" fill="#FFFFFF" opacity="0.6" transform="translate(7.8 34.7)"/>
</svg>`;

const AnimatedLine = Animated.createAnimatedComponent(Line);

export const AnimatedMirrorWorkIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // 0 to 1 loop for the shine
  const shine = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    
    shine.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(1, { duration: 600, easing: easing.inOut })),
        withDelay(3000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );
  }, [reduced, shine]);

  const animatedProps = useAnimatedProps(() => {
    // Sweep diagonally across the ellipse: 
    // from top-left (approx x: 10, y: 5) to bottom-right (approx x: 38, y: 35)
    const offset = interpolate(shine.value, [0, 1], [-10, 40]);
    return {
      x1: offset,
      y1: offset - 20, // line goes diagonally down-left
      x2: offset + 20,
      y2: offset + 20,
    };
  });

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <SvgXml
        xml={HOUSING_XML}
        width={size}
        height={size}
        color={housing ?? colors.surface.inverse}
      />
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={MIRROR_BASE_XML} width={size} height={size} />
      </View>
      
      {/* Animated Shine Masked */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Defs>
            <ClipPath id="glass">
              <Ellipse cx="24" cy="19.2" rx="8.5" ry="10.8" />
            </ClipPath>
          </Defs>
          <G clipPath="url(#glass)">
            <AnimatedLine
              animatedProps={animatedProps}
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="square"
              opacity="0.8"
            />
            {/* A second, thinner line following closely for a double-shine effect */}
            <AnimatedLine
              animatedProps={useAnimatedProps(() => {
                const offset = interpolate(shine.value, [0, 1], [-10, 40]) - 4;
                return {
                  x1: offset,
                  y1: offset - 20,
                  x2: offset + 20,
                  y2: offset + 20,
                };
              })}
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="square"
              opacity="0.9"
            />
          </G>
        </Svg>
      </View>
      
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={MIRROR_HIGHLIGHT_XML} width={size} height={size} />
      </View>
    </View>
  );
};
