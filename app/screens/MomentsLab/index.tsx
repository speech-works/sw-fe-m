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
import { NavigationContext } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PipBeat, PipVariant } from "../../components/Pip";
import { PipStage } from "../../components/Pip/fx/PipStage";
import type { PipStageHandle } from "../../components/Pip/fx/PipStage";
import { SAMPLE_MOMENTS as ALL_SAMPLES } from "../../components/Pip/fx/samples";
import { FINAL_MOMENTS, FINAL_NOTES } from "../../components/Pip/fx/final";
import type { FxEffect } from "../../components/Pip/fx/types";
import { PIP_MOMENTS } from "../../components/Pip/moments";
import { playSfx, SFX } from "../../components/Pip/fx/sfx";
import { Audio } from "expo-av";
import type { PipOption } from "../../components/Pip/moments";

const KEY = "momentsLab.final";
const CANVAS = { light: "#F7F4EE", dark: "#141311" };
const AREAS = ["Program", "Practice", "Home", "Onboarding", "Social", "System"] as const;
/** One final animation and one sound per moment. sound: "none", or "<kind>:ours|A|B|C". */
type Pick = { anim?: string; sound?: string; note?: string };
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
/** The real app screen each moment happens on (captured from the test lab with sample data, Pip hidden), and where Pip
 *  stands on it, in the screen's own 390 x 844 points: x, y, size of Pip's picture; cut = the sheet's top edge (Pip is
 *  hidden below it, as on the real screen). Only the Program moments have a screen so far. */
type Scr = { img: any; x: number; y: number; size: number; cut: number; blob?: boolean };
const SCR: Record<string, Scr> = {
  quizRight: { img: require("./screens/quiz-right.jpg"), x: 254, y: 419, size: 132, cut: 530 },
  quizWrong: { img: require("./screens/quiz-wrong.jpg"), x: 255, y: 445, size: 130, cut: 555 },
  start: { img: require("./screens/start.jpg"), x: 165, y: 140, size: 219, cut: 322 },
  close: { img: require("./screens/close.jpg"), x: 165, y: 140, size: 218, cut: 322 },
  practice: { img: require("./screens/practice.jpg"), x: 52, y: 157, size: 286, cut: 396 },
  dayDone: { img: require("./screens/daydone.jpg"), x: -26, y: 331, size: 441, cut: 700 },
  goals: { img: require("./screens/goals.jpg"), x: 170, y: 205, size: 212, cut: 383 },
  form: { img: require("./screens/form.jpg"), x: 254, y: 136, size: 132, cut: 250 },   // no Pip on this screen today: a spot on the sheet's edge for now
  practiceDone: { img: require("./screens/practice-done.jpg"), x: 250, y: 84, size: 138, cut: 204 },   // the written practice ("Done"); a spot in the hero for now
  home: { img: require("./screens/home.jpg"), x: 95, y: 90, size: 200, cut: 844, blob: true },   // Home's empty top, over "For you"; Pip on his blob
  stage: { img: require("./screens/stage.jpg"), x: 75, y: 250, size: 240, cut: 844, blob: true },   // no real screen yet: the app's dark background
};
const SCREEN_OF: Record<string, keyof typeof SCR> = {
  "quiz-right": "quizRight", "quiz-not-this-one": "quizWrong", "step-done": "close", "day-start": "start", "reflection-saved": "form",
  "step-skipped": "practice", "day-done": "dayDone", "day-closed": "goals", "furthest-moment": "dayDone", "program-finished": "dayDone",
  "practice-done": "practiceDone", "practice-ended-early": "practiceDone", "home-greeting": "home", "mood-checkin": "home",
  "first-call-done": "stage", "level-up": "stage", "recording-problem": "stage", "welcome-first-launch": "stage", "onboarding-done": "stage",
  "buddy-paired": "stage", "purchase-done": "stage", "error-safe": "stage", "waiting-empty": "stage", "permission-ask": "stage",
};
const LETTERS = "ABCDEFGH";
/** Final mode (the phone lab build with EXPO_PUBLIC_PIP_LAB=final, or #momentslab=final on the web): every moment shows only
 *  the founder's final pick(s), to check them on the phone. */
const FINAL = process.env.EXPO_PUBLIC_PIP_LAB === "final" || (() => { try { return /momentslab=final/.test((globalThis as any).location?.hash ?? ""); } catch { return false; } })();
const SAMPLE_MOMENTS = FINAL ? FINAL_MOMENTS : ALL_SAMPLES;
/** Placement preview (web, for the placement review): &place=dim shows the moment over the real screen dimmed, Pip on his blob in
 *  the middle; the default shows Pip in his own spot on the screen. */
const PLACE: "spot" | "dim" = (() => { try { return /[&,]place=dim/.test((globalThis as any).location?.hash ?? "") ? "dim" : "spot"; } catch { return "spot"; } })();
/** Web review: #momentslab=day-done,step-skipped shows only those moments (in that order), nothing else to look at. */
const ONLY: string[] | null = (() => { try { const m = ((globalThis as any).location?.hash ?? "").match(/momentslab=([a-z0-9,-]+)/); return m && m[1] !== "final" ? m[1].split(",") : null; } catch { return null; } })();
const ORDER: number[] = ONLY ? ONLY.map(id => PIP_MOMENTS.findIndex(m => m.id === id)).filter(i => i >= 0) : PIP_MOMENTS.map((_, i) => i);
const SHOWN = ORDER.map(i => PIP_MOMENTS[i]);
const SLOTS = ["ours", "A", "B", "C"] as const;
const candOf = (kind: string, slot: string) => CANDS.filter(c => c.role === kind).sort((a, b) => a.rank - b.rank)[["A", "B", "C"].indexOf(slot)];
const soundLabel = (v?: string) => (!v ? "-" : v === "none" ? "no sound" : v === "own" ? "its own sounds" : `${v.split(":")[0]} ${v.split(":")[1] === "ours" ? "(ours)" : v.split(":")[1]}`);
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
  const stage = useRef<PipStageHandle>(null), alive = useRef(true), shot = useRef<View>(null);
  const pip = { get current() { return stage.current?.pip ?? null; } };
  const [fx, setFx] = useState<FxEffect | null>(null), [runId, setRunId] = useState(0), [win, setWin] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const nav = React.useContext(NavigationContext) as NavigationProp<ParamListBase> | undefined;
  const [variant, setVariant] = useState<PipVariant>("pip"), [mode, setMode] = useState<"light" | "dark">("dark");
  const [idx, setIdx] = useState(ORDER[0] ?? 0), [picks, setPicks] = useState<Picks>({}), [summary, setSummary] = useState(false), [jump, setJump] = useState(false);
  const [busy, setBusy] = useState(false), [note, setNote] = useState(""), [lastPool, setLastPool] = useState<Record<string, number>>({});

  useEffect(() => {
    alive.current = true;
    (async () => { try { const s = await AsyncStorage.getItem(KEY); if (s && alive.current) setPicks(JSON.parse(s) as Picks); } catch { /* ignore */ } })();
    return () => { alive.current = false; };
  }, []);

  const moment = PIP_MOMENTS[idx], dark = mode === "dark";
  const fg = dark ? "#F7F4EE" : "#141311", sub = dark ? "#B9B3A8" : "#5E584E", card = dark ? "#23211E" : "#FFFFFF", line = dark ? "#3A3733" : "#DDD6C8";
  const isDone = (id: string) => !!picks[id]?.anim && !!picks[id]?.sound;
  const pickedCount = SHOWN.filter(m => isDone(m.id)).length, pos = Math.max(0, ORDER.indexOf(idx));
  const [kindOf, setKindOf] = useState<Record<string, string>>({});
  const kind = kindOf[moment.id] || START_KIND[moment.id] || KINDS[0];
  // what plays with every animation on this moment: the chosen sound, or the first of the current kind until one is chosen
  const heard = picks[moment.id]?.sound ?? `${kind}:ours`;
  const go = (i: number) => { setIdx(Math.max(0, Math.min(PIP_MOMENTS.length - 1, i))); setNote(""); };
  const step = (d: number) => { const n = ORDER[Math.max(0, Math.min(ORDER.length - 1, pos + d))]; if (n !== undefined) go(n); };

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
  const samples = SAMPLE_MOMENTS[moment.id];
  const toggleSample = (e: FxEffect) => save(picks[moment.id]?.anim === e.id ? { anim: undefined, sound: undefined } : { anim: e.id, sound: "own" });
  const playSample = (e: FxEffect) => { if (busy) return; setFx(e); setRunId(r => r + 1); };
  useEffect(() => {
    if (!runId || !fx) return;
    let live = true; setBusy(true);
    const h = setTimeout(async () => {   // a frame later: the stage has the new effect (its particles made, its sounds loading)
      try { await stage.current?.fire(); await sleep(500); if (alive.current) stage.current?.pip?.face("calm"); } finally { if (live && alive.current) setBusy(false); }
    }, 60);
    return () => { live = false; clearTimeout(h); };
  }, [runId]);   // eslint-disable-line react-hooks/exhaustive-deps
  const chooseSound = (v: string) => { save({ sound: v }); playChoice(v); };

  const lines = SHOWN.map(m => {
    const p = picks[m.id] || {}, o = m.options.find(x => x.id === p.anim) ?? SAMPLE_MOMENTS[m.id]?.find(x => x.id === p.anim);
    return `${m.id}: ${o ? `${o.id} ${o.name}` : "NO ANIMATION"} | sound: ${p.sound ? soundLabel(p.sound) + ` [${p.sound}]` : "NO SOUND"}${p.note?.trim() ? ` | comment: ${p.note.trim()}` : ""}`;
  });
  const missing = SHOWN.filter(m => !isDone(m.id)).length;
  // web review: the page hands its answers over (window.reviewAnswers()), so nobody retypes them
  useEffect(() => { try { (globalThis as any).reviewAnswers = () => lines.join("\n"); } catch { /* ignore */ } });
  const share = () => { Share.share({ message: lines.join("\n") }).catch(() => undefined); };

  const Btn = ({ label, onPress, on, off, grow }: { label: string; onPress: () => void; on?: boolean; off?: boolean; grow?: boolean }) => (
    <Pressable onPress={onPress} disabled={off} style={[s.btn, { borderColor: line }, on && s.btnOn, off && { opacity: 0.4 }, grow && { flex: 1 }]}>
      <Text style={[s.btnT, { color: on ? "#141311" : fg }]}>{label}</Text>
    </Pressable>);

  const { height } = useWindowDimensions();
  const scr0 = SCR[SCREEN_OF[moment.id]];
  const scr = scr0 && PLACE === "dim" ? { ...scr0, x: 75, y: 250, size: 240, cut: 844, blob: true } : scr0;
  const screenH = Math.round(height * 0.56), k = screenH / 844, screenW = Math.round(390 * k);
  const plainSize = Math.min(width - 32, 260);
  const pSize = scr ? Math.round(scr.size * k) : plainSize, pH = Math.round(pSize * 322 / 372);
  const stageFx = samples && fx && samples.some(e => e.id === fx.id) ? fx : null;
  const pipEl = (
    <PipStage ref={stage} key={variant + moment.id} variant={variant} size={pSize} stageW={pSize} stageH={pH} pipTop={0} effect={stageFx} screen={win}
      {...(scr && !scr.blob ? { blob: false, labNoCut: true, jelly: false, figureClip: Math.round((scr.cut - scr.y) * k), backClip: Math.round(scr.cut * k) } : {})} />);
  const measureShot = () => shot.current?.measureInWindow((x, y, w, h) => { if (Number.isFinite(x) && w > 0) setWin(o => (o && o.x === x && o.y === y && o.width === w ? o : { x, y, width: w, height: h })); });
  return (
    <View style={[s.root, { backgroundColor: CANVAS[mode], paddingTop: insets.top + 6 }]}>
      {scr ? (
        <View ref={shot} onLayout={measureShot} style={[s.screen, { width: screenW, height: screenH }]}>
          <Image source={scr.img} style={{ width: screenW, height: screenH }} resizeMode="cover" />
          {PLACE === "dim" ? <View pointerEvents="none" style={[s.abs, { left: 0, top: 0, width: screenW, height: screenH, backgroundColor: "rgba(10,9,8,0.72)" }]} /> : null}
          <View pointerEvents="none" style={[s.abs, { left: Math.round(scr.x * k), top: Math.round(scr.y * k) }]}>{pipEl}</View>
        </View>
      ) : (
        <View style={[s.screen, { width: screenW, height: screenH, backgroundColor: CANVAS[mode], borderWidth: 1, borderColor: line, justifyContent: "center", alignItems: "center" }]}>
          {pipEl}
          <Text style={[s.small, { color: sub }]}>No real screen for this moment yet</Text>
        </View>
      )}
      <View style={[s.head, { alignSelf: "stretch", paddingHorizontal: 12, marginTop: 8 }]}>
        <Btn label="‹" off={pos === 0} onPress={() => step(-1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[s.title, { color: fg, textAlign: "center" }]} numberOfLines={1}>{summary ? "All picks" : moment.title}</Text>
          <Text style={[s.tiny, { color: sub }]}>{summary ? `Done: ${pickedCount} of ${SHOWN.length}` : `${pos + 1} of ${SHOWN.length} - ${moment.area} - done ${pickedCount}`}</Text>
        </View>
        <Btn label="›" off={pos === ORDER.length - 1} onPress={() => step(1)} />
      </View>

      {summary ? (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <View style={s.row}>
            <Btn label="Back" onPress={() => setSummary(false)} />
            <Btn label="Share picks" onPress={share} on />
          </View>
          <Text style={[s.note, { color: missing ? "#E8A33D" : "#7BC67B" }]}>{missing ? `${missing} moments still need a pick` : `All ${SHOWN.length} moments done`}</Text>
          {SHOWN.map((m) => { const i = PIP_MOMENTS.indexOf(m);
            const p = picks[m.id] || {}, list: { id: string; name: string }[] = SAMPLE_MOMENTS[m.id] ?? m.options, oi = list.findIndex(x => x.id === p.anim);
            return (
              <Pressable key={m.id} onPress={() => { go(i); setSummary(false); }} style={[s.card, { backgroundColor: card, borderColor: isDone(m.id) ? line : "#E8A33D" }]}>
                <Text style={[s.body, { color: fg, marginTop: 0, fontWeight: "700" }]}>{ONLY ? "" : `${i + 1}. `}{m.title}</Text>
                <Text style={[s.small, { color: oi >= 0 ? fg : "#E8A33D" }]}>{oi >= 0 ? `${LETTERS[oi]}: ${list[oi].name}` : "No animation yet"} - {p.sound ? soundLabel(p.sound) : "no sound yet"}</Text>
                {p.note?.trim() ? <Text style={[s.small, { color: sub }]}>Comment: {p.note.trim()}</Text> : null}
              </Pressable>);
          })}
        </ScrollView>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {samples ? <Text style={[s.tiny, { color: "#7BC67B", textAlign: "center", marginTop: 6 }]}>{FINAL ? `Final pick${samples.length > 1 ? "s" : ""}. ${FINAL_NOTES[moment.id] ?? ""}` : "New samples: each one plays the whole moment (props, background and its own sounds)"}</Text> : null}
          {samples ? samples.map((e, oi) => {
            const starred = picks[moment.id]?.anim === e.id;
            return (
              <View key={e.id} style={[s.opt, { backgroundColor: card, borderColor: starred ? "#E8A33D" : line }]}>
                <Pressable disabled={busy} onPress={() => playSample(e)} style={[s.optPlay, busy && { opacity: 0.5 }]} accessibilityLabel={`Play ${LETTERS[oi]}`}>
                  <Text style={s.optL}>{LETTERS[oi]}</Text>
                  <Text style={s.playT}>▶</Text>
                </Pressable>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[s.body, { color: fg, marginTop: 0, fontWeight: "700" }]} numberOfLines={1}>{e.name}</Text>
                  <Text style={[s.tiny, { color: sub }]}>{(e.ms / 1000).toFixed(1)} s - {e.feel}</Text>
                </View>
                <Pressable onPress={() => toggleSample(e)} style={s.star} accessibilityLabel={starred ? "Unpick" : "Pick this one"}>
                  <Text style={{ fontSize: 30, color: starred ? "#E8A33D" : sub }}>{starred ? "★" : "☆"}</Text>
                </Pressable>
              </View>);
          }) : moment.options.map((o, oi) => {
            const starred = picks[moment.id]?.anim === o.id, pool = isPool(o);
            const run = () => (pool ? playPool(o) : o.variants ? play(o.variants[Object.keys(o.variants)[0]]) : play(o.beats || []));
            return (
              <View key={o.id} style={[s.opt, { backgroundColor: card, borderColor: starred ? "#E8A33D" : line }]}>
                <Pressable disabled={busy} onPress={run} style={[s.optPlay, busy && { opacity: 0.5 }]} accessibilityLabel={`Play ${LETTERS[oi]}`}>
                  <Text style={s.optL}>{LETTERS[oi]}</Text>
                  <Text style={s.playT}>▶</Text>
                </Pressable>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <Text style={[s.body, { color: fg, marginTop: 0, fontWeight: "700" }]} numberOfLines={1}>{o.name}</Text>
                  <Text style={[s.tiny, { color: sub }]}>{(o.ms / 1000).toFixed(1)} s{pool ? ` - plays a different one each time (${lastPool[o.id] || 0}/${poolKeys(o).length})` : ""}</Text>
                  {o.variants && !pool ? (
                    <View style={[s.row, { justifyContent: "flex-start", marginTop: 4 }]}>
                      {Object.keys(o.variants).map(v => <Btn key={v} label={plain(v)} off={busy} onPress={() => play(o.variants![v])} />)}
                    </View>) : null}
                </View>
                <Pressable onPress={() => toggle(o)} style={s.star} accessibilityLabel={starred ? "Unpick" : "Pick this one"}>
                  <Text style={{ fontSize: 30, color: starred ? "#E8A33D" : sub }}>{starred ? "★" : "☆"}</Text>
                </Pressable>
              </View>);
          })}
          {samples ? null : <View style={[s.card, { backgroundColor: card, borderColor: picks[moment.id]?.sound ? line : "#E8A33D" }]}>
            <View style={s.head}>
              <Text style={[s.body, { color: fg, flex: 1, marginTop: 0, fontWeight: "700" }]}>Sound: {soundLabel(heard)}{picks[moment.id]?.sound ? " ✓" : ""}</Text>
              <Btn label={`Kind: ${kind}`} onPress={() => setKindOf(k => ({ ...k, [moment.id]: KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length] }))} />
            </View>
            <Text style={[s.tiny, { color: sub }]}>Plays with every option above. Tap one to hear it and choose it.</Text>
            <View style={[s.row, { justifyContent: "flex-start" }]}>
              <Btn label="None" on={picks[moment.id]?.sound === "none"} onPress={() => chooseSound("none")} />
              {SLOTS.map(sl => <Btn key={sl} label={sl === "ours" ? "Ours" : sl} on={picks[moment.id]?.sound === `${kind}:${sl}`} onPress={() => chooseSound(`${kind}:${sl}`)} />)}
            </View>
          </View>}
          <View style={[s.card, { backgroundColor: card, borderColor: line }]}>
            <Text style={[s.body, { color: fg, marginTop: 0, fontWeight: "700" }]}>Comment</Text>
            <TextInput key={moment.id} defaultValue={picks[moment.id]?.note ?? ""} onChangeText={t => save({ note: t })} multiline
              placeholder="Anything about this moment, e.g. B but slower" placeholderTextColor={sub}
              style={[s.input, { color: fg, borderColor: line }]} />
          </View>
          <View style={s.row}>
            <Btn label="All picks" onPress={() => setSummary(true)} />
            {ONLY ? null : <Btn label={jump ? "Hide list" : "Jump to..."} on={jump} onPress={() => setJump(v => !v)} />}
            <Btn label={variant === "pip" ? "Pip" : "Pip-f"} onPress={() => setVariant(v => (v === "pip" ? "pip-f" : "pip"))} />
            {scr ? null : <Btn label={dark ? "Dark" : "Light"} onPress={() => setMode(m => (m === "dark" ? "light" : "dark"))} />}
            {nav ? <Btn label="FX lab" onPress={() => nav.navigate("FxLab")} /> : null}
          </View>
          {jump ? AREAS.map(a => (
            <View key={a} style={{ marginTop: 10 }}>
              <Text style={[s.small, { color: sub }]}>{a}</Text>
              <View style={[s.row, { justifyContent: "flex-start" }]}>
                {PIP_MOMENTS.map((m, i) => m.area !== a ? null : (
                  <Btn key={m.id} label={`${i + 1}${isDone(m.id) ? " ✓" : ""}`} on={i === idx} onPress={() => { go(i); setJump(false); }} />
                ))}
              </View>
            </View>)) : null}
          {note ? <Text style={s.note}>{note}</Text> : null}
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
  tiny: { fontSize: 13, lineHeight: 17, marginTop: 2 },
  input: { minHeight: 64, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8, fontSize: 16, textAlignVertical: "top" },
  abs: { position: "absolute" },
  screen: { borderRadius: 18, overflow: "hidden" },
  opt: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, padding: 8, marginTop: 8 },
  optPlay: { width: 64, height: 56, borderRadius: 12, backgroundColor: "#E8A33D", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  optL: { fontSize: 20, fontWeight: "800", color: "#141311" },
  note: { color: "#E8A33D", fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 10 },
  play: { minHeight: 56, borderRadius: 14, backgroundColor: "#E8A33D", alignItems: "center", justifyContent: "center", marginTop: 12 },
  playT: { fontSize: 18, fontWeight: "700", color: "#141311" },
});
