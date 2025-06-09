// VoiceLister.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import * as Speech from "expo-speech";

// Define a local “VoiceItem” type that matches what getAvailableVoicesAsync returns.
// You can add or remove fields based on what you actually see at runtime.
type VoiceItem = {
  identifier: string | null;
  name: string | null;
  language: string | null;
  quality?: string | null;
  networkConnectionRequired?: boolean | null;
};

export default function VoiceLister() {
  const [voices, setVoices] = useState<VoiceItem[]>([]);

  useEffect(() => {
    Speech.getAvailableVoicesAsync()
      .then((list) => {
        // Filter out any entries that have a null identifier or name
        const valid: VoiceItem[] = list.filter(
          (v: any) => v.identifier && v.name
        );
        setVoices(valid);
      })
      .catch((err) => console.warn("Error listing voices:", err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available TTS Voices:</Text>
      <ScrollView style={styles.scroll}>
        {voices.map((v) => (
          <View key={v.identifier!} style={styles.row}>
            <Text style={styles.name}>
              {v.name} ({v.language})
            </Text>
            <Text style={styles.id}>{v.identifier}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  scroll: { flex: 1 },
  row: { marginBottom: 12 },
  name: { fontSize: 16 },
  id: { fontSize: 12, color: "#555" },
});
