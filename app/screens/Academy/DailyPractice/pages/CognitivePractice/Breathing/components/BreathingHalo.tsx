import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BreathPhase } from "../../../../../../../api/dailyPractice/types";
import { useBreathAudio } from "../../../../../../../hooks/useBreathAudio";
import {
  Text,
  spacing,
  radius,
  easing,
  useTheme,
  useMotion,
  withAlpha,
} from "../../../../../../../design-system";

type BreathingHaloProps = {
  /** The pattern to pace, in order. Comes from the chosen technique's
   *  `guidedBreathingData.phases`; callers supply a fallback when absent. */
  phases: BreathPhase[];
  repeat?: boolean;
  onCycleComplete?: () => void;
  mute?: boolean; // mute breath sounds only
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Geometry of the pacer. Asset-internal numbers, not layout — kept named so the
 *  relationships (core fits inside the arc) stay legible. */
const SIZE = 200;
const ARC_STROKE = 3;
const ARC_R = (SIZE - ARC_STROKE) / 2 - 6; // 6px breathing room inside the box
const ARC_C = 2 * Math.PI * ARC_R;
const CORE_MAX = 132; // full lungs; sits well inside ARC_R (=91.5)
/** Empty lungs still shows an orb — a vanishing dot reads as "broken", not "empty". */
const CORE_MIN_SCALE = 0.45;

const DEFAULT_LABEL: Record<BreathPhase["kind"], string> = {
  inhale: "Breathe In",
  hold: "Hold",
  exhale: "Breathe Out",
};

/** Target lung fullness at the end of a phase. A hold carries the previous value
 *  forward; `to` overrides, which is how Reset's double inhale (0.8 then 1) works. */
const targetFullness = (phase: BreathPhase, current: number): number => {
  if (phase.to !== undefined) return phase.to;
  if (phase.kind === "inhale") return 1;
  if (phase.kind === "exhale") return 0;
  return current;
};

/**
 * The breathing pacer: sequences a technique's phases, speaks the phase text,
 * plays breath audio, and — for the first time — actually shows the breath.
 *
 * The predecessor drove an `Animated.Value` 1→1.5 on every breath and never
 * bound it to a transform, so the exercise had no visual at all; the animation
 * was only being used as a clock. Two things changed:
 *
 * 1. The clock is now a plain cancellable timer, decoupled from the animation.
 *    Driving the loop off an animation's `finished` callback meant an
 *    interrupted animation (unmount, reduced motion) resolved nothing and hung
 *    the cycle forever.
 * 2. Phases are DATA, so a technique can hold asymmetrically (4-7-8) or inhale
 *    twice (Reset) — neither of which the old inhale/hold/exhale props could say.
 */
export const BreathingHalo: React.FC<BreathingHaloProps> = ({
  phases,
  repeat = true,
  onCycleComplete,
  mute = false,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const { loadBreathSounds, playBreath, stopBreathSounds } = useBreathAudio();

  const [phaseText, setPhaseText] = useState<string>(
    phases[0] ? (phases[0].label ?? DEFAULT_LABEL[phases[0].kind]) : "Breathe In",
  );

  /** 0 = empty, 1 = full. The single source of truth for the visual. */
  const fullness = useSharedValue(0);
  /** 0→1 across the CURRENT phase, reset at each boundary. */
  const phaseProgress = useSharedValue(0);

  const isMounted = useRef(true);
  const muteRef = useRef(mute);
  const reducedRef = useRef(reduced);
  /** Resolves the in-flight phase wait early so unmount doesn't strand the loop. */
  const cancelWait = useRef<(() => void) | null>(null);
  /** Bumped whenever a cycle is retired, so only the newest loop drives. */
  const epochRef = useRef(0);

  useEffect(() => {
    muteRef.current = mute;
  }, [mute]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // Toggling mute cuts any in-flight breath sound immediately.
  useEffect(() => {
    if (mute) {
      stopBreathSounds();
    }
  }, [mute, stopBreathSounds]);

  /** Waits `ms`, resolving false if the component tore down first. */
  const wait = useCallback((ms: number) => {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        cancelWait.current = null;
        resolve(true);
      }, ms);
      cancelWait.current = () => {
        clearTimeout(timer);
        cancelWait.current = null;
        resolve(false);
      };
    });
  }, []);

  const runBreathingCycle = useCallback(
    async (epoch: number) => {
      const isCurrentlyMuted = () => muteRef.current;
      /** Still ours to drive? False once unmounted or a newer cycle took over. */
      const alive = () => isMounted.current && epochRef.current === epoch;

      // An empty pattern would spin the do/while with nothing to await and lock
      // the JS thread outright. Phases are backend data — don't trust the shape.
      if (!phases.length) return;

      fullness.value = 0;

      do {
        for (const phase of phases) {
          if (!alive()) return;

          const ms = Math.max(100, phase.seconds * 1000);
          setPhaseText(phase.label ?? DEFAULT_LABEL[phase.kind]);

          if (phase.kind !== "hold" && !muteRef.current) {
            playBreath(phase.kind, ms, isCurrentlyMuted);
          }

          // Reduced motion keeps the orb still and lets its opacity carry the
          // breath instead — the DS rule is "keep opacity, drop transform", and a
          // pacer that renders nothing would be worse than one that doesn't move.
          const next = targetFullness(phase, fullness.value);
          fullness.value = withTiming(next, { duration: ms, easing: easing.loop });

          phaseProgress.value = 0;
          if (!reducedRef.current) {
            phaseProgress.value = withTiming(1, { duration: ms, easing: easing.linear });
          }

          if (!(await wait(ms))) return;
        }
      } while (repeat && alive());

      if (alive()) onCycleComplete?.();
    },
    [phases, repeat, playBreath, onCycleComplete, wait, fullness, phaseProgress],
  );

  useEffect(() => {
    isMounted.current = true;
    const epoch = ++epochRef.current;

    // Audio loads ALONGSIDE the exercise, never in front of it. This was
    // `await loadBreathSounds()` before the first breath, so a slow or hung
    // load — the Simulator's CoreAudio is unreliable, see the app's audio
    // notes — meant the pacer never started at all: no motion, no sound,
    // frozen on "Breathe In" while the session timer ticked on. Breathing is
    // the exercise; sound is an accompaniment, and it must not be able to
    // block it. `playBreath` already no-ops until the clips exist, so a late
    // load simply joins from the next phase.
    loadBreathSounds().catch(() => {});
    runBreathingCycle(epoch);

    return () => {
      isMounted.current = false;
      // Retire this cycle so a re-run (e.g. the technique changing) can't leave
      // two loops fighting over the same shared values.
      epochRef.current += 1;
      cancelWait.current?.();
      cancelAnimation(fullness);
      cancelAnimation(phaseProgress);
      stopBreathSounds();
    };
  }, [loadBreathSounds, runBreathingCycle, stopBreathSounds, fullness, phaseProgress]);

  const coreStyle = useAnimatedStyle(() => {
    const scale = CORE_MIN_SCALE + fullness.value * (1 - CORE_MIN_SCALE);
    return reduced
      ? { transform: [{ scale: 0.8 }], opacity: 0.35 + fullness.value * 0.65 }
      : { transform: [{ scale }], opacity: 1 };
  }, [reduced]);

  const bloomStyle = useAnimatedStyle(() => {
    const scale = CORE_MIN_SCALE + fullness.value * (1 - CORE_MIN_SCALE);
    return reduced
      ? { transform: [{ scale: 0.96 }], opacity: 0.12 + fullness.value * 0.2 }
      : { transform: [{ scale: scale * 1.22 }], opacity: 0.18 + fullness.value * 0.3 };
  }, [reduced]);

  // The arc times the CURRENT phase — including holds, where nothing else moves.
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_C * (1 - phaseProgress.value),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.orbSlot}>
        <Animated.View
          style={[
            styles.bloom,
            { backgroundColor: withAlpha(colors.accent.danger, 0.55) },
            bloomStyle,
          ]}
        />
        <Animated.View
          style={[styles.core, { backgroundColor: colors.accent.danger }, coreStyle]}
        />
        {!reduced && (
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ARC_R}
              stroke={colors.border.default}
              strokeWidth={ARC_STROKE}
              fill="none"
            />
            {/* dangerText, not the accent base: a thin stroke on the paper canvas
                collapses to ~2.9:1, while this cut is per-scheme and clears 3:1. */}
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ARC_R}
              stroke={colors.feedback.dangerText}
              strokeWidth={ARC_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={ARC_C}
              animatedProps={arcProps}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
        )}
      </View>

      <View style={styles.textContainer}>
        <Text variant="display" color="primary" style={styles.phaseText}>
          {phaseText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing["5xl"],
  },
  orbSlot: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    position: "absolute",
    width: CORE_MAX,
    height: CORE_MAX,
    borderRadius: radius.full,
  },
  bloom: {
    position: "absolute",
    width: CORE_MAX,
    height: CORE_MAX,
    borderRadius: radius.full,
  },
  textContainer: {
    height: 40, // fixed height to prevent jumping
    alignItems: "center",
    justifyContent: "center",
  },
  phaseText: {
    opacity: 0.9, // original softening — between opacity.full and opacity.muted
  },
});
