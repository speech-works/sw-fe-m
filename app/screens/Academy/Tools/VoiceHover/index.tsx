// VoiceHover.tsx
import Slider from "@react-native-community/slider"; // Import Slider
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { theme } from "../../../../Theme/tokens";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import { speakWithProfile, stopSpeaking } from "../../../../util/voice";

type VoiceHoverProps = {
  text: string;
  style?: object;
  textStyle?: object;
  onHighlightChange?: (start: number, length: number) => void;
  // External Control Props
  rate?: number;
  prePause?: number;
  gap?: number;
  isPlaying?: boolean; // If provided, controls playback externally
  onComplete?: () => void;
};

export function VoiceHover({
  text,
  style,
  onHighlightChange,
  rate, // Optional external control
  prePause: externalPrePause, // Optional external control
  gap: externalGap, // Optional external control
  isPlaying: externalIsPlaying, // Optional external control
  onComplete,
}: VoiceHoverProps) {
  // App-wide accent preference, resolved to a concrete on-device voice. Voice
  // selection lives in one place now (app/util/voice) and is shared with every
  // surface, so the guide always speaks in the user's chosen accent.
  const { resolved, preference, loading: loadingVoices } = useVoicePreference();

  // Keep the latest resolved voice in refs so the async chunk loop always reads
  // the current value even if it was started from an earlier render's closure.
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;
  const preferenceRef = useRef(preference);
  preferenceRef.current = preference;

  // Internal State (used if external props are not provided)
  const [internalIsSpeaking, setInternalIsSpeaking] = useState(false);
  const [internalBaseRate, setInternalBaseRate] = useState(1.0);
  const [internalPrePause, setInternalPrePause] = useState(200);
  const [internalGap, setInternalGap] = useState(100);

  // Derived Control Values (External > Internal)
  const isControlled = externalIsPlaying !== undefined;
  const isSpeaking = isControlled ? externalIsPlaying! : internalIsSpeaking;
  const baseRate = rate !== undefined ? rate : internalBaseRate;
  const prePause =
    externalPrePause !== undefined ? externalPrePause : internalPrePause;
  const gapBetweenChunks =
    externalGap !== undefined ? externalGap : internalGap;

  const playTokenRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);
  const highlightTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // This effect runs on unmount.
    return () => {
      playTokenRef.current++;
      stopSpeaking();
      clearAllHighlightTimeouts();
      if (onHighlightChange) onHighlightChange(-1, 0);
    };
  }, []);

  useEffect(() => {
    // This effect handles changes to the 'text' prop.
    playTokenRef.current++;
    stopSpeaking();
    clearAllHighlightTimeouts();
    if (!isControlled) setInternalIsSpeaking(false);

    currentChunkIndexRef.current = 0;
    if (onHighlightChange) onHighlightChange(-1, 0);
  }, [text]);

  // Effect to handle EXTERNAL isPlaying changes
  useEffect(() => {
    if (loadingVoices) return;
    if (isControlled) {
      if (externalIsPlaying) {
        // START or RESUME
        // Logic similar to onPlay but triggered by prop
        const token = ++playTokenRef.current;
        chunksRef.current = splitIntoChunks(text);
        // Verify if we need to reset index
        if (currentChunkIndexRef.current >= chunksRef.current.length) {
          currentChunkIndexRef.current = 0;
        }
        speakChunks(currentChunkIndexRef.current, token);
      } else {
        // STOP
        playTokenRef.current++;
        stopSpeaking();
        clearAllHighlightTimeouts();
        if (onHighlightChange) onHighlightChange(-1, 0);
      }
    }
  }, [externalIsPlaying, loadingVoices, text]);

  const clearAllHighlightTimeouts = () => {
    highlightTimeoutsRef.current.forEach((id) => clearTimeout(id));
    highlightTimeoutsRef.current = [];
  };

  const splitIntoChunks = (input: string): string[] => {
    const regex = /[^,;:.!?]+[,:;.!?]?/g;
    const results: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const raw = match[0].trim();
      if (!raw) continue;
      results.push(raw);
    }
    return results;
  };

  const speakChunks = async (startChunkIndex: number, token: number) => {
    // setIsSpeaking(true); // Managed by parents or internal state

    const chunkStarts: number[] = [];
    let cumulative = 0;
    for (const ch of chunksRef.current) {
      const idx = text.indexOf(ch, cumulative);
      chunkStarts.push(idx >= 0 ? idx : cumulative);
      cumulative = (idx >= 0 ? idx : cumulative) + ch.length;
    }

    for (let ci = startChunkIndex; ci < chunksRef.current.length; ci++) {
      if (playTokenRef.current !== token) break;
      currentChunkIndexRef.current = ci;

      await new Promise((r) => setTimeout(r, prePause));
      if (playTokenRef.current !== token) break;

      const chunkText = chunksRef.current[ci];
      const chunkStartIdx = chunkStarts[ci];

      const stripped = chunkText.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");

      if (stripped) {
        if (onHighlightChange) {
          onHighlightChange(chunkStartIdx, chunkText.length);
        }

        await new Promise<void>((resolve) => {
          speakWithProfile(stripped, {
            voice: resolvedRef.current.voice,
            language: preferenceRef.current?.accent,
            rate: baseRate,
            onDone: () => resolve(),
            onError: (e) => {
              console.error("Speech error:", e);
              resolve();
            },
          });
        });
      }

      if (playTokenRef.current !== token) break;

      if (onHighlightChange) onHighlightChange(-1, 0);
      await new Promise((r) => setTimeout(r, gapBetweenChunks));
    }

    if (playTokenRef.current === token) {
      // Finished normally
      if (!isControlled) setInternalIsSpeaking(false);
      if (onHighlightChange) onHighlightChange(-1, 0);
      onComplete?.();
    }
  };

  const restartFromCurrent = () => {
    if (!isSpeaking) return;
    playTokenRef.current++;
    stopSpeaking();
    clearAllHighlightTimeouts();
    const token = playTokenRef.current;
    setTimeout(() => {
      if (playTokenRef.current === token) {
        speakChunks(currentChunkIndexRef.current, token);
      }
    }, 50);
  };

  // If params change while speaking, restart logic
  useEffect(() => {
    if (isSpeaking && !loadingVoices) {
      restartFromCurrent();
    }
  }, [baseRate, prePause, gapBetweenChunks]); // Depend on resolved values

  const onPlayInternal = () => {
    if (loadingVoices) return;
    if (internalIsSpeaking) {
      playTokenRef.current++;
      stopSpeaking();
      clearAllHighlightTimeouts();
      setInternalIsSpeaking(false);
      if (onHighlightChange) onHighlightChange(-1, 0);
      return;
    }
    playTokenRef.current++;
    const token = playTokenRef.current;
    chunksRef.current = splitIntoChunks(text);
    currentChunkIndexRef.current = 0;
    setInternalIsSpeaking(true);
    if (onHighlightChange) onHighlightChange(-1, 0);
    speakChunks(0, token);
  };

  // Render Controls ONLY if NOT Controlled Externally
  if (isControlled) {
    // Just render a hidden view or nothing, as logic is running via hooks/effects handled above?
    // Actually, we need to return null or just the view if style is passed.
    // But wait, our 'speakChunks' etc. are closures. Usage is fine.
    return <View style={style} />;
  }

  return (
    <View style={[styles.container, style]}>
      {loadingVoices ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <View style={styles.controls}>
            {/* Rate controls */}
            <View style={styles.controlSection}>
              <View style={styles.rowContainer}>
                <Text style={styles.infoText}>Speech Rate</Text>
                <Text style={styles.speedText}>
                  {internalBaseRate.toFixed(1)}×
                </Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5} // Minimum rate
                  maximumValue={2.0} // Maximum rate
                  step={0.1} // Step value
                  value={internalBaseRate}
                  onValueChange={(value) => {
                    setInternalBaseRate(value);
                  }}
                  minimumTrackTintColor={theme.colors.library.orange[400]}
                  maximumTrackTintColor={theme.colors.surface.default}
                  thumbTintColor={theme.colors.library.orange[400]}
                />
              </View>
              <View style={styles.rowContainer}>
                <Text style={styles.paceText}>Slow</Text>
                <Text style={styles.paceText}>Fast</Text>
              </View>
            </View>

            {/* PrePause controls */}
            <View style={styles.controlSection}>
              <View style={styles.rowContainer}>
                <Text style={styles.infoText}>Pre-Pause</Text>
                <Text style={styles.speedText}>{internalPrePause}ms</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0} // Minimum pre-pause
                  maximumValue={1000} // Maximum pre-pause
                  step={50} // Step value
                  value={internalPrePause}
                  onValueChange={(value) => {
                    setInternalPrePause(value);
                  }}
                  minimumTrackTintColor={theme.colors.library.orange[400]}
                  maximumTrackTintColor={theme.colors.surface.default}
                  thumbTintColor={theme.colors.library.orange[400]}
                />
              </View>
              <View style={styles.rowContainer}>
                <Text style={styles.paceText}>Short</Text>
                <Text style={styles.paceText}>Long</Text>
              </View>
            </View>

            {/* GapBetween controls */}
            <View style={styles.controlSection}>
              <View style={styles.rowContainer}>
                <Text style={styles.infoText}>Gap Between Chunks</Text>
                <Text style={styles.speedText}>{internalGap}ms</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0} // Minimum gap
                  maximumValue={1000} // Maximum gap
                  step={50} // Step value
                  value={internalGap}
                  onValueChange={(value) => {
                    setInternalGap(value);
                  }}
                  minimumTrackTintColor={theme.colors.library.orange[400]}
                  maximumTrackTintColor={theme.colors.surface.default}
                  thumbTintColor={theme.colors.library.orange[400]}
                />
              </View>
              <View style={styles.rowContainer}>
                <Text style={styles.paceText}>Short</Text>
                <Text style={styles.paceText}>Long</Text>
              </View>
            </View>
          </View>

          {/* Speak/Stop button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onPlayInternal}
              style={[styles.button, internalIsSpeaking && styles.buttonStop]}
            >
              <Text style={styles.buttonText}>
                {internalIsSpeaking ? "Stop" : "Speak"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: "column",
  },
  controls: {
    flexDirection: "column",
    gap: 16, // Increased gap between control sections
  },
  controlSection: {
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  speedText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
  },
  sliderWrapper: {
    width: "100%",
    justifyContent: "center",
    overflow: "visible", // Ensures thumb is not clipped
  },
  slider: {
    width: "100%",
    height: 12,
  },
  paceText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  buttonContainer: {
    paddingVertical: 8,
    marginTop: 8, // Added some margin to separate from sliders
  },
  button: {
    paddingVertical: 10, // Increased padding for better touch target
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  buttonStop: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
