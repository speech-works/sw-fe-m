import React, { useEffect } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  type SharedValue,
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
import Svg, { Path } from "react-native-svg";
import { UserAvatar } from "../../components/UserAvatar";
import { CelebrationLight } from "../../components/CelebrationLight";
import { DEFAULT_MANIFEST, type AvatarManifest } from "../../types/avatar";
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

// The avatar renders in a -8..56 viewBox (an 8-unit bleed for props like the
// flag), and its disc is 0.75 × size — so 160 gives a ~120px disc plus room
// for the summit flag to fly past the edge.
const HERO_SIZE = 160;
const STAGE = 286; // stage height that the light layers center within
// (232 before the caption block was added under the hero)

/**
 * The hero DRESSES ITSELF: bare, then the hat, then the camera.
 *
 * Those two are the Seeker kit (`STAGE_KITS[0]`), which every account owns from
 * the first minute. The screen used to show them already worn, which told
 * nobody anything — a hat on a drawing is just a drawing. Putting them on, one
 * at a time, with their names underneath, is the whole point: it says these are
 * PIECES, they go on, and by implication they come off.
 *
 * The heart glasses the hero used to wear are gone. They are free wardrobe
 * rather than Seeker kit, and with the captions naming two items, a third
 * unnamed one on the same face muddies the sentence.
 */
const HERO_BASE: AvatarManifest = {
  ...DEFAULT_MANIFEST,
  parts: { ...DEFAULT_MANIFEST.parts, face: "face.joy" },
};
const HERO_HAT: AvatarManifest = {
  ...HERO_BASE,
  parts: { ...HERO_BASE.parts, headgear: "headgear.tourist" },
};
const HERO_FULL: AvatarManifest = {
  ...HERO_HAT,
  parts: { ...HERO_HAT.parts, prop: "prop.camera" },
};

/**
 * One linear clock for the whole sequence, 0 to 1.
 *
 * Every beat below is a fraction of it rather than its own delayed animation,
 * so the hat, the camera, the four captions and the speech bubble physically
 * cannot drift apart. Times: hat at 1.0s, camera at 2.1s, bubble at 3.2s.
 */
const SEQ_MS = 4600;
const HAT_IN = [0.217, 0.283] as const;
const CAM_IN = [0.457, 0.522] as const;
const BUB_IN = [0.696, 0.761] as const;
/** Caption swap points, one per beat. */
const CAP = [0.217, 0.24, 0.457, 0.48, 0.696, 0.72] as const;

/** A 4-point twinkle star. */
const SPARK_PATH =
  "M12 0 C13.2 8 16 10.8 24 12 C16 13.2 13.2 16 12 24 C10.8 16 8 13.2 0 12 C8 10.8 10.8 8 12 0 Z";

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
    // Identity transform, not omission — see the note on Sunburst's style.
    if (reduced) return { opacity: 0.5, transform: [{ scale: 1 }] };
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
const Hero: React.FC<{ reduced: boolean; seq: SharedValue<number> }> = ({
  reduced,
  seq,
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
    // Identity transform, not omission — see the note on Sunburst's style.
    if (reduced) {
      return { opacity: pop.value, transform: [{ translateY: 0 }, { scale: 1 }] };
    }
    const scale = 0.55 + pop.value * 0.45 + tap.value * 0.14;
    const drift = interpolate(floatV.value, [0, 1], [-5, 5]);
    return {
      opacity: Math.min(1, pop.value * 1.4),
      transform: [{ translateY: drift }, { scale }],
    };
  });

  // Cross-fades rather than per-part animation: `UserAvatar` draws a whole
  // manifest, so three stacked copies is both simpler and impossible to get
  // half-drawn. Identity transforms in every branch, as everywhere here.
  const hatStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ translateY: 0 }] };
    const v = interpolate(seq.value, [HAT_IN[0], HAT_IN[1]], [0, 1], Extrapolation.CLAMP);
    return { opacity: v, transform: [{ translateY: (1 - v) * -7 }] };
  });
  const camStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: 1, transform: [{ translateY: 0 }] };
    const v = interpolate(seq.value, [CAM_IN[0], CAM_IN[1]], [0, 1], Extrapolation.CLAMP);
    return { opacity: v, transform: [{ translateY: (1 - v) * 6 }] };
  });

  return (
    <Pressable onPress={onPoke} accessibilityRole="image">
      <Animated.View style={style}>
        <View style={styles.heroBox}>
          <UserAvatar
            manifest={HERO_BASE}
            size={HERO_SIZE}
            animate={false}
            accessibilityLabel="Your character"
          />
          <Animated.View style={[styles.heroLayer, hatStyle]} pointerEvents="none">
            <UserAvatar manifest={HERO_HAT} size={HERO_SIZE} animate={false} />
          </Animated.View>
          <Animated.View style={[styles.heroLayer, camStyle]} pointerEvents="none">
            <UserAvatar manifest={HERO_FULL} size={HERO_SIZE} animate={false} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

/**
 * The four lines under the hero, stacked so the block never changes height
 * mid-sequence. Only one is ever visible; the last one is written to stand on
 * its own, because it is the one that stays on screen and most people will
 * never see the three before it.
 */
const Caption: React.FC<{ reduced: boolean; seq: SharedValue<number> }> = ({
  reduced,
  seq,
}) => {
  const s1 = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0 };
    return {
      opacity: interpolate(seq.value, [CAP[0], CAP[1]], [1, 0], Extrapolation.CLAMP),
    };
  });
  const s2 = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0 };
    return {
      opacity: interpolate(
        seq.value,
        [CAP[0], CAP[1], CAP[2], CAP[3]],
        [0, 1, 1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });
  const s3 = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0 };
    return {
      opacity: interpolate(
        seq.value,
        [CAP[2], CAP[3], CAP[4], CAP[5]],
        [0, 1, 1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });
  const s4 = useAnimatedStyle(() => {
    // The one that stays. Under reduced motion it is the only one shown.
    if (reduced) return { opacity: 1 };
    return {
      opacity: interpolate(seq.value, [CAP[4], CAP[5]], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={styles.caps}>
      <Animated.View style={[styles.cap, s1]}>
        <Text variant="bodySm" color="secondary" center>
          Meet your character
        </Text>
      </Animated.View>
      <Animated.View style={[styles.cap, s2]}>
        <Text variant="bodySm" color="secondary" center>
          A sun hat
        </Text>
      </Animated.View>
      <Animated.View style={[styles.cap, s3]}>
        <Text variant="bodySm" color="secondary" center>
          and a camera
        </Text>
      </Animated.View>
      <Animated.View style={[styles.cap, s4]}>
        <Text variant="bodySm" color="secondary" center>
          Your sun hat and camera are already yours.
        </Text>
      </Animated.View>
    </View>
  );
};

// Full-screen confetti — chips travel the WHOLE display, entering above the top
// edge and falling clear past the bottom. Distances are window-relative, so the
// end point is always beyond the bottom of whatever device it runs on.
const CONFETTI_COUNT = 30;

/** One confetti chip — a one-shot fall from above the screen to past its bottom,
 *  with sideways drift and spin. */
const ConfettiPiece: React.FC<{
  index: number;
  color: string;
  screenW: number;
  screenH: number;
}> = ({ index, color, screenW, screenH }) => {
  const t = useSharedValue(0);
  // Spread evenly across the full width, with a little deterministic jitter.
  const startX = (index / CONFETTI_COUNT) * (screenW - 16) + (((index * 53) % 60) - 30);
  const dx = ((index % 5) - 2) * 30; // gentle sideways drift as it falls
  const spin = index % 2 === 0 ? 420 : -360;
  const size = 7 + (index % 3) * 3;
  const startY = -40 - (index % 5) * 24; // staggered just above the top edge
  const endY = screenH + 100; // clears the bottom on THIS device

  useEffect(() => {
    t.value = withDelay(
      (index % 8) * 90,
      withTiming(1, {
        duration: 2400 + (index % 5) * 260,
        easing: easing.linear,
      }),
    );
    return () => cancelAnimation(t);
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.05, 0.95, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: dx * t.value },
      { translateY: interpolate(t.value, [0, 1], [startY, endY]) },
      { rotate: `${spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { left: startX, width: size, height: size * 1.6, backgroundColor: color },
        style,
      ]}
    />
  );
};

/**
 * Full-screen confetti rain. Mounted at the SCREEN root (not inside the centred
 * stage), so it spans the whole display: chips enter above the top edge and fall
 * clear past the bottom on any device height. Reduced motion → nothing at all.
 */
export const CelebrationConfetti: React.FC = () => {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  if (reduced) return null;
  const palette = [
    colors.accent.info,
    colors.accent.warning,
    colors.accent.danger,
    colors.accent.purple,
    colors.action.primary,
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece
          key={i}
          index={i}
          color={palette[i % palette.length]}
          screenW={width}
          screenH={height}
        />
      ))}
    </View>
  );
};

/** "Let's go!" speech bubble. Lands AFTER the gear, on the shared clock: it is
 *  the payoff to the dressing, so arriving first would step on it. */
const CheerBubble: React.FC<{ reduced: boolean; seq: SharedValue<number> }> = ({
  reduced,
  seq,
}) => {
  const { colors } = useTheme();
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    wiggle.value = withDelay(
      SEQ_MS * BUB_IN[1] + 300,
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
  }, [reduced, wiggle]);

  const style = useAnimatedStyle(() => {
    // Identity transform, not omission — see the note on Sunburst's style.
    if (reduced) {
      return { opacity: 1, transform: [{ scale: 1 }, { rotate: "0deg" }] };
    }
    const v = interpolate(seq.value, [BUB_IN[0], BUB_IN[1]], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: v,
      transform: [{ scale: 0.6 + v * 0.4 }, { rotate: `${wiggle.value * 2.5}deg` }],
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

  /** The one clock. Starts after the hero has popped in, so the character is
   *  present before it starts putting things on. */
  const seq = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      seq.value = 1;
      return;
    }
    seq.value = withDelay(
      600,
      withTiming(1, { duration: SEQ_MS, easing: easing.linear }),
    );
    return () => cancelAnimation(seq);
  }, [reduced, seq]);

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
      {/* Rays 300, ring 150, both centred on the stage — the same numbers this
          screen has always used, now shared with the level-up takeover. */}
      <CelebrationLight
        reduced={reduced}
        color={gold}
        burstSize={300}
        haloSize={150}
        gradientId="onboardingRay"
      />
      {sparkles.map((s, i) => (
        <Sparkle key={i} index={i} reduced={reduced} {...s} />
      ))}

      <CheerBubble reduced={reduced} seq={seq} />
      <Hero reduced={reduced} seq={seq} />
      <Caption reduced={reduced} seq={seq} />
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
  heroBox: {
    width: HERO_SIZE,
    height: HERO_SIZE,
  },
  heroLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Fixed height so swapping lines never nudges the layout. Two lines' worth,
   *  because the resting line is a full sentence. */
  caps: {
    height: 38,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  cap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  sparkle: {
    position: "absolute",
  },
  confetti: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    borderBottomLeftRadius: radius.xs,
  },
});
