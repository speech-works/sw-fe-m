import React, { useRef, useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import RecordingWidget from "./RecordingWidget";
import RecorderWidget from "./RecorderWidget";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";

const BAR_COUNT = 30;

type Frame = {
  db: number;
  timestamp: number; // Relative timestamp from recording start
};

const VoiceRecorder: React.FC<{
  onToggle?: () => void;
  onRecorded?: () => void;
  onRecording?: () => void;
}> = ({ onToggle, onRecorded, onRecording }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meteringData, setMeteringData] = useState<number[]>(
    Array(BAR_COUNT).fill(-100)
  );

  // Animation and timing refs
  const recordingFrames = useRef<Frame[]>([]);
  const animationRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const recordingStartTime = useRef<number>(0);
  const playbackStartTime = useRef<number>(0);
  const currentPlaybackPosition = useRef<number>(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Reset visualization to empty state
  const resetVisualization = useCallback(() => {
    console.log("🔄 Resetting visualization");
    setMeteringData(Array(BAR_COUNT).fill(-100));
  }, []);

  // Handle metering data from recording
  const handleMetering = useCallback(
    (db: number) => {
      if (!isMounted.current) return;

      // Always update the current visualization
      setMeteringData((prev) => [...prev.slice(1), db]);

      // Store frame data during recording with precise timing
      if (isRecording) {
        const now = Date.now();
        const relativeTime = now - recordingStartTime.current;

        recordingFrames.current.push({
          db,
          timestamp: relativeTime,
        });

        console.log(
          `📊 Recording frame: dB=${db.toFixed(
            1
          )}, time=${relativeTime}ms, total=${recordingFrames.current.length}`
        );
      }
    },
    [isRecording]
  );

  // Start recording
  const handleRecordStart = useCallback(() => {
    console.log("🎤 Starting recording");
    recordingFrames.current = [];
    recordingStartTime.current = Date.now();
    resetVisualization();
    setIsRecording(true);
    setIsPlaying(false);
    onRecording?.();
  }, [resetVisualization, onRecording]);

  // Stop recording
  const handleRecordStop = useCallback(() => {
    console.log(
      `🛑 Recording stopped. Captured ${recordingFrames.current.length} frames`
    );
    setIsRecording(false);
    onRecorded?.();
  }, [onRecorded]);

  // Playback animation loop
  const playbackAnimationLoop = useCallback(() => {
    if (!isMounted.current || !isPlaying) {
      console.log("🚫 Animation stopped");
      return;
    }

    const now = Date.now();
    const elapsed = now - playbackStartTime.current;
    const frames = recordingFrames.current;

    // Find all frames that should be played at this time
    const framesToPlay = frames.filter(
      (frame) =>
        frame.timestamp <= elapsed &&
        frame.timestamp > currentPlaybackPosition.current
    );

    // Update visualization with the latest frame data
    if (framesToPlay.length > 0) {
      const latestFrame = framesToPlay[framesToPlay.length - 1];
      console.log(
        `🎵 Playing frame: dB=${latestFrame.db.toFixed(1)} at ${elapsed}ms`
      );

      setMeteringData((prev) => [...prev.slice(1), latestFrame.db]);
      currentPlaybackPosition.current = elapsed;
    }

    // Check if we've played all frames
    const maxTimestamp =
      frames.length > 0 ? Math.max(...frames.map((f) => f.timestamp)) : 0;
    if (elapsed >= maxTimestamp + 1000) {
      // Add 1 second buffer
      console.log("✅ Playback animation completed");
      setIsPlaying(false);
      return;
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(playbackAnimationLoop);
  }, [isPlaying]);

  // Start playback animation
  const startPlaybackAnimation = useCallback(() => {
    console.log(
      `🎬 Starting playback animation with ${recordingFrames.current.length} frames`
    );

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Reset state
    resetVisualization();
    currentPlaybackPosition.current = 0;
    playbackStartTime.current = Date.now();

    // Start animation loop
    if (recordingFrames.current.length > 0) {
      animationRef.current = requestAnimationFrame(playbackAnimationLoop);
    } else {
      console.warn("⚠️ No frames available for playback");
    }
  }, [resetVisualization, playbackAnimationLoop]);

  // Handle playback start
  const handlePlaybackStart = useCallback(() => {
    console.log("▶️ Playback started");
    setIsPlaying(true);

    // Start animation on next tick to ensure state is updated
    requestAnimationFrame(() => {
      if (isMounted.current) {
        startPlaybackAnimation();
      }
    });
  }, [startPlaybackAnimation]);

  // Handle playback stop
  const handlePlaybackStop = useCallback(() => {
    console.log("⏹️ Playback stopped");

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsPlaying(false);
    currentPlaybackPosition.current = 0;
    resetVisualization();
  }, [resetVisualization]);

  // Debug logging
  console.log(
    `🔍 VoiceRecorder state: recording=${isRecording}, playing=${isPlaying}, frames=${recordingFrames.current.length}`
  );

  return (
    <View style={styles.recordingContainer}>
      <RecordingWidget
        isRecording={isRecording}
        isPlaying={isPlaying}
        meteringData={meteringData}
      />
      <View style={styles.recorderContainer}>
        <RecorderWidget
          onRecord={handleRecordStart}
          onStopRecording={handleRecordStop}
          onPlay={handlePlaybackStart}
          onPlaybackStop={handlePlaybackStop}
          onToggle={onToggle}
          onMetering={handleMetering}
        />
        <Text style={styles.recordTipText}>
          Tap microphone to record your voice
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recordingContainer: {
    padding: 16,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  recorderContainer: {
    gap: 16,
    alignItems: "center",
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});

export default VoiceRecorder;
