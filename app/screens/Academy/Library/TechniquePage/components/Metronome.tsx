import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";

export const useMetronome = (muteLogic = false) => {
  const [isPlaying, setIsPlaying] = useState(false);
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

  const min = 30;
  const max = 150;

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text style={styles.heroEyebrow}>Tempo</Text>
            <Text style={styles.heroTitle}>Metronome</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              activeIsPlaying ? styles.statusBadgeReady : styles.statusBadgeIdle,
            ]}
          >
            <FAIcon
              name="clock"
              size={12}
              color={
                activeIsPlaying
                  ? "#10B981"
                  : theme.colors.actionPrimary.default
              }
            />
            <Text
              style={[
                styles.statusBadgeText,
                activeIsPlaying
                  ? styles.statusBadgeTextReady
                  : styles.statusBadgeTextIdle,
              ]}
            >
              {activeIsPlaying ? "Playing" : "Ready"}
            </Text>
          </View>
        </View>

        <Text style={styles.heroText}>
          Set a steady beat for your reading, then press start when you're
          ready.
        </Text>
      </View>

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Speed</Text>
            <Text style={styles.sectionTitle}>{activeSpeed} BPM</Text>
          </View>

          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>Beat</Text>
          </View>
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
            maximumTrackTintColor="#F1D9C6"
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>

        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>Slow</Text>
          <Text style={styles.paceText}>Fast</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => activeSetIsPlaying && activeSetIsPlaying(!activeIsPlaying)}
          style={[
            styles.button,
            activeIsPlaying ? styles.buttonStop : styles.buttonStart,
          ]}
          activeOpacity={0.85}
        >
          <View style={styles.buttonContent}>
            <FAIcon
              name={activeIsPlaying ? "stop" : "play"}
              size={14}
              color="#FFF"
            />
            <Text style={styles.buttonText}>
              {activeIsPlaying ? "Stop Metronome" : "Start Metronome"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Metronome;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    flexDirection: "column",
    gap: 14,
  },
  heroCard: {
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 0,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroHeaderText: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.62,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading4),
    color: theme.colors.text.title,
  },
  heroText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusBadgeReady: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.16)",
  },
  statusBadgeIdle: {
    backgroundColor: "#FFF4E6",
    borderColor: "rgba(255, 144, 64, 0.20)",
  },
  statusBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "600",
  },
  statusBadgeTextReady: {
    color: "#0F9F6E",
  },
  statusBadgeTextIdle: {
    color: theme.colors.actionPrimary.default,
  },
  sliderCard: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(253, 182, 129, 0.22)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodyHighLight),
    color: theme.colors.text.title,
  },
  valueBadge: {
    backgroundColor: "#FFF4E6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 144, 64, 0.20)",
  },
  valueBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "700",
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderWrapper: {
    width: "100%",
    justifyContent: "center",
    overflow: "visible",
  },
  slider: {
    width: "100%",
    height: 22,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    opacity: 0.68,
  },
  buttonContainer: {
    marginTop: 2,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle("0px 6px 16px 0px rgba(255, 144, 64, 0.18)"),
  },
  buttonStart: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  buttonStop: {
    backgroundColor: "#E85D4A",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "600",
  },
});
