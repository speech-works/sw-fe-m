import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";

// Reuse existing logic components
import AudioRecorderControls from "../../../../../Library/TechniquePage/components/AudioRecorderControls";
import ModernWaveform from "../../../../../Library/TechniquePage/components/ModernWaveform";
import type { AVPlaybackStatus } from "expo-av";
import { theme } from "../../../../../../../Theme/tokens"; // 7 levels up
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

const BAR_COUNT = 32;
const MAX_ENVELOPE = 512;
const width = Dimensions.get("window").width;

type Frame = { db: number; timestamp: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Props {
  onRecorded?: (uri: string) => void;
  onToggle?: () => void; // Next story action
  prevRecordingUri?: string;
  renderTools?: () => React.ReactNode;
  onSubmit?: () => void;
  onDiscard?: () => void;
}

const SmartRecorder: React.FC<Props> = ({
  onRecorded,
  onToggle,
  prevRecordingUri,
  renderTools,
  onSubmit,
  onDiscard,
}) => {
  const [mode, setMode] = useState<"idle" | "recording" | "playing">("idle");

  // Logic States (Cloned from VoiceRecorder)
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(0)
  );
  const [waveformEnvelope, setWaveformEnvelope] = useState<number[]>(() =>
    Array(0)
  );
  const envelopeHistoryRef = useRef<number[]>([]);
  const framesRef = useRef<Frame[]>([]);
  const recordingStartRef = useRef<number>(0);
  const playbackUriRef = useRef<string | null>(prevRecordingUri || null);
  const rafRef = useRef<number | null>(null);
  const playbackPositionMsRef = useRef<number>(0);
  const playbackIndexRef = useRef<number>(0);
  const playbackActiveRef = useRef<boolean>(false);

  // Bump signals
  const [startRecordSignal, setStartRecordSignal] = useState<number | null>(
    null
  );
  const [stopRecordSignal, setStopRecordSignal] = useState<number | null>(null);
  const [startPlaybackSignal, setStartPlaybackSignal] = useState<number | null>(
    null
  );
  const [stopPlaybackSignal, setStopPlaybackSignal] = useState<number | null>(
    null
  );

  // --- Logic Functions ( Identical to VoiceRecorder) ---

  const normalizeDb = useCallback((db: number): number => {
    const MIN_DB = -100;
    const MAX_DB = -10;
    const clamped = Math.max(MIN_DB, Math.min(db, MAX_DB));
    return Math.pow((clamped - MIN_DB) / (MAX_DB - MIN_DB), 0.7);
  }, []);

  const pushMeteringToLevels = useCallback(
    (db: number) => {
      const level = normalizeDb(db);
      setAudioLevels((prev) => [...prev.slice(1), level]);
    },
    [normalizeDb]
  );

  const pushEnvelopeSample = useCallback((level: number) => {
    const history = envelopeHistoryRef.current;
    history.push(level);
    if (history.length > MAX_ENVELOPE)
      history.splice(0, history.length - MAX_ENVELOPE);
    setWaveformEnvelope(history.slice());
  }, []);

  const handleMeter = useCallback(
    (db: number) => {
      pushMeteringToLevels(db);
      const level = normalizeDb(db);
      pushEnvelopeSample(level);
      if (mode === "recording") {
        const now = Date.now();
        const rel = now - recordingStartRef.current;
        framesRef.current.push({ db, timestamp: rel });
      }
    },
    [mode, pushMeteringToLevels, normalizeDb, pushEnvelopeSample]
  );

  const startRecording = useCallback(() => {
    framesRef.current = [];
    recordingStartRef.current = Date.now();
    setAudioLevels(Array(BAR_COUNT).fill(0));
    envelopeHistoryRef.current = [];
    setWaveformEnvelope([]);
    setMode("recording");
    setStartRecordSignal(Date.now());
  }, []);

  const stopRecording = useCallback(() => {
    setStopRecordSignal(Date.now());
    setMode("idle"); // Note: In Smart Dock, "idle" with URI means "Review" mode effectively
  }, []);

  const onRecordingReady = useCallback(
    (uri: string) => {
      playbackUriRef.current = uri;
      onRecorded?.(uri);
    },
    [onRecorded]
  );

  const playbackLoop = useCallback(() => {
    const frames = framesRef.current;
    const elapsed = playbackPositionMsRef.current ?? 0;

    if (!frames || !frames.length) {
      pushEnvelopeSample(
        Math.max(
          0,
          (envelopeHistoryRef.current[envelopeHistoryRef.current.length - 1] ??
            0) - 0.02
        )
      );
    } else {
      let idx = playbackIndexRef.current;
      while (idx < frames.length - 1 && frames[idx + 1].timestamp <= elapsed) {
        idx++;
      }
      while (idx > 0 && frames[idx].timestamp > elapsed) {
        idx--;
      }
      playbackIndexRef.current = idx;

      const f0 = frames[idx];
      const f1 = frames[Math.min(idx + 1, frames.length - 1)];

      let db = f0.db;
      if (f1 && f1.timestamp !== f0.timestamp) {
        const t = clamp(
          (elapsed - f0.timestamp) / (f1.timestamp - f0.timestamp),
          0,
          1
        );
        db = lerp(f0.db, f1.db, t);
      }
      const level = normalizeDb(db);
      pushEnvelopeSample(level);
      setAudioLevels((prev) => [...prev.slice(1), level]);

      const lastTs = frames[frames.length - 1].timestamp;
      if (elapsed >= lastTs + 700) {
        playbackActiveRef.current = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setMode("idle");
        playbackIndexRef.current = 0;
        return;
      }
    }
    rafRef.current = requestAnimationFrame(playbackLoop);
  }, [normalizeDb, pushEnvelopeSample]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      try {
        if (!status) return;
        if (!status.isLoaded) return;
        const pos =
          typeof status.positionMillis === "number"
            ? status.positionMillis
            : playbackPositionMsRef.current;
        playbackPositionMsRef.current = pos;

        if (status.isPlaying) {
          if (mode === "playing" && !playbackActiveRef.current) {
            playbackActiveRef.current = true;
            playbackIndexRef.current = 0;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(playbackLoop);
          }
        } else {
          if ((status as any).didJustFinish) {
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            playbackActiveRef.current = false;
            setMode("idle");
            playbackPositionMsRef.current = 0;
            playbackIndexRef.current = 0;
          }
        }
      } catch (err) {
        // ignore
      }
    },
    [mode, playbackLoop]
  );

  const startPlayback = useCallback(() => {
    if (!playbackUriRef.current) return;
    playbackIndexRef.current = 0;
    playbackPositionMsRef.current = 0;
    envelopeHistoryRef.current = [];
    setWaveformEnvelope([]);
    setAudioLevels(Array(BAR_COUNT).fill(0));
    setMode("playing");
    setStartPlaybackSignal(Date.now());
  }, []);

  const stopPlayback = useCallback(() => {
    setStopPlaybackSignal(Date.now());
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    playbackActiveRef.current = false;
    playbackIndexRef.current = 0;
    playbackPositionMsRef.current = 0;
    setMode("idle");
  }, []);

  const handleDiscard = useCallback(() => {
    playbackUriRef.current = null;
    setMode("idle");
    // Reset logic states
    setAudioLevels(Array(BAR_COUNT).fill(0));
    setWaveformEnvelope([]);
    onDiscard?.();
  }, [onDiscard]);

  // If prevRecordingUri becomes null (parent discarded), verify state
  useEffect(() => {
    if (!prevRecordingUri) {
      playbackUriRef.current = null;
    } else {
      playbackUriRef.current = prevRecordingUri;
    }
  }, [prevRecordingUri]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      playbackActiveRef.current = false;
    };
  }, []);

  // --- UI Logic ---

  const isRecording = mode === "recording";
  const isPlaying = mode === "playing";
  const hasUri = !!playbackUriRef.current;

  // Clean, unified compact dock
  // We want to animate between "Tools" and "Waveform"

  return (
    <View style={styles.container}>
      {/* Logic Component (Hidden) */}
      <AudioRecorderControls
        onMeter={(db: number) => handleMeter(db)}
        onRecordingReady={onRecordingReady}
        onPlaybackStatus={(status) =>
          handlePlaybackStatus(status as AVPlaybackStatus)
        }
        startRecordingSignal={startRecordSignal}
        stopRecordingSignal={stopRecordSignal}
        startPlaybackSignal={startPlaybackSignal}
        stopPlaybackSignal={stopPlaybackSignal}
        playbackUri={playbackUriRef.current}
      />

      {/* Floating Dock */}
      <LinearGradient
        colors={["#FFF", "#FDFDFD"]}
        style={[styles.dock, isRecording && styles.dockRecording]}
      >
        {/* LEFT SECTION: Tools or Timer */}
        <View
          style={
            !isRecording && !isPlaying
              ? styles.leftSection
              : styles.leftSectionRecording
          }
        >
          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Rec</Text>
            </View>
          ) : hasUri ? (
            // Review Mode: Show Discard (Trash)
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleDiscard}
            >
              <Icon name="trash" size={20} color={theme.colors.text.default} />
            </TouchableOpacity>
          ) : (
            <View style={styles.toolsWrapper}>{renderTools?.()}</View>
          )}
        </View>

        {/* SEPARATOR (Only in Idle) */}
        {!isRecording && !hasUri && <View style={styles.separator} />}

        {/* CENTER SECTION:  Mic Button OR Waveform */}
        <View
          style={
            !isRecording && !isPlaying
              ? styles.centerSection
              : styles.centerSectionRecording
          }
        >
          {isRecording || isPlaying ? (
            <View style={styles.waveformWrapper}>
              <ModernWaveform
                envelope={waveformEnvelope}
                mode={
                  isPlaying ? "playback" : isRecording ? "recording" : "idle"
                }
                height={32} // Reduced height for better fit
                strokeColor={theme.colors.text.title}
                glowColor={
                  isRecording
                    ? theme.colors.library.red[500]
                    : theme.colors.library.orange[500]
                }
                points={50} // 50 bars for clean pill look
                fps={30}
              />
            </View>
          ) : hasUri ? (
            // Review Mode: Play Button (Large)
            <TouchableOpacity
              style={styles.mainMicButton}
              onPress={startPlayback}
            >
              <LinearGradient
                colors={["#FFF", "#F5F5F5"]}
                style={StyleSheet.absoluteFill}
              />
              <Icon
                name="play"
                size={18}
                color={theme.colors.text.default}
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.mainMicButton}
              onPress={startRecording}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                style={StyleSheet.absoluteFill}
              />
              <Icon name="microphone" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* RIGHT SECTION: Next or Stop/Play controls */}
        <View style={styles.rightSection}>
          {isRecording ? (
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <LinearGradient
                colors={[
                  theme.colors.library.red[500],
                  theme.colors.library.red[600],
                ]}
                style={StyleSheet.absoluteFill}
              />
              <Icon name="stop" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : hasUri ? (
            // Review Mode: Submit (Check) Button
            <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
              <Icon name="check" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
};

// Styles for the "Smart Dock"
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20, // Floating slightly
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    height: 70,
    // Minimal Border
    borderWidth: 1,
    borderColor: "#E2E8F0", // Slate 200
    // Very soft shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dockRecording: {
    backgroundColor: "#FFF",
    borderColor: theme.colors.library.red[200],
    borderWidth: 2,
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // For gradient
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },

  // Sections
  leftSection: {
    flex: 1, // TAKES ALL AVAILABLE SPACE in Idle
    alignItems: "flex-start",
    paddingLeft: 4,
    justifyContent: "center",
  },
  leftSectionRecording: {
    width: "auto", // Shrink to fit content
    alignItems: "flex-start",
    paddingLeft: 12, // More padding for "Rec" label
    justifyContent: "center",
  },

  centerSection: {
    minWidth: 60, // ensure space for mic
    alignItems: "center",
    justifyContent: "center",
  },
  centerSectionRecording: {
    flex: 1, // GROW to fill space
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  rightSection: {
    // Auto width - collapses if empty
    alignItems: "flex-end",
    paddingRight: 4,
    justifyContent: "center",
  },

  // Components
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.library.red[500],
  },
  recordingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.red[600],
    fontWeight: "600",
  },

  toolsWrapper: {
    // Just a wrapper for the passed tools
  },

  mainMicButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // No shadow on button itself to avoid artifacts
  },

  waveformWrapper: {
    height: 40,
    width: 160,
    justifyContent: "center",
    alignItems: "center",
    // No background, just the wave
  },

  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9", // Slate 100
    alignItems: "center",
    justifyContent: "center",
    // No border, No shadow -> Flat Pill
  },
  subtleButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.actionPrimary.default, // Orange
    alignItems: "center",
    justifyContent: "center",
    // No shadow to avoid sharp corners artifact
  },
});

export default SmartRecorder;
