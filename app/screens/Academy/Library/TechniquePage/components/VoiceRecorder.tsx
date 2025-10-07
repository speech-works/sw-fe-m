import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
} from "react-native";
import AudioRecorderControls from "./AudioRecorderControls";
import ModernWaveform from "./ModernWaveform";
import type { AVPlaybackStatus } from "expo-av";
import { theme } from "../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { parseShadowStyle } from "../../../../../util/functions/parseStyles";

const BAR_COUNT = 32;
const MAX_ENVELOPE = 512;

type Frame = { db: number; timestamp: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Props {
  onRecorded?: (uri: string) => void;
  onToggle?: () => void;
  prevRecordingUri?: string;
}

const VoiceRecorder: React.FC<Props> = ({
  onRecorded,
  onToggle,
  prevRecordingUri,
}) => {
  const [mode, setMode] = useState<"idle" | "recording" | "playing">("idle");

  // keep both the classic bar-levels (for other UI) and the envelope history (for smooth waveform)
  const [audioLevels, setAudioLevels] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(0)
  );

  // envelope history (fed to ModernWaveform). Use state to trigger re-render on updates
  const [waveformEnvelope, setWaveformEnvelope] = useState<number[]>(() =>
    Array(0)
  );
  const envelopeHistoryRef = useRef<number[]>([]);

  // layout for responsive waveform
  const [containerWidth, setContainerWidth] = useState<number>(360); // eslint-disable-line @typescript-eslint/no-unused-vars

  // recorded frames (db + timestamp) used for playback envelope replay
  const framesRef = useRef<Frame[]>([]);
  const recordingStartRef = useRef<number>(0);

  // playback state
  // 💡 INITIALIZE playbackUriRef with prevRecordingUri
  const playbackUriRef = useRef<string | null>(prevRecordingUri || null);
  const rafRef = useRef<number | null>(null);
  const playbackPositionMsRef = useRef<number>(0);
  const playbackIndexRef = useRef<number>(0);
  const playbackActiveRef = useRef<boolean>(false);

  // bump signals for AudioRecorderControls
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

  // Convert dB to normalized level (0-1)
  const normalizeDb = useCallback((db: number): number => {
    const MIN_DB = -100;
    const MAX_DB = -10;
    const clamped = Math.max(MIN_DB, Math.min(db, MAX_DB));
    return Math.pow((clamped - MIN_DB) / (MAX_DB - MIN_DB), 0.7); // More responsive curve
  }, []);

  // push metering to classic levels immediately (used for bars if needed)
  const pushMeteringToLevels = useCallback(
    (db: number) => {
      const level = normalizeDb(db);
      setAudioLevels((prev) => {
        const next = [...prev.slice(1), level];
        return next;
      });
    },
    [normalizeDb]
  );

  // push envelope sample into circular history and update state for waveform
  const pushEnvelopeSample = useCallback((level: number) => {
    const history = envelopeHistoryRef.current;
    history.push(level);
    if (history.length > MAX_ENVELOPE)
      history.splice(0, history.length - MAX_ENVELOPE);
    // update state with a shallow copy (triggers re-render)
    setWaveformEnvelope(history.slice());
  }, []);

  // record metering handler - called by AudioRecorderControls
  const handleMeter = useCallback(
    (db: number) => {
      // immediate UI for bars
      pushMeteringToLevels(db);

      // push envelope sample for waveform
      const level = normalizeDb(db);
      pushEnvelopeSample(level);

      // store frame if recording (for playback envelope replay)
      if (mode === "recording") {
        const now = Date.now();
        const rel = now - recordingStartRef.current;
        framesRef.current.push({ db, timestamp: rel });
      }
    },
    [mode, pushMeteringToLevels, normalizeDb, pushEnvelopeSample]
  );

  // start recording
  const startRecording = useCallback(() => {
    framesRef.current = [];
    recordingStartRef.current = Date.now();
    setAudioLevels(Array(BAR_COUNT).fill(0));
    // clear envelope history so waveform starts fresh
    envelopeHistoryRef.current = [];
    setWaveformEnvelope([]);
    setMode("recording");
    // 💡 Signal change to AudioRecorderControls
    setStartRecordSignal(Date.now());
  }, []);

  const stopRecording = useCallback(() => {
    // 💡 Signal change to AudioRecorderControls
    setStopRecordSignal(Date.now());
    setMode("idle");
  }, []);

  // when recorder provides URI
  const onRecordingReady = useCallback(
    (uri: string) => {
      playbackUriRef.current = uri;
      onRecorded?.(uri);
    },
    [onRecorded]
  );

  // RAF playback loop (interpolates between frames and pushes levels into envelope)
  const playbackLoop = useCallback(() => {
    const frames = framesRef.current;
    const elapsed = playbackPositionMsRef.current ?? 0;

    if (!frames.length) {
      // If there are no frames, slowly decay waveform (optional)
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

      // push level into waveform envelope so ModernWaveform animates during playback
      pushEnvelopeSample(level);
      // also update classic bar levels for other UI (keeps behavior consistent)
      setAudioLevels((prev) => [...prev.slice(1), level]);

      const lastTs = frames[frames.length - 1].timestamp;
      if (elapsed >= lastTs + 700) {
        // stop playback
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

  // playback status handler (drives playbackPositionMsRef)
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
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
            }
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

  // start playback
  const startPlayback = useCallback(() => {
    if (!playbackUriRef.current) {
      console.warn("No recording available to play");
      return;
    }
    playbackIndexRef.current = 0;
    playbackPositionMsRef.current = 0;
    // clear envelope for fresh playback visualization or keep previous? clearing to make replay distinct
    envelopeHistoryRef.current = [];
    setWaveformEnvelope([]);
    setAudioLevels(Array(BAR_COUNT).fill(0));
    setMode("playing");
    // 💡 Signal change to AudioRecorderControls
    setStartPlaybackSignal(Date.now());
  }, []);

  const stopPlayback = useCallback(() => {
    // 💡 Signal change to AudioRecorderControls
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

  // --- Control Logic (combined Record/Stop and Play/Pause logic) ---

  const handleRecordButton = useCallback(() => {
    if (mode === "recording") {
      stopRecording();
    } else {
      if (mode === "playing") stopPlayback();
      startRecording();
    }
  }, [mode, startRecording, stopRecording, stopPlayback]);

  const handlePlaybackButton = useCallback(() => {
    if (mode === "recording") {
      // If recording, stop it first before attempting playback toggle
      stopRecording();
    } else {
      // Toggle Play/Stop Playback
      if (mode === "playing") {
        stopPlayback();
      } else {
        startPlayback();
      }
    }
  }, [mode, stopRecording, stopPlayback, startPlayback]);

  // cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      playbackActiveRef.current = false;
    };
  }, []);

  const statusText =
    mode === "idle"
      ? playbackUriRef.current
        ? "Ready to play or record"
        : "Ready to record"
      : mode === "recording"
      ? "Recording..."
      : "Playing...";

  const isReadyForPlayback = !!playbackUriRef.current;
  const isRecording = mode === "recording";
  const isPlaying = mode === "playing";

  // Only show the active waveform if a recording is in progress, playing, or already exists.
  const isWaveformVisible = isRecording || isPlaying || isReadyForPlayback;

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        {/* FIX: Use the placeholder container as the single wrapper for both states */}
        <View style={styles.waveformPlaceholder}>
          {isWaveformVisible ? (
            // Render the actual waveform inside the placeholder container
            <ModernWaveform
              envelope={waveformEnvelope}
              mode={isPlaying ? "playback" : isRecording ? "recording" : "idle"}
              height={140}
              strokeColor={theme.colors.text.title}
              glowColor={theme.colors.actionPrimary.default}
              points={420}
              fps={30}
            />
          ) : (
            // Render the center line placeholder when the wave is hidden (initial state)
            <View style={styles.centerLine} />
          )}
        </View>
      </View>

      <Text
        style={[
          styles.statusText,
          isRecording && styles.recordingText,
          isPlaying && styles.playingText,
        ]}
      >
        {statusText}
      </Text>

      {/* Control Buttons with RecorderWidget design and logic */}
      <View style={styles.micContainer}>
        <TouchableOpacity
          style={styles.circle}
          onPress={onToggle} // Placeholder for onToggle
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
            isRecording && styles.micCircleActive,
            isPlaying && styles.disabledCircle,
          ]}
          onPress={handleRecordButton}
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
          style={[styles.circle, isRecording && styles.disabledCircle]}
          onPress={handlePlaybackButton}
          disabled={isRecording || !isReadyForPlayback}
        >
          <Icon
            name={isPlaying ? "pause" : "play"}
            size={16}
            color={
              isRecording || !isReadyForPlayback
                ? theme.colors.text.disabled
                : theme.colors.text.default
            }
          />
        </TouchableOpacity>
      </View>

      <AudioRecorderControls
        onMeter={(db: number) => {
          handleMeter(db);
        }}
        onRecordingReady={onRecordingReady}
        onPlaybackStatus={(status) => {
          handlePlaybackStatus(status as AVPlaybackStatus);
        }}
        // Pass signals down to the AudioRecorderControls for its logic
        startRecordingSignal={startRecordSignal}
        stopRecordingSignal={stopRecordSignal}
        startPlaybackSignal={startPlaybackSignal}
        stopPlaybackSignal={stopPlaybackSignal}
        playbackUri={playbackUriRef.current}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // FIX for collapse: removed flex: 1 as the content defines its size
  container: { padding: 20 },

  // KEEP waveformContainer for consistent margin below the waveform area
  waveformContainer: { marginBottom: 24 },

  // UPDATED STYLES for the placeholder to be the light orange box
  waveformPlaceholder: {
    height: 140, // Match the ModernWaveform height
    justifyContent: "center",
    alignItems: "center",
    // These styles give it the light orange background and rounded corners
    backgroundColor: theme.colors.library.orange[100],
    borderRadius: 12,
    overflow: "hidden", // Important to clip the wave within the rounded box
    paddingHorizontal: 8, // Add padding if the wave should not touch the sides
  },
  centerLine: {
    width: "80%",
    height: 1,
    backgroundColor: theme.colors.library.orange[200], // Subtle line color
    opacity: 0.8,
  },

  statusText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 24,
  },
  recordingText: { color: "#FF3B30" },
  playingText: { color: "#34C759" },

  // Styles from RecorderWidget
  micContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 4,
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
  micCircleActive: {
    backgroundColor: theme.colors.library.red[400],
  },
  disabledCircle: {
    backgroundColor: theme.colors.surface.disabled,
  },
});

export default VoiceRecorder;
