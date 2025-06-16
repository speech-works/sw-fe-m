import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseShadowStyle } from "../../../../../util/functions/parseStyles";

interface RecorderWidgetProps {
  onToggle?: () => void;
  onRecord?: () => void;
  onStopRecording?: () => void;
  onPlay?: () => void;
  onPlaybackStop?: () => void;
}

const RecorderWidget: React.FC<RecorderWidgetProps> = ({
  onToggle,
  onPlay,
  onRecord,
  onStopRecording,
  onPlaybackStop,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordedUri = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) console.warn("Audio permission not granted");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1,
        interruptionModeIOS: 1,
      });
    })();

    return () => {
      sound?.unloadAsync();
      recording?.stopAndUnloadAsync();
    };
  }, []);

  const startRecording = async () => {
    try {
      if (isPlaying && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setIsPlaying(false);
        onPlaybackStop?.();
      }
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      onRecord?.();
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    recordedUri.current = recording.getURI();
    setIsRecording(false);
    setRecording(null);
    onStopRecording?.();
  };

  const togglePlayback = async () => {
    if (isRecording) await stopRecording();
    const uri = recordedUri.current;
    if (!uri) return;

    if (isPlaying && sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setIsPlaying(false);
      onPlaybackStop?.();
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          onPlaybackStop?.();
          newSound.unloadAsync();
        }
      });
      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);
      onPlay?.();
    }
  };

  return (
    <View style={styles.micContainer}>
      <TouchableOpacity
        style={styles.circle}
        onPress={onToggle}
        disabled={isRecording || isPlaying}
      >
        <Icon
          name="random"
          size={16}
          color={
            isRecording || isPlaying
              ? theme.colors.text.disabled
              : theme.colors.text.default
          }
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.circle,
          styles.micCircle,
          isPlaying && styles.disabledCircle,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isPlaying}
      >
        <Icon
          name={isRecording ? "stop" : "microphone"}
          size={24}
          color={
            isPlaying ? theme.colors.text.disabled : theme.colors.text.onDark
          }
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.circle}
        onPress={togglePlayback}
        disabled={isRecording || !recordedUri.current}
      >
        <Icon
          name={isPlaying ? "pause" : "play"}
          size={16}
          color={
            isRecording || !recordedUri.current
              ? theme.colors.text.disabled
              : theme.colors.text.default
          }
        />
      </TouchableOpacity>
    </View>
  );
};

export default RecorderWidget;

const styles = StyleSheet.create({
  micContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.library.gray[100],
  },
  micCircle: {
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.library.orange[400],
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCircle: {
    backgroundColor: theme.colors.surface.disabled,
  },
});
