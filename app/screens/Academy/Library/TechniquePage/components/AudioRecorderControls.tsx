// AudioRecorderControls.tsx
import React, { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import type { AVPlaybackStatus } from "expo-av";
import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from "expo-av/build/Audio";

export type RecorderStatus =
  | "idle"
  | "recording"
  | "stopped"
  | "playing"
  | "paused";

export interface AudioRecorderControlsProps {
  onMeter?: (db: number) => void; // called frequently during recording with dB (approx)
  onRecordingReady?: (uri: string) => void; // when a recording file is ready (on stop)
  onPlaybackStatus?: (status: AVPlaybackStatus) => void;
  // control signals from parent
  startRecordingSignal?: number | null; // bump to start
  stopRecordingSignal?: number | null; // bump to stop
  startPlaybackSignal?: number | null; // bump to start playback
  stopPlaybackSignal?: number | null; // bump to stop playback
  playbackUri?: string | null;
}

const SAMPLE_INTERVAL_MS = 60; // sample every ~60ms for smooth frames (~16-60fps visual interpolation will use this)

const AudioRecorderControls: React.FC<AudioRecorderControlsProps> = ({
  onMeter,
  onRecordingReady,
  onPlaybackStatus,
  startRecordingSignal,
  stopRecordingSignal,
  startPlaybackSignal,
  stopPlaybackSignal,
  playbackUri,
}) => {
  // Use Audio.Recording and Audio.Sound types via the Audio namespace
  const recordingRef = useRef<Audio.Recording | null>(null);
  const meteringTimer = useRef<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Configure audio mode for record/playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playThroughEarpieceAndroid: false,
    });
    return () => {
      stopMeteringTimer();
      (async () => {
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch {}
          recordingRef.current = null;
        }
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch {}
          soundRef.current = null;
        }
      })();
    };
  }, []);

  // helpers
  const startMeteringTimer = () => {
    stopMeteringTimer();
    meteringTimer.current = setInterval(async () => {
      try {
        if (!recordingRef.current) return;
        const status = await recordingRef.current.getStatusAsync();
        const metering = (status as any).metering ?? null;
        if (typeof metering === "number") {
          onMeter?.(metering);
        }
      } catch (e) {
        // ignore sampling errors
      }
    }, SAMPLE_INTERVAL_MS) as unknown as number;
  };

  const stopMeteringTimer = () => {
    if (meteringTimer.current) {
      clearInterval(meteringTimer.current);
      meteringTimer.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Microphone permission is required to record audio."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

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

      await recording.startAsync();
      recordingRef.current = recording;
      startMeteringTimer();
    } catch (e) {
      console.error("startRecording error", e);
      Alert.alert("Recording error", String(e));
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      stopMeteringTimer();
      const rec = recordingRef.current;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (uri) {
        onRecordingReady?.(uri);
      }
    } catch (e) {
      console.error("stopRecording error", e);
    }
  };

  const startPlayback = async (uri?: string) => {
    try {
      const sourceUri = uri ?? playbackUri;
      if (!sourceUri) return;
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: sourceUri },
        { shouldPlay: true },
        (status) => {
          onPlaybackStatus?.(status);
        }
      );
      soundRef.current = sound;
      // ensure frequent status updates are sent to parent
      if (soundRef.current && onPlaybackStatus) {
        soundRef.current.setOnPlaybackStatusUpdate((status) => {
          onPlaybackStatus(status as any);
        });
      }
    } catch (e) {
      console.error("startPlayback error", e);
      Alert.alert("Playback error", String(e));
    }
  };

  const stopPlayback = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      console.error("stopPlayback error", e);
    }
  };

  // Effects for bump signals from parent
  const startRecordingRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      !startRecordingSignal ||
      startRecordingSignal === startRecordingRef.current
    )
      return;
    startRecordingRef.current = startRecordingSignal;
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRecordingSignal]);

  const stopRecordingRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      !stopRecordingSignal ||
      stopRecordingSignal === stopRecordingRef.current
    )
      return;
    stopRecordingRef.current = stopRecordingSignal;
    stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRecordingSignal]);

  const startPlaybackRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      !startPlaybackSignal ||
      startPlaybackSignal === startPlaybackRef.current
    )
      return;
    startPlaybackRef.current = startPlaybackSignal;
    startPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPlaybackSignal, playbackUri]);

  const stopPlaybackRef = useRef<number | null>(null);
  useEffect(() => {
    if (!stopPlaybackSignal || stopPlaybackSignal === stopPlaybackRef.current)
      return;
    stopPlaybackRef.current = stopPlaybackSignal;
    stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopPlaybackSignal]);

  return null;
};

export default AudioRecorderControls;
