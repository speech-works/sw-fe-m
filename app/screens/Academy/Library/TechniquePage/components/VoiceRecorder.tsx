// VoiceRecorder.tsx
import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import RecordingWidget from "./RecordingWidget";
import RecorderWidget from "./RecorderWidget";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles"; // Adjust path if needed
import { theme } from "../../../../../Theme/tokens"; // Adjust path if needed
import { AudioRecorderProvider } from "@siteed/expo-audio-studio";

interface VoiceRecorderProps {
  onToggle?: () => void;
}

const VoiceRecorder = ({ onToggle }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // Changed from `level` to `spectrogramData` to hold the frequency data
  const [spectrogramData, setSpectrogramData] = useState<number[][]>([]);

  return (
    // Wrap your component tree with AudioRecorderProvider from @siteed/expo-audio-studio
    <AudioRecorderProvider>
      <View style={styles.recordingContainer}>
        <RecordingWidget
          isRecording={isRecording}
          isPlaying={isPlaying}
          spectrogramData={spectrogramData} // Pass the spectrogram data to the visualization widget
        />

        <View style={styles.recorderContainer}>
          <RecorderWidget
            onRecord={() => setIsRecording(true)}
            onStopRecording={() => setIsRecording(false)}
            onPlay={() => setIsPlaying(true)}
            onPlaybackStop={() => setIsPlaying(false)}
            onSpectrogramDataUpdate={(data) => setSpectrogramData(data)} // Callback to receive spectrogram data
            onToggle={onToggle}
          />
          <Text style={styles.recordTipText}>
            Tap microphone to record your voice
          </Text>
        </View>
      </View>
    </AudioRecorderProvider>
  );
};

export default VoiceRecorder;

const styles = StyleSheet.create({
  recordingContainer: {
    padding: 16,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  recorderContainer: {
    gap: 16,
    alignItems: "center",
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
