// DAFTool.tsx
import Slider from "@react-native-community/slider";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";
import { Buffer } from "buffer";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PCM from "react-native-pcm-player-lite";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import {
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
  InputAudioStream,
} from "@dr.pogodin/react-native-audio";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { isHeadsetConnected } from "../../../../util/functions/headset";

interface AudioChunk {
  timestamp: number;
  data: string;
}

const DAF_SAMPLE_RATE = 44100;
const DAF_BUFFER_SIZE = 1024;
const DAF_POLL_INTERVAL_MS = 10;

export const useDAF = (muteLogic = false) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [headsetConnected, setHeadsetConnected] = useState(
    Platform.OS === "web" ? false : true,
  );
  const [showHeadsetPrompt, setShowHeadsetPrompt] = useState(false);
  const [isDAFActive, setIsDAFActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Microphone permission required."
  );
  const [delayMs, setDelayMs] = useState(250);

  const audioQueueRef = useRef<AudioChunk[]>([]);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const micStreamRef = useRef<InputAudioStream | null>(null);
  const delayMsRef = useRef(delayMs);
  const chunkListenerRef = useRef<((chunk: Buffer, chunkId: number) => void) | null>(null);
  const errorListenerRef = useRef<((error: Error) => void) | null>(null);

  useEffect(() => {
    delayMsRef.current = delayMs;
  }, [delayMs]);

  const updateHeadsetStatus = useCallback(async (shouldShowPrompt = false) => {
    if (Platform.OS === "web") {
      setHeadsetConnected(false);
      return false;
    }

    const connected = await isHeadsetConnected();
    setHeadsetConnected(connected);

    if (!connected) {
      setStatusMessage("Please connect wired headphones to start DAF.");
      if (shouldShowPrompt) setShowHeadsetPrompt(true);
    } else {
      setShowHeadsetPrompt(false);
      if (!isDAFActive && hasPermission) {
        setStatusMessage(
          "Permission granted. Start DAF and use wired headphones for best results.",
        );
      }
    }

    return connected;
  }, [hasPermission, isDAFActive]);

  // Request microphone permissions
  useEffect(() => {
    if (muteLogic) return;

    if (Platform.OS === "web") {
      setHasPermission(false);
      setStatusMessage("DAF is currently available only in the iOS and Android app.");
      return;
    }

    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      if (status !== "granted") {
        setStatusMessage("Microphone permission denied. DAF cannot function.");
      } else {
        setStatusMessage(
          "Permission granted. Start DAF and use wired headphones for best results.",
        );
      }
    })();
  }, [muteLogic]);

  useEffect(() => {
    if (muteLogic || Platform.OS === "web" || !hasPermission) return;
    void updateHeadsetStatus(false);
  }, [hasPermission, muteLogic, updateHeadsetStatus]);

  const stopAudioProcessing = useCallback(async () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    const stream = micStreamRef.current;
    if (stream) {
      if (chunkListenerRef.current) {
        stream.removeChunkListener(chunkListenerRef.current);
      }
      if (errorListenerRef.current) {
        stream.removeErrorListener(errorListenerRef.current);
      }

      try {
        await stream.destroy();
      } catch (error) {
        console.error("Error stopping DAF microphone stream:", error);
      }
    }

    micStreamRef.current = null;
    chunkListenerRef.current = null;
    errorListenerRef.current = null;

    try {
      await PCM.stop();
    } catch (error) {
      console.error("Error stopping DAF playback:", error);
    }

    audioQueueRef.current = [];

    if (Platform.OS !== "web") {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error("Error resetting DAF audio mode:", error);
      }
    }
  }, []);

  const startAudioProcessing = useCallback(async () => {
    if (Platform.OS === "web") {
      setStatusMessage("DAF is currently available only in the iOS and Android app.");
      return;
    }

    try {
      setStatusMessage("Starting DAF...");
      audioQueueRef.current = [];

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      await PCM.stop().catch(() => undefined);
      await PCM.start(DAF_SAMPLE_RATE);

      const stream = new InputAudioStream(
        AUDIO_SOURCES.VOICE_RECOGNITION || AUDIO_SOURCES.MIC,
        DAF_SAMPLE_RATE,
        CHANNEL_CONFIGS.MONO,
        AUDIO_FORMATS.PCM_16BIT,
        DAF_BUFFER_SIZE,
      );

      const onChunk = (chunk: Buffer) => {
        audioQueueRef.current.push({
          timestamp: Date.now(),
          data: chunk.toString("base64"),
        });
      };

      const onError = (error: Error) => {
        console.error("DAF microphone stream error:", error);
        setStatusMessage("DAF microphone stream error. Please try again.");
        setIsDAFActive(false);
      };

      stream.addChunkListener(onChunk);
      stream.addErrorListener(onError);

      chunkListenerRef.current = onChunk;
      errorListenerRef.current = onError;

      const started = await stream.start();
      if (!started) {
        throw new Error("Microphone stream failed to start.");
      }

      micStreamRef.current = stream;

      playIntervalRef.current = setInterval(() => {
        const now = Date.now();

        while (
          audioQueueRef.current.length > 0 &&
          now - audioQueueRef.current[0]!.timestamp >= delayMsRef.current
        ) {
          const nextChunk = audioQueueRef.current.shift();
          if (nextChunk) {
            PCM.enqueueBase64(nextChunk.data);
          }
        }
      }, DAF_POLL_INTERVAL_MS);

      setStatusMessage(
        "DAF Active. Wear wired headphones for the clearest feedback.",
      );
    } catch (error) {
      console.error("Error starting DAF:", error);
      await stopAudioProcessing();
      setStatusMessage("Failed to start DAF. Use a native build and check audio permissions.");
      setIsDAFActive(false);
    }
  }, [stopAudioProcessing]);

  // Audio processing logic
  useEffect(() => {
    if (muteLogic || !hasPermission || Platform.OS === "web") {
      void stopAudioProcessing();
      return;
    }

    if (isDAFActive) {
      void startAudioProcessing();
    } else {
      void stopAudioProcessing();
    }

    return () => {
      void stopAudioProcessing();
    };
  }, [hasPermission, isDAFActive, muteLogic, startAudioProcessing, stopAudioProcessing]);

  const toggleDAF = useCallback(() => {
    void (async () => {
      if (hasPermission === false) {
        setStatusMessage(
          Platform.OS === "web"
            ? "DAF is currently available only in the iOS and Android app."
            : "Microphone permission not granted.",
        );
        return;
      }

      if (!isDAFActive) {
        const connected = await updateHeadsetStatus(true);
        if (!connected) return;
        setStatusMessage("Starting DAF...");
      } else {
        setStatusMessage("DAF Stopped.");
      }

      setIsDAFActive((prev) => !prev);
    })();
  }, [hasPermission, isDAFActive, updateHeadsetStatus]);

  return {
    headsetConnected,
    showHeadsetPrompt,
    setShowHeadsetPrompt,
    updateHeadsetStatus,
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
  headsetConnected?: boolean;
  showHeadsetPrompt?: boolean;
  onDismissHeadsetPrompt?: () => void;
  onRecheckHeadset?: () => void;
};

export function DAFTool({
  style,
  isDAFActive: controlledIsActive,
  onToggleDAF,
  delayMs: controlledDelay,
  onDelayChange,
  hasPermission: controlledPermission,
  statusMessage: controlledMessage,
  headsetConnected: controlledHeadsetConnected,
  showHeadsetPrompt: controlledShowHeadsetPrompt,
  onDismissHeadsetPrompt,
  onRecheckHeadset,
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
  const activeHeadsetConnected = isControlled
    ? controlledHeadsetConnected
    : internalHook.headsetConnected;
  const activeShowHeadsetPrompt = isControlled
    ? controlledShowHeadsetPrompt
    : internalHook.showHeadsetPrompt;
  const activeDismissHeadsetPrompt = isControlled
    ? onDismissHeadsetPrompt
    : () => internalHook.setShowHeadsetPrompt(false);
  const activeRecheckHeadset = isControlled
    ? onRecheckHeadset
    : () => {
        void internalHook.updateHeadsetStatus(true);
      };

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
      <View style={styles.headsetIndicator}>
        <FAIcon
          name="headphones-alt"
          size={14}
          color={activeHeadsetConnected ? "#10B981" : "#EF4444"}
        />
        <Text style={styles.headsetIndicatorText}>
          {activeHeadsetConnected ? "Headphones Ready" : "No Headphones"}
        </Text>
      </View>

      <Text style={styles.heading}>Real-time Delayed Auditory Feedback</Text>
      <Text style={styles.helperText}>
        Plug in your headphones before you start. This helps you hear your
        voice clearly and avoids echo from the phone speaker.
      </Text>

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

      <Modal
        visible={Boolean(activeShowHeadsetPrompt)}
        transparent
        animationType="fade"
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptBox}>
            <FAIcon
              name="headphones-alt"
              size={36}
              color={theme.colors.actionPrimary.default}
              style={{ marginBottom: 14 }}
            />
            <Text style={styles.promptTitle}>Headphones Required</Text>
            <Text style={styles.promptText}>
              Please connect your headphones before starting DAF.
            </Text>

            <View style={styles.promptButtonRow}>
              <TouchableOpacity
                style={styles.promptButtonSecondary}
                onPress={activeDismissHeadsetPrompt}
              >
                <Text style={styles.promptButtonTextSecondary}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptButtonPrimary}
                onPress={activeRecheckHeadset}
              >
                <Text style={styles.promptButtonTextPrimary}>Check Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headsetIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headsetIndicatorText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    opacity: 0.8,
  },
  heading: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 2,
  },
  helperText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    textAlign: "center",
    opacity: 0.8,
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
  promptOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  promptBox: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  promptTitle: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  promptText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 20,
  },
  promptButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  promptButtonPrimary: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  promptButtonSecondary: {
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  promptButtonTextPrimary: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFFFFF",
    fontWeight: "600",
  },
  promptButtonTextSecondary: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
});
