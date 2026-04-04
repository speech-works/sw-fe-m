import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
// import Svg, { Path } from "react-native-svg";
import { theme } from "../../../../../../../Theme/tokens";
import GuidedBreathingFace, {
  BreathingPhase,
} from "../../../../../../../assets/sw-faces/GuidedBreathingFace";
import { useBreathAudio } from "../../../../../../../hooks/useBreathAudio";
import { parseTextStyle } from "../../../../../../../util/functions/parseStyles";

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

  // Phase text: “Breathe In” | “Hold” | “Breathe Out”
  const [phaseText, setPhaseText] = useState<string>("Breathe In");

  // Phase state for Face Animation
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>("idle");

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
      setCurrentPhase("inhale");
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
        setCurrentPhase("hold-in");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) resolve();
          });
        });
        if (!isMounted.current) break;
      }

      // ─── EXHALE ───────────────────────────────────────────
      setPhaseText("Breathe Out");
      setCurrentPhase("exhale");
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
        setCurrentPhase("hold-out");
        await new Promise<void>((resolve) => {
          Animated.delay(holdMs).start(({ finished }) => {
            if (finished && isMounted.current) resolve();
          });
        });
        if (!isMounted.current) break;
      }
    } while (repeat && isMounted.current);

    if (isMounted.current) {
      setCurrentPhase("idle");
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
      if (isMounted.current) {
        // setIsReady(true) - no longer needed as phase drives it
        runBreathingCycle();
      }
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
      {/* Animated Face */}
      <View style={styles.faceContainer}>
        <GuidedBreathingFace size={CIRCLE_SIZE} phase={currentPhase} />
      </View>

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
  faceContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    height: 40, // fixed height to prevent jumping
    alignItems: "center",
    justifyContent: "center",
  },
  phaseText: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 32,
    color: "#F1F5F9", // Slate-100 for dark mode
    opacity: 0.9,
  },
});
