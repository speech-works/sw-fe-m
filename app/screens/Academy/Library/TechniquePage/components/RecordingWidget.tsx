// RecordingWidget.tsx
import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens"; // Adjust path if needed
import { parseTextStyle } from "../../../../../util/functions/parseStyles"; // Adjust path if needed

interface RecordingWidgetProps {
  isRecording?: boolean;
  isPlaying?: boolean;
  // Renamed `level` to `spectrogramData`
  spectrogramData?: number[][]; // A 2D array: [time_slice_idx][frequency_bin_idx]
}

const BAR_COUNT = 30; // Number of bars in your visualization
const MAX_BAR_HEIGHT = 80;

const RecordingWidget = ({
  isRecording,
  isPlaying,
  spectrogramData = [], // Default to empty array
}: RecordingWidgetProps) => {
  // Create a sliding window of animated values for the bars
  const animValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    let frameId: number;

    const updateWave = () => {
      let currentDisplayLevel = 0;

      if (isRecording || isPlaying) {
        if (spectrogramData.length > 0) {
          // Take the latest "time slice" from the spectrogram data
          const latestTimeSlice = spectrogramData[spectrogramData.length - 1];
          if (latestTimeSlice && latestTimeSlice.length > 0) {
            // Average the magnitudes across all frequency bins in the latest slice
            // This converts the spectrogram slice into a single "level" for your bar graph.
            const sumOfMagnitudes = latestTimeSlice.reduce(
              (sum, val) => sum + val,
              0
            );
            currentDisplayLevel = sumOfMagnitudes / latestTimeSlice.length;
          }
        }
      }

      // Shift all bars left by copying the next bar’s value
      for (let i = 0; i < BAR_COUNT - 1; i++) {
        const nextVal = (animValues[i + 1] as any)._value; // Access the current value of the next Animated.Value
        animValues[i].setValue(nextVal);
      }

      // Insert the new calculated level at the end of the bars
      animValues[BAR_COUNT - 1].setValue(currentDisplayLevel * MAX_BAR_HEIGHT);

      // Schedule the next frame
      frameId = requestAnimationFrame(updateWave);
    };

    if (isRecording || isPlaying) {
      // Start the animation loop when recording or playing
      frameId = requestAnimationFrame(updateWave);
    } else {
      // Reset all bars to zero when idle
      animValues.forEach((v) => v.setValue(0));
    }

    // Cleanup function to cancel the animation frame
    return () => cancelAnimationFrame(frameId);
  }, [isRecording, isPlaying, spectrogramData]); // Re-run effect if these props change

  return (
    <View style={styles.container}>
      <View style={styles.infoBar}>
        <View style={styles.infoBarInner}>
          <Icon
            name="wave-square"
            size={16}
            color={theme.colors.actionPrimary.default}
          />
          <Text style={styles.infoBarLeftText}>Speech</Text>
        </View>

        {(isRecording || isPlaying) && (
          <View style={styles.infoBarInner}>
            <Text style={styles.infoBarRightText}>
              {isRecording ? "Recording" : "Playing"}
            </Text>
            <Icon
              solid
              name="circle"
              size={8}
              color={theme.colors.library.green[500]}
            />
          </View>
        )}
      </View>

      <View style={styles.wave}>
        <View style={styles.barContainer}>
          {animValues.map((val, idx) => (
            <Animated.View key={idx} style={[styles.bar, { height: val }]} />
          ))}
        </View>
      </View>
    </View>
  );
};

export default RecordingWidget;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBarLeftText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  infoBarRightText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[500],
  },
  wave: {
    height: MAX_BAR_HEIGHT,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden", // Important for clipping bars that exceed bounds
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "flex-end", // Bars grow upwards from the bottom
    justifyContent: "space-between",
    paddingHorizontal: 8,
    width: "100%", // Ensure bars take full width
  },
  bar: {
    backgroundColor: theme.colors.library.green[300],
    borderRadius: 2,
    flex: 1, // Distributes width equally among bars
    marginHorizontal: 1, // Small gap between bars
  },
});
