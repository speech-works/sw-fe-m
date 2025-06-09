// ChorusButton.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import type { ChorusManager } from "./chorusManager";

type Props = {
  chorusManager: ChorusManager;
  textToRead: string;
  isMuted: boolean;
  /** Supply an array of voice IDs to try overlapping. */
  voiceIdentifiers?: string[];
  delayMs?: number;
  rate?: number;
};

export function ChorusButton({
  chorusManager,
  textToRead,
  isMuted,
  voiceIdentifiers = [],
  delayMs = 50,
  rate = 1.0,
}: Props) {
  const onPress = () => {
    if (isMuted) return;
    chorusManager.play({
      text: textToRead,
      voiceIdentifiers,
      delayMs,
      rate,
    });
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonDisabled]}
        onPress={onPress}
        disabled={isMuted}
      >
        <Text style={styles.buttonText}>
          {isMuted ? "Chorus (Muted)" : "Chorus Help"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 16 },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonDisabled: { backgroundColor: "#A0A0A0" },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
