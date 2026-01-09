// DAFTool.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import { Audio } from "expo-av"; // Use expo-av for microphone permissions

// --- Mocking the Real-time Audio Library Interface ---
interface RealtimeAudioLib {
  startMicrophone: (options: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  }) => Promise<void>;
  stopMicrophone: () => Promise<void>;
  onAudioFrame: (callback: (frame: number[]) => void) => () => void;
  playAudioChunk: (
    chunk: number[],
    sampleRate: number,
    channels: number
  ) => Promise<void>;
  stopPlayback: () => Promise<void>;
}

const mockRealtimeAudioLib: RealtimeAudioLib = (() => {
  let audioFrameCallback: ((frame: number[]) => void) | null = null;
  const mockAudioBuffer = new Array(512).fill(0);

  return {
    async startMicrophone(options) {
      // console.log("Mock: Starting microphone with options:", options);
      setInterval(() => {
        if (audioFrameCallback) {
          audioFrameCallback(
            mockAudioBuffer.map(() => Math.random() * 0.1 - 0.05)
          );
        }
      }, options.bufferSize / (options.sampleRate / 1000));
      return Promise.resolve();
    },
    async stopMicrophone() {
      // console.log("Mock: Stopping microphone.");
      return Promise.resolve();
    },
    onAudioFrame(callback) {
      audioFrameCallback = callback;
      return () => {
        audioFrameCallback = null;
      };
    },
    async playAudioChunk(chunk, sampleRate, channels) {
      // console.log(`Mock: Playing audio chunk (${chunk.length} samples, ${sampleRate}Hz, ${channels}ch)`);
      return Promise.resolve();
    },
    async stopPlayback() {
      // console.log("Mock: Stopping playback.");
      return Promise.resolve();
    },
  };
})();
// --- End Mocking ---

interface AudioFrame {
  timestamp: number;
  data: number[];
}

export const useDAF = (muteLogic = false) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isDAFActive, setIsDAFActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Microphone permission required."
  );
  const [delayMs, setDelayMs] = useState(250);

  const audioQueueRef = useRef<AudioFrame[]>([]);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferSize = 1024;
  const sampleRate = 44100;
  const channels = 1;

  // Request microphone permissions
  useEffect(() => {
    if (muteLogic) return;

    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        setStatusMessage("Microphone permission denied. DAF cannot function.");
      } else {
        setStatusMessage("Permission granted. Press Start DAF.");
      }
    })();
  }, [muteLogic]);

  // Audio processing logic
  useEffect(() => {
    if (muteLogic || !hasPermission) return;

    let unsubscribeFromAudioFrames: (() => void) | null = null;

    const startAudioProcessing = async () => {
      try {
        await mockRealtimeAudioLib.startMicrophone({
          sampleRate,
          channels,
          bufferSize,
        });

        unsubscribeFromAudioFrames = mockRealtimeAudioLib.onAudioFrame(
          (frameData) => {
            audioQueueRef.current.push({
              timestamp: Date.now(),
              data: frameData,
            });
          }
        );

        playIntervalRef.current = setInterval(() => {
          if (!isDAFActive) return;

          const now = Date.now();
          const indexToPlay = audioQueueRef.current.findIndex(
            (frame) => now - frame.timestamp >= delayMs
          );

          if (indexToPlay !== -1) {
            const framesToPlay = audioQueueRef.current.splice(
              0,
              indexToPlay + 1
            );
            const combinedData = framesToPlay.flatMap((frame) => frame.data);

            if (combinedData.length > 0) {
              mockRealtimeAudioLib
                .playAudioChunk(combinedData, sampleRate, channels)
                .catch((e) => console.error("Error playing audio chunk:", e));
            }
          }
        }, 50);

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
      audioQueueRef.current = [];
      setStatusMessage("DAF Stopped.");
    };

    if (isDAFActive) {
      startAudioProcessing();
    } else {
      stopAudioProcessing();
    }

    return () => {
      stopAudioProcessing();
    };
  }, [isDAFActive, hasPermission, delayMs, muteLogic]);

  const toggleDAF = useCallback(() => {
    if (hasPermission === false) {
      setStatusMessage("Microphone permission not granted.");
      return;
    }
    setIsDAFActive((prev) => !prev);
  }, [hasPermission]);

  return {
    isDAFActive,
    setIsDAFActive,
    toggleDAF,
    delayMs,
    setDelayMs,
    hasPermission,
    statusMessage,
  };
};

// Component
type DAFToolProps = {
  style?: object;
  // Controlled props
  isDAFActive?: boolean;
  onToggleDAF?: () => void;
  delayMs?: number;
  onDelayChange?: (val: number) => void;
  hasPermission?: boolean | null;
  statusMessage?: string;
};

export function DAFTool({
  style,
  isDAFActive: controlledIsActive,
  onToggleDAF,
  delayMs: controlledDelay,
  onDelayChange,
  hasPermission: controlledPermission,
  statusMessage: controlledMessage,
}: DAFToolProps) {
  const isControlled = controlledIsActive !== undefined;

  const internalHook = useDAF(isControlled);

  const activeIsDAFActive = isControlled
    ? controlledIsActive
    : internalHook.isDAFActive;
  const activeToggleDAF = isControlled ? onToggleDAF : internalHook.toggleDAF;
  const activeDelayMs = isControlled
    ? (controlledDelay as number)
    : internalHook.delayMs;
  const activeSetDelayMs = isControlled
    ? onDelayChange
    : internalHook.setDelayMs;
  const activeHasPermission = isControlled
    ? controlledPermission
    : internalHook.hasPermission;
  const activeStatusMessage = isControlled
    ? controlledMessage
    : internalHook.statusMessage;

  const handleDelayChange = useCallback(
    (value: number) => {
      const newDelay = Math.round(value);
      if (activeSetDelayMs) activeSetDelayMs(newDelay);
    },
    [activeSetDelayMs]
  );

  if (activeHasPermission === null && !isControlled) {
    // If controlled, we assume permission is handled by parent/hook in parent.
    // If null, it means loading.
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.statusText}>
          Requesting microphone permission...
        </Text>
      </View>
    );
  }

  if (isControlled && activeHasPermission === null) {
    // Controlled mode + null permission = also loading
    return (
      <View style={[styles.container, styles.centerContent, style]}>
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
          onPress={activeToggleDAF}
          style={[
            styles.button,
            activeIsDAFActive ? styles.buttonStop : styles.buttonStart,
          ]}
          disabled={activeHasPermission === false}
        >
          <Text style={styles.buttonText}>
            {activeIsDAFActive ? "Stop DAF" : "Start DAF"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delay Slider */}
      <View style={styles.controlSection}>
        <View style={styles.rowContainer}>
          <Text style={styles.infoText}>Delay Time</Text>
          <Text style={styles.speedText}>{activeDelayMs}ms</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0} // Minimum delay
            maximumValue={1000} // Max 1 second delay (adjust as needed for DAF effect)
            step={25} // Step by 25ms
            value={activeDelayMs}
            onValueChange={handleDelayChange}
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

      <Text style={styles.statusText}>{activeStatusMessage}</Text>
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
