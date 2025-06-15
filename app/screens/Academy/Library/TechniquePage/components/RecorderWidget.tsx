// RecorderWidget.tsx
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av"; // Still needed for general permissions and audio mode
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens"; // Adjust path if needed
import { parseShadowStyle } from "../../../../../util/functions/parseStyles"; // Adjust path if needed

// Import from the new library, using correct exports
import {
  useAudioRecorder,
  // extractMelSpectrogram, // Not directly used for real-time visualization in this component
} from "@siteed/expo-audio-studio";

interface RecorderWidgetProps {
  onToggle?: () => void;
  onRecord?: () => void;
  onStopRecording?: () => void;
  onPlay?: () => void;
  onPlaybackStop?: () => void;
  // New prop to update spectrogram data (replaces onLevelUpdate)
  onSpectrogramDataUpdate?: (data: number[][]) => void;
  isInitiallyRecording?: boolean;
}

const RecorderWidget: React.FC<RecorderWidgetProps> = ({
  onToggle,
  onPlay,
  onRecord,
  onStopRecording,
  onPlaybackStop,
  onSpectrogramDataUpdate,
  isInitiallyRecording = false,
}) => {
  // Use the hook and destructure its returned values correctly
  // Assuming useAudioRecorder only provides recording specific functionalities
  const {
    startRecording: studioStartRecording,
    stopRecording: studioStopRecording,
    isRecording: studioIsRecording, // Real-time recording status from the hook
  } = useAudioRecorder();

  // Internal states to manage UI for recording and playback
  const [isPlaying, setIsPlaying] = useState(false);
  const recordedFileUri = useRef<string | null>(null); // To store the URI for playback after recording
  const playbackSoundObjectRef = useRef<Audio.Sound | null>(null); // To manage the expo-av Sound object

  // Ref to hold the spectrogram interval ID for cleanup
  const spectrogramIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1) Request permissions and set audio mode once
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          console.warn("Audio recording permission not granted!");
        }

        // Set the audio mode for recording and playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
          interruptionModeIOS: 1, // INTERRUPTION_MODE_IOS_DO_NOT_MIX
        });
      } catch (err) {
        console.error("Failed to set audio mode or get permissions:", err);
      }
    };

    setupAudio();

    // Cleanup function to stop all recordings/players when component unmounts
    return () => {
      // If there's a sound playing, unload it
      if (playbackSoundObjectRef.current) {
        playbackSoundObjectRef.current.unloadAsync();
        playbackSoundObjectRef.current = null;
      }
      // Stop any ongoing recording via the hook
      // It's good practice to stop recording if component unmounts while recording
      studioStopRecording();
    };
  }, []); // Empty dependency array as this runs once on mount/unmount

  // 2) Manage real-time spectrogram data updates (SIMULATED)
  // This effect starts/stops the simulation based on `studioIsRecording` state.
  useEffect(() => {
    if (studioIsRecording && onSpectrogramDataUpdate) {
      // Start an interval to simulate spectrogram data updates
      spectrogramIntervalRef.current = setInterval(() => {
        const simulatedSpectrogram: number[][] = [];
        const numFrequencyBins = 20; // Number of "frequency" bars to display
        const numTimeSlices = 1; // We're showing one "slice" (current moment)

        // Simulate a varying 'energy' or 'amplitude'
        const currentEnergy = 0.3 + Math.random() * 0.7; // Values between 0.3 and 1.0

        // Create the "spectrogram" data for the current time slice
        for (let t = 0; t < numTimeSlices; t++) {
          const slice: number[] = [];
          for (let f = 0; f < numFrequencyBins; f++) {
            // Simulate frequency response: higher values at lower "frequencies" (index 0)
            // with some randomness to make it look dynamic.
            const magnitude =
              currentEnergy * (1 - f / numFrequencyBins) + Math.random() * 0.1;
            slice.push(Math.min(Math.max(magnitude, 0), 1)); // Ensure values are between 0 and 1
          }
          simulatedSpectrogram.push(slice);
        }
        onSpectrogramDataUpdate(simulatedSpectrogram);
      }, 100); // Update visualization every 100ms
    } else {
      // Clear spectrogram data when not recording/playing
      if (spectrogramIntervalRef.current) {
        clearInterval(spectrogramIntervalRef.current);
        spectrogramIntervalRef.current = null;
      }
      onSpectrogramDataUpdate?.([]); // Clear visual data
    }

    return () => {
      // Cleanup interval on unmount or when dependencies change
      if (spectrogramIntervalRef.current) {
        clearInterval(spectrogramIntervalRef.current);
        spectrogramIntervalRef.current = null;
      }
    };
  }, [studioIsRecording, onSpectrogramDataUpdate]);

  // Handle cleanup for playback sound object
  useEffect(() => {
    // When isPlaying changes to false, ensure the sound object is unloaded
    // This is already handled by setOnPlaybackStatusUpdate inside togglePlayback
    // but this acts as an additional safeguard, especially if playback is stopped
    // by external means or if `isPlaying` changes due to other logic.
    if (!isPlaying && playbackSoundObjectRef.current) {
      playbackSoundObjectRef.current.unloadAsync();
      playbackSoundObjectRef.current = null;
    }
  }, [isPlaying]);

  // 3) Recording controls
  const startRecording = async () => {
    try {
      if (isPlaying) {
        // If playing, stop playback before starting recording
        if (playbackSoundObjectRef.current) {
          await playbackSoundObjectRef.current.stopAsync(); // Use stopAsync()
          await playbackSoundObjectRef.current.unloadAsync(); // Then unloadAsync()
          playbackSoundObjectRef.current = null;
        }
        setIsPlaying(false);
        onPlaybackStop?.();
      }

      await studioStartRecording({
        // For real-time analysis, you would use onNewAudioChunk here
        // onNewAudioChunk: (chunk: { base64: string; sampleRate: number; channels: number }) => {
        //   // Process `chunk.base64` (PCM float32) for actual FFT here
        //   // This would be much more complex to implement for visualization.
        //   // The current implementation uses a simulated spectrogram.
        // },
      });
      onRecord?.(); // Notify parent that recording started
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await studioStopRecording();
      if (result && result?.fileUri) {
        recordedFileUri.current = result.fileUri; // Store the URI for playback
      }
      onStopRecording?.(); // Notify parent that recording stopped
      onSpectrogramDataUpdate?.([]); // Clear spectrogram when recording stops
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  // 4) Playback controls
  const togglePlayback = async () => {
    try {
      const uri = recordedFileUri.current;
      if (!uri) {
        console.warn("No recording URI available for playback.");
        return;
      }

      if (studioIsRecording) {
        // If recording, stop recording before starting playback
        await stopRecording();
      }

      if (isPlaying) {
        // If currently playing, stop playback
        if (playbackSoundObjectRef.current) {
          await playbackSoundObjectRef.current.stopAsync(); // Use stopAsync()
          await playbackSoundObjectRef.current.unloadAsync(); // Then unloadAsync()
          playbackSoundObjectRef.current = null;
        }
        setIsPlaying(false);
        onPlaybackStop?.();
        onSpectrogramDataUpdate?.([]); // Clear spectrogram when playback stops
      } else {
        // If not playing, start playback
        onSpectrogramDataUpdate?.([]); // Clear it during playback for simplicity
        const { sound } = await Audio.Sound.createAsync({ uri });

        // Set the onPlaybackStatusUpdate listener for cleanup
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            onPlaybackStop?.();
            sound.unloadAsync(); // Unload the sound when it finishes playing
            playbackSoundObjectRef.current = null;
          }
        });

        playbackSoundObjectRef.current = sound;
        await sound.playAsync();
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (err) {
      console.error("Playback error", err);
    }
  };

  return (
    <View style={styles.micContainer}>
      <TouchableOpacity
        style={styles.circle}
        onPress={onToggle}
        disabled={studioIsRecording || isPlaying} // Disable if recording or playing
      >
        <Icon
          name="random"
          size={16}
          color={
            studioIsRecording || isPlaying
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
        onPress={studioIsRecording ? stopRecording : startRecording}
        disabled={isPlaying} // Disable mic button if playing
      >
        <Icon
          name={studioIsRecording ? "stop" : "microphone"}
          size={24}
          color={
            isPlaying ? theme.colors.text.disabled : theme.colors.text.onDark
          }
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.circle}
        onPress={togglePlayback}
        disabled={studioIsRecording || !recordedFileUri.current} // Disable if recording or no URI
      >
        <Icon
          name={isPlaying ? "pause" : "play"}
          size={16}
          color={
            studioIsRecording || !recordedFileUri.current
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
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  disabledCircle: {
    backgroundColor: theme.colors.surface.disabled,
  },
});
