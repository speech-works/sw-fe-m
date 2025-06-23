import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import { parseShadowStyle } from "../../../../../util/functions/parseStyles";

const RecorderWidget: React.FC<{
  onToggle?: () => void;
  onRecord?: () => void;
  onStopRecording?: () => void;
  onPlay?: () => void;
  onPlaybackStop?: () => void;
  onMetering?: (db: number) => void;
}> = ({
  onToggle,
  onPlay,
  onRecord,
  onStopRecording,
  onPlaybackStop,
  onMetering,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordedUri = useRef<string | null>(null);
  const isMounted = useRef(true);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMounted.current = true;

    (async () => {
      console.log("🔧 Requesting audio permissions");
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) console.warn("⚠️ Audio permission not granted");

      console.log("🔧 Setting audio mode");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    })();

    return () => {
      console.log("🧹 Cleaning up audio resources");
      isMounted.current = false;
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
      }
      sound?.unloadAsync();
      recording?.stopAndUnloadAsync();
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log("🎤 Starting recording");

      // Stop any active playback
      if (isPlaying && sound) {
        console.log("⏹️ Stopping existing playback");
        await sound.stopAsync();
        await sound.unloadAsync();
        setIsPlaying(false);
        onPlaybackStop?.();
      }

      // Create and prepare recording
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true, // Ensure metering is enabled
      });

      // Set up metering updates with higher frequency
      rec.setOnRecordingStatusUpdate((status) => {
        if (
          status.isRecording &&
          typeof status.metering === "number" &&
          isMounted.current
        ) {
          // Send metering data at consistent intervals
          onMetering?.(status.metering);
        }
      });

      // Start recording
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      onRecord?.();

      console.log("✅ Recording started successfully");
    } catch (e) {
      console.error("❌ Recording error:", e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      console.log("🛑 Stopping recording");

      // Clear any metering intervals
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
        meteringInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      recordedUri.current = recording.getURI();
      console.log(`💾 Recording saved: ${recordedUri.current}`);

      setRecording(null);
      setIsRecording(false);
      onStopRecording?.();
    } catch (e) {
      console.error("❌ Stop recording error:", e);
    }
  };

  const togglePlayback = async () => {
    if (isRecording) {
      console.log("🛑 Stopping recording before playback");
      await stopRecording();
    }

    if (!recordedUri.current) {
      console.log("⚠️ No recorded URI for playback");
      return;
    }

    if (isPlaying) {
      // Stop playback
      console.log("⏹️ Stopping playback");
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      setIsPlaying(false);
      onPlaybackStop?.();
    } else {
      // Start playback
      try {
        console.log("▶️ Starting playback");
        const { sound: newSound } = await Audio.Sound.createAsync({
          uri: recordedUri.current,
        });

        // Set up playback status monitoring
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && isMounted.current) {
            if (status.didJustFinish) {
              console.log("✅ Playback finished");
              setIsPlaying(false);
              onPlaybackStop?.();
              newSound.unloadAsync();
            }
          }
        });

        setSound(newSound);
        await newSound.playAsync();
        setIsPlaying(true);
        onPlay?.();

        console.log("✅ Playback started successfully");
      } catch (e) {
        console.error("❌ Playback error:", e);
      }
    }
  };

  return (
    <View style={styles.micContainer}>
      <TouchableOpacity
        style={styles.circle}
        onPress={onToggle}
        disabled={!onToggle || isRecording || isPlaying}
      >
        <Icon
          name="random"
          size={16}
          color={
            !onToggle || isRecording || isPlaying
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

export default RecorderWidget;
