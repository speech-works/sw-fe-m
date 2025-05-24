import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";

const Metronome = () => {
  const [isPlaying, setIsPlaying] = useState(true); // Enable/disable metronome
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [speed, setSpeed] = useState(72);
  const min = 30;
  const max = 150;

  // Load the metronome tick sound
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("../../../../../assets/single-tick.mp3")
      );
      soundRef.current = sound;
    };

    loadSound();

    return () => {
      soundRef.current?.unloadAsync();
      clearInterval(intervalRef.current as NodeJS.Timeout);
    };
  }, []);

  // Update metronome interval when speed changes or play toggles
  useEffect(() => {
    if (!isPlaying || !soundRef.current) return;

    const intervalMs = (60 / speed) * 1000;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      soundRef.current?.replayAsync();
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speed, isPlaying]);

  return (
    <View style={styles.container}>
      <View style={styles.rowContainer}>
        <Text style={styles.infoText}>Metronome Speed</Text>
        <Text style={styles.speedText}>{speed} BPM</Text>
      </View>

      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={1}
          value={speed}
          onValueChange={setSpeed}
          minimumTrackTintColor={theme.colors.library.orange[400]}
          maximumTrackTintColor={theme.colors.surface.default}
          thumbTintColor={theme.colors.library.orange[400]}
        />
      </View>

      <View style={styles.rowContainer}>
        <Text style={styles.paceText}>Slow</Text>
        <Text style={styles.paceText}>Fast</Text>
      </View>
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
