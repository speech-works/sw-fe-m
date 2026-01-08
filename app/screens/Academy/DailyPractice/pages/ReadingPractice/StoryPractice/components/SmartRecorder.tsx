import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import ModernWaveform from "../../../../../Library/TechniquePage/components/ModernWaveform";
import { useAudioRecorder } from "./useAudioRecorder";

const width = Dimensions.get("window").width;

interface Props {
  onRecorded?: (uri: string) => void;
  onToggle?: () => void;
  prevRecordingUri?: string;
  renderTools?: () => React.ReactNode;
  onSubmit?: () => void;
  onDiscard?: () => void;
}

const SmartRecorder: React.FC<Props> = ({
  onRecorded,
  prevRecordingUri,
  renderTools,
  onSubmit,
  onDiscard,
}) => {
  const {
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    state,
    waveform,
    playbackPosition, // Needed for replay sync
    deleteRecording,
  } = useAudioRecorder();

  const isRecording = state === "recording";
  const isPlaying = state === "playback";
  const hasRecording = !!prevRecordingUri;

  // Waveform Visualization Logic
  const POINTS = 40; // Match the visualizer
  const displayEnvelope = useMemo(() => {
    if (isRecording) {
      const slice = waveform.slice(-POINTS);
      return [
        ...new Array(Math.max(0, POINTS - slice.length)).fill(0),
        ...slice,
      ];
    }
    if (isPlaying) {
      const index = Math.floor(playbackPosition / 50); // 50ms per sample
      const slice = waveform.slice(Math.max(0, index - POINTS), index);
      return [
        ...new Array(Math.max(0, POINTS - slice.length)).fill(0),
        ...slice,
      ];
    }
    return waveform; // Review Mode: Show full history squeezed
  }, [waveform, isRecording, isPlaying, playbackPosition]);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    const uri = await stopRecording();
    if (uri && onRecorded) {
      onRecorded(uri);
    }
  };

  const handlePlay = () => {
    if (prevRecordingUri) startPlayback(prevRecordingUri);
  };

  const handleStopPlay = () => {
    stopPlayback();
  };

  const handleDiscard = () => {
    deleteRecording();
    onDiscard?.();
  };

  return (
    <View style={styles.container}>
      {/* Floating Dock */}
      <LinearGradient
        colors={["#FFF", "#FDFDFD"]}
        style={[styles.dock, isRecording && styles.dockRecording]}
      >
        {/* LEFT SECTION: Tools or Timer */}
        <View
          style={
            isRecording
              ? styles.leftSectionRecording
              : isPlaying
              ? styles.leftSectionCompact
              : styles.leftSection
          }
        >
          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Rec</Text>
            </View>
          ) : hasRecording ? (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleDiscard}
            >
              <Icon name="trash" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View style={styles.toolsWrapper}>{renderTools?.()}</View>
          )}
        </View>

        {/* SEPARATOR (Only in Idle) */}
        {!isRecording && !hasRecording && <View style={styles.separator} />}

        {/* CENTER SECTION:  Mic Button OR Waveform */}
        <View
          style={
            !isRecording && !isPlaying
              ? styles.centerSection
              : styles.centerSectionRecording
          }
        >
          {isRecording || isPlaying ? (
            <View style={styles.waveformWrapper}>
              <ModernWaveform
                envelope={displayEnvelope}
                mode={state}
                height={32}
                glowColor={
                  isRecording
                    ? theme.colors.library.red[500]
                    : theme.colors.library.orange[500]
                }
                points={POINTS}
              />
            </View>
          ) : hasRecording ? (
            <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
              <LinearGradient
                colors={["#FFF", "#F5F5F5"]}
                style={StyleSheet.absoluteFill}
              />
              <Icon
                name="play"
                size={20}
                color="#94A3B8"
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>
          ) : (
            // Idle Center: Empty Spacer
            <View style={{ flex: 1 }} />
          )}
        </View>

        {/* RIGHT SECTION: Stop/Submit */}
        <View style={styles.rightSection}>
          {isRecording ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.red[500],
                  theme.colors.library.red[600],
                ]}
                style={StyleSheet.absoluteFill}
              />
              <Icon name="stop" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : isPlaying ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopPlay}
            >
              <LinearGradient
                colors={["#F1F5F9", "#E2E8F0"]}
                style={StyleSheet.absoluteFill}
              />
              <Icon name="stop" size={16} color={theme.colors.text.default} />
            </TouchableOpacity>
          ) : hasRecording ? (
            <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
              <Icon name="check" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            // Idle Right: Mic Button (Moved from Center)
            <TouchableOpacity
              style={styles.mainMicButton}
              onPress={handleStartRecording}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                style={StyleSheet.absoluteFill}
              />
              <Icon name="microphone" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 34, // Safe area margin
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    height: 70,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dockRecording: {
    backgroundColor: "#FFF",
    borderColor: theme.colors.library.red[200],
    borderWidth: 2,
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: 4,
    justifyContent: "center",
  },
  leftSectionRecording: {
    width: "auto",
    alignItems: "flex-start",
    paddingLeft: 12,
    justifyContent: "center",
  },
  leftSectionCompact: {
    width: "auto",
    alignItems: "flex-start",
    paddingLeft: 4,
    justifyContent: "center",
  },
  centerSection: {
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSectionRecording: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSection: {
    minWidth: 60, // Ensure space for controls
    alignItems: "flex-end",
    paddingRight: 4,
    justifyContent: "center",
  },
  waveformWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.library.red[500],
    marginRight: 6,
  },
  recordingText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  toolsWrapper: {
    width: "100%",
  },
  mainMicButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FFF",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
});

export default SmartRecorder;
