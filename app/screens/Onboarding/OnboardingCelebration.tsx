import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimatedFunIcon } from "../../assets/practice-icons/AnimatedFunIcon";
import { AnimatedReadingIcon } from "../../assets/practice-icons/AnimatedReadingIcon";
import { AnimatedCognitiveIcon } from "../../assets/practice-icons/AnimatedCognitiveIcon";
import { AnimatedExposureIcon } from "../../assets/practice-icons/AnimatedExposureIcon";
import {
  Text,
  useTheme,
  easing,
  spring,
  duration,
  spacing,
  space,
  radius,
} from "../../design-system";

/**
 * The onboarding-completion celebration — a rare, first-time moment, so it
 * earns real delight (the one place the frequency test says "yes, be playful").
 *
 * The four practice characters (reading · fun · cognitive · exposure) are the
 * app's own cast, so we introduce them here: they pop in one after another with
 * a bouncy settle, drift on gentle out-of-phase loops, a "Let's go!" bubble
 * lands, and a one-shot confetti burst goes off overhead.
 *
 * Craft rules held throughout:
 *  - transform + opacity ONLY (GPU; no layout/paint).
 *  - never from scale(0) — the pop starts at 0.5 with opacity, so nothing
 *    appears out of nothing.
 *  - celebration spring = `spring.bouncy` (a little overshoot), used ONLY here.
 *  - reduced motion is a first-class branch: fade in, no pop, no float, no
 *    confetti — comprehension kept, movement dropped.
 */

const CAST = [
  { key: "reading", accent: "info" as const, Comp: AnimatedReadingIcon, dy: 6 },
  { key: "fun", accent: "warning" as const, Comp: AnimatedFunIcon, dy: -8 },
  { key: "cognitive", accent: "danger" as const, Comp: AnimatedCognitiveIcon, dy: -2 },
  { key: "exposure", accent: "purple" as const, Comp: AnimatedExposureIcon, dy: 8 },
];

const CHAR_SIZE = 62;
/** Slightly different per character so the drift never marches in unison. */
const FLOAT_PERIODS = [2600, 3100, 2400, 2900];

const CastCharacter: React.FC<{
  index: number;
  reduced: boolean;
  accent: "info" | "warning" | "danger" | "purple";
  restY: number;
  Comp: React.FC<{ size?: number; housing?: string }>;
}> = ({ index, reduced, accent, restY, Comp }) => {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  const floatV = useSharedValue(0);
  // Tap-to-bounce — the "interactive" bit. A quick squash toward the finger,
  // then a bouncy settle. Additive to the ambient scale so it never fights it.
  const tap = useSharedValue(0);

  const onPoke = () => {
    if (reduced) return;
    tap.value = withSequence(
      withTiming(1, { duration: duration.fast, easing: easing.out }),
      withSpring(0, spring.bouncy),
    );
  };

  useEffect(() => {
    const delay = 150 + index * 90; // staggered entrance
    if (reduced) {
      pop.value = withDelay(delay, withTiming(1, { duration: duration.reveal }));
      return;
    }
    pop.value = withDelay(delay, withSpring(1, spring.bouncy));
    // Ambient drift begins after the pop has mostly settled.
    floatV.value = withDelay(
      delay + 260,
      withRepeat(
        withTiming(1, { duration: FLOAT_PERIODS[index], easing: easing.loop }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(floatV);
  }, [reduced, index, pop, floatV]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: pop.value };
    const scale = 0.5 + pop.value * 0.5 + tap.value * 0.22;
    const drift = interpolate(floatV.value, [0, 1], [restY - 5, restY + 5]);
    return {
      opacity: Math.min(1, pop.value * 1.4),
      transform: [{ translateY: drift }, { scale }],
    };
  });

  return (
    <Pressable onPress={onPoke} accessibilityRole="image">
      <Animated.View style={style}>
        <Comp size={CHAR_SIZE} housing={colors.accent[accent]} />
      </Animated.View>
    </Pressable>
  );
};

/** A single confetti chip — one-shot fall + drift + spin, then fade. */
const ConfettiPiece: React.FC<{ index: number; color: string }> = ({
  index,
  color,
}) => {
  const t = useSharedValue(0);
  // Deterministic spread (no Math.random): fan the chips across the width.
  const startX = -140 + (index * 41) % 280;
  const dx = ((index % 5) - 2) * 26;
  const spin = index % 2 === 0 ? 300 : -260;
  const size = 7 + (index % 3) * 3;

  useEffect(() => {
    t.value = withDelay(
      (index % 6) * 55,
      withTiming(1, { duration: 1100 + (index % 4) * 160, easing: easing.out }),
    );
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.8, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: startX + dx * t.value },
      { translateY: -30 + t.value * 240 },
      { rotate: `${spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { width: size, height: size * 1.6, backgroundColor: color },
        style,
      ]}
    />
  );
};

const Confetti: React.FC = () => {
  const { colors } = useTheme();
  const palette = [
    colors.accent.info,
    colors.accent.warning,
    colors.accent.danger,
    colors.accent.purple,
  ];
  return (
    <View style={styles.confettiLayer} pointerEvents="none">
      {Array.from({ length: 18 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} color={palette[i % palette.length]} />
      ))}
    </View>
  );
};

/** "Let's go!" speech bubble — lands with a bounce, then a tiny idle wiggle. */
const CheerBubble: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    const delay = 150 + CAST.length * 90 + 120;
    if (reduced) {
      pop.value = withDelay(delay, withTiming(1, { duration: duration.reveal }));
      return;
    }
    pop.value = withDelay(delay, withSpring(1, spring.bouncy));
    wiggle.value = withDelay(
      delay + 300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: easing.loop }),
          withTiming(-1, { duration: 900, easing: easing.loop }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(wiggle);
  }, [reduced, pop, wiggle]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: pop.value };
    return {
      opacity: Math.min(1, pop.value * 1.4),
      transform: [
        { scale: 0.6 + pop.value * 0.4 },
        { rotate: `${wiggle.value * 2.5}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.bubble, { backgroundColor: colors.accent.warning }, style]}
    >
      <Text variant="label" color={colors.accentOn.warning}>
        Let&apos;s go!
      </Text>
    </Animated.View>
  );
};

/** The whole celebration flourish — cast band + bubble + confetti. */
const OnboardingCelebration: React.FC = () => {
  const reduced = useReducedMotion();
  return (
    <View style={styles.wrap}>
      {!reduced ? <Confetti /> : null}
      <CheerBubble reduced={reduced} />
      <View style={styles.castRow}>
        {CAST.map((c, i) => (
          <CastCharacter
            key={c.key}
            index={i}
            reduced={reduced}
            accent={c.accent}
            restY={c.dy}
            Comp={c.Comp}
          />
        ))}
      </View>
    </View>
  );
};

export default OnboardingCelebration;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: space.groupGap,
    marginVertical: spacing.lg,
  },
  confettiLayer: {
    position: "absolute",
    top: -20,
    left: 0,
    right: 0,
    alignItems: "center",
    height: 1,
  },
  confetti: {
    position: "absolute",
    borderRadius: 2,
  },
  castRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderBottomLeftRadius: radius.xs,
  },
});
