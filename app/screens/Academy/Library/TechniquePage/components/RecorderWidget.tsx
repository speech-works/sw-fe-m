import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens"; // Assuming this path is correct
import { parseShadowStyle } from "../../../../../util/functions/parseStyles"; // Assuming this path is correct

interface RecorderWidgetProps {
  onToggle?: () => void;
  onRecord?: () => void;
  onStopRecording?: () => void;
  onPlay?: () => void;
  isInitiallyRecording?: boolean; // Optional: to set initial recording state
}

const RecorderWidget = ({
  onToggle,
  onPlay,
  onRecord,
  onStopRecording,
  isInitiallyRecording = false,
}: RecorderWidgetProps) => {
  const [isRecording, setIsRecording] = useState<boolean>(isInitiallyRecording);

  // Handler for the main recording button
  const handleRecordButtonPress = () => {
    if (isRecording) {
      // If currently recording, stop recording
      if (onStopRecording) {
        onStopRecording();
      }
      setIsRecording(false);
    } else {
      // If not recording, start recording
      if (onRecord) {
        onRecord();
      }
      setIsRecording(true);
    }
  };

  // Handler for the toggle button
  const handleToggleButtonPress = () => {
    if (onToggle) {
      onToggle();
    }
  };

  // Handler for the play button
  const handlePlayButtonPress = () => {
    if (onPlay) {
      onPlay();
    }
  };

  return (
    <View style={styles.micContainer}>
      {/* Toggle Button */}
      <TouchableOpacity
        style={[styles.circle]}
        onPress={handleToggleButtonPress}
      >
        <Icon name="random" size={16} color={theme.colors.text.default} />
      </TouchableOpacity>

      {/* Record/Stop Button */}
      <TouchableOpacity
        style={[styles.circle, styles.micCircle]}
        onPress={handleRecordButtonPress}
      >
        <Icon
          name={isRecording ? "stop" : "microphone"} // Change icon based on recording state
          size={24}
          color={theme.colors.text.onDark}
        />
      </TouchableOpacity>

      {/* Play Button */}
      <TouchableOpacity style={[styles.circle]} onPress={handlePlayButtonPress}>
        <Icon name="play" size={16} color={theme.colors.text.default} />
      </TouchableOpacity>
    </View>
  );
};

export default RecorderWidget;

const styles = StyleSheet.create({
  micContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start", // Reverted to flex-start
    gap: 16,
    paddingHorizontal: 24,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    height: 64,
    width: 64,
    borderRadius: 32, // 64 / 2 for a circle
    backgroundColor: theme.colors.library.gray[100],
  },
  micCircle: {
    height: 80,
    width: 80,
    borderRadius: 40, // 80 / 2 for a circle
    backgroundColor: theme.colors.library.orange[400],
    ...parseShadowStyle(theme.shadow.elevation2),
  },
});
