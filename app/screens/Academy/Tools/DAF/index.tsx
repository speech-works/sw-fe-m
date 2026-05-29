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
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
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

  const startDAF = useCallback(async () => {
    if (hasPermission === false) {
      setStatusMessage(
        Platform.OS === "web"
          ? "DAF is currently available only in the iOS and Android app."
          : "Microphone permission not granted.",
      );
      return false;
    }

    const connected = await updateHeadsetStatus(true);
    if (!connected) {
      return false;
    }

    setStatusMessage("Starting DAF...");
    setIsDAFActive(true);
    return true;
  }, [hasPermission, updateHeadsetStatus]);

  const stopDAF = useCallback(() => {
    setStatusMessage("DAF Stopped.");
    setIsDAFActive(false);
  }, []);

  const toggleDAF = useCallback(() => {
    void (async () => {
      if (isDAFActive) {
        stopDAF();
        return;
      }

      await startDAF();
    })();
  }, [isDAFActive, startDAF, stopDAF]);

  return {
    headsetConnected,
    showHeadsetPrompt,
    setShowHeadsetPrompt,
    updateHeadsetStatus,
    isDAFActive,
    setIsDAFActive,
    startDAF,
    stopDAF,
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

  const hiddenStatusMessages = new Set([
    "Permission granted. Start DAF and use wired headphones for best results.",
    "DAF Active. Wear wired headphones for the clearest feedback.",
    "Starting DAF...",
    "DAF Stopped.",
    "Please connect wired headphones to start DAF.",
  ]);

  const visibleStatusMessage =
    activeStatusMessage && !hiddenStatusMessages.has(activeStatusMessage)
      ? activeStatusMessage
      : null;

  const isStatusError = Boolean(
    visibleStatusMessage &&
      /failed|denied|error|cannot|available only/i.test(visibleStatusMessage),
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
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text style={styles.heroEyebrow}>DAF</Text>
            <Text style={styles.heroTitle}>Delayed feedback</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              activeHeadsetConnected
                ? styles.statusBadgeReady
                : styles.statusBadgeWarning,
            ]}
          >
            <FAIcon
              name="headphones-alt"
              size={13}
              color={
                activeHeadsetConnected
                  ? "#10B981"
                  : theme.colors.feedback.error
              }
            />
            <Text
              style={[
                styles.statusBadgeText,
                activeHeadsetConnected
                  ? styles.statusBadgeTextReady
                  : styles.statusBadgeTextWarning,
              ]}
            >
              {activeHeadsetConnected ? "Ready" : "Needed"}
            </Text>
          </View>
        </View>

        <Text style={styles.heroText}>
          {activeHeadsetConnected
            ? "Hear your own voice back with a slight delay while you practice."
            : "Plug in your headphones to begin."}
        </Text>
      </View>

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Delay</Text>
            <Text style={styles.sectionTitle}>{activeDelayMs} ms</Text>
          </View>

          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>Adjust</Text>
          </View>
        </View>

        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1000}
            step={25}
            value={activeDelayMs}
            onValueChange={handleDelayChange}
            minimumTrackTintColor={theme.colors.library.orange[400]}
            maximumTrackTintColor="#F1D9C6"
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>

        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>Subtle</Text>
          <Text style={styles.paceText}>Stronger</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={activeToggleDAF}
        activeOpacity={0.85}
        style={[
          styles.button,
          activeIsDAFActive ? styles.buttonStop : styles.buttonStart,
        ]}
        disabled={activeHasPermission === false}
      >
        <View style={styles.buttonContent}>
          <FAIcon
            name={activeIsDAFActive ? "stop" : "play"}
            size={14}
            color="#FFF"
          />
          <Text style={styles.buttonText}>
            {activeIsDAFActive ? "Stop DAF" : "Start DAF"}
          </Text>
        </View>
      </TouchableOpacity>

      {visibleStatusMessage ? (
        <View
          style={[
            styles.statusBanner,
            isStatusError ? styles.statusBannerError : styles.statusBannerInfo,
          ]}
        >
          <FAIcon
            name={isStatusError ? "exclamation-circle" : "info-circle"}
            size={14}
            color={
              isStatusError
                ? theme.colors.feedback.error
                : theme.colors.actionPrimary.default
            }
          />
          <Text style={styles.statusBannerText}>{visibleStatusMessage}</Text>
        </View>
      ) : null}

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
    marginVertical: 8,
    flexDirection: "column",
    gap: 14,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 0,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroHeaderText: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.62,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusBadgeReady: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.16)",
  },
  statusBadgeWarning: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderColor: "rgba(239, 68, 68, 0.14)",
  },
  statusBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "600",
  },
  statusBadgeTextReady: {
    color: "#0F9F6E",
  },
  statusBadgeTextWarning: {
    color: theme.colors.feedback.error,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading4),
    color: theme.colors.text.title,
  },
  heroText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle("0px 6px 16px 0px rgba(255, 144, 64, 0.18)"),
  },
  buttonStart: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  buttonStop: {
    backgroundColor: "#E85D4A",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Button),
    fontWeight: "600",
  },
  sliderCard: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(253, 182, 129, 0.22)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodyHighLight),
    color: theme.colors.text.title,
  },
  valueBadge: {
    backgroundColor: "#FFF4E6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 144, 64, 0.20)",
  },
  valueBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "700",
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderWrapper: {
    width: "100%",
    justifyContent: "center",
    overflow: "visible",
  },
  slider: {
    width: "100%",
    height: 22,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    opacity: 0.68,
  },
  statusText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
    marginTop: 10,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusBannerInfo: {
    backgroundColor: "#FFF4E6",
  },
  statusBannerError: {
    backgroundColor: "#FEF2F2",
  },
  statusBannerText: {
    flex: 1,
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
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
