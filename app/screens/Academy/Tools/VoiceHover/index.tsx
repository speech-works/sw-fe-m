// VoiceHover.tsx
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useVoicePreference } from "../../../../hooks/useVoicePreference";
import { speakWithProfile, stopSpeaking } from "../../../../util/voice";
import { spacing, radius, Text, Slider, Button, Spinner } from "../../../../design-system";

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
        <Spinner size="small" />
      ) : (
        <>
          <View style={styles.controls}>
            {/* Rate controls */}
            <View style={styles.section}>
              <Slider
                label="Speech Rate"
                showValue
                haptic={false}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={internalBaseRate}
                onValueChange={setInternalBaseRate}
                formatValue={(v) => `${v.toFixed(1)}×`}
              />
              <View style={styles.captionRow}>
                <Text variant="caption" color="tertiary">Slow</Text>
                <Text variant="caption" color="tertiary">Fast</Text>
              </View>
            </View>

            {/* PrePause controls */}
            <View style={styles.section}>
              <Slider
                label="Pre-Pause"
                showValue
                haptic={false}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={internalPrePause}
                onValueChange={setInternalPrePause}
                formatValue={(v) => `${Math.round(v)}ms`}
              />
              <View style={styles.captionRow}>
                <Text variant="caption" color="tertiary">Short</Text>
                <Text variant="caption" color="tertiary">Long</Text>
              </View>
            </View>

            {/* GapBetween controls */}
            <View style={styles.section}>
              <Slider
                label="Gap Between Chunks"
                showValue
                haptic={false}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={internalGap}
                onValueChange={setInternalGap}
                formatValue={(v) => `${Math.round(v)}ms`}
              />
              <View style={styles.captionRow}>
                <Text variant="caption" color="tertiary">Short</Text>
                <Text variant="caption" color="tertiary">Long</Text>
              </View>
            </View>
          </View>

          {/* Speak/Stop button */}
          <View style={styles.buttonContainer}>
            <Button
              label={internalIsSpeaking ? "Stop" : "Speak"}
              variant={internalIsSpeaking ? "danger" : "primary"}
              onPress={onPlayInternal}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: "column",
  },
  controls: {
    flexDirection: "column",
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  captionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
});
