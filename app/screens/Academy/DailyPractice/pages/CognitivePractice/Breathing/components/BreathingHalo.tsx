// components/BreathingHalo.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";
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

  // Animated values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const faceOpacity = useRef(new Animated.Value(1)).current;

  // Phase text: “Breathe In” | “Hold” | “Breathe Out”
  const [phaseText, setPhaseText] = useState<string>("Breathe In");

  // Convert seconds → ms
  const inhaleMs = inhale * 1000;
  const holdMs = hold * 1000;
  const exhaleSecs = Math.max(0.1, exhale);
  const exhaleMs = exhaleSecs * 1000;

  // Track if still mounted
  const isMounted = useRef(true);

  // Ref for mute state
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
    const isCurrentlyMuted = () => muteRef.current;

    // Reset
    scaleAnim.setValue(1);

    do {
      if (!isMounted.current) break;

      // ─── INHALE ───────────────────────────────────────────
      setPhaseText("Breathe In");
      if (!muteRef.current) {
        playBreath("inhale", inhaleMs, isCurrentlyMuted);
      }

      await new Promise<void>((resolve) => {
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: inhaleMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && isMounted.current) resolve();
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD (Full Lungs) ────────────────────────────────
      if (holdMs > 0) {
        setPhaseText("Hold");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) resolve();
          });
        });
        if (!isMounted.current) break;
      }

      // ─── EXHALE ───────────────────────────────────────────
      setPhaseText("Breathe Out");
      if (!muteRef.current) {
        playBreath("exhale", exhaleMs, isCurrentlyMuted);
      }

      await new Promise<void>((resolve) => {
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: exhaleMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && isMounted.current) resolve();
        });
      });
      if (!isMounted.current) break;

      // ─── HOLD (Empty Lungs) ───────────────────────────────
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

    if (isMounted.current) {
      onCycleComplete?.();
    }
  }, [
    inhaleMs,
    holdMs,
    exhaleMs,
    repeat,
    playBreath,
    onCycleComplete,
    scaleAnim,
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
      scaleAnim.stopAnimation();
      stopBreathSounds();
    };
  }, [loadBreathSounds, runBreathingCycle, stopBreathSounds, scaleAnim]);

  return (
    <View style={styles.container}>
      {/* Animated Face Circle */}
      <Animated.View
        style={[
          styles.faceCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Simple SVG Face Features */}
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          {/* Closed Eyes */}
          <Path
            d="M 30 40 Q 40 45, 50 40"
            stroke="#9A3412" // Darker Orange/Brown
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            transform="translate(-15, 0)"
          />
          <Path
            d="M 30 40 Q 40 45, 50 40"
            stroke="#9A3412"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            transform="translate(35, 0)"
          />
          {/* Mouth - Small dash/smile */}
          <Path
            d="M 45 65 L 55 65"
            stroke="#9A3412"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* Text Below */}
      <View style={styles.textContainer}>
        <Text style={styles.phaseText}>{phaseText}</Text>
      </View>
    </View>
  );
};

const CIRCLE_SIZE = 200;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
  },
  faceCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#F97316", // Bright Orange (Tailwind orange-500)
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    height: 40, // fixed height to prevent jumping
    alignItems: "center",
    justifyContent: "center",
  },
  phaseText: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 32,
    color: "#78350F", // Dark Orange/Brown
    opacity: 0.9,
  },
});
