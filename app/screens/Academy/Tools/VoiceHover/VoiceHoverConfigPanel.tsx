import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";

interface VoiceHoverConfigProps {
  baseRate: number;
  setBaseRate: (val: number) => void;
  prePause: number;
  setPrePause: (val: number) => void;
  gapBetweenChunks: number;
  setGapBetweenChunks: (val: number) => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
}

export function VoiceHoverConfigPanel({
  baseRate,
  setBaseRate,
  prePause,
  setPrePause,
  gapBetweenChunks,
  setGapBetweenChunks,
  isSpeaking,
  onToggleSpeech,
}: VoiceHoverConfigProps) {
  return (
    <View style={styles.controls}>
      {/* Rate controls */}
      <View style={styles.controlSection}>
        <View style={styles.rowContainer}>
          <Text style={styles.infoText}>Speech Rate</Text>
          <Text style={styles.speedText}>{baseRate.toFixed(1)}×</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={baseRate}
            onValueChange={setBaseRate}
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

      {/* PrePause controls */}
      <View style={styles.controlSection}>
        <View style={styles.rowContainer}>
          <Text style={styles.infoText}>Pre-Pause</Text>
          <Text style={styles.speedText}>{prePause}ms</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1000}
            step={50}
            value={prePause}
            onValueChange={setPrePause}
            minimumTrackTintColor={theme.colors.library.orange[400]}
            maximumTrackTintColor={theme.colors.surface.default}
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>
        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>Short</Text>
          <Text style={styles.paceText}>Long</Text>
        </View>
      </View>

      {/* GapBetween controls */}
      <View style={styles.controlSection}>
        <View style={styles.rowContainer}>
          <Text style={styles.infoText}>Gap Between Chunks</Text>
          <Text style={styles.speedText}>{gapBetweenChunks}ms</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1000}
            step={50}
            value={gapBetweenChunks}
            onValueChange={setGapBetweenChunks}
            minimumTrackTintColor={theme.colors.library.orange[400]}
            maximumTrackTintColor={theme.colors.surface.default}
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>
        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>Short</Text>
          <Text style={styles.paceText}>Long</Text>
        </View>
      </View>

      {/* Speak/Stop button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={onToggleSpeech}
          style={[styles.button, isSpeaking && styles.buttonStop]}
        >
          <Text style={styles.buttonText}>{isSpeaking ? "Stop" : "Speak"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "column",
    gap: 16,
  },
  controlSection: {
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
  },
  slider: {
    width: "100%",
    height: 12,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  buttonContainer: {
    paddingVertical: 8,
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  buttonStop: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
