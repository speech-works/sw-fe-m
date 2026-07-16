import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { easing, useMotion, useTheme } from "../../design-system";

/** A clean superhero mask: broad brow, rounded cheeks, and a raised nose bridge. */
const HOUSING_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="exposure-anim-glow" cx="35%" cy="26%" r="75%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="exposure-anim-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#171420" stop-opacity="0"/>
      <stop offset="1" stop-color="#171420" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="24" fill="currentColor"/>
  <circle cx="24" cy="24" r="24" fill="url(#exposure-anim-glow)"/>
  <circle cx="24" cy="24" r="24" fill="url(#exposure-anim-shade)"/>
  <circle cx="24" cy="24" r="22.9" fill="none" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.2"/>
</svg>`;

const FACE_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path fill="#171420" d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"/>
  <path d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

const HERO_MASK_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M5.4 17.8c6.4-2.3 12.1-2 18.4-.2 6.3-1.8 12-2.1 18.4.2.6 6.2-.9 10.9-4.1 13.2-3.3 2.4-7.3 1.7-10.6-1.9L23.8 25.5l-3.6 3.6c-3.3 3.6-7.3 4.3-10.6 1.9-3.2-2.3-4.7-7-4.1-13.2Z" fill="#B93446" transform="translate(0 1.45)"/>
  <path d="M5.4 16.5c6.4-2.3 12.1-2 18.4-.2 6.3-1.8 12-2.1 18.4.2.6 6.2-.9 10.9-4.1 13.2-3.3 2.4-7.3 1.7-10.6-1.9L23.8 24.2l-3.6 3.6c-3.3 3.6-7.3 4.3-10.6 1.9-3.2-2.3-4.7-7-4.1-13.2Z" fill="#ED1B35"/>
  <path d="M7.5 17.4c5.8-1.6 10.9-1.4 16.3.1 5.4-1.5 10.5-1.7 16.3-.1" fill="none" stroke="#FF6575" stroke-width="1.3" stroke-linecap="round"/>
  <ellipse cx="15.3" cy="22.2" rx="4.8" ry="2.9" transform="rotate(-8 15.3 22.2)" fill="#FFF4D8"/>
  <ellipse cx="32.3" cy="22.2" rx="4.8" ry="2.9" transform="rotate(8 32.3 22.2)" fill="#FFF4D8"/>
</svg>`;

const GLINT_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <path d="M0 -2.6.72-.72 2.6 0 .72.72 0 2.6-.72.72-2.6 0-.72-.72Z" fill="#FFF4D8" transform="translate(37.6 15.4) rotate(12)"/>
</svg>`;

export const AnimatedExposureIcon: React.FC<{
  size?: number;
  housing?: string;
}> = ({ size = 56, housing }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const ready = useSharedValue(0);
  const glint = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(ready);
      cancelAnimation(glint);
      ready.value = 0;
      glint.value = 0;
      return;
    }

    // A compact, confident lift and flash, followed by a long neutral rest.
    ready.value = withRepeat(
      withSequence(
        withDelay(1100, withTiming(1, { duration: 180, easing: easing.out })),
        withTiming(0.64, { duration: 150, easing: easing.inOut }),
        withTiming(1, { duration: 150, easing: easing.out }),
        withDelay(360, withTiming(0, { duration: 340, easing: easing.inOut })),
        withDelay(2320, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
    glint.value = withRepeat(
      withSequence(
        withDelay(1260, withTiming(1, { duration: 120, easing: easing.out })),
        withTiming(0, { duration: 270, easing: easing.inOut }),
        withDelay(2970, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(ready);
      cancelAnimation(glint);
    };
  }, [glint, ready, reduced]);

  const maskLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.05 * ready.value }],
  }));
  const maskScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.02 * ready.value }],
  }));
  const glintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glint.value, [0, 0.3, 1], [0, 0.6, 1]),
    transform: [{ scale: 0.72 + 0.5 * glint.value }],
  }));

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
        <View style={StyleSheet.absoluteFill}>
          <SvgXml xml={FACE_XML} width={size} height={size} />
        </View>
        <Animated.View style={[StyleSheet.absoluteFill, maskLiftStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, maskScaleStyle]}>
            <SvgXml xml={HERO_MASK_XML} width={size} height={size} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, glintStyle]}>
          <SvgXml xml={GLINT_XML} width={size} height={size} />
        </Animated.View>
      </View>
    </View>
  );
};
