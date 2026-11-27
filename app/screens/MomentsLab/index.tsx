/**
 * DEV ONLY: Moments lab. The founder plays every Pip animation option for each of the 24 moments and stars his top 2.
 * Reached from the dev menu ("Moments lab") or from the "Moments" button in the Pip lab. Picks are saved on the phone
 * (AsyncStorage key "momentsLab.picks") and can be shared as text from the Summary view.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pip } from "../../components/Pip";
import type { PipBeat, PipHandle, PipVariant } from "../../components/Pip";
import { PIP_MOMENTS } from "../../components/Pip/moments";
import type { PipOption } from "../../components/Pip/moments";

const KEY = "momentsLab.picks";
const CANVAS = { light: "#F7F4EE", dark: "#141311" };
const MAX_PICKS = 2;
const AREAS = ["Program", "Practice", "Home", "Onboarding", "Social", "System"] as const;
type Picks = Record<string, string[]>;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const isPool = (o: PipOption) => !!o.variants && Object.keys(o.variants).every(k => /^\d+$/.test(k));
const poolKeys = (o: PipOption) => Object.keys(o.variants || {}).sort((a, b) => Number(a) - Number(b));
const plain = (k: string) => k.replace(/-/g, " ");

export default function MomentsLab() {
  const { width } = useWindowDimensions(), insets = useSafeAreaInsets();
  const pip = useRef<PipHandle>(null), alive = useRef(true);
  const nav = useNavigation<NavigationProp<ParamListBase>>();
  const [variant, setVariant] = useState<PipVariant>("pip"), [mode, setMode] = useState<"light" | "dark">("dark");
  const [idx, setIdx] = useState(0), [picks, setPicks] = useState<Picks>({}), [summary, setSummary] = useState(false), [jump, setJump] = useState(false);
  const [busy, setBusy] = useState(false), [note, setNote] = useState(""), [lastPool, setLastPool] = useState<Record<string, number>>({});

  useEffect(() => {
    alive.current = true;
    (async () => { try { const s = await AsyncStorage.getItem(KEY); if (s && alive.current) setPicks(JSON.parse(s) as Picks); } catch { /* ignore */ } })();
    return () => { alive.current = false; };
  }, []);

  const moment = PIP_MOMENTS[idx], dark = mode === "dark";
  const fg = dark ? "#F7F4EE" : "#141311", sub = dark ? "#B9B3A8" : "#5E584E", card = dark ? "#23211E" : "#FFFFFF", line = dark ? "#3A3733" : "#DDD6C8";
  const pickedCount = PIP_MOMENTS.filter(m => (picks[m.id] || []).length > 0).length;
  const go = (i: number) => { setIdx(Math.max(0, Math.min(PIP_MOMENTS.length - 1, i))); setNote(""); };

  const play = useCallback(async (beats: PipBeat[]) => {
    if (busy || !pip.current) return;
    setBusy(true);
    try {
      await pip.current.perform(beats);
      await sleep(600);
      if (alive.current) pip.current?.face("calm");
    } finally { if (alive.current) setBusy(false); }
  }, [busy]);

  const playPool = (o: PipOption) => {
    const keys = poolKeys(o), next = ((lastPool[o.id] || 0) % keys.length) + 1;
    setLastPool(p => ({ ...p, [o.id]: next }));
    play(o.variants![String(next)]);
  };

  const toggle = (o: PipOption) => {
    const cur = picks[moment.id] || [];
    let next: string[];
    if (cur.includes(o.id)) next = cur.filter(x => x !== o.id);
    else if (cur.length >= MAX_PICKS) { setNote("Unstar one first"); return; }
    else next = [...cur, o.id];
    setNote("");
    const all = { ...picks, [moment.id]: next };
    setPicks(all);
    AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => undefined);
  };

  const lines = PIP_MOMENTS.map(m => {
    const names = (picks[m.id] || []).map(id => { const o = m.options.find(x => x.id === id); return o ? `${o.id} ${o.name}` : id; });
    return `${m.id}: ${names.join(", ") || "-"}`;
  });
  const share = () => { Share.share({ message: lines.join("\n") }).catch(() => undefined); };

  const Btn = ({ label, onPress, on, off, grow }: { label: string; onPress: () => void; on?: boolean; off?: boolean; grow?: boolean }) => (
    <Pressable onPress={onPress} disabled={off} style={[s.btn, { borderColor: line }, on && s.btnOn, off && { opacity: 0.4 }, grow && { flex: 1 }]}>
      <Text style={[s.btnT, { color: on ? "#141311" : fg }]}>{label}</Text>
    </Pressable>);

  const size = Math.min(width - 32, 300);
  return (
    <View style={[s.root, { backgroundColor: CANVAS[mode], paddingTop: insets.top + 8 }]}>
      <View style={{ height: Math.round(size * 322 / 372), justifyContent: "center", alignItems: "center" }}>
        <Pip ref={pip} key={variant} variant={variant} size={size} backdrop={CANVAS[mode]} />
      </View>
      <View style={s.row}>
        <Btn label="Pip" on={variant === "pip"} onPress={() => setVariant("pip")} />
        <Btn label="Pip-f" on={variant === "pip-f"} onPress={() => setVariant("pip-f")} />
        <Btn label={dark ? "Dark" : "Light"} onPress={() => setMode(m => (m === "dark" ? "light" : "dark"))} />
        <Btn label={summary ? "Back" : "Summary"} on={summary} onPress={() => setSummary(v => !v)} />
        <Btn label="FX lab" onPress={() => nav.navigate("FxLab")} />
      </View>
      <Text style={[s.small, { color: sub }]}>Picked: {pickedCount} of {PIP_MOMENTS.length} moments</Text>

      {summary ? (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <Btn label="Share picks" onPress={share} on />
          {PIP_MOMENTS.map((m, i) => {
            const names = (picks[m.id] || []).map(id => m.options.find(x => x.id === id)?.name || id);
            return (
              <Pressable key={m.id} onPress={() => { go(i); setSummary(false); }} style={[s.card, { backgroundColor: card, borderColor: line }]}>
                <Text style={[s.title, { color: fg }]}>{i + 1}. {m.title}</Text>
                <Text style={[s.body, { color: names.length ? fg : sub }]}>{names.length ? names.join(", ") : "No pick yet"}</Text>
              </Pressable>);
          })}
        </ScrollView>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={[s.card, { backgroundColor: card, borderColor: line }]}>
            <Text style={[s.small, { color: sub }]}>Moment {idx + 1} of {PIP_MOMENTS.length}</Text>
            <Text style={[s.title, { color: fg }]}>{moment.title}</Text>
            <Text style={[s.body, { color: sub }]}>{moment.area} - {moment.freq} - size: {moment.size}</Text>
            <View style={s.row}>
              <Btn label="Prev" off={idx === 0} onPress={() => go(idx - 1)} grow />
              <Btn label="Next" off={idx === PIP_MOMENTS.length - 1} onPress={() => go(idx + 1)} grow />
              <Btn label={jump ? "Hide list" : "Jump to..."} on={jump} onPress={() => setJump(v => !v)} grow />
            </View>
            {jump ? AREAS.map(a => (
              <View key={a} style={{ marginTop: 10 }}>
                <Text style={[s.small, { color: sub }]}>{a}</Text>
                <View style={s.row}>
                  {PIP_MOMENTS.map((m, i) => m.area !== a ? null : (
                    <Btn key={m.id} label={`${i + 1}${(picks[m.id] || []).length ? " *" : ""}`} on={i === idx} onPress={() => { go(i); setJump(false); }} />
                  ))}
                </View>
              </View>)) : null}
          </View>
          {note ? <Text style={s.note}>{note}</Text> : null}
          {moment.options.map(o => {
            const starred = (picks[moment.id] || []).includes(o.id), pool = isPool(o);
            return (
              <View key={o.id} style={[s.card, { backgroundColor: card, borderColor: starred ? "#C77B2A" : line }]}>
                <View style={s.head}>
                  <Text style={[s.title, { color: fg, flex: 1 }]}>{o.name}</Text>
                  <Pressable onPress={() => toggle(o)} style={s.star} accessibilityLabel={starred ? "Unstar" : "Star"}>
                    <Text style={{ fontSize: 30, color: starred ? "#E8A33D" : sub }}>{starred ? "★" : "☆"}</Text>
                  </Pressable>
                </View>
                <Text style={[s.body, { color: fg }]}>{o.feel}</Text>
                <Text style={[s.small, { color: sub }]}>{(o.ms / 1000).toFixed(2)} s - {o.inspiredBy}</Text>
                {o.variants && !pool ? (
                  <View style={s.row}>
                    {Object.keys(o.variants).map(k => <Btn key={k} label={`Play ${plain(k)}`} off={busy} onPress={() => play(o.variants![k])} grow />)}
                  </View>
                ) : (
                  <>
                    {pool ? <Text style={[s.small, { color: sub }]}>Pool: plays {lastPool[o.id] || 0} of {poolKeys(o).length}</Text> : null}
                    <Pressable disabled={busy} onPress={() => (pool ? playPool(o) : play(o.beats || []))} style={[s.play, busy && { opacity: 0.4 }]}>
                      <Text style={s.playT}>{pool ? "Play next" : "Play"}</Text>
                    </Pressable>
                  </>
                )}
              </View>);
          })}
        </ScrollView>
      )}
    </View>);
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  scroll: { alignSelf: "stretch", paddingHorizontal: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" },
  btn: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnOn: { backgroundColor: "#E8A33D", borderColor: "#E8A33D" },
  btnT: { fontSize: 15, fontWeight: "600" },
  card: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginTop: 12 },
  head: { flexDirection: "row", alignItems: "center" },
  star: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  small: { fontSize: 14, lineHeight: 19, marginTop: 6 },
  note: { color: "#E8A33D", fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 10 },
  play: { minHeight: 56, borderRadius: 14, backgroundColor: "#E8A33D", alignItems: "center", justifyContent: "center", marginTop: 12 },
  playT: { fontSize: 18, fontWeight: "700", color: "#141311" },
});
