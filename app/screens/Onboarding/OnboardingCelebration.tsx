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
import Svg, { Defs, Path, RadialGradient, Stop } from "react-native-svg";
import CheerHero from "../../assets/celebration/cheerHero";
import {
  Text,
  useTheme,
  easing,
  spring,
  duration,
  spacing,
  space,
  radius,
  withAlpha,
} from "../../design-system";

/**
 * The onboarding-completion celebration — a rare, first-time moment, so it
 * earns real delight (the one place the frequency test says "yes, be playful").
 *
 * The impact comes from LAYERED LIGHT, the way an achievement screen does it
 * (Duolingo's "Legendary" card): a slow rotating god-ray burst, a one-shot
 * shockwave halo, and twinkling sparkles — behind the app's own cast (reading ·
 * fun · cognitive · exposure), who pop in one by one and drift.
 *
 * Craft rules held throughout:
 *  - transform + opacity ONLY (GPU; no layout/paint).
 *  - never from scale(0) — pops start at 0.5 with opacity.
 *  - celebration spring = `spring.bouncy`; ambient loops = `easing.loop`.
 *  - reduced motion is a real branch: static light, fade-in cast, no rotation,
 *    no shockwave, no confetti, no tap-bounce. Comprehension kept, motion gone.
 */

const HERO_SIZE = 120;
const STAGE = 224; // stage height that the light layers center within
const BURST_PERIOD = 22000; // one slow god-ray revolution

// ── God-ray sunburst geometry (built once; Math is fine in app code) ────────
const RAYS = 12;
const RAY_PATH = (() => {
  const cx = 100, cy = 100, rInner = 12, rOuter = 100;
  const half = (Math.PI / RAYS) * 0.42;
  let d = "";
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const ax = cx + Math.cos(a) * rInner;
    const ay = cy + Math.sin(a) * rInner;
    const x1 = cx + Math.cos(a - half) * rOuter;
    const y1 = cy + Math.sin(a - half) * rOuter;
    const x2 = cx + Math.cos(a + half) * rOuter;
    const y2 = cy + Math.sin(a + half) * rOuter;
    d += `M${ax.toFixed(1)} ${ay.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z `;
  }
  return d.trim();
})();

/** A 4-point twinkle star. */
const SPARK_PATH =
  "M12 0 C13.2 8 16 10.8 24 12 C16 13.2 13.2 16 12 24 C10.8 16 8 13.2 0 12 C8 10.8 10.8 8 12 0 Z";

/** Rotating god-rays behind the cast. The single biggest source of impact. */
const Sunburst: React.FC<{ reduced: boolean; color: string }> = ({
  reduced,
  color,
}) => {
  const rot = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(
      withTiming(1, { duration: BURST_PERIOD, easing: easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 2800, easing: easing.loop }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(rot);
      cancelAnimation(pulse);
    };
  }, [reduced, rot, pulse]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.32 };
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.34, 0.52]),
      transform: [
        { rotate: `${rot.value * 360}deg` },
        { scale: interpolate(pulse.value, [0, 1], [0.96, 1.04]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.burst, style]} pointerEvents="none">
      <Svg width={300} height={300} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.5" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={RAY_PATH} fill="url(#ray)" />
      </Svg>
    </Animated.View>
  );
};

/** One-shot shockwave ring — expands and fades on mount. */
const HaloRing: React.FC<{ color: string }> = ({ color }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      120,
      withTiming(1, { duration: 720, easing: easing.out }),
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.4, 1.5]) }],
  }));
  return (
    <Animated.View
      style={[styles.halo, { borderColor: color }, style]}
      pointerEvents="none"
    />
  );
};

/** A twinkling sparkle at a fixed offset from the stage centre. */
const Sparkle: React.FC<{
  index: number;
  reduced: boolean;
  x: number;
  y: number;
  size: number;
  color: string;
}> = ({ index, reduced, x, y, size, color }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(
      300 + index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 620, easing: easing.out }),
          withTiming(0, { duration: 760, easing: easing.loop }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [reduced, index, t]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.5 };
    return {
      opacity: interpolate(t.value, [0, 0.5, 1], [0, 1, 0]),
      transform: [{ scale: interpolate(t.value, [0, 0.5, 1], [0.3, 1, 0.3]) }],
    };
  });

  return (
    <Animated.View
      style={[styles.sparkle, { left: x, top: y }, style]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={SPARK_PATH} fill={color} />
      </Svg>
    </Animated.View>
  );
};

/** The single celebration hero — pops in over the burst, floats, tap to bounce. */
const Hero: React.FC<{ reduced: boolean; color: string }> = ({
  reduced,
  color,
}) => {
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
    const delay = 200; // enters just after the burst opens
    if (reduced) {
      pop.value = withDelay(delay, withTiming(1, { duration: duration.reveal }));
      return;
    }
    pop.value = withDelay(delay, withSpring(1, spring.bouncy));
    floatV.value = withDelay(
      delay + 320,
      withRepeat(
        withTiming(1, { duration: 3000, easing: easing.loop }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(floatV);
  }, [reduced, pop, floatV]);

  const style = useAnimatedStyle(() => {
    if (reduced) return { opacity: pop.value };
    const scale = 0.55 + pop.value * 0.45 + tap.value * 0.14;
    const drift = interpolate(floatV.value, [0, 1], [-5, 5]);
    return {
      opacity: Math.min(1, pop.value * 1.4),
      transform: [{ translateY: drift }, { scale }],
    };
  });

  return (
    <Pressable onPress={onPoke} accessibilityRole="image">
      <Animated.View style={style}>
        <CheerHero size={HERO_SIZE} color={color} />
      </Animated.View>
    </Pressable>
  );
};

/** One confetti chip — one-shot fall + drift + spin, then fade. */
const ConfettiPiece: React.FC<{ index: number; color: string }> = ({
  index,
  color,
}) => {
  const t = useSharedValue(0);
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

const Confetti: React.FC<{ palette: string[] }> = ({ palette }) => (
  <View style={styles.confettiLayer} pointerEvents="none">
    {Array.from({ length: 18 }).map((_, i) => (
      <ConfettiPiece key={i} index={i} color={palette[i % palette.length]} />
    ))}
  </View>
);

/** "Let's go!" speech bubble — lands with a bounce, then a tiny idle wiggle. */
const CheerBubble: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    const delay = 520; // lands just after the hero settles
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

const OnboardingCelebration: React.FC = () => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const gold = colors.action.primary;
  const palette = [
    colors.accent.info,
    colors.accent.warning,
    colors.accent.danger,
    colors.accent.purple,
  ];

  // Sparkles at fixed offsets from the stage centre (x≈150, y≈110).
  const sparkles = [
    { x: 40, y: 44, size: 18, color: gold },
    { x: 250, y: 60, size: 22, color: colors.accent.warning },
    { x: 70, y: 150, size: 14, color: colors.accent.info },
    { x: 236, y: 150, size: 16, color: colors.accent.purple },
    { x: 150, y: 24, size: 20, color: gold },
    { x: 300, y: 120, size: 12, color: colors.accent.danger },
  ];

  return (
    <View style={styles.wrap}>
      <Sunburst reduced={reduced} color={gold} />
      {!reduced ? <HaloRing color={withAlpha(gold, 0.7)} /> : null}
      {sparkles.map((s, i) => (
        <Sparkle key={i} index={i} reduced={reduced} {...s} />
      ))}
      {!reduced ? <Confetti palette={palette} /> : null}

      <CheerBubble reduced={reduced} />
      <Hero reduced={reduced} color={gold} />
    </View>
  );
};

export default OnboardingCelebration;

const styles = StyleSheet.create({
  wrap: {
    height: STAGE,
    alignItems: "center",
    justifyContent: "center",
    gap: space.groupGap,
    marginVertical: spacing.sm,
  },
  burst: {
    position: "absolute",
    top: (STAGE - 300) / 2,
    alignSelf: "center",
  },
  halo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: radius.full,
    borderWidth: 3,
    alignSelf: "center",
    top: (STAGE - 150) / 2,
  },
  sparkle: {
    position: "absolute",
  },
  confettiLayer: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    height: 1,
  },
  confetti: {
    position: "absolute",
    borderRadius: 2,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderBottomLeftRadius: radius.xs,
  },
});
