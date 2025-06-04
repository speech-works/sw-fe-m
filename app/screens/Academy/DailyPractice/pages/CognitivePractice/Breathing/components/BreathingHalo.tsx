// components/BreathingHalo.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { parseTextStyle } from "../../../../../../../util/functions/parseStyles";
import { theme } from "../../../../../../../Theme/tokens";
import { useBreathAudio } from "../../../../../../../hooks/useBreathAudio";

type BreathingHaloProps = {
  inhale: number; // seconds
  hold?: number; // seconds
  exhale: number; // seconds
  repeat?: boolean;
  onCycleComplete?: () => void;
  mute?: boolean; // mute breath sounds only
};

export const BreathingHalo: React.FC<BreathingHaloProps> = ({
  inhale,
  hold = 0,
  exhale,
  repeat = true,
  onCycleComplete,
  mute = false,
}) => {
  const { loadBreathSounds, playBreath, stopBreathSounds } = useBreathAudio();

  // Animated values:
  const outerScale = useRef(new Animated.Value(1)).current;
  const outerOpacity = useRef(new Animated.Value(0.3)).current;
  const middleScale = useRef(new Animated.Value(1)).current;
  const middleOpacity = useRef(new Animated.Value(0.4)).current;
  const innerScale = useRef(new Animated.Value(1)).current;
  const innerOpacity = useRef(new Animated.Value(0.5)).current;
  const centerDotScale = useRef(new Animated.Value(1)).current;

  // Phase text: “Inhale” | “Hold” | “Exhale”
  const [phaseText, setPhaseText] = useState<"Inhale" | "Hold" | "Exhale">(
    "Inhale"
  );

  // Convert seconds → ms
  const inhaleMs = inhale * 1000;
  const holdMs = hold * 1000;
  const exhaleSecs = Math.max(0.1, exhale);
  const exhaleMs = exhaleSecs * 1000;

  // Track if still mounted
  const isMounted = useRef(true);

  // MODIFIED: Use a ref to store the latest mute state for the getter function
  const muteRef = useRef(mute);

  useEffect(() => {
    muteRef.current = mute;
  }, [mute]);

  // If user toggles `mute`, immediately cut off any in‐flight breath sound
  useEffect(() => {
    if (mute) {
      stopBreathSounds();
    }
  }, [mute, stopBreathSounds]);

  // Orchestrate one full inhale→hold→exhale→hold cycle
  const runBreathingCycle = useCallback(async () => {
    // Reset all animations to “rest”
    const resetAnimations = () => {
      outerScale.stopAnimation();
      outerOpacity.stopAnimation();
      middleScale.stopAnimation();
      middleOpacity.stopAnimation();
      innerScale.stopAnimation();
      innerOpacity.stopAnimation();
      centerDotScale.stopAnimation();

      outerScale.setValue(1);
      outerOpacity.setValue(0.3);
      middleScale.setValue(1);
      middleOpacity.setValue(0.4);
      innerScale.setValue(1);
      innerOpacity.setValue(0.5);
      centerDotScale.setValue(1);
    };
    resetAnimations();

    // MODIFIED: Define the getter function for the current mute state
    const isCurrentlyMuted = () => muteRef.current;

    do {
      if (!isMounted.current) break;

      // ─── INHALE ───────────────────────────────────────────
      if (!mute) {
        await playBreath("inhale", inhaleMs, isCurrentlyMuted);
      }
      setPhaseText("Inhale");
      await new Promise<void>((resolve) => {
        Animated.parallel([
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
          Animated.timing(centerDotScale, {
            toValue: 1.05,
            duration: inhaleMs,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isMounted.current) resolve();
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD (after inhale) ───────────────────────────────────
      if (holdMs > 0) {
        setPhaseText("Hold");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) resolve();
          });
        });
        if (!isMounted.current) break;
      }

      // ─── EXHALE ───────────────────────────────────────────────
      if (!mute) {
        await playBreath("exhale", exhaleMs, isCurrentlyMuted);
      }
      setPhaseText("Exhale");
      await new Promise<void>((resolve) => {
        Animated.parallel([
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
          Animated.timing(centerDotScale, {
            toValue: 1,
            duration: exhaleMs,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isMounted.current) resolve();
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD (after exhale) ────────────────────────────────────
      if (holdMs > 0) {
        setPhaseText("Hold");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) resolve();
          });
        });
        if (!isMounted.current) break;
      }
    } while (repeat && isMounted.current);

    // Reset and callback
    if (isMounted.current) {
      setPhaseText("Inhale");
      onCycleComplete?.();
    }
  }, [
    inhaleMs,
    holdMs,
    exhaleMs,
    mute,
    repeat,
    playBreath,
    onCycleComplete,
    outerScale,
    outerOpacity,
    middleScale,
    middleOpacity,
    innerScale,
    innerOpacity,
    centerDotScale,
  ]);

  // On mount: load breath clips, then start cycle. On unmount: stop everything.
  useEffect(() => {
    isMounted.current = true;
    const start = async () => {
      await loadBreathSounds();
      if (isMounted.current) runBreathingCycle();
    };
    start();

    return () => {
      isMounted.current = false;
      outerScale.stopAnimation();
      outerOpacity.stopAnimation();
      middleScale.stopAnimation();
      middleOpacity.stopAnimation();
      innerScale.stopAnimation();
      innerOpacity.stopAnimation();
      centerDotScale.stopAnimation();
      stopBreathSounds();
    };
  }, [
    loadBreathSounds,
    runBreathingCycle,
    stopBreathSounds,
    outerScale,
    outerOpacity,
    middleScale,
    middleOpacity,
    innerScale,
    innerOpacity,
    centerDotScale,
  ]);

  return (
    <View style={styles.container}>
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

const RING_SIZE = 120;
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
