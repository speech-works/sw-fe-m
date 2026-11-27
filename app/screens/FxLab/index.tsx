/**
 * DEV ONLY: FX lab. The founder plays every Pip effect (particles, sounds, Pip's reaction) and hearts the ones he likes.
 * Reached from the dev menu ("FX lab"), from the Moments lab and Pip lab, or at start in a release build made with EXPO_PUBLIC_PIP_LAB=1.
 * Likes are saved on the phone (AsyncStorage key "fxLab.likes"; sounds are stored as "sfx:<name>") and can be shared as text.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS, useFrameCallback, useSharedValue } from "react-native-reanimated";
import { PIP_ENTER, PIP_EXIT, PIP_IN, PIP_MOMENTS, PIP_OUT, showPipMoment } from "../../components/Pip";
import type { PipBody, PipVariant } from "../../components/Pip";
import { PipStage } from "../../components/Pip/fx/PipStage";
import type { PipStageHandle } from "../../components/Pip/fx/PipStage";
import { FX_EFFECTS } from "../../components/Pip/fx/library";
import { SFX_NAMES, playSfx, sfxStatus } from "../../components/Pip/fx/sfx";
import type { FxEffect } from "../../components/Pip/fx/types";
import { DAY_DONE_SAMPLES, DayDoneReal } from "./DayDoneReal";
import type { DayDoneSample } from "./DayDoneReal";
import { ProgramLab, labLink, parseLabHash } from "./ProgramLab";
import type { LabSpec } from "./ProgramLab";
import { PROGRAM_LAB_LINKS } from "./programLabLinks";

const KEY = "fxLab.likes";
const CANVAS = { light: "#F7F4EE", dark: "#141311" };
const ONE_BY_DEFAULT = ["rays", "ring", "pop"];
const particles = (e: FxEffect) => e.emitters.reduce((t, m) => t + (m.count ?? (ONE_BY_DEFAULT.includes(m.kind) ? 1 : 0)), 0);
const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
// entrances and exits around every effect, each with its own sound (time in ms after the move starts)
const MOVE_SFX: Partial<Record<PipBody, [string, number][]>> = {
  enter: [["pop", 0], ["slide-up", 230]], "enter-peek": [["pop", 0], ["whoosh", 220]], "enter-drop": [["whoosh", 0], ["boing", 420]],
  "exit-sink": [["slide-down", 100], ["pop", 620]], "exit-slide": [["whoosh", 120], ["pop", 640]], "exit-jump": [["boing", 0], ["zip", 150]],
  duck: [["slide-down", 0], ["boing", 860]], peekaboo: [["whoosh", 0], ["boop", 650], ["slide-up", 1000]], hide: [["slide-down", 0], ["pop", 860], ["boing", 900]],
};
const LABEL: Partial<Record<PipBody, string>> = { enter: "Rise out", "enter-peek": "Peek in", "enter-drop": "Drop in", "exit-sink": "Sink in", "exit-slide": "Slide away", "exit-jump": "Jump out", duck: "Duck", peekaboo: "Peekaboo", hide: "Hide" };

export default function FxLab() {
  const { width } = useWindowDimensions(), insets = useSafeAreaInsets();
  const stage = useRef<PipStageHandle>(null), alive = useRef(true);
  const [variant, setVariant] = useState<PipVariant>("pip"), [dark, setDark] = useState(true), [sound, setSound] = useState(true);
  const [effect, setEffect] = useState<FxEffect | null>(null), [busy, setBusy] = useState(false);
  // entry and exit: start from an empty stage, Pip arrives, the effect plays, he leaves (on by default)
  const [noMask, setNoMask] = useState(false);
  // the real day-done screen (components/Pack/DayDone) with sample words; `run` restarts it
  const [dayDoneReal, setDayDoneReal] = useState<{ sample: DayDoneSample; run: number } | null>(null);
  // the real program screens with sample data (ProgramLab); on a phone only the states a link can set up without taps
  const [programLab, setProgramLab] = useState<{ spec: LabSpec; run: number } | null>(null);
  const [ends, setEnds] = useState(true), [entry, setEntry] = useState<PipBody>(PIP_IN), [exit, setExit] = useState<PipBody>(PIP_OUT);
  const move = useCallback(async (m: PipBody) => {
    // entry and exit: silent (founder 2026-11-26: the pop / slide sounds were too much); duck / peekaboo / hide keep theirs
    if (sound && !PIP_ENTER.includes(m) && !PIP_EXIT.includes(m)) for (const [n, at] of MOVE_SFX[m] ?? []) setTimeout(() => playSfx(n, 0.7), at);
    await stage.current?.pip?.body(m);
  }, [sound]);
  const [likes, setLikes] = useState<Record<string, boolean>>({}), [showSounds, setShowSounds] = useState(false);
  // Speed test: plays every effect in a row and records frame times on the UI thread (as in the Pip lab)
  const [speed, setSpeed] = useState<string[]>([]);
  const rec = useSharedValue(0), got = useRef<((v: number[]) => void) | null>(null);
  const take = useCallback((v: number[]) => { const g = got.current; got.current = null; if (g) g(v); }, []);
  useFrameCallback(info => {
    const g: any = globalThis; // UI-thread scratch
    if (rec.value === 1) { if (!g.__fxft) g.__fxft = []; if (info.timeSincePreviousFrame != null) g.__fxft.push(info.timeSincePreviousFrame); }
    else if (rec.value === 2) { rec.value = 0; const v = g.__fxft || []; g.__fxft = []; runOnJS(take)(v); }
  });

  useEffect(() => {
    alive.current = true;
    (async () => { try { const s = await AsyncStorage.getItem(KEY); if (s && alive.current) setLikes(JSON.parse(s) as Record<string, boolean>); } catch { /* ignore */ } })();
    return () => { alive.current = false; };
  }, []);

  const toggleLike = (id: string) => setLikes(prev => {
    const next = { ...prev }; if (next[id]) delete next[id]; else next[id] = true;
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => { /* ignore */ });
    return next;
  });

  const play = useCallback(async (e: FxEffect, fresh: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (fresh) { setEffect(e); await frame(); await frame(); }
      if (ends) await move(entry);
      await stage.current?.fire();
      if (ends) { await new Promise(r => setTimeout(r, 250)); await move(exit); }
    } finally { if (alive.current) setBusy(false); }
  }, [busy, ends, entry, exit, move]);

  const speedTest = useCallback(async () => {
    if (busy) return; setBusy(true); setSpeed([]);
    try {
      for (const e of FX_EFFECTS) {
        const m0 = Date.now(); setEffect(e); await frame(); await frame(); const mount = Date.now() - m0;
        rec.value = 1; await stage.current?.fire();
        const v = await new Promise<number[]>(res => { got.current = res; rec.value = 2; });
        const srt = [...v].sort((a, b) => a - b), avg = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
        const line = `${e.id}: ${(1000 / Math.max(1, avg)).toFixed(0)} fps, p95 ${(srt[Math.floor(srt.length * 0.95)] || 0).toFixed(1)} ms, worst ${(srt[srt.length - 1] || 0).toFixed(0)} ms, ready in ${mount} ms`;
        console.log("SWFX " + line); if (alive.current) setSpeed(r => [...r, line]);
      }
    } finally { if (alive.current) setBusy(false); }
  }, [busy, rec]);

  const likedEffects = FX_EFFECTS.filter(e => likes[e.id]), likedSounds = SFX_NAMES.filter(n => likes["sfx:" + n]);
  const share = () => {
    const lines = [`Liked effects (${likedEffects.length} of ${FX_EFFECTS.length}):`, ...likedEffects.map(e => `- ${e.id}: ${e.name}`)];
    if (likedSounds.length) lines.push("", `Liked sounds (${likedSounds.length} of ${SFX_NAMES.length}):`, ...likedSounds.map(n => `- ${n}`));
    Share.share({ message: lines.join("\n") }).catch(() => { /* ignore */ });
  };

  const fg = dark ? "#F7F4EE" : "#141311", sub = dark ? "#B9B3A8" : "#5E584E", card = dark ? "#23211E" : "#FFFFFF", line = dark ? "#3A3733" : "#DDD6C8";
  const size = Math.min(width - 80, 280), pipH = Math.round(size * 322 / 372), stageH = Math.round(pipH * 1.35);
  const Btn = ({ label, onPress, on, off }: { label: string; onPress: () => void; on?: boolean; off?: boolean }) => (
    <Pressable onPress={onPress} disabled={off} style={[s.btn, { borderColor: line }, on && s.btnOn, off && { opacity: 0.4 }]}>
      <Text style={[s.btnT, { color: on ? "#141311" : fg }]}>{label}</Text>
    </Pressable>);
  const Heart = ({ id, label }: { id: string; label: string }) => (
    <Pressable onPress={() => toggleLike(id)} style={s.heart} accessibilityLabel={likes[id] ? `Unlike ${label}` : `Like ${label}`}>
      <Text style={{ fontSize: 28, color: likes[id] ? "#E8503D" : sub }}>{likes[id] ? "♥" : "♡"}</Text>
    </Pressable>);

  return (
    <View style={[s.root, { backgroundColor: CANVAS[dark ? "dark" : "light"], paddingTop: insets.top + 8 }]}>
      <PipStage ref={stage} key={variant + (ends ? ":ends" : "") + (noMask ? ":nomask" : "")} startHidden={ends} labNoCut={noMask} stageW={width} stageH={stageH} effect={effect} sound={sound} variant={variant} size={size} backdrop={CANVAS[dark ? "dark" : "light"]} />
      <View style={s.row}>
        <Btn label="Pip" on={variant === "pip"} onPress={() => setVariant("pip")} />
        <Btn label="Pip-f" on={variant === "pip-f"} onPress={() => setVariant("pip-f")} />
        <Btn label={dark ? "Dark" : "Light"} onPress={() => setDark(d => !d)} />
        <View style={s.sw}>
          <Text style={[s.btnT, { color: fg }]}>Sound</Text>
          <Switch value={sound} onValueChange={setSound} />
        </View>
      </View>
      <View style={s.row}>
        <Btn label={ends ? "Entry & exit: on" : "Entry & exit: off"} on={ends} onPress={() => setEnds(v => !v)} off={busy} />
        {(ends ? PIP_ENTER : []).map(m => <Btn key={m} label={LABEL[m] ?? m} on={entry === m} onPress={() => setEntry(m)} off={busy} />)}
      </View>
      {ends ? <View style={s.row}>{PIP_EXIT.map(m => <Btn key={m} label={LABEL[m] ?? m} on={exit === m} onPress={() => setExit(m)} off={busy} />)}</View> : null}
      <View style={s.row}>
        {(["duck", "peekaboo", "hide"] as PipBody[]).map(m => <Btn key={m} label={LABEL[m] ?? m} onPress={async () => { if (busy) return; setBusy(true); try { await move(m); } finally { setBusy(false); } }} off={busy || ends} />)}
      </View>
      <View style={s.row}>
        <Text style={[s.liked, { color: fg }]}>Liked: {likedEffects.length} of {FX_EFFECTS.length}</Text>
        <Btn label="Share likes" onPress={share} />
        <Btn label={noMask ? "Mask: off" : "Mask: on"} on={!noMask} onPress={() => setNoMask(v => !v)} off={busy} />
        <Btn label="Speed test" onPress={speedTest} off={busy} />
      </View>

      <Text style={{ color: fg, fontSize: 13, paddingHorizontal: 16, marginTop: 6 }} selectable>sounds played {sfxStatus.played}{sfxStatus.last ? " · " + sfxStatus.last : ""}</Text>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* phase 3: the real moments, played by the app's root host (dim or not as picked, with their text) */}
        <View style={[s.card, { backgroundColor: card, borderColor: "#E8A33D" }]}>
          <Text style={[s.title, { color: fg }]}>Day done (real)</Text>
          <View style={[s.row, { paddingHorizontal: 0 }]}>{DAY_DONE_SAMPLES.map(([id, label]) => <Btn key={id} label={label} onPress={() => setDayDoneReal(d => ({ sample: id, run: (d?.run ?? 0) + 1 }))} />)}</View>
          <Text style={[s.title, { color: fg, marginTop: 12 }]}>Program screens (real, sample data)</Text>
          {PROGRAM_LAB_LINKS.map(g => (
            <View key={g.group}>
              <Text style={{ color: sub, fontSize: 14, marginTop: 8 }}>{g.group}</Text>
              <View style={[s.row, { paddingHorizontal: 0 }]}>{g.items.filter(it => !it.rest.some(r => r.startsWith("do="))).map(it => <Btn key={it.label} label={it.label} onPress={() => { const sp = parseLabHash(labLink(it.word, Math.round(width), 800, it.rest, dark)); if (sp) setProgramLab(o => ({ spec: sp, run: (o?.run ?? 0) + 1 })); }} />)}</View>
            </View>))}
          <Text style={[s.title, { color: fg, marginTop: 12 }]}>Moments in the app</Text>
          <View style={[s.row, { paddingHorizontal: 0 }]}>{PIP_MOMENTS.map(m => <Btn key={m.id} label={m.ref + " " + m.name} onPress={() => { void showPipMoment(m.id); }} />)}</View>
        </View>
        {speed.length ? (
          <View style={[s.card, { backgroundColor: card, borderColor: line }]}>
            <View style={s.head}>
              <Text style={[s.title, { color: fg, flex: 1 }]}>Speed test: {speed.length} of {FX_EFFECTS.length}</Text>
              <Btn label="Share" onPress={() => { Share.share({ message: speed.join("\n") }).catch(() => { /* ignore */ }); }} />
            </View>
            {speed.map((l, i) => <Text key={i} style={[s.small, { color: fg }]}>{l}</Text>)}
          </View>) : null}
        {FX_EFFECTS.map(e => {
          const sel = effect?.id === e.id, snd = Array.from(new Set((e.sounds ?? []).map(x => x.name)));
          return (
            <Pressable key={e.id} onPress={() => play(e, true)} disabled={busy} style={[s.card, { backgroundColor: card, borderColor: sel ? "#E8A33D" : line }]}>
              <View style={s.head}>
                <Text style={[s.title, { color: fg, flex: 1 }]}>{e.name}</Text>
                <Heart id={e.id} label={e.name} />
              </View>
              <Text style={[s.body, { color: fg }]}>{e.feel}</Text>
              <Text style={[s.small, { color: sub }]}>{(e.ms / 1000).toFixed(1)} s - {particles(e)} particles - {snd.length ? snd.join(", ") : "no sound"}</Text>
              {sel ? <View style={s.row}><Btn label="Play again" off={busy} onPress={() => play(e, false)} /></View> : null}
            </Pressable>);
        })}
        <Pressable onPress={() => setShowSounds(v => !v)} style={[s.card, { backgroundColor: card, borderColor: line }]}>
          <Text style={[s.title, { color: fg }]}>{showSounds ? "▾" : "▸"} Sounds ({SFX_NAMES.length})</Text>
        </Pressable>
        {showSounds ? SFX_NAMES.map(n => (
          <View key={n} style={[s.sfxRow, { backgroundColor: card, borderColor: line }]}>
            <Pressable onPress={() => playSfx(n)} style={[s.btn, { borderColor: line, flex: 1 }]}>
              <Text style={[s.btnT, { color: fg }]}>▶ {n}</Text>
            </Pressable>
            <Heart id={"sfx:" + n} label={n} />
          </View>)) : null}
      </ScrollView>
      {programLab ? (
        <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
          <ProgramLab key={programLab.run} spec={programLab.spec} dark={dark} />
          <Pressable onPress={() => setProgramLab(null)} accessibilityLabel="Close the preview" style={{ position: "absolute", top: insets.top + 4, right: 12, minWidth: 44, minHeight: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", zIndex: 50 }} /* invisible: the recordings show only the app's own screen (founder) */ />
        </View>) : null}
      {/* "Back to home" (after Pip's wave) closes it */}
      {dayDoneReal ? <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]}><DayDoneReal key={dayDoneReal.sample + ":" + dayDoneReal.run} sample={dayDoneReal.sample} sound={sound} onHome={() => setDayDoneReal(null)} /></View> : null}
    </View>);
}

const s = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 16, marginTop: 8 },
  btn: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  btnOn: { backgroundColor: "#E8A33D", borderColor: "#E8A33D" },
  btnT: { fontSize: 16, fontWeight: "600" },
  sw: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  liked: { fontSize: 17, fontWeight: "700", flex: 1 },
  scroll: { flex: 1, marginTop: 8 },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 2 },
  head: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700" },
  body: { fontSize: 16, marginTop: 4 },
  small: { fontSize: 15, marginTop: 6 },
  heart: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  sfxRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 6, borderRadius: 14, borderWidth: 1 },
});
