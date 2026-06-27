import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getDeviceVoiceDiagnostics } from "../../../../util/voice";
import type { VoiceDiagnosticRow } from "../../../../util/voice/voiceCapability";

/**
 * STEP 0 — throwaway device diagnostic.
 *
 * Mount this anywhere temporarily (e.g. drop <VoiceDiagnostics /> on the Home
 * screen) and run it on each real test phone to see the ACTUAL voices the OS
 * exposes — name, language, raw quality, our derived tier, and which curated
 * accent it maps to. Use it to confirm the accent roster and tune the
 * natural-vs-basic heuristic in voiceCapability.ts before finalizing.
 *
 * Voices/accents do not exist on simulators, so this must be run on hardware.
 * Remove before shipping.
 */
export function VoiceDiagnostics() {
  const [data, setData] = useState<{
    platform: string;
    total: number;
    englishTotal: number;
    rows: VoiceDiagnosticRow[];
  } | null>(null);

  useEffect(() => {
    getDeviceVoiceDiagnostics()
      .then((d) => {
        setData(d);
        // Also dump to Metro logs for copy/paste.
        console.log("[VoiceDiagnostics]", JSON.stringify(d, null, 2));
      })
      .catch((e) => console.warn("[VoiceDiagnostics] failed:", e));
  }, []);

  if (!data) return <Text style={styles.muted}>Loading voices…</Text>;

  return (
    <View style={styles.box}>
      <Text style={styles.header}>
        {data.platform} · {data.englishTotal} English / {data.total} total
      </Text>
      <ScrollView style={styles.scroll}>
        {data.rows.map((r) => (
          <View key={r.identifier} style={styles.row}>
            <Text style={styles.name}>
              {r.mappedAccent !== "—" ? "★ " : ""}
              {r.name}
            </Text>
            <Text style={styles.meta}>
              {r.language} · {r.quality} (raw: {r.rawQuality})
              {r.isNetwork ? " · network" : ""} · {r.mappedAccent}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    margin: 12,
    maxHeight: 320,
    backgroundColor: "#FFF",
  },
  header: { fontWeight: "700", marginBottom: 8, color: "#0F172A" },
  scroll: { flexGrow: 0 },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  name: { fontWeight: "600", color: "#0F172A" },
  meta: { fontSize: 12, color: "#64748B" },
  muted: { color: "#64748B", padding: 12 },
});
