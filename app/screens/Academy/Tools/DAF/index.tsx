// DAFTool.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
// Assume a real-time audio library like @siteed/expo-audio-studio or mykin-ai/expo-audio-stream
// For demonstration, we'll mock its interface. In a real app, you'd import:
// import { AudioProcessor, AudioStreamer } from '@siteed/expo-audio-studio';
// OR
// import { startMicrophone, playSound, stopMicrophone, stopSound } from 'mykin-ai/expo-audio-stream';

import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import { Audio } from "expo-av"; // Use expo-av for microphone permissions

// --- Mocking the Real-time Audio Library Interface ---
// In a real application, you would replace this with actual imports and API calls
// from a library like @siteed/expo-audio-studio or mykin-ai/expo-audio-stream.
interface RealtimeAudioLib {
  startMicrophone: (options: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  }) => Promise<void>;
  stopMicrophone: () => Promise<void>;
  onAudioFrame: (callback: (frame: number[]) => void) => () => void; // Listener for incoming audio frames
  playAudioChunk: (
    chunk: number[],
    sampleRate: number,
    channels: number
  ) => Promise<void>;
  stopPlayback: () => Promise<void>;
}

// Simple mock implementation for demonstration purposes.
// This mock does NOT simulate real-time performance or actual audio output.
// It's just to make the component logic compilable and illustrate the flow.
const mockRealtimeAudioLib: RealtimeAudioLib = (() => {
  let audioFrameCallback: ((frame: number[]) => void) | null = null;
  const mockAudioBuffer = new Array(512).fill(0); // Simulate a small audio buffer

  return {
    async startMicrophone(options) {
      console.log("Mock: Starting microphone with options:", options);
      // In a real library, this would set up native audio input.
      // We can simulate frames being received at an interval here.
      // This part is crucial for real DAF: low-latency frame delivery.
      setInterval(() => {
        if (audioFrameCallback) {
          // In a real scenario, this would be actual microphone data.
          // For mock, just send a dummy buffer.
          audioFrameCallback(
            mockAudioBuffer.map(() => Math.random() * 0.1 - 0.05)
          );
        }
      }, options.bufferSize / (options.sampleRate / 1000)); // Simulate frame rate
      return Promise.resolve();
    },
    async stopMicrophone() {
      console.log("Mock: Stopping microphone.");
      // In a real library, this would tear down native audio input.
      return Promise.resolve();
    },
    onAudioFrame(callback) {
      audioFrameCallback = callback;
      return () => {
        audioFrameCallback = null;
      }; // Cleanup function
    },
    async playAudioChunk(chunk, sampleRate, channels) {
      // In a real library, this would play the audio data to the output.
      console.log(
        `Mock: Playing audio chunk (${chunk.length} samples, ${sampleRate}Hz, ${channels}ch)`
      );
      return Promise.resolve();
    },
    async stopPlayback() {
      console.log("Mock: Stopping playback.");
      return Promise.resolve();
    },
  };
})();
// --- End Mocking ---

type DAFToolProps = {
  style?: object;
};

// Queue for audio frames to implement delay
interface AudioFrame {
  timestamp: number; // When this frame was captured
  data: number[]; // The raw audio data
}

export function DAFTool({ style }: DAFToolProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isDAFActive, setIsDAFActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Microphone permission required."
  );
  const [delayMs, setDelayMs] = useState(250); // Default DAF delay
  const audioQueueRef = useRef<AudioFrame[]>([]);
  const lastPlaybackTimeRef = useRef(0);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferSize = 1024; // Number of samples per audio frame (adjust based on library)
  const sampleRate = 44100; // Standard audio sample rate
  const channels = 1; // Mono audio for simplicity

  // Request microphone permissions
  useEffect(() => {
    (async () => {
      // Use Audio.requestPermissionsAsync for microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        setStatusMessage("Microphone permission denied. DAF cannot function.");
      } else {
        setStatusMessage("Permission granted. Press Start DAF.");
      }
    })();
  }, []);

  // Effect for managing real-time audio input and output
  useEffect(() => {
    if (!hasPermission) return;

    let unsubscribeFromAudioFrames: (() => void) | null = null;

    const startAudioProcessing = async () => {
      try {
        await mockRealtimeAudioLib.startMicrophone({
          sampleRate,
          channels,
          bufferSize,
        });

        // Set up listener for incoming audio frames
        unsubscribeFromAudioFrames = mockRealtimeAudioLib.onAudioFrame(
          (frameData) => {
            // Add incoming frame with its capture timestamp to the queue
            audioQueueRef.current.push({
              timestamp: Date.now(),
              data: frameData,
            });
          }
        );

        // Start interval for playing delayed audio frames
        // This interval determines how frequently we check for and play delayed audio
        playIntervalRef.current = setInterval(() => {
          if (!isDAFActive) return; // Only play if DAF is active

          const now = Date.now();
          // Find the first frame that is "old enough" to be played back (current time - delay)
          const indexToPlay = audioQueueRef.current.findIndex(
            (frame) => now - frame.timestamp >= delayMs
          );

          if (indexToPlay !== -1) {
            // Remove and get frames that are ready to be played
            const framesToPlay = audioQueueRef.current.splice(
              0,
              indexToPlay + 1
            );

            // Concatenate all data from frames that are ready to play in this interval
            const combinedData = framesToPlay.flatMap((frame) => frame.data);

            if (combinedData.length > 0) {
              mockRealtimeAudioLib
                .playAudioChunk(combinedData, sampleRate, channels)
                .catch((e) => console.error("Error playing audio chunk:", e));
            }
          }
        }, 50); // Check and play every 50ms (adjust for latency vs. processing load)

        setStatusMessage("DAF Active. Speak into microphone.");
      } catch (error) {
        console.error("Error starting real-time audio:", error);
        setStatusMessage("Failed to start DAF. Check console for details.");
        setIsDAFActive(false);
      }
    };

    const stopAudioProcessing = async () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      if (unsubscribeFromAudioFrames) {
        unsubscribeFromAudioFrames();
        unsubscribeFromAudioFrames = null;
      }
      await mockRealtimeAudioLib
        .stopMicrophone()
        .catch((e) => console.error("Error stopping mic:", e));
      await mockRealtimeAudioLib
        .stopPlayback()
        .catch((e) => console.error("Error stopping playback:", e));
      audioQueueRef.current = []; // Clear any remaining audio in queue
      setStatusMessage("DAF Stopped.");
    };

    if (isDAFActive) {
      startAudioProcessing();
    } else {
      stopAudioProcessing();
    }

    // Cleanup function for this effect
    return () => {
      stopAudioProcessing(); // Ensure everything is stopped on unmount or effect re-run
    };
  }, [isDAFActive, hasPermission, delayMs]); // Re-run if DAF state, permission, or delay changes

  const toggleDAF = () => {
    if (hasPermission === false) {
      setStatusMessage("Microphone permission not granted.");
      return;
    }
    setIsDAFActive((prev) => !prev);
  };

  const onDelayChange = useCallback((value: number) => {
    const newDelay = Math.round(value);
    setDelayMs(newDelay);
    // When delay changes, if DAF is active, the useEffect will re-run and restart processing
    // with the new delay, effectively applying the change.
  }, []);

  if (hasPermission === null) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>
          Requesting microphone permission...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.heading}>Real-time Delayed Auditory Feedback</Text>

      <View style={styles.controlsSection}>
        {/* Start/Stop DAF Button */}
        <TouchableOpacity
          onPress={toggleDAF}
          style={[
            styles.button,
            isDAFActive ? styles.buttonStop : styles.buttonStart,
          ]}
          disabled={hasPermission === false}
        >
          <Text style={styles.buttonText}>
            {isDAFActive ? "Stop DAF" : "Start DAF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delay Slider */}
      <View style={styles.controlSection}>
        <View style={styles.rowContainer}>
          <Text style={styles.infoText}>Delay Time</Text>
          <Text style={styles.speedText}>{delayMs}ms</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0} // Minimum delay
            maximumValue={1000} // Max 1 second delay (adjust as needed for DAF effect)
            step={25} // Step by 25ms
            value={delayMs}
            onValueChange={onDelayChange}
            minimumTrackTintColor={theme.colors.library.orange[400]}
            maximumTrackTintColor={theme.colors.surface.default}
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>
        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>No Delay</Text>
          <Text style={styles.paceText}>Long Delay</Text>
        </View>
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.library.orange[100],
    flexDirection: "column",
    gap: 16,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 8,
  },
  controlsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonStart: {
    backgroundColor: theme.colors.actionPrimary.default, // Blue for Start
  },
  buttonStop: {
    backgroundColor: theme.colors.library.red[500], // Red for Stop
  },
  buttonText: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "600",
  },
  controlSection: {
    width: "100%",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
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
    overflow: "visible",
  },
  slider: {
    width: "100%",
    height: 12,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  statusText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginTop: 10,
  },
});
