// DAFTool.tsx
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";
import { Buffer } from "buffer";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import PCM from "react-native-pcm-player-lite";
import {
  AUDIO_FORMATS,
  AUDIO_SOURCES,
  CHANNEL_CONFIGS,
  InputAudioStream,
} from "@dr.pogodin/react-native-audio";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  Text,
  Icon,
  icons,
  Button,
  Slider,
  Spinner,
  Dialog,
} from "../../../../design-system";
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
  const { colors } = useTheme();
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
        <Spinner label="Requesting microphone permission..." />
      </View>
    );
  }

  if (isControlled && activeHasPermission === null) {
    // Controlled mode + null permission = also loading
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Spinner label="Requesting microphone permission..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Hero — free-floating eyebrow/title + headset status on the sheet surface. */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text variant="label" color="tertiary">
              DAF
            </Text>
            <Text variant="h3" color="primary">
              Delayed feedback
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: activeHeadsetConnected
                  ? colors.accentTint.success
                  : colors.accentTint.danger,
              },
            ]}
          >
            <Icon
              name={icons.headphones}
              size={13}
              color={
                activeHeadsetConnected
                  ? colors.feedback.successText
                  : colors.feedback.dangerText
              }
            />
            <Text
              variant="label"
              color={
                activeHeadsetConnected
                  ? colors.feedback.successText
                  : colors.feedback.dangerText
              }
            >
              {activeHeadsetConnected ? "Ready" : "Needed"}
            </Text>
          </View>
        </View>

        <Text variant="bodySm" color="secondary">
          {activeHeadsetConnected
            ? "Hear your own voice back with a slight delay while you practice."
            : "Plug in your headphones to begin."}
        </Text>
      </View>

      {/* Delay slider card — elevated surface + hairline. */}
      <View
        style={[
          styles.sliderCard,
          {
            backgroundColor: colors.surface.elevated,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.sliderHeader}>
          <View>
            <Text variant="label" color="tertiary">
              DELAY
            </Text>
            <Text variant="h3" color="primary">
              {activeDelayMs} ms
            </Text>
          </View>

          <View
            style={[
              styles.valueBadge,
              {
                backgroundColor: colors.action.primaryTint,
                borderColor: colors.border.selected,
              },
            ]}
          >
            <Text variant="label" color={colors.action.primary}>
              Adjust
            </Text>
          </View>
        </View>

        <Slider
          minimumValue={0}
          maximumValue={1000}
          step={25}
          value={activeDelayMs}
          onValueChange={handleDelayChange}
          haptic={false}
        />

        <View style={styles.rowContainer}>
          <Text variant="caption" color="tertiary">
            Subtle
          </Text>
          <Text variant="caption" color="tertiary">
            Stronger
          </Text>
        </View>
      </View>

      <Button
        variant={activeIsDAFActive ? "secondary" : "primary"}
        label={activeIsDAFActive ? "Stop DAF" : "Start DAF"}
        leftIcon={activeIsDAFActive ? icons.stop : icons.play}
        onPress={() => activeToggleDAF && activeToggleDAF()}
        disabled={activeHasPermission === false}
      />

      {visibleStatusMessage ? (
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isStatusError
                ? colors.accentTint.danger
                : colors.action.primaryTint,
            },
          ]}
        >
          <Icon
            name={isStatusError ? icons.warning : icons.tip}
            size={14}
            color={
              isStatusError
                ? colors.feedback.dangerText
                : colors.action.primary
            }
          />
          <Text variant="bodySm" color="secondary" style={styles.statusBannerText}>
            {visibleStatusMessage}
          </Text>
        </View>
      ) : null}

      <Dialog
        visible={Boolean(activeShowHeadsetPrompt)}
        onClose={() => activeDismissHeadsetPrompt && activeDismissHeadsetPrompt()}
        title="Headphones Required"
        message="Please connect your headphones before starting DAF."
        cancelLabel="Close"
        confirmLabel="Check Again"
        onConfirm={() => activeRecheckHeadset && activeRecheckHeadset()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    flexDirection: "column",
    gap: spacing.lg,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sliderCard: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    borderWidth: borderWidth.thin,
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  valueBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: borderWidth.thin,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statusBannerText: {
    flex: 1,
  },
});
