import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { easing, useMotion, useTheme } from "../../design-system";

/**
 * Animated Cognitive category icon.
 *
 * A slow head swing carries two closely spaced headphone hits. Each hit expands
 * the cups, nudges the head upward, and flashes pressure marks at both ears.
 * The paired beat then rests so the loop feels musical rather than mechanical.
 */

const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="cognitive-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cognitive-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#cognitive-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#cognitive-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

const FACE_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#171420" d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"/>
  <circle cx="15" cy="22" r="7.5" fill="#FFFFFF"/>
  <circle cx="33" cy="22" r="7.5" fill="#FFFFFF"/>
</svg>`;

const SPIRAL_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M 24 24 A 0.5 0.5 0 0 1 25 24 A 1 1 0 0 1 23 24 A 2 2 0 0 1 27 24 A 3 3 0 0 1 21 24 A 4 4 0 0 1 29 24 A 5 5 0 0 1 19 24 A 6 6 0 0 1 31 24 A 7 7 0 0 1 17 24" fill="none" stroke="#171420" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

const STARS_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M0 -2.9 L0.82 -0.82 L2.9 0 L0.82 0.82 L0 2.9 L-0.82 0.82 L-2.9 0 L-0.82 -0.82 Z" fill="#FFF4D8" opacity="0.95" transform="translate(40.2 9.6) rotate(15)"/>
  <path d="M0 -1.7 L0.5 -0.5 L1.7 0 L0.5 0.5 L0 1.7 L-0.5 0.5 L-1.7 0 L-0.5 -0.5 Z" fill="#FFFFFF" opacity="0.6" transform="translate(33.5 16.2)"/>
</svg>`;

export const AnimatedCognitiveIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // 0 → 1: continuous rotation for hypnotic eyes
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }

    // Spin continuously
    spin.value = withRepeat(
      withTiming(1, { duration: 2400, easing: easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(spin);
    };
  }, [reduced, spin]);

  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-spin.value * 360}deg` }],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const eyeScale = size / 48;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <SvgXml
        xml={HOUSING_XML}
        width={size}
        height={size}
        color={housing ?? colors.surface.inverse}
      />

      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, overflow: "hidden" },
        ]}
      >
        <View
          style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.03 }] }]}
        >
          <View style={StyleSheet.absoluteFill}>
            <SvgXml xml={FACE_XML} width={size} height={size} />
          </View>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: -9 * eyeScale,
                top: -2 * eyeScale,
                width: size,
                height: size,
              },
              leftEyeStyle,
            ]}
          >
            <SvgXml xml={SPIRAL_XML} width={size} height={size} />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 9 * eyeScale,
                top: -2 * eyeScale,
                width: size,
                height: size,
              },
              rightEyeStyle,
            ]}
          >
            <SvgXml xml={SPIRAL_XML} width={size} height={size} />
          </Animated.View>
        </View>
      </View>

      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={STARS_XML} width={size} height={size} />
      </View>
    </View>
  );
};
