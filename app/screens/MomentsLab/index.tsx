/**
 * DEV ONLY: Moments lab. The founder picks ONE final animation and ONE sound for each of the 24 moments
 * (founder, 2026-11-28). Every play includes the moment's chosen sound, fired on the animation's key beat, so the two
 * are judged together. Each moment offers 5 sounds of one kind (none, ours, library A, B, C); "Kind" switches the kind.
 * A moment is done when it has an animation and a sound (none counts once chosen). Reached from the dev menu ("Moments
 * lab"), or at start in a lab build made with EXPO_PUBLIC_PIP_LAB=moments. Picks are saved on the phone (AsyncStorage
 * key "momentsLab.final") and shared as text from the Summary view.
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
import { playSfx, SFX } from "../../components/Pip/fx/sfx";
import { Audio } from "expo-av";
import type { PipOption } from "../../components/Pip/moments";

const KEY = "momentsLab.final";
const CANVAS = { light: "#F7F4EE", dark: "#141311" };
const AREAS = ["Program", "Practice", "Home", "Onboarding", "Social", "System"] as const;
/** One final animation and one sound per moment. sound: "none", or "<kind>:ours|A|B|C". */
type Pick = { anim?: string; sound?: string };
type Picks = Record<string, Pick>;

// the library candidates (Freesound, CC0; the FX lab's list): 3 per kind, played from the internet, nothing bundled
type Cand = { role: string; rank: number; name: string; preview: string };
const CANDS: Cand[] = require("../FxLab/freesound-candidates.json");
const KINDS = Array.from(new Set(CANDS.map(c => c.role))).filter(k => k !== "entry-exit" && k in SFX);
/** The kind of sound each moment starts on (the "Kind" button moves to the next one). */
const START_KIND: Record<string, string> = {
  "quiz-right": "ding", "quiz-not-this-one": "boop", "step-done": "tick", "day-start": "chime-up", "reflection-saved": "heart-blip",
  "step-skipped": "swoosh-down", "day-done": "tada", "day-closed": "sleepy", "furthest-moment": "xylo-run", "program-finished": "firework",
  "practice-done": "popper", "practice-ended-early": "swoosh-down", "first-call-done": "harp", "level-up": "drumroll",
  "recording-problem": "boop", "home-greeting": "pop", "mood-checkin": "sparkle", "welcome-first-launch": "whoosh",
  "onboarding-done": "chime-up", "buddy-paired": "heart-blip", "purchase-done": "sparkle", "error-safe": "bubbles",
  "waiting-empty": "snow", "permission-ask": "zip",
};
const SLOTS = ["ours", "A", "B", "C"] as const;
const candOf = (kind: string, slot: string) => CANDS.filter(c => c.role === kind).sort((a, b) => a.rank - b.rank)[["A", "B", "C"].indexOf(slot)];
const soundLabel = (v?: string) => (!v ? "-" : v === "none" ? "no sound" : `${v.split(":")[0]} ${v.split(":")[1] === "ours" ? "(ours)" : v.split(":")[1]}`);
const net: Record<string, Audio.Sound> = {};
async function playChoice(v?: string) {
  if (!v || v === "none") return;
  const [kind, slot] = v.split(":");
  if (slot === "ours") { playSfx(kind, 0.8); return; }
  const c = candOf(kind, slot); if (!c) return;
  try { if (!net[c.preview]) net[c.preview] = (await Audio.Sound.createAsync({ uri: c.preview }, { shouldPlay: false })).sound; await net[c.preview].setVolumeAsync(0.8); await net[c.preview].replayAsync(); } catch { /* a sound that fails to load never blocks the lab */ }
}
/** When the sound fires: the first beat that moves the body or buzzes, else the first beat. */
const keyAt = (beats: PipBeat[]) => ((beats.find(b => (b as any).body || (b as any).haptic) || beats[0] || { at: 0 }) as any).at || 0;
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
  const isDone = (id: string) => !!picks[id]?.anim && !!picks[id]?.sound;
  const pickedCount = PIP_MOMENTS.filter(m => isDone(m.id)).length;
  const [kindOf, setKindOf] = useState<Record<string, string>>({});
  const kind = kindOf[moment.id] || START_KIND[moment.id] || KINDS[0];
  // what plays with every animation on this moment: the chosen sound, or the first of the current kind until one is chosen
  const heard = picks[moment.id]?.sound ?? `${kind}:ours`;
  const go = (i: number) => { setIdx(Math.max(0, Math.min(PIP_MOMENTS.length - 1, i))); setNote(""); };

  const play = useCallback(async (beats: PipBeat[]) => {
    if (busy || !pip.current) return;
    setBusy(true);
    try {
      const at = keyAt(beats); setTimeout(() => { playChoice(heard); }, at);
      await pip.current.perform(beats);
      await sleep(600);
      if (alive.current) pip.current?.face("calm");
    } finally { if (alive.current) setBusy(false); }
  }, [busy, heard]);

  const playPool = (o: PipOption) => {
    const keys = poolKeys(o), next = ((lastPool[o.id] || 0) % keys.length) + 1;
    setLastPool(p => ({ ...p, [o.id]: next }));
    play(o.variants![String(next)]);
  };

  const save = (p: Pick) => {
    const all = { ...picks, [moment.id]: { ...picks[moment.id], ...p } };
    setPicks(all); setNote("");
    AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => undefined);
  };
  const toggle = (o: PipOption) => save({ anim: picks[moment.id]?.anim === o.id ? undefined : o.id });
  const chooseSound = (v: string) => { save({ sound: v }); playChoice(v); };

  const lines = PIP_MOMENTS.map(m => {
    const p = picks[m.id] || {}, o = m.options.find(x => x.id === p.anim);
    return `${m.id}: ${o ? `${o.id} ${o.name}` : "NO ANIMATION"} | sound: ${p.sound ? soundLabel(p.sound) + ` [${p.sound}]` : "NO SOUND"}`;
  });
  const missing = PIP_MOMENTS.filter(m => !isDone(m.id)).length;
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
      <Text style={[s.small, { color: sub }]}>Done: {pickedCount} of {PIP_MOMENTS.length} moments (animation + sound)</Text>

      {summary ? (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <Text style={[s.note, { color: missing ? "#E8A33D" : "#7BC67B" }]}>{missing ? `${missing} moments still need a pick` : "All 24 moments done"}</Text>
          <Btn label="Share picks" onPress={share} on />
          {PIP_MOMENTS.map((m, i) => {
            const p = picks[m.id] || {}, name = m.options.find(x => x.id === p.anim)?.name;
            return (
              <Pressable key={m.id} onPress={() => { go(i); setSummary(false); }} style={[s.card, { backgroundColor: card, borderColor: isDone(m.id) ? line : "#E8A33D" }]}>
                <Text style={[s.title, { color: fg }]}>{i + 1}. {m.title}</Text>
                <Text style={[s.body, { color: name ? fg : "#E8A33D" }]}>{name ?? "No animation yet"}</Text>
                <Text style={[s.body, { color: p.sound ? fg : "#E8A33D" }]}>Sound: {p.sound ? soundLabel(p.sound) : "not chosen yet"}</Text>
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
                    <Btn key={m.id} label={`${i + 1}${isDone(m.id) ? " ✓" : ""}`} on={i === idx} onPress={() => { go(i); setJump(false); }} />
                  ))}
                </View>
              </View>)) : null}
          </View>
          <View style={[s.card, { backgroundColor: card, borderColor: picks[moment.id]?.sound ? line : "#E8A33D" }]}>
            <View style={s.head}>
              <Text style={[s.title, { color: fg, flex: 1 }]}>Sound</Text>
              <Btn label={`Kind: ${kind}`} onPress={() => setKindOf(k => ({ ...k, [moment.id]: KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length] }))} />
            </View>
            <Text style={[s.small, { color: sub }]}>Plays with every animation below. Tap one to hear it and choose it.</Text>
            <View style={s.row}>
              <Btn label="None" on={picks[moment.id]?.sound === "none"} onPress={() => chooseSound("none")} />
              {SLOTS.map(sl => <Btn key={sl} label={sl === "ours" ? "Ours" : sl} on={picks[moment.id]?.sound === `${kind}:${sl}`} onPress={() => chooseSound(`${kind}:${sl}`)} />)}
            </View>
            <Text style={[s.small, { color: sub }]}>Chosen: {soundLabel(picks[moment.id]?.sound)}</Text>
          </View>
          {note ? <Text style={s.note}>{note}</Text> : null}
          {moment.options.map(o => {
            const starred = picks[moment.id]?.anim === o.id, pool = isPool(o);
            return (
              <View key={o.id} style={[s.card, { backgroundColor: card, borderColor: starred ? "#C77B2A" : line }]}>
                <View style={s.head}>
                  <Text style={[s.title, { color: fg, flex: 1 }]}>{o.name}</Text>
                  <Pressable onPress={() => toggle(o)} style={s.star} accessibilityLabel={starred ? "Unpick" : "Pick this one"}>
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
