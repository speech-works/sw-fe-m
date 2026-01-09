import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";

export const useMetronome = (muteLogic = false) => {
  const [isPlaying, setIsPlaying] = useState(true); // Default true so it auto-starts
  const [speed, setSpeed] = useState(72);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false); // Track loading
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Load sound
  useEffect(() => {
    if (muteLogic) {
      setIsSoundLoaded(false);
      return;
    }

    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../../../../assets/single-tick.mp3")
        );
        soundRef.current = sound;
        setIsSoundLoaded(true);
      } catch (error) {
        console.warn("Failed to load metronome sound", error);
      }
    };

    loadSound();

    return () => {
      soundRef.current?.unloadAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsSoundLoaded(false);
    };
  }, [muteLogic]);

  // Playback logic
  useEffect(() => {
    if (muteLogic || !isSoundLoaded) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (!isPlaying || !soundRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const intervalMs = (60 / speed) * 1000;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      soundRef.current?.replayAsync();
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speed, isPlaying, muteLogic, isSoundLoaded]); // Depend on isSoundLoaded

  return {
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
  };
};

interface MetronomeProps {
  // Controlled props (optional)
  isPlaying?: boolean;
  onTogglePlay?: (playing: boolean) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

const Metronome = ({
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  speed: controlledSpeed,
  onSpeedChange,
}: MetronomeProps) => {
  const isControlled = controlledIsPlaying !== undefined;

  // If controlled, mute the internal hook logic (because parent runs it)
  // If uncontrolled, run the internal hook logic normally
  const internalHook = useMetronome(isControlled);

  const activeIsPlaying = isControlled
    ? controlledIsPlaying
    : internalHook.isPlaying;
  const activeSetIsPlaying = isControlled
    ? onTogglePlay
    : internalHook.setIsPlaying;

  const activeSpeed = isControlled
    ? (controlledSpeed as number)
    : internalHook.speed;
  const activeSetSpeed = isControlled ? onSpeedChange : internalHook.setSpeed;

  const togglePlay = () => {
    if (activeSetIsPlaying) {
      activeSetIsPlaying(!activeIsPlaying);
    }
  };

  const min = 30;
  const max = 150;

  return (
    <View style={styles.container}>
      <View style={styles.rowContainer}>
        <Text style={styles.infoText}>Metronome Speed</Text>
        <Text style={styles.speedText}>{activeSpeed} BPM</Text>
      </View>

      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={1}
          value={activeSpeed}
          onValueChange={(val) => activeSetSpeed && activeSetSpeed(val)}
          minimumTrackTintColor={theme.colors.library.orange[400]}
          maximumTrackTintColor={theme.colors.surface.default}
          thumbTintColor={theme.colors.library.orange[400]}
        />
      </View>

      <View style={styles.rowContainer}>
        <Text style={styles.paceText}>Slow</Text>
        <Text style={styles.paceText}>Fast</Text>
      </View>

      {/* Play/Stop Button (Added for UI completeness, though mostly auto-plays in original) */}
      {/* Original didn't have a button, just speed slider and always running if mounted? */}
      {/* Original logic: const [isPlaying, setIsPlaying] = useState(true); */}
      {/* Original renders: No button. Just runs. */}
      {/* But user wants to control it? */}
      {/* Let's respect original UI: No button. Just slider. */}
      {/* But if it's persistent, how does user STOP it? */}
      {/* They likely toggle the tool OFF in the parent dock. */}
      {/* When tool is toggled off, parent unmounts hook or stops it. */}
      {/* So we don't need a button here if original didn't have one. */}
      {/* Wait, original code: const [isPlaying, setIsPlaying] = useState(true); */}
      {/* It was always playing. So merely selecting tool = playing. */}
      {/* Deselecting tool = unmounting = stopping. */}
      {/* So persistent mode = selecting tool = persistent playing. */}
      {/* Deselecting tool = kill hook. */}
      {/* Perfect. */}
    </View>
  );
};

export default Metronome;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  speedText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
  },
  sliderWrapper: {
    width: "100%",
    justifyContent: "center",
    overflow: "visible",
  },
  slider: {
    width: "100%",
    height: 12,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
