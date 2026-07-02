import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  Button,
  Slider,
  withAlpha,
} from "../../../../../design-system";

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
  accentColor?: string;
  onAccentColor?: string;
}

const Metronome = ({
  isPlaying: controlledIsPlaying,
  onTogglePlay,
  speed: controlledSpeed,
  onSpeedChange,
  accentColor,
  onAccentColor,
}: MetronomeProps) => {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.action.primary;
  const onAccent = onAccentColor ?? colors.action.onPrimary;
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
      {/* Hero — free-floating eyebrow/title/status on the sheet surface. */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text variant="label" color="tertiary">
              TEMPO
            </Text>
            <Text variant="h3" color="primary">
              Metronome
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: activeIsPlaying
                  ? colors.accentTint.success
                  : withAlpha(accent, 0.14),
              },
            ]}
          >
            <Icon
              name={icons.duration}
              size={12}
              color={
                activeIsPlaying
                  ? colors.feedback.successText
                  : accent
              }
            />
            <Text
              variant="label"
              color={
                activeIsPlaying
                  ? colors.feedback.successText
                  : accent
              }
            >
              {activeIsPlaying ? "Playing" : "Ready"}
            </Text>
          </View>
        </View>

        <Text variant="bodySm" color="secondary">
          Set a steady beat for your reading, then press start when you're
          ready.
        </Text>
      </View>

      {/* Slider card — elevated surface + hairline. */}
      <View
        style={[
          styles.sliderCard,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.sliderHeader}>
          <View>
            <Text variant="label" color="tertiary">
              SPEED
            </Text>
            <Text variant="h3" color="primary">
              {activeSpeed} BPM
            </Text>
          </View>

          <View
            style={[
              styles.valueBadge,
              {
                backgroundColor: withAlpha(accent, 0.14),
                borderColor: accent,
              },
            ]}
          >
            <Text variant="label" color={accent}>
              Beat
            </Text>
          </View>
        </View>

        <Slider
          minimumValue={min}
          maximumValue={max}
          step={1}
          value={activeSpeed}
          onValueChange={(val) => activeSetSpeed && activeSetSpeed(val)}
          haptic={false}
          accentColor={accent}
        />

        <View style={styles.rowContainer}>
          <Text variant="caption" color="tertiary">
            Slow
          </Text>
          <Text variant="caption" color="tertiary">
            Fast
          </Text>
        </View>
      </View>

      <Button
        variant={activeIsPlaying ? "secondary" : "primary"}
        label={activeIsPlaying ? "Stop Metronome" : "Start Metronome"}
        leftIcon={activeIsPlaying ? icons.stop : icons.play}
        onPress={() => activeSetIsPlaying && activeSetIsPlaying(!activeIsPlaying)}
        accentColor={accent}
        onAccentColor={onAccent}
      />
    </View>
  );
};

export default Metronome;

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    flexDirection: "column",
    gap: spacing.lg,
  },
  heroCard: {
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sliderCard: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    borderWidth: borderWidth.thin,
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: borderWidth.thin,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
