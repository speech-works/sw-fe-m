import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";


import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "playback";

interface UseAudioRecorderReturn {
  /** Resolves `false` when the take never started (denied permission, failed
   *  prepare) so the caller can say so — it used to fail silently. */
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  startPlayback: (uri: string) => Promise<void>;
  stopPlayback: () => Promise<void>;
  state: RecorderState;
  /**
   * A take was paused because the app was interrupted, and is waiting for the
   * user to say whether to carry on. `state` stays "recording" throughout: the
   * Recording object is alive and holds the audio, it is simply not capturing.
   */
  interrupted: boolean;
  /** Pause a running take. No-op unless something is actually recording. */
  pauseForInterruption: () => Promise<void>;
  /** Carry on from where the take was paused. */
  resumeInterruption: () => Promise<void>;
  /** Throw the paused take away and return to a clean recorder. */
  discardInterruption: () => Promise<void>;
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
  const [interrupted, setInterrupted] = useState(false);
  const [metering, setMetering] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const meteringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // start* have long await chains (permissions, audio-mode delays); if the
  // screen unmounts mid-flight the cleanup below runs BEFORE the refs are
  // assigned, so the started recording/sound would live forever (hot mic).
  // Each await boundary re-checks this flag and releases what it just created.
  const unmountedRef = useRef(false);

  // Track samples in ref to avoid frequent state re-renders during recording loop
  const samplesRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
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

  const startRecording = async (): Promise<boolean> => {
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
      setInterrupted(false);
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
        return false;
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

      if (unmountedRef.current) return false;

      // 4. Start (Using High Quality Preset for Stability)
      console.log("[useAudioRecorder] Preparing recorder...");
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      recording.setProgressUpdateInterval(SAMPLE_INTERVAL_MS);

      console.log("[useAudioRecorder] Starting Async...");
      await recording.startAsync();
      if (unmountedRef.current) {
        await recording.stopAndUnloadAsync().catch(() => {});
        return false;
      }
      recordingRef.current = recording;

      setState("recording");
      startMeteringLogic();
      console.log("[useAudioRecorder] Recording started successfully.");
      return true;
    } catch (e) {
      console.error("[useAudioRecorder] Failed to start recording", e);
      setState("idle");
      return false;
    }
  };

  /**
   * Interruption handling.
   *
   * The take is paused rather than stopped, so the audio already captured stays
   * in the same file and recording continues into it when the user comes back.
   * `state` deliberately stays "recording": the Recording object is alive, and
   * anything that inspects `state` (the waveform, the dock layout) should keep
   * treating this as a take in progress.
   *
   * Metering is stopped while paused. It polls `getStatusAsync` twenty times a
   * second, and there is nothing to read from a paused recorder.
   *
   * `pauseAsync` rejects on Android below API 24. minSdkVersion is 26, so that
   * cannot happen here — but if the pause fails for any other reason the take is
   * left running rather than half-broken, and the user is none the wiser.
   */
  const pauseForInterruption = async (): Promise<void> => {
    if (!recordingRef.current || state !== "recording" || interrupted) return;
    try {
      await recordingRef.current.pauseAsync();
      stopMeteringLogic();
      setInterrupted(true);
    } catch (e) {
      console.warn("[useAudioRecorder] Could not pause the take", e);
    }
  };

  const resumeInterruption = async (): Promise<void> => {
    if (!recordingRef.current || !interrupted) return;
    try {
      // The audio session was handed back to the OS while we were away; claim it
      // again before asking the recorder to continue, or startAsync can fail.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      await recordingRef.current.startAsync();
      setInterrupted(false);
      startMeteringLogic();
    } catch (e) {
      // Cannot carry on — do not strand the user in a paused state they cannot
      // leave. Drop the take and hand back a clean recorder.
      console.warn("[useAudioRecorder] Could not resume the take, discarding", e);
      await discardInterruption();
    }
  };

  const discardInterruption = async (): Promise<void> => {
    stopMeteringLogic();
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    samplesRef.current = [];
    setWaveform([]);
    setMetering(0);
    setRecordingDuration(0);
    setInterrupted(false);
    setState("idle");
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
            // Only a POSITIVE reading is trustworthy. Android routinely reports
            // no durationMillis for the m4a we just wrote, and zeroing here wiped
            // the length captured at stop — which then read as 00:00 and tripped
            // the "audio too short" guard on a perfectly good take.
            if (status.durationMillis) setDuration(status.durationMillis);

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

      if (unmountedRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
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
    interrupted,
    pauseForInterruption,
    resumeInterruption,
    discardInterruption,
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
