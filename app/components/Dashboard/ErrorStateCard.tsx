import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import {
  Text,
  Button,
  Icon,
  icons,
  useTheme,
  useMotion,
  spacing,
  space,
  radius,
  easing,
  mix,
  withAlpha,
} from "../../design-system";

interface ErrorStateCardProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Bespoke ambient loop periods — slow drift, and a ripple that reads as a
 *  signal going out rather than something urgent. */
const FLOAT_PERIOD = 4000;
const RIPPLE_PERIOD = 2600;

const MOTIF_SIZE = 130;

/**
 * The failed-to-load card (reports, trends, recommendations).
 *
 * Rebuilt on tokens. It previously hardcoded twelve colour literals behind a
 * `variant` prop, of which only "dark" was ever passed — so the light half was
 * dead code that also happened to be the app's only defence against light mode,
 * where the card would have rendered a near-black panel on cream. Reading the
 * scheme from `useTheme` deletes both problems.
 *
 * The face is gone; a ripple around a dark glyph carries the "signal lost" idea
 * without one. The distinctive shape — flat header, convex hill overlapping it,
 * motif straddling the seam — is kept, since that's the card's identity.
 */
const ErrorStateCard: React.FC<ErrorStateCardProps> = ({
  title = "Uh oh.",
  message = "Something weird happened.\nKeep calm and try again.",
  onRetry,
  style,
}) => {
  const { colors, elevation } = useTheme();
  const { reduced } = useMotion();

  const cardBg = colors.surface.elevated;
  // An opaque tint rather than a wash: a 12% accentTint over the card is nearly
  // the card, and the header needs to read as its own band in both schemes.
  const headerBg = mix(cardBg, colors.accent.danger, 0.16);

  const float = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      // Nothing here carries meaning, so ambient motion stops entirely. The
      // original looped regardless of the OS preference.
      cancelAnimation(float);
      cancelAnimation(ripple);
      float.value = 0;
      ripple.value = 0;
      return;
    }
    float.value = withRepeat(
      withTiming(1, { duration: FLOAT_PERIOD, easing: easing.loop }),
      -1,
      true,
    );
    ripple.value = withRepeat(
      withTiming(1, { duration: RIPPLE_PERIOD, easing: easing.out }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(float);
      cancelAnimation(ripple);
    };
  }, [reduced, float, ripple]);

  const orbStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * 10 },
      { translateX: float.value * 8 },
    ],
  }));
  const orbStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * -15 },
      { translateX: float.value * -10 },
    ],
  }));

  // Two rings half a period apart, so the signal keeps going out.
  const ringOuter = useAnimatedStyle(() => ({
    transform: [{ scale: 0.55 + ripple.value * 0.65 }],
    opacity: (1 - ripple.value) * 0.4,
  }));
  const ringInner = useAnimatedStyle(() => {
    const p = (ripple.value + 0.5) % 1;
    return {
      transform: [{ scale: 0.55 + p * 0.65 }],
      opacity: (1 - p) * 0.4,
    };
  });

  return (
    <View
      style={[styles.container, { backgroundColor: cardBg }, elevation.e2, style]}
    >
      {/* 1. Flat header band */}
      <View style={[styles.headerBg, { backgroundColor: headerBg }]}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.orb,
              { backgroundColor: withAlpha(colors.accent.danger, 0.2), top: -20, left: -20 },
              orbStyle1,
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              { backgroundColor: withAlpha(colors.accent.danger, 0.3), bottom: -20, right: -10 },
              orbStyle2,
            ]}
          />
        </View>
      </View>

      {/* 2. The overlapping convex hill */}
      <View style={[styles.hillShape, { backgroundColor: cardBg }]} />

      {/* 3. Foreground content */}
      <View style={styles.content}>
        <View style={styles.motifContainer}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: colors.feedback.dangerText },
              ringOuter,
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              { borderColor: colors.feedback.dangerText },
              ringInner,
            ]}
          />
          <View style={[styles.motifDisc, { backgroundColor: colors.accent.danger }]}>
            <Icon name={icons.danger} size={34} color={colors.accentOn.danger} />
          </View>
        </View>

        <Text variant="h2" color="primary" center>
          {title}
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          {message}
        </Text>

        <Button label="Try again" onPress={onRetry} fullWidth={false} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
    position: "relative",
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180, // height of the flat band behind the hill
    overflow: "hidden",
  },
  hillShape: {
    position: "absolute",
    top: 140, // leaves the header 140px, then curves up over it
    left: "-50%", // centres the oversized circle
    width: "200%", // wide enough that the arc reads as a subtle convex hill
    height: 600,
    borderRadius: 1000,
  },
  content: {
    padding: spacing["3xl"],
    alignItems: "center",
    gap: space.titleSub,
    zIndex: 1,
  },
  motifContainer: {
    marginTop: spacing["4xl"],
    marginBottom: spacing.xl,
    height: MOTIF_SIZE,
    width: MOTIF_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: MOTIF_SIZE,
    height: MOTIF_SIZE,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  motifDisc: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    marginBottom: spacing["2xl"],
  },
  // Soft blobs drifting behind the header band.
  orb: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: radius.full,
  },
});

export default React.memo(ErrorStateCard);
