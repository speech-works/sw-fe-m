import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { parseTextStyle } from "../../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../../Theme/tokens";
import { useBreathAudio } from "../../../../../../../hooks/useBreathAudio";

type BreathingHaloProps = {
  inhale: number;
  hold?: number;
  exhale: number;
  repeat?: boolean;
  onCycleComplete?: () => void;
  mute?: boolean; // ← new prop
};

/**
 * Multi‐ring pulsing BreathingHalo with phase indicator + synchronized breath sounds.
 *
 * - The “outer”, “middle”, and “inner” rings each scale/opacity‐animate in a staggered way.
 * - The center dot does a subtle pulse.
 * - We display “Inhale / Hold / Exhale” text in the middle, switching at the right times.
 * - Inhale and Exhale sounds (via expo-av) play in sync with the animations.
 */
export const BreathingHalo: React.FC<BreathingHaloProps> = ({
  inhale,
  hold = 0,
  exhale,
  repeat = true,
  mute = false,
  onCycleComplete,
}) => {
  console.log("mute breathing sound", mute);
  const { loadSounds, playBreath, stopAll } = useBreathAudio();

  // ─── Animated values for the three rings ───────────────────────────────
  const outerScale = useRef(new Animated.Value(1)).current;
  const outerOpacity = useRef(new Animated.Value(0.3)).current;

  const middleScale = useRef(new Animated.Value(1)).current;
  const middleOpacity = useRef(new Animated.Value(0.4)).current;

  const innerScale = useRef(new Animated.Value(1)).current;
  const innerOpacity = useRef(new Animated.Value(0.5)).current;

  // ─── Subtle inner‐dot pulse ────────────────────────────────────────────
  const centerDotScale = useRef(new Animated.Value(1)).current;

  // ─── Phase state for center text: “Inhale” | “Hold” | “Exhale” ────────
  const [phaseText, setPhaseText] = useState<"Inhale" | "Hold" | "Exhale">(
    "Inhale"
  );

  // ─── Convert seconds → milliseconds ──────────────────────────────────
  const inhaleMs = inhale * 1000;
  const holdMs = hold * 1000;
  // Ensure exhale is not zero—give minimal duration if necessary
  const effectiveExhale = Math.max(0.1, exhale);
  const exhaleMs = effectiveExhale * 1000;

  // Ref to track if component is mounted, to prevent state updates after unmount
  const isMounted = useRef(true);

  // ─── Orchestrates the entire breathing cycle ───────────────────────────
  const runBreathingCycle = async () => {
    // Stop any ongoing animations before starting a new cycle
    outerScale.stopAnimation();
    outerOpacity.stopAnimation();
    middleScale.stopAnimation();
    middleOpacity.stopAnimation();
    innerScale.stopAnimation();
    innerOpacity.stopAnimation();
    centerDotScale.stopAnimation();

    // Reset all animated values to “rest” state
    outerScale.setValue(1);
    outerOpacity.setValue(0.3);
    middleScale.setValue(1);
    middleOpacity.setValue(0.4);
    innerScale.setValue(1);
    innerOpacity.setValue(0.5);
    centerDotScale.setValue(1);

    // Loop: if repeat === true, run indefinitely; if false, run once
    while (isMounted.current && (repeat || true)) {
      // ─── INHALE Phase (Expanding) ───────────────────
      if (!isMounted.current) break;
      if (!mute) playBreath("inhale", inhaleMs); // start inhale sound
      setPhaseText("Inhale");
      await new Promise<void>((resolve) => {
        Animated.parallel([
          // Outer ring expands & fades in
          Animated.timing(outerScale, {
            toValue: 1.6,
            duration: inhaleMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerOpacity, {
            toValue: 0.8,
            duration: inhaleMs,
            useNativeDriver: true,
          }),
          // Middle ring (staggered)
          Animated.timing(middleScale, {
            toValue: 1.4,
            duration: inhaleMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            delay: inhaleMs / 6,
          }),
          Animated.timing(middleOpacity, {
            toValue: 0.8,
            duration: inhaleMs,
            useNativeDriver: true,
            delay: inhaleMs / 6,
          }),
          // Inner ring (more staggered)
          Animated.timing(innerScale, {
            toValue: 1.2,
            duration: inhaleMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            delay: inhaleMs / 3,
          }),
          Animated.timing(innerOpacity, {
            toValue: 0.8,
            duration: inhaleMs,
            useNativeDriver: true,
            delay: inhaleMs / 3,
          }),
          // Center dot subtle pulse up
          Animated.timing(centerDotScale, {
            toValue: 1.05,
            duration: inhaleMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isMounted.current) {
            resolve();
          }
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD Phase (Expanded, at max size) ──────────
      if (holdMs > 0) {
        setPhaseText("Hold");
        await new Promise<void>((resolve) => {
          // No visual changes—just delay
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) {
              resolve();
            }
          });
        });
        if (!isMounted.current) break;
      }

      // ─── EXHALE Phase (Shrinking) ────────────────────
      if (!isMounted.current) break;
      if (!mute) playBreath("exhale", exhaleMs); // start exhale sound
      setPhaseText("Exhale");
      await new Promise<void>((resolve) => {
        Animated.parallel([
          // Outer ring shrinks & fades out
          Animated.timing(outerScale, {
            toValue: 1,
            duration: exhaleMs,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(outerOpacity, {
            toValue: 0.3,
            duration: exhaleMs,
            useNativeDriver: true,
          }),
          // Middle ring (staggered)
          Animated.timing(middleScale, {
            toValue: 1,
            duration: exhaleMs,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
            delay: exhaleMs / 6,
          }),
          Animated.timing(middleOpacity, {
            toValue: 0.4,
            duration: exhaleMs,
            useNativeDriver: true,
            delay: exhaleMs / 6,
          }),
          // Inner ring (more staggered)
          Animated.timing(innerScale, {
            toValue: 1,
            duration: exhaleMs,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
            delay: exhaleMs / 3,
          }),
          Animated.timing(innerOpacity, {
            toValue: 0.5,
            duration: exhaleMs,
            useNativeDriver: true,
            delay: exhaleMs / 3,
          }),
          // Center dot subtle pulse down
          Animated.timing(centerDotScale, {
            toValue: 1,
            duration: exhaleMs,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isMounted.current) {
            resolve();
          }
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD Phase (Shrunk, before next cycle) ───────
      if (holdMs > 0) {
        setPhaseText("Hold");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) {
              resolve();
            }
          });
        });
        if (!isMounted.current) break;
      }

      // Break if we only wanted a single cycle
      if (!repeat) {
        break;
      }
    }

    // Once finished (either repeat=false or unmount):
    if (isMounted.current) {
      setPhaseText("Inhale"); // reset text
      onCycleComplete?.();
    }
  };

  // ─── Start cycle on mount; load sounds first ─────────────────────────
  useEffect(() => {
    isMounted.current = true;

    const startLoop = async () => {
      await loadSounds(); // preload inhale/exhale sounds
      runBreathingCycle(); // then start animation+audio loop
    };
    startLoop();

    return () => {
      isMounted.current = false;
      // Stop all animations
      outerScale.stopAnimation();
      outerOpacity.stopAnimation();
      middleScale.stopAnimation();
      middleOpacity.stopAnimation();
      innerScale.stopAnimation();
      innerOpacity.stopAnimation();
      centerDotScale.stopAnimation();
      // Stop any playing sounds
      stopAll();
    };
  }, [inhaleMs, holdMs, exhaleMs, repeat, onCycleComplete, mute]);

  return (
    <View style={styles.container}>
      {/* Outer ring */}
      <Animated.View
        style={[
          styles.haloBase,
          {
            transform: [{ scale: outerScale }],
            opacity: outerOpacity,
            backgroundColor: "#FF9A56",
          },
        ]}
      />

      {/* Middle ring (slightly smaller) */}
      <Animated.View
        style={[
          styles.haloBase,
          styles.middleRing,
          {
            transform: [{ scale: middleScale }],
            opacity: middleOpacity,
            backgroundColor: "#FFB37C",
          },
        ]}
      />

      {/* Inner ring (even smaller) */}
      <Animated.View
        style={[
          styles.haloBase,
          styles.innerRing,
          {
            transform: [{ scale: innerScale }],
            opacity: innerOpacity,
            backgroundColor: "#FFD4A3",
          },
        ]}
      />

      {/* Center dot (with subtle pulse) */}
      <Animated.View
        style={[
          styles.centerDot,
          {
            transform: [{ scale: centerDotScale }],
          },
        ]}
      >
        <Text style={styles.phaseText}>{phaseText}</Text>
      </Animated.View>
    </View>
  );
};

const RING_SIZE = 192;
const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  haloBase: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
  },
  middleRing: {
    width: RING_SIZE * 0.85,
    height: RING_SIZE * 0.85,
    borderRadius: (RING_SIZE * 0.85) / 2,
    zIndex: 1,
  },
  innerRing: {
    width: RING_SIZE * 0.7,
    height: RING_SIZE * 0.7,
    borderRadius: (RING_SIZE * 0.7) / 2,
    zIndex: 2,
  },
  centerDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    zIndex: 3,
  },
  phaseText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
