import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from "expo-av/build/Audio";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "playback";

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  startPlayback: (uri: string) => Promise<void>;
  stopPlayback: () => Promise<void>;
  state: RecorderState;
  metering: number; // 0 to 1 normalized
  waveform: number[]; // Array of normalized levels (0-1) for entire session
  playbackPosition: number; // ms
  duration: number; // ms
  recordingDuration: number; // ms
  deleteRecording: () => void;
}

const SAMPLE_INTERVAL_MS = 50; // 20fps updates

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<RecorderState>("idle");
  const [metering, setMetering] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track samples in ref to avoid frequent state re-renders during recording loop
  const samplesRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMeteringLogic();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const normalizeDb = (db: number) => {
    // Expo metering: -160 (silence) to 0 (max)
    // Usable range: ~ -60 to 0
    if (db < -80) return 0;
    const norm = (db + 80) / 80; // 0 to 1 scaling
    return Math.max(0, Math.min(1, norm));
  };

  const startMeteringLogic = useCallback(() => {
    stopMeteringLogic();
    meteringIntervalRef.current = setInterval(async () => {
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            if (status.durationMillis !== undefined) {
              setRecordingDuration(status.durationMillis);
            }
            if ((status as any).metering !== undefined) {
              const db = (status as any).metering;
              const rawLevel = normalizeDb(db);
              // console.log("Metering:", db, rawLevel); // Uncomment for spammy debug

              // Smooth check
              setMetering(rawLevel);
              samplesRef.current.push(rawLevel);
              // OPTIMIZATION: Only update state with the tail (last 50 samples) during recording.
              // This prevents O(N) array copying every frame as the recording grows.
              // The full history is preserved in samplesRef.current.
              setWaveform(samplesRef.current.slice(-50));
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }, SAMPLE_INTERVAL_MS);
  }, []);

  const stopMeteringLogic = () => {
    if (meteringIntervalRef.current) {
      clearInterval(meteringIntervalRef.current);
      meteringIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      // 1. Cleanup
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setWaveform([]);
      samplesRef.current = [];
      setMetering(0);
      setRecordingDuration(0);
      console.log("[useAudioRecorder] Starting recording sequence...");

      // 1.5 Stop any TTS
      try {
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
          console.log("[useAudioRecorder] TTS is speaking, stopping...");
          Speech.stop();
          // Short delay to let OS release audio focus
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch (e) {
        console.warn("[useAudioRecorder] Failed to check/stop Speech:", e);
      }

      // 2. Permissions
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn("[useAudioRecorder] Permission denied");
        return;
      }

      // 3. Audio Mode (RECORDING)
      // Highly specific settings for recording
      console.log("[useAudioRecorder] Setting Audio Mode for Recording...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Crucial Delay for Mode Switch
      // Increased to 500ms for iOS category transition stability
      await new Promise((r) => setTimeout(r, 500));

      // 4. Start (Using High Quality Preset for Stability)
      console.log("[useAudioRecorder] Preparing recorder...");
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      recording.setProgressUpdateInterval(SAMPLE_INTERVAL_MS);

      console.log("[useAudioRecorder] Starting Async...");
      await recording.startAsync();
      recordingRef.current = recording;

      setState("recording");
      startMeteringLogic();
      console.log("[useAudioRecorder] Recording started successfully.");
    } catch (e) {
      console.error("[useAudioRecorder] Failed to start recording", e);
      setState("idle");
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    stopMeteringLogic();
    if (!recordingRef.current) return null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setState("idle");
      setMetering(0);
      setDuration(recordingDuration);
      // OPTIMIZATION: Restore full waveform on stop for review/playback
      setWaveform([...samplesRef.current]);
      return uri;
    } catch (e) {
      console.error("Failed to stop recording", e);
      return null;
    }
  };

  const startPlayback = async (uri: string) => {
    try {
      console.log("[useAudioRecorder] Starting playback for:", uri);
      // 1. Audio Mode (PLAYBACK - Speaker Force)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      console.log("[useAudioRecorder] Loading sound...");
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);

            if (status.didJustFinish) {
              console.log("[useAudioRecorder] Playback finished.");
              setState("idle");
              setPlaybackPosition(0);
              setMetering(0);
            }
          } else if ((status as any).error) {
            console.warn(
              "[useAudioRecorder] Playback error update:",
              (status as any).error,
            );
          }
        },
      );

      soundRef.current = sound;
      setState("playback");
      console.log("[useAudioRecorder] Playback started.");
    } catch (e) {
      console.error("[useAudioRecorder] Playback failed", e);
      setState("idle");
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
    }
    setState("idle");
    setMetering(0);
  };

  const deleteRecording = async () => {
    await stopPlayback();
    setWaveform([]);
    samplesRef.current = [];
    setDuration(0);
    setRecordingDuration(0);
  };

  return {
    startRecording,
    stopRecording,
    startPlayback,
    stopPlayback,
    state,
    metering,
    waveform,
    playbackPosition,
    duration,
    recordingDuration,
    deleteRecording,
  };
};
