// VoiceHover.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider"; // Import Slider
import * as Speech from "expo-speech";
import { parseTextStyle } from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";

type VoiceHoverProps = {
  text: string;
  style?: object;
  textStyle?: object;
  onHighlightChange?: (start: number, length: number) => void;
};

export function VoiceHover({
  text,
  style,
  textStyle,
  onHighlightChange,
}: VoiceHoverProps) {
  const [voiceId, setVoiceId] = useState<string | undefined>(undefined);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [baseRate, setBaseRate] = useState(1.0);
  const [prePause, setPrePause] = useState(200);
  const [gapBetweenChunks, setGapBetweenChunks] = useState(100);

  const playTokenRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);
  const currentWordIndexRef = useRef(0); // Not directly used for highlighting words anymore
  const highlightTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const allVoices = await Speech.getAvailableVoicesAsync();
        let chosen: string | undefined = undefined;

        if (Platform.OS === "ios") {
          chosen = allVoices.find(
            (v) =>
              v.language?.startsWith("en") &&
              v.name?.toLowerCase().includes("enhanced") &&
              v.identifier
          )?.identifier;
          if (!chosen) {
            chosen = allVoices.find(
              (v) =>
                v.language?.startsWith("en") &&
                v.name?.toLowerCase().includes("premium") &&
                v.identifier
            )?.identifier;
          }
        }
        if (!chosen && Platform.OS === "android") {
          chosen = allVoices.find(
            (v) =>
              v.language === "en-US" &&
              v.name?.toLowerCase().includes("female") &&
              v.identifier
          )?.identifier;
          if (!chosen) {
            chosen = allVoices.find(
              (v) => v.language === "en-US" && v.identifier
            )?.identifier;
          }
        }
        if (!chosen) {
          chosen = allVoices.find(
            (v) => v.language?.startsWith("en") && v.identifier
          )?.identifier;
        }
        setVoiceId(chosen);
      } catch (err) {
        console.warn("VoiceHover: failed to load voices:", err);
      } finally {
        setLoadingVoices(false);
      }
    })();
  }, []);

  useEffect(() => {
    // This effect runs on unmount.
    return () => {
      playTokenRef.current++;
      Speech.stop();
      clearAllHighlightTimeouts();
      if (onHighlightChange) onHighlightChange(-1, 0);
    };
  }, []);

  useEffect(() => {
    // This effect handles changes to the 'text' prop.
    playTokenRef.current++;
    Speech.stop();
    clearAllHighlightTimeouts();
    setIsSpeaking(false);
    currentChunkIndexRef.current = 0;
    currentWordIndexRef.current = 0;
    if (onHighlightChange) onHighlightChange(-1, 0);
  }, [text]);

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

  // splitChunkIntoWords is retained but not used for highlighting in chunk-level mode.
  const splitChunkIntoWords = (
    chunk: string,
    chunkStart: number
  ): { word: string; start: number; length: number }[] => {
    const wordRegex = /[A-Za-z0-9']+/g;
    const words: { word: string; start: number; length: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = wordRegex.exec(chunk)) !== null) {
      const w = match[0];
      const relIdx = match.index;
      words.push({
        word: w,
        start: chunkStart + relIdx,
        length: w.length,
      });
    }
    return words;
  };

  const speakChunks = async (startChunkIndex: number, token: number) => {
    setIsSpeaking(true);

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

        const pitch = 1 + (Math.random() * 0.06 - 0.03);

        await new Promise<void>((resolve) => {
          Speech.speak(stripped, {
            voice: voiceId,
            rate: baseRate,
            pitch,
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
      setIsSpeaking(false);
      if (onHighlightChange) onHighlightChange(-1, 0);
    }
  };

  const restartFromCurrent = () => {
    if (!isSpeaking) return;
    playTokenRef.current++;
    Speech.stop();
    clearAllHighlightTimeouts();
    const token = playTokenRef.current;
    setTimeout(() => {
      if (playTokenRef.current === token) {
        speakChunks(currentChunkIndexRef.current, token);
      }
    }, 50);
  };

  const onPlay = () => {
    if (loadingVoices) return;
    if (isSpeaking) {
      playTokenRef.current++;
      Speech.stop();
      clearAllHighlightTimeouts();
      setIsSpeaking(false);
      if (onHighlightChange) onHighlightChange(-1, 0);
      return;
    }
    playTokenRef.current++;
    const token = playTokenRef.current;
    chunksRef.current = splitIntoChunks(text);
    currentChunkIndexRef.current = 0;
    currentWordIndexRef.current = 0;
    if (onHighlightChange) onHighlightChange(-1, 0);
    speakChunks(0, token);
  };

  // The individual increase/decrease functions are no longer needed
  // as the Slider's onValueChange will update the state directly.
  // We'll keep the restartFromCurrent logic within the slider's onValueChange
  // for consistency with previous button behavior.

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
                <Text style={styles.speedText}>{baseRate.toFixed(1)}×</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5} // Minimum rate
                  maximumValue={2.0} // Maximum rate
                  step={0.1} // Step value
                  value={baseRate}
                  onValueChange={(value) => {
                    setBaseRate(value);
                    restartFromCurrent(); // Restart speech with new rate
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
                <Text style={styles.speedText}>{prePause}ms</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0} // Minimum pre-pause
                  maximumValue={1000} // Maximum pre-pause
                  step={50} // Step value
                  value={prePause}
                  onValueChange={(value) => {
                    setPrePause(value);
                    restartFromCurrent(); // Restart speech with new pre-pause
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
                <Text style={styles.speedText}>{gapBetweenChunks}ms</Text>
              </View>
              <View style={styles.sliderWrapper}>
                <Slider
                  style={styles.slider}
                  minimumValue={0} // Minimum gap
                  maximumValue={1000} // Maximum gap
                  step={50} // Step value
                  value={gapBetweenChunks}
                  onValueChange={(value) => {
                    setGapBetweenChunks(value);
                    restartFromCurrent(); // Restart speech with new gap
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
              onPress={onPlay}
              style={[styles.button, isSpeaking && styles.buttonStop]}
            >
              <Text style={styles.buttonText}>
                {isSpeaking ? "Stop" : "Speak"}
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
