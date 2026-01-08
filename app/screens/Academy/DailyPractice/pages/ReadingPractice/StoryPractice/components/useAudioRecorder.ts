import { useState, useRef, useCallback, useEffect } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Platform } from "react-native";
import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from "expo-av/build/Audio";

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
  deleteRecording: () => void;
}

const SAMPLE_INTERVAL_MS = 50; // 20fps updates

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<RecorderState>("idle");
  const [metering, setMetering] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);

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
          if (status.isRecording && (status as any).metering !== undefined) {
            const db = (status as any).metering;
            const rawLevel = normalizeDb(db);

            // Smooth check
            setMetering(rawLevel);
            samplesRef.current.push(rawLevel);
            setWaveform([...samplesRef.current]);
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

      // 2. Permissions
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn("Permission denied");
        return;
      }

      // 3. Audio Mode (RECORDING)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 4. Start (Explicit Options)
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: AndroidOutputFormat.MPEG_4,
          audioEncoder: AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: IOSOutputFormat.MPEG4AAC,
          audioQuality: IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        isMeteringEnabled: true,
        web: {
          mimeType: undefined,
          bitsPerSecond: undefined,
        },
      });

      recording.setProgressUpdateInterval(SAMPLE_INTERVAL_MS);

      await recording.startAsync();
      recordingRef.current = recording;

      setState("recording");
      startMeteringLogic();
    } catch (e) {
      console.error("Failed to start recording", e);
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
      return uri;
    } catch (e) {
      console.error("Failed to stop recording", e);
      return null;
    }
  };

  const startPlayback = async (uri: string) => {
    try {
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

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 50 },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);

            if (status.didJustFinish) {
              setState("idle");
              setPlaybackPosition(0);
              setMetering(0);
            }
          }
        }
      );

      soundRef.current = sound;
      setState("playback");
    } catch (e) {
      console.error("Playback failed", e);
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
    deleteRecording,
  };
};
