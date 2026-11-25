/**
 * DEV ONLY: Pip lab. Shows Pip (app/components/Pip) with every move and face, on the app's light and dark canvas, and measures
 * frame times on the phone. Reached from the React Native dev menu ("Pip lab"); not registered in release builds.
 *
 * "Test" plays idle for 10 s, then each move 5 times, and logs one line per run to the Metro log:
 *   SWPIP {"run":"h-palms","frames":..,"avg":..,"p95":..,"max":..,"fps":..,"over28":..}
 * Pass (phase 2): idle about 60 fps; the worst move at least 36 fps on the S22 Ultra (average frame 27.8 ms or less).
 */
import React, { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { runOnJS, useFrameCallback, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PIP_BODY, PIP_FACES, PIP_MOVES, Pip } from "../../components/Pip";
import type { PipHandle, PipMove, PipVariant } from "../../components/Pip";

const CANVAS = { light: "#F7F4EE", dark: "#141311" };
const HOLDS: Record<PipMove, number> = { "h-palms": 1070, "h-wave": 1170, "h-cheek": 1300, "h-chin": 1500, "h-heart": 1170 };
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
type Stat = { run: string; frames: number; avg: number; p95: number; max: number; fps: number; over28: number };
function stat(run: string, ft: number[]): Stat {
  const s = [...ft].sort((a, b) => a - b), avg = ft.reduce((t, v) => t + v, 0) / Math.max(1, ft.length), r = (v: number) => +v.toFixed(2);
  return { run, frames: ft.length, avg: r(avg), p95: r(s[Math.floor(s.length * 0.95)] || 0), max: r(s[s.length - 1] || 0), fps: r(1000 / Math.max(1, avg)), over28: ft.filter(v => v > 27.8).length };
}

export default function PipLab() {
  const { width } = useWindowDimensions(), insets = useSafeAreaInsets();
  const pip = useRef<PipHandle>(null);
  const [variant, setVariant] = useState<PipVariant>("pip"), [mode, setMode] = useState<"light" | "dark">("dark");
  const [hide, setHide] = useState(false), [noCut, setNoCut] = useState(false), [sz, setSz] = useState(360), [noHands, setNoHands] = useState(false), [jelly, setJelly] = useState(true), [jHold, setJHold] = useState(false);
  const [hold, setHold] = useState<[PipMove, number] | null>(null), [busy, setBusy] = useState(false), [rows, setRows] = useState<string[]>([]);
  // frame times, measured on the UI thread while a run records
  const rec = useSharedValue(0);   // 1 = recording, 2 = hand the times to JS
  const got = useRef<((v: number[]) => void) | null>(null);
  const take = useCallback((v: number[]) => { const g = got.current; got.current = null; if (g) g(v); }, []);
  useFrameCallback(info => {
    const g: any = globalThis;   // UI-thread scratch, as in the kit prototype
    if (rec.value === 1) { if (!g.__pipft) g.__pipft = []; if (info.timeSincePreviousFrame != null) g.__pipft.push(info.timeSincePreviousFrame); }
    else if (rec.value === 2) { rec.value = 0; const v = g.__pipft || []; g.__pipft = []; runOnJS(take)(v); }
  });
  const record = useCallback(async (run: string, body: () => Promise<void>) => {
    rec.value = 1; await body();
    const v = await new Promise<number[]>(res => { got.current = res; rec.value = 2; });
    const s = stat(run, v); console.log("SWPIP " + JSON.stringify({ variant, ...s }));
    setRows(r => [...r, `${variant} ${run}: ${s.fps} fps, avg ${s.avg} ms, p95 ${s.p95}, max ${s.max}, frames over 27.8 ms: ${s.over28}/${s.frames}`]);
  }, [rec, variant]);
  const test = useCallback(async () => {
    setBusy(true); setHold(null); setRows([]); await sleep(800);
    await record("idle 10 s", () => sleep(10000));
    for (const m of PIP_MOVES) await record(m + " x5", async () => { for (let i = 0; i < 5; i++) { await pip.current?.play(m); await sleep(150); } });
    await record(`hop+pop+sway x3${jelly ? " (jelly)" : ""}`, async () => { for (let i = 0; i < 3; i++) for (const b of PIP_BODY) { await pip.current?.body(b); await sleep(100); } });
    console.log("SWPIPDONE"); setBusy(false);
  }, [record, jelly]);

  const Bt = ({ label, onPress, on }: { label: string; onPress: () => void; on?: boolean }) => (
    <Pressable onPress={onPress} disabled={busy} style={[st.b, on && st.on, busy && { opacity: 0.4 }]}><Text style={st.bt}>{label}</Text></Pressable>);
  const fg = mode === "dark" ? "#F7F4EE" : "#141311";
  return (
    <View style={[st.root, { backgroundColor: CANVAS[mode], paddingTop: insets.top + 8 }]}>
      <View style={{ height: Math.round(Math.min(width - 32, 360) * 322 / 372), justifyContent: "center" }}>
        {hide ? null : <Pip ref={pip} key={variant} variant={variant} size={Math.min(width - 32, sz)} hold={hold} labNoCut={noCut} labNoHands={noHands} jelly={jelly} labJellyHold={jHold} backdrop={CANVAS[mode]} />}
      </View>
      <ScrollView style={st.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={st.row}>
          <Bt label="Pip" on={variant === "pip"} onPress={() => setVariant("pip")} />
          <Bt label="Pip-f" on={variant === "pip-f"} onPress={() => setVariant("pip-f")} />
          <Bt label={mode === "dark" ? "Dark" : "Light"} onPress={() => setMode(m => (m === "dark" ? "light" : "dark"))} />
          <Bt label="Test" onPress={test} />
        </View>
        <View style={st.row}>
          <Bt label="Idle 5 s" onPress={async () => { setBusy(true); await record(`idle 5 s ${sz} dp${hide ? " (no Pip)" : ""}${noCut ? " (no cut)" : ""}${noHands ? " (no hands)" : ""}`, () => sleep(5000)); setBusy(false); }} />
          <Bt label="Hide Pip" on={hide} onPress={() => setHide(h => !h)} />
          <Bt label="No cut" on={noCut} onPress={() => setNoCut(c => !c)} />
          <Bt label="Arms test" onPress={async () => { setBusy(true); for (const m of ["h-palms", "h-wave"] as PipMove[]) await record(`${m} x5`, async () => { for (let i = 0; i < 5; i++) { await pip.current?.play(m); await sleep(150); } }); setBusy(false); }} />
          <Bt label="No hands" on={noHands} onPress={() => setNoHands(c => !c)} />
          <Bt label={`${sz} dp`} onPress={() => setSz(v => (v === 360 ? 240 : v === 240 ? 160 : 360))} />
        </View>
        <Text style={[st.h, { color: fg }]}>Moves</Text>
        <View style={st.row}>{PIP_MOVES.map(m => <Bt key={m} label={m.slice(2)} onPress={() => { setHold(null); pip.current?.play(m); }} />)}</View>
        <Text style={[st.h, { color: fg }]}>Whole body</Text>
        <View style={st.row}>{PIP_BODY.map(b => <Bt key={b} label={b} onPress={() => pip.current?.body(b)} />)}<Bt label="Jelly" on={jelly} onPress={() => setJelly(j => !j)} /><Bt label="Jelly peak" on={jHold} onPress={() => setJHold(j => !j)} /></View>
        <Text style={[st.h, { color: fg }]}>Hold (pictures)</Text>
        <View style={st.row}>{PIP_MOVES.map(m => <Bt key={m} label={m.slice(2)} on={hold?.[0] === m} onPress={() => setHold(h => (h?.[0] === m ? null : [m, HOLDS[m]]))} />)}</View>
        <Text style={[st.h, { color: fg }]}>Faces</Text>
        <View style={st.row}>{PIP_FACES.map(f => <Bt key={f} label={f} onPress={() => pip.current?.face(f)} />)}</View>
        {rows.map((r, i) => <Text key={i} style={[st.res, { color: fg }]}>{r}</Text>)}
      </ScrollView>
    </View>);
}

const st = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  scroll: { alignSelf: "stretch", paddingHorizontal: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, justifyContent: "center" },
  b: { backgroundColor: "#3A5A8C", paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10 },
  on: { backgroundColor: "#C77B2A" },
  bt: { color: "#fff", fontWeight: "600", fontSize: 13 },
  h: { fontSize: 13, fontWeight: "700", marginTop: 12, textAlign: "center" },
  res: { fontSize: 12, marginTop: 6 },
});
