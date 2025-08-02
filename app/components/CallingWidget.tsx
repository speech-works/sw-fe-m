import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../util/functions/parseStyles";
import { useCallSession } from "../hooks/useCallSession";

interface CallingWidgetProps {
  userId: string;
  websocketUrl: string;
}

const CallingWidget: React.FC<CallingWidgetProps> = ({
  userId,
  websocketUrl,
}) => {
  const {
    isCallActive,
    startCall,
    endCall,
    isUserMuted,
    toggleUserMute,
    isAgentMuted,
    toggleAgentMute,
    callDuration,
    currentTurn,
  } = useCallSession({ userId, websocketUrl });

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  return (
    <View style={styles.callContainer}>
      {isCallActive && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
        </View>
      )}
      {/* <TouchableOpacity
        onPress={debugSaveAudioChunk}
        style={{ padding: 10, backgroundColor: "blue", margin: 20 }}
      >
        <Text style={{ color: "white" }}>Save Debug Audio</Text>
      </TouchableOpacity> */}
      <Text
        style={{
          ...parseTextStyle(theme.typography.Heading3),
        }}
      >
        {currentTurn}
      </Text>
      <TouchableOpacity
        style={[styles.circle, !isCallActive && styles.disabledCircle]}
        onPress={toggleUserMute}
        disabled={!isCallActive}
      >
        <Icon
          name={isUserMuted ? "microphone-slash" : "microphone"}
          size={16}
          color={
            isCallActive ? theme.colors.text.default : theme.colors.text.onDark
          }
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.circle,
          styles.phoneCircle,
          isCallActive
            ? { backgroundColor: theme.colors.library.red[600] }
            : {},
        ]}
        onPress={() => (isCallActive ? endCall() : startCall())}
      >
        <Icon
          name={isCallActive ? "phone-slash" : "phone"}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.circle, !isCallActive && styles.disabledCircle]}
        onPress={toggleAgentMute}
        disabled={!isCallActive}
      >
        <Icon
          name={isAgentMuted ? "volume-mute" : "volume-up"}
          size={16}
          color={
            isCallActive ? theme.colors.text.default : theme.colors.text.onDark
          }
        />
      </TouchableOpacity>
    </View>
  );
};

export default CallingWidget;

const styles = StyleSheet.create({
  callContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.library.gray[100],
  },
  phoneCircle: {
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.library.green[600],
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCircle: {
    backgroundColor: theme.colors.surface.disabled,
  },
  timerContainer: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text.default,
  },
});
