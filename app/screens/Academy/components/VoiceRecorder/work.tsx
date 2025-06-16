import React, { useRef, useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Audio } from "expo-av";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";

const BAR_COUNT = 30;

type Frame = {
  db: number;
  timestamp: number; // Relative timestamp from recording start
};

const VoiceRecorder: React.FC<{ onToggle?: () => void }> = ({ onToggle }) => {
  // State for recording and playback
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meteringData, setMeteringData] = useState<number[]>(
    Array(BAR_COUNT).fill(-100)
  );

  // Audio recording/playback refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordedUri = useRef<string | null>(null);

  // Animation and timing refs
  const recordingFrames = useRef<Frame[]>([]);
  const animationRef = useRef<number | null>(null);
  const isMounted = useRef(true); // To prevent state updates on unmounted component
  const recordingStartTime = useRef<number>(0);
  const playbackStartTime = useRef<number>(0);
  const currentPlaybackPosition = useRef<number>(0);

  // --- General Lifecycle and Permissions ---
  useEffect(() => {
    isMounted.current = true; // Component is mounted

    (async () => {
      console.log("🔧 Requesting audio permissions");
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) console.warn("⚠️ Audio permission not granted");

      console.log("🔧 Setting audio mode");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    })();

    return () => {
      console.log("🧹 Cleaning up audio resources and animations");
      isMounted.current = false; // Component is unmounting
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      soundRef.current?.unloadAsync();
      recordingRef.current?.stopAndUnloadAsync();
    };
  }, []);

  // --- Visualization Logic ---
  const resetVisualization = useCallback(() => {
    console.log("🔄 Resetting visualization");
    setMeteringData(Array(BAR_COUNT).fill(-100));
  }, []);

  // Convert dB to height (0-100%) for the visualization bars
  const normalizeDB = (db: number) => {
    const MIN_DB = -100;
    const MAX_DB = -10; // Adjust for more responsive visualization
    if (db <= MIN_DB) return 0;
    if (db >= MAX_DB) return 1;
    return Math.pow((db - MIN_DB) / (MAX_DB - MIN_DB), 0.5); // Square root for better visual distribution
  };

  // --- Recording Logic ---
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

        // console.log( // Often too chatty, uncomment for detailed debug
        //   `📊 Recording frame: dB=${db.toFixed(
        //     1
        //   )}, time=${relativeTime}ms, total=${recordingFrames.current.length}`
        // );
      }
    },
    [isRecording]
  );

  const startRecording = async () => {
    try {
      console.log("🎤 Starting recording");

      // Stop any active playback if it's running
      if (isPlaying && soundRef.current) {
        console.log("⏹️ Stopping existing playback");
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      }

      // Create and prepare new recording
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true, // Crucial for getting dB values
      });

      // Set up metering updates
      rec.setOnRecordingStatusUpdate((status) => {
        if (
          status.isRecording &&
          typeof status.metering === "number" &&
          isMounted.current
        ) {
          handleMetering(status.metering);
        }
      });

      await rec.startAsync();
      recordingRef.current = rec;
      recordingFrames.current = []; // Clear previous frames
      recordingStartTime.current = Date.now();
      resetVisualization();
      setIsRecording(true);
      setIsPlaying(false); // Ensure playback state is off

      console.log("✅ Recording started successfully");
    } catch (e) {
      console.error("❌ Recording error:", e);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    try {
      console.log("🛑 Stopping recording");

      await recordingRef.current.stopAndUnloadAsync();
      recordedUri.current = recordingRef.current.getURI();
      console.log(`💾 Recording saved: ${recordedUri.current}`);

      recordingRef.current = null;
      setIsRecording(false);
    } catch (e) {
      console.error("❌ Stop recording error:", e);
    }
  };

  // --- Playback Logic ---
  const playbackAnimationLoop = useCallback(() => {
    if (!isMounted.current || !isPlaying) {
      console.log(
        "🚫 Playback animation stopped (due to unmount or !isPlaying)"
      );
      return;
    }

    const now = Date.now();
    const elapsed = now - playbackStartTime.current;
    const frames = recordingFrames.current;

    // Find all frames that should have occurred by this elapsed time
    const relevantFrames = frames.filter(
      (frame) =>
        frame.timestamp <= elapsed &&
        frame.timestamp > currentPlaybackPosition.current
    );

    // Update visualization with the latest relevant frame's dB
    if (relevantFrames.length > 0) {
      const latestFrame = relevantFrames[relevantFrames.length - 1];
      console.log(
        `🎵 Playing frame: dB=${latestFrame.db.toFixed(1)} at ${elapsed}ms`
      );
      setMeteringData((prev) => [...prev.slice(1), latestFrame.db]);
      currentPlaybackPosition.current = elapsed;
    } else if (
      frames.length > 0 &&
      elapsed > frames[frames.length - 1].timestamp
    ) {
      // If we've passed all frames, but haven't hit the "finished" buffer yet,
      // just keep showing the last known metering value or fill with silence
      // For simplicity, we'll keep the last value or fill with silence if no frames.
      const lastKnownDb =
        frames.length > 0 ? frames[frames.length - 1].db : -100;
      setMeteringData((prev) => [...prev.slice(1), lastKnownDb]);
    }

    // Check if we've played past the end of all frames with a small buffer
    const maxTimestamp =
      frames.length > 0 ? Math.max(...frames.map((f) => f.timestamp)) : 0;
    if (elapsed >= maxTimestamp + 500) {
      // Add 0.5 second buffer
      console.log("✅ Playback animation completed");
      setIsPlaying(false); // This will stop the loop
      resetVisualization(); // Reset bars to empty state
      return;
    }

    // Continue animation
    animationRef.current = requestAnimationFrame(playbackAnimationLoop);
  }, [isPlaying, resetVisualization]);

  const togglePlayback = async () => {
    // If currently recording, stop recording first
    if (isRecording) {
      console.log("🛑 Stopping recording before playback toggle");
      await stopRecording();
      // Wait a moment for state to settle if needed, or re-evaluate flow
      // For now, proceed directly
    }

    if (!recordedUri.current) {
      console.log("⚠️ No recorded URI for playback");
      return;
    }

    if (isPlaying) {
      // Stop playback
      console.log("⏹️ Stopping playback");
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      resetVisualization(); // Reset bars when stopped manually
    } else {
      // Start playback
      try {
        console.log("▶️ Starting playback");
        // Unload any previous sound instance
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        const { sound: newSound } = await Audio.Sound.createAsync({
          uri: recordedUri.current,
        });

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && isMounted.current) {
            if (status.didJustFinish) {
              console.log("✅ Playback finished (audio engine)");
              setIsPlaying(false);
              // Animation loop should catch this and reset, but can force here too
              if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
              }
              resetVisualization();
              newSound.unloadAsync();
              soundRef.current = null;
            }
          }
        });

        soundRef.current = newSound;
        await newSound.playAsync();
        setIsPlaying(true);

        // Start visualization animation
        console.log(
          `🎬 Starting playback animation with ${recordingFrames.current.length} frames`
        );
        resetVisualization();
        currentPlaybackPosition.current = 0;
        playbackStartTime.current = Date.now();
        if (recordingFrames.current.length > 0) {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          animationRef.current = requestAnimationFrame(playbackAnimationLoop);
        } else {
          console.warn("⚠️ No frames available for playback animation");
        }

        console.log("✅ Playback started successfully");
      } catch (e) {
        console.error("❌ Playback error:", e);
        setIsPlaying(false); // Ensure UI reflects error state
        resetVisualization();
      }
    }
  };

  // Debug logging
  console.log(
    `🔍 VoiceRecorder overall state: recording=${isRecording}, playing=${isPlaying}, frames=${recordingFrames.current.length}`
  );

  return (
    <View style={styles.recordingContainer}>
      {/* RecordingWidget part (visualization) */}
      <View style={styles.visualizationContainer}>
        <View style={styles.infoBar}>
          <View style={styles.infoBarInner}>
            <Icon
              name="wave-square"
              size={16}
              color={theme.colors.actionPrimary.default}
            />
            <Text style={styles.infoBarLeftText}>Speech</Text>
          </View>
          {(isRecording || isPlaying) && (
            <View style={styles.infoBarInner}>
              <Text style={styles.infoBarRightText}>
                {isRecording ? "Recording" : "Playing"}
              </Text>
              <Icon
                solid
                name="circle"
                size={8}
                color={
                  isRecording
                    ? theme.colors.library.red[500]
                    : theme.colors.library.green[500]
                }
              />
            </View>
          )}
        </View>

        <View style={styles.wave}>
          <View style={styles.barContainer}>
            {meteringData.map((db, idx) => {
              const normalizedHeight = normalizeDB(db);
              const height = normalizedHeight * 76; // 76 = 80 - 4 (padding)
              const minHeight = 2; // Minimum visible height
              const finalHeight = Math.max(minHeight, height);

              // Add slight variation for dynamic look, only when active
              const variation =
                isRecording || isPlaying
                  ? Math.sin(Date.now() * 0.001 + idx) * 2
                  : 0;
              const adjustedHeight = Math.max(
                minHeight,
                finalHeight + variation
              );

              return (
                <View
                  key={idx}
                  style={[
                    styles.bar,
                    {
                      height: adjustedHeight,
                      backgroundColor:
                        normalizedHeight > 0.1
                          ? isRecording
                            ? theme.colors.library.red[400]
                            : theme.colors.library.green[400]
                          : theme.colors.library.gray[200],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* RecorderWidget part (buttons) */}
      <View style={styles.recorderControlsContainer}>
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={styles.circle}
            onPress={onToggle}
            disabled={isRecording || isPlaying} // Disable if recording or playing
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
              isPlaying && styles.disabledCircle,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isPlaying} // Disable mic button if playing
          >
            <Icon
              name={isRecording ? "stop" : "microphone"}
              size={24}
              color={
                isPlaying
                  ? theme.colors.text.disabled
                  : theme.colors.text.onDark
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circle}
            onPress={togglePlayback}
            disabled={isRecording || !recordedUri.current} // Disable if recording or no URI
          >
            <Icon
              name={isPlaying ? "pause" : "play"}
              size={16}
              color={
                isRecording || !recordedUri.current
                  ? theme.colors.text.disabled
                  : theme.colors.text.default
              }
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.recordTipText}>
          Tap microphone to record your voice
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // VoiceRecorder top-level styles
  recordingContainer: {
    padding: 16,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },

  // Styles from RecordingWidget (visualization)
  visualizationContainer: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoBarLeftText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  infoBarRightText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.green[500],
  },
  wave: {
    height: 80,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 12,
    justifyContent: "center",
    overflow: "hidden",
    padding: 2,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    width: "100%",
    height: "100%",
  },
  bar: {
    borderRadius: 1,
    flex: 1,
    marginHorizontal: 0.5,
    minHeight: 2,
  },

  // Styles from RecorderWidget (buttons)
  recorderControlsContainer: {
    gap: 16,
    alignItems: "center",
  },
  micContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 24,
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
  disabledCircle: {
    backgroundColor: theme.colors.surface.disabled,
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});

export default VoiceRecorder;
