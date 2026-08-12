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
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { easing, radius, withAlpha } from "../../design-system";

/**
 * The app's celebration light rig, in two sizes.
 *
 * `mode="rays"` is the original full-bleed treatment: twelve slow rotating
 * god-rays behind a one-shot shockwave. It survives at full-screen scale and
 * full strength, with sparkles and a hero around it, which is the only place
 * it has ever run.
 *
 * `mode="bloom"` exists because that does NOT shrink. Dropped into a modal and
 * dimmed to stay under text, the rays stop reading as light and start reading
 * as clipart: hard straight polygon edges, twelve identical wedges on even
 * spacing, and amber at low alpha over a warm dark surface desaturating into
 * brown. So the small version drops the geometry entirely and is a soft radial
 * with a few sparkles. Same event, an instrument that fits the room.
 *
 * Everything is transform + opacity (GPU), and reduced motion is a real branch:
 * nothing rotates, nothing twinkles, and the shockwave does not fire at all.
 */

const RAYS = 12;

/** Built once at module load. Math in app code is fine; this is not a worklet. */
const RAY_PATH = (() => {
  const cx = 100,
    cy = 100,
    rInner = 12,
    rOuter = 100;
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

/** One slow revolution. Long on purpose: it should read as light, not as a spinner. */
const BURST_PERIOD = 22000;

/**
 * Sparkle offsets, as a fraction of the box, from its centre. Off the diagonals
 * and at three different sizes, so they do not read as a compass rose.
 *
 * `dy` STAYS ABOVE -0.21. In `bloom` mode the box is centred on a badge that
 * sits near the top of its container, so the upper half of the box hangs off
 * the surface; the first pass used -0.30 and -0.36 and quietly clipped two of
 * the three away. If you move the light rig, re-check these.
 */
const SPARKS = [
  { dx: -0.40, dy: -0.19, size: 15 },
  { dx: 0.38, dy: -0.15, size: 18 },
  { dx: -0.44, dy: 0.21, size: 12 },
];

/** A 4-point twinkle star. */
const SPARK_PATH =
  "M12 0 C13.2 8 16 10.8 24 12 C16 13.2 13.2 16 12 24 C10.8 16 8 13.2 0 12 C8 10.8 10.8 8 12 0 Z";

interface CelebrationLightProps {
  reduced: boolean;
  color: string;
  /** "rays" for a full-bleed screen, "bloom" for anything modal-sized. */
  mode?: "rays" | "bloom";
  /** God-ray diameter. */
  burstSize?: number;
  /** Shockwave diameter. Omit `halo` to skip the ring entirely. */
  haloSize?: number;
  halo?: boolean;
  /**
   * Scales the ray opacity. 1 is the onboarding screen's own weight; drop it
   * for surfaces where the light sits behind text it must not fight.
   */
  intensity?: number;
  /** Unique per mount — two SVG gradients sharing an id resolve to one. */
  gradientId: string;
}

const Rays: React.FC<{
  reduced: boolean;
  color: string;
  size: number;
  intensity: number;
  gradientId: string;
}> = ({ reduced, color, size, intensity, gradientId }) => {
  const rot = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(
      withTiming(1, { duration: BURST_PERIOD, easing: easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(withTiming(1, { duration: 2800, easing: easing.loop }), -1, true);
    return () => {
      cancelAnimation(rot);
      cancelAnimation(pulse);
    };
  }, [reduced, rot, pulse]);

  /*
   * EVERY REDUCED-MOTION BRANCH HERE RETURNS AN IDENTITY TRANSFORM RATHER THAN
   * OMITTING THE KEY. Reanimated snapshots the shape of the first style a
   * worklet returns and merges later ones into it, so a branch returning
   * `{ opacity }` alone leaves `last.transform` undefined and a later pass
   * animating a transform dies on "Cannot set property 'scale' of undefined".
   * Nothing here can reach that today, but it is one ordinary edit away, and
   * matched shapes cost nothing.
   */
  const style = useAnimatedStyle(() => {
    if (reduced) {
      return { opacity: 0.32 * intensity, transform: [{ rotate: "0deg" }, { scale: 1 }] };
    }
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.34, 0.52]) * intensity,
      transform: [
        { rotate: `${rot.value * 360}deg` },
        { scale: interpolate(pulse.value, [0, 1], [0.96, 1.04]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.center, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.5" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={RAY_PATH} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
};

/** One-shot shockwave: expands and fades on mount, then never again. */
const Halo: React.FC<{ color: string; size: number }> = ({ color, size }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(120, withTiming(1, { duration: 720, easing: easing.out }));
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.4, 1.5]) }],
  }));
  // The ring is sized INSIDE a centring layer rather than on it: Yoga drops
  // `right`/`bottom` when a width is also given, so an absolute-fill style
  // carrying its own size lands top-left instead of centred.
  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius.full,
            borderWidth: 3,
            borderColor: color,
          },
          style,
        ]}
      />
    </View>
  );
};

/**
 * Soft light with no edges: a radial that breathes slowly.
 *
 * This is the whole point of `bloom` mode. A gradient has no silhouette, so
 * there is nothing to look hard or repetitive or clipped, and it stays light
 * at any size and any opacity.
 */
const Bloom: React.FC<{
  reduced: boolean;
  color: string;
  size: number;
  intensity: number;
  gradientId: string;
}> = ({ reduced, color, size, intensity, gradientId }) => {
  const t = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: 700, easing: easing.out });
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 3200, easing: easing.loop }), -1, true);
    return () => {
      cancelAnimation(t);
      cancelAnimation(pulse);
    };
  }, [reduced, t, pulse]);

  const style = useAnimatedStyle(() => {
    // Identity transform, not an omitted key — see the note on Rays.
    if (reduced) return { opacity: t.value * intensity, transform: [{ scale: 1 }] };
    return {
      opacity: t.value * interpolate(pulse.value, [0, 1], [0.88, 1]) * intensity,
      // Swells in from smaller than its rest size, so the light arrives.
      transform: [
        { scale: interpolate(t.value, [0, 1], [0.55, 1]) * interpolate(pulse.value, [0, 1], [0.97, 1.03]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.center, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          {/* Four stops, not two. A straight two-stop radial has a visible
              shoulder where it gives up; the extra stops keep the falloff
              reading as air rather than as a disc. */}
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.5" />
            <Stop offset="0.32" stopColor={color} stopOpacity="0.26" />
            <Stop offset="0.62" stopColor={color} stopOpacity="0.08" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
};

/** One slow twinkle each, staggered. Three, not a dozen: past a handful they
 *  stop being highlights and become a texture. */
const Sparkle: React.FC<{
  index: number;
  color: string;
  box: number;
  dx: number;
  dy: number;
  size: number;
}> = ({ index, color, box, dx, dy, size }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      420 + index * 260,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: easing.out }),
          withTiming(0, { duration: 900, easing: easing.loop }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [index, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.5, 1], [0, 0.85, 0]),
    transform: [
      { translateX: dx * box },
      { translateY: dy * box },
      { scale: interpolate(t.value, [0, 0.5, 1], [0.4, 1, 0.4]) },
    ],
  }));

  return (
    <Animated.View style={[styles.center, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={SPARK_PATH} fill={color} />
      </Svg>
    </Animated.View>
  );
};

export const CelebrationLight: React.FC<CelebrationLightProps> = ({
  reduced,
  color,
  mode = "rays",
  burstSize = 300,
  haloSize = 150,
  halo = true,
  intensity = 1,
  gradientId,
}) => (
  <>
    {mode === "rays" ? (
      <Rays
        reduced={reduced}
        color={color}
        size={burstSize}
        intensity={intensity}
        gradientId={gradientId}
      />
    ) : (
      <>
        <Bloom
          reduced={reduced}
          color={color}
          size={burstSize}
          intensity={intensity}
          gradientId={gradientId}
        />
        {!reduced &&
          SPARKS.map((s, i) => (
            <Sparkle
              key={i}
              index={i}
              color={color}
              box={burstSize}
              dx={s.dx}
              dy={s.dy}
              size={s.size}
            />
          ))}
      </>
    )}
    {halo && !reduced ? <Halo color={withAlpha(color, 0.7)} size={haloSize} /> : null}
  </>
);

/**
 * A confetti burst that stays INSIDE its parent.
 *
 * The app already has `ConfettiAnimation`, but it is sized off
 * `Dimensions.get("window")` and must be mounted as a viewport overlay. Firing
 * that over an open modal would rain chips across the whole screen for a
 * celebration that belongs to one card, and it would have to be a sibling of
 * the native Modal to do it. This one measures its own box and is clipped by
 * whatever encloses it.
 *
 * Reserved for the loud tier: the success screen already bursts confetti on
 * every completed practice, so a second helping on an ordinary level-up is a
 * signal that does not mean anything. Firing it only on a stage crossing is
 * what keeps it saying "this one is different".
 */
export const CHIP_COUNT = 16;

const CHIP_STAGGER = 70;
const CHIP_FALL_BASE = 1500;
const CHIP_FALL_STEP = 240;

/** One chip's schedule. Exported so the unmount deadline below is derived from
 *  the same arithmetic the chips actually run, not from a copied number. */
export function chipPlan(index: number): { delay: number; fall: number } {
  return {
    delay: (index % 6) * CHIP_STAGGER,
    fall: CHIP_FALL_BASE + (index % 5) * CHIP_FALL_STEP,
  };
}

/**
 * When the last chip is certainly gone, plus a few frames of slack.
 *
 * The layer UNMOUNTS at this point rather than trusting the fade. Chips already
 * end at zero opacity below the card, so nothing should linger either way, but
 * "should" is what the old ConfettiAnimation offered too, and its own header
 * records the version that left pieces parked and spinning forever. An empty
 * tree cannot park anything. Computed, not hard-coded: bumping a fall duration
 * without this moving would cut chips off mid-air.
 */
export const BURST_TOTAL_MS = (() => {
  let max = 0;
  for (let i = 0; i < CHIP_COUNT; i++) {
    const { delay, fall } = chipPlan(i);
    max = Math.max(max, delay + fall);
  }
  return max + 80;
})();

const Chip: React.FC<{
  index: number;
  color: string;
  width: number;
  height: number;
}> = ({ index, color, width, height }) => {
  const t = useSharedValue(0);

  // Deterministic scatter. Random would re-roll on every re-render and is not
  // worth a ref here; index arithmetic gives an even spread that still looks
  // unplanned.
  const startX = ((index + 0.5) / CHIP_COUNT) * width + (((index * 37) % 40) - 20);
  const drift = ((index % 5) - 2) * 16;
  const spin = index % 2 === 0 ? 340 : -300;
  const w = 5 + (index % 3) * 2;
  const { delay, fall } = chipPlan(index);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: fall, easing: easing.linear }));
    return () => cancelAnimation(t);
  }, [t, delay, fall]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.06, 0.86, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: drift * t.value },
      // Starts above the box and clears the bottom, so no chip is ever seen
      // appearing or parking in view.
      { translateY: interpolate(t.value, [0, 1], [-30, height + 60]) },
      { rotate: `${spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.chip,
        { left: startX, width: w, height: w * 1.7, backgroundColor: color },
        style,
      ]}
    />
  );
};

export const CelebrationBurst: React.FC<{
  reduced: boolean;
  /** Chip colours, cycled. Pass theme accents so it matches the surface. */
  colors: string[];
}> = ({ reduced, colors }) => {
  // Measured, not assumed: the card's height depends on how many rewards
  // landed, and a hard-coded fall distance would either stop short on the tall
  // layout or overshoot on the short one.
  const [box, setBox] = React.useState({ width: 0, height: 0 });
  const [spent, setSpent] = React.useState(false);

  // Firing late is harmless (the chips are already invisible); firing early is
  // impossible, so the burst can never be cut off mid-air.
  React.useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setSpent(true), BURST_TOTAL_MS);
    return () => clearTimeout(id);
  }, [reduced]);

  if (reduced || spent) return null;
  return (
    <View
      // Clips to its own box as well, so a parent that stops clipping cannot
      // let a chip escape onto the rest of the screen.
      style={[StyleSheet.absoluteFill, styles.burst]}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}
    >
      {box.height > 0 &&
        Array.from({ length: CHIP_COUNT }).map((_, i) => (
          <Chip
            key={i}
            index={i}
            color={colors[i % colors.length]}
            width={box.width}
            height={box.height}
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  /** Both layers centre themselves in the parent, which is what made the two
   *  originals line up on the onboarding stage. Callers own the box. */
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  burst: {
    overflow: "hidden",
  },
  chip: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
});
