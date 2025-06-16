import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import RecordingWidget from "./RecordingWidget";
import RecorderWidget from "./RecorderWidget";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";

interface VoiceRecorderProps {
  onToggle?: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onToggle }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <View style={styles.recordingContainer}>
      <RecordingWidget isRecording={isRecording} isPlaying={isPlaying} />

      <View style={styles.recorderContainer}>
        <RecorderWidget
          onRecord={() => setIsRecording(true)}
          onStopRecording={() => setIsRecording(false)}
          onPlay={() => setIsPlaying(true)}
          onPlaybackStop={() => setIsPlaying(false)}
          onToggle={onToggle}
        />
        <Text style={styles.recordTipText}>
          Tap microphone to record your voice
        </Text>
      </View>
    </View>
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
