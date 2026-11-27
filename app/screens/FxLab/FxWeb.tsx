/**
 * DEV ONLY, WEB ONLY: the FX preview page (`npx expo start --web`, App.web.tsx). The founder plays every Pip effect with
 * Pip's entry and exit, inside a phone screen drawn over a real-looking app page, and rejects the ones he does not want.
 * Uses the same Pip, PipStage, FxLayer and effect library as the phone. Final picks are then tested on the phone.
 * Run it: `npm i --no-save react-native-web@~0.20.0 @expo/metro-runtime@~5.0.5` once, then `npx expo start --web`.
 * Rejects are kept in this browser (localStorage) and read with window.reviewAnswers().
 * Compare mode: two phones side by side, the old body motion (motionStyle "v1") left and the new one ("v2") right, both
 * playing the same effect or body move at the same moment.
 */
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { PIP_ENTER, PIP_EXIT, PIP_IN, PIP_OUT } from "../../components/Pip";
import type { PipBody, PipVariant } from "../../components/Pip";
import { PipStage } from "../../components/Pip/fx/PipStage";
import type { PipStageHandle } from "../../components/Pip/fx/PipStage";
import { FX_EFFECTS } from "../../components/Pip/fx/library";
import { SFX_NAMES, playSfx, setSfxOverride } from "../../components/Pip/fx/sfx";
import type { FxEffect } from "../../components/Pip/fx/types";
import { PipMoment } from "../../components/Pip/PipMoment";
import type { PipBackdrop, PipMomentHandle } from "../../components/Pip/PipMoment";
import { PIP_MOMENTS } from "../../components/Pip/pipMoments";
import { ThemeProvider } from "../../design-system";
import type { DayDoneHandle } from "../../components/Pack/DayDone";
import { DAY_DONE_SAMPLES, DayDoneReal } from "./DayDoneReal";
import type { DayDoneSample } from "./DayDoneReal";
import { ProgramLab, labLink, parseLabHash } from "./ProgramLab";
import type { LabSpec } from "./ProgramLab";
import { PROGRAM_LAB_LINKS } from "./programLabLinks";
import { LAB_LOOKS } from "./AvatarLab";
import type { AvatarManifest } from "../../types/avatar";

const KEY = "fxWeb.rejects";
// Freesound candidates (CC0 only), found 2026-11-26; previews play from cdn.freesound.org, nothing is bundled
type Cand = { role: string; rank: number; id: number; name: string; author: string; page: string; preview: string; license: string; duration_s: number };
const CANDS: Cand[] = require("./freesound-candidates.json");
const USES: Record<string, number> = {};
for (const e of FX_EFFECTS) for (const x of e.sounds ?? []) USES[x.name] = (USES[x.name] ?? 0) + 1;
const SOUND_ROLES = Array.from(new Set(CANDS.map(c => c.role))).sort((a, b) => (a === "entry-exit" ? -1 : b === "entry-exit" ? 1 : (USES[b] ?? 0) - (USES[a] ?? 0)));
const PHONE = { w: 360, h: 740 };
const ONE_BY_DEFAULT = ["rays", "ring", "pop"];
const particles = (e: FxEffect) => e.emitters.reduce((t, m) => t + (m.count ?? (ONE_BY_DEFAULT.includes(m.kind) ? 1 : 0)), 0);
const frame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
// the same entry and exit sounds as the phone lab (ms after the move starts)
const MOVE_SFX: Partial<Record<PipBody, [string, number][]>> = {
  enter: [["pop", 0], ["slide-up", 230]], "enter-peek": [["pop", 0], ["whoosh", 220]], "enter-drop": [["whoosh", 0], ["boing", 420]],
  "exit-sink": [["slide-down", 100], ["pop", 620]], "exit-slide": [["whoosh", 120], ["pop", 640]], "exit-jump": [["boing", 0], ["zip", 150]],
};
// single body moves (played with Pip already on the screen)
const BODY_MOVES: [PipBody, string][] = [["sway", "Sway"], ["hop", "Hop"], ["nod", "Nod"], ["lean", "Lean"], ["bighop", "Big hop"], ["bounce", "Bounce"], ["settle", "Settle"],
  ["pop", "Pop"], ["peek", "Peek"], ["duck", "Duck"], ["peekaboo", "Peekaboo"], ["hide", "Hide"]];
type Motion = "v1" | "v2";
const LABEL: Partial<Record<PipBody, string>> = { enter: "Rise out", "enter-peek": "Peek in", "enter-drop": "Drop in", "exit-sink": "Sink in", "exit-slide": "Slide away", "exit-jump": "Jump out" };
const THEME = {
  dark: { page: "#0B0A09", screen: "#141311", fg: "#F7F4EE", sub: "#B9B3A8", card: "#23211E", line: "#3A3733", track: "#3A3733" },
  light: { page: "#E9E4DA", screen: "#F7F4EE", fg: "#141311", sub: "#5E584E", card: "#FFFFFF", line: "#DDD6C8", track: "#DDD6C8" },
};

const load = (): Record<string, boolean> => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : {}; } catch { return {}; } };
const save = (v: Record<string, boolean>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window */ } };

type Theme = typeof THEME.dark;
/** One phone: a real-looking program step with Pip's stage over it. It measures its own screen (effects are placed in it). */
const Phone = forwardRef<PipStageHandle, { k: number; pw: number; ph: number; T: Theme; dark: boolean; effect: FxEffect | null; sound: boolean; variant: PipVariant; motion: Motion; caption?: string; winKey: string; moment?: React.Ref<PipMomentHandle>; backdrop?: PipBackdrop | undefined }>(
  function Phone({ k, pw, ph, T, dark, effect, sound, variant, motion, caption, winKey, moment, backdrop }, ref) {
    const screenRef = useRef<View>(null);
    const [screen, setScreen] = useState({ x: 0, y: 0, width: PHONE.w, height: PHONE.h });
    const measure = useCallback(() => {
      screenRef.current?.measureInWindow((x, y, width, height) => {
        if ([x, y, width, height].every(Number.isFinite)) setScreen(s => (s.x === x && s.y === y && s.width === width && s.height === height ? s : { x, y, width, height }));
      });
    }, []);
    useEffect(() => { measure(); }, [measure, winKey, effect]);
    return (
      <View style={{ alignItems: "center", gap: 6 }}>
        <View ref={screenRef} onLayout={measure} style={[s.phone, { width: pw, height: ph, paddingHorizontal: Math.round(20 * k), backgroundColor: T.screen, borderColor: dark ? "#2A2825" : "#CFC8BA" }]}>
          <View style={[s.appTop, { height: Math.round(64 * k) }]}><View style={[s.back, { backgroundColor: T.card }]}><Text style={{ color: T.fg, fontSize: 20 }}>←</Text></View></View>
          <Text style={[s.h1, { color: T.fg, fontSize: Math.round(28 * k), marginTop: Math.round(18 * k) }]}>Hearing yourself say it</Text>
          <Text style={[s.meta, { color: T.sub }]}>Day 5 of 14 · Step 1 of 7</Text>
          <View style={[s.track, { backgroundColor: T.track }]}><View style={s.fill} /></View>
          <Text style={[s.p, { color: T.fg, fontSize: Math.round(17 * k), lineHeight: Math.round(25 * k) }]} numberOfLines={4}>Yesterday there was no call. You spent the day on one question about your own speech, and you wrote your decision down.</Text>
          <Text style={[s.p, { color: T.fg, fontSize: Math.round(17 * k), lineHeight: Math.round(25 * k) }]} numberOfLines={3}>Today you say your answer out loud and record it in the app. Then you listen to it.</Text>
          <View style={s.next}><Text style={s.nextT}>▶  Next</Text></View>
          <View style={[s.stageBox, { top: Math.round(330 * k) }]} pointerEvents="none">
            <PipStage ref={ref} key={variant + ":" + pw + ":" + motion} startHidden screen={screen} stageW={pw - 12} stageH={Math.round(260 * k)} effect={effect} sound={sound} variant={variant} size={Math.round(230 * k)} motionStyle={motion} />
          </View>
          {moment ? <PipMoment ref={moment} backdrop={backdrop} screen={screen} dark={dark} sound={sound} variant={variant} /> : null}
        </View>
        {caption ? <Text style={[s.cap, { color: T.fg }]}>{caption}</Text> : null}
      </View>);
  });

// candidate sounds on web: one cached element per URL (loaded on first use), a fresh copy per play so plays can overlap
const AUDIO: Record<string, any> = {};
function playUrl(url: string, volume: number) {
  try {
    const A = (globalThis as any).Audio; if (!A) return;
    const base = AUDIO[url] ?? (AUDIO[url] = Object.assign(new A(url), { preload: "auto" }));
    if (volume <= 0) { base.load(); return; }   // volume 0 = just load it now
    const a = base.cloneNode(); a.volume = Math.min(1, volume); a.play().catch(() => { /* ignore */ });
  } catch { /* ignore */ }
}

export default function FxWeb() {
  const win = useWindowDimensions();
  const stage = useRef<PipStageHandle>(null), stageB = useRef<PipStageHandle>(null), busyRef = useRef(false), shown = useRef(false);
  // compare: old motion left, new motion right. One phone: `motion` picks which one it shows.
  const [compare, setCompare] = useState(false), [motion, setMotion] = useState<Motion>("v2");   // the new motion is the default (founder 2026-11-26: "Yes, keep new")
  // entry and exit sounds: off (founder: the old pop / slide sounds were too much)
  const [moveSound] = useState(false);
  const [variant, setVariant] = useState<PipVariant>("pip"), [dark, setDark] = useState(true), [sound, setSound] = useState(true);
  // phase 3 moments: the picked effect with its text, over a dimmed screen or on the screen as it is
  const momentRef = useRef<PipMomentHandle>(null), [backdrop, setBackdrop] = useState<PipBackdrop | undefined>(undefined);   // undefined = each moment's own pick
  const playMoment = async (i: number, look?: AvatarManifest | null) => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setLast(PIP_MOMENTS[i].ref + " " + PIP_MOMENTS[i].name);
    // a "user" moment (Avatar saved) is played by a sample user avatar here (the app passes the avatar just saved)
    const lk = PIP_MOMENTS[i].figure === "user" ? (look !== undefined ? look : LAB_LOOKS[5][1]) : undefined;
    try { if (shown.current) await move(exit); await momentRef.current?.play({ ...PIP_MOMENTS[i], ...(lk !== undefined ? { look: lk } : {}) }); } finally { busyRef.current = false; setBusy(false); }
  };
  // a link like http://localhost:8096/#moment=avatar-saved,light[,look=3][,shape=bg.cloud] plays that moment when the page opens
  // (look = a sample avatar from AvatarLab.tsx LAB_LOOKS, shape = its blob shape, for a "user" moment)
  useEffect(() => {
    const mm = ((globalThis as any).location?.hash ?? "").match(/moment=([a-z-]+)(?:,(light|dark))?(?:,look=(\d+))?(?:,shape=([a-z.-]+))?/); if (!mm) return;
    const i = PIP_MOMENTS.findIndex(x => x.id === mm[1]); if (i < 0) return;
    if (mm[2]) setDark(mm[2] === "dark");
    const base = mm[3] ? LAB_LOOKS[+mm[3]]?.[1] ?? null : mm[4] ? LAB_LOOKS[5][1] : undefined;
    const look = base && mm[4] ? { ...base, parts: { ...base.parts, bg: mm[4] } } : base;
    const h = setTimeout(() => { void playMoment(i, look); }, 1500); return () => clearTimeout(h);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const [entry, setEntry] = useState<PipBody>(PIP_IN), [exit, setExit] = useState<PipBody>(PIP_OUT);
  const [effect, setEffect] = useState<FxEffect | null>(null), [busy, setBusy] = useState(false);
  const [rejects, setRejects] = useState<Record<string, boolean>>(load);
  const T = THEME[dark ? "dark" : "light"];
  // the phone fits the window height (same shape as a 360 x 740 phone); Pip and the stage scale with it.
  // Compare: two phones must also fit the width (side by side, next to the list on a wide window)
  const narrowW = win.width < (compare ? 1040 : 760), kH = Math.max(0.6, Math.min(1, (win.height - (narrowW ? 260 : compare ? 90 : 56)) / PHONE.h));
  const k = compare ? Math.max(0.4, Math.min(kH, ((narrowW ? win.width : win.width * 0.6) - 60) / (2 * PHONE.w))) : kH;
  const pw = Math.round(PHONE.w * k), ph = Math.round(PHONE.h * k);
  // a new Pip is mounted (hidden) when any of these change
  useEffect(() => { shown.current = false; }, [variant, pw, compare, motion]);

  const [last, setLast] = useState("");
  // Day done (real): the app's own day-done screen in a phone frame of a real size (no scaling: 1 px = 1 dp).
  // A link like http://localhost:8096/#daydone=390x844,goals,light opens it at once.
  const ddRef = useRef<DayDoneHandle>(null);
  const [dd, setDd] = useState<{ sample: DayDoneSample; w: number; h: number; run: number; auto: boolean } | null>(null);
  useEffect(() => {
    const m = ((globalThis as any).location?.hash ?? "").match(/daydone=(\d+)x(\d+)(?:,([a-z-]+))?(?:,(light|dark))?/); if (!m) return;
    setDd({ sample: (DAY_DONE_SAMPLES.find(x => x[0] === m[3])?.[0] ?? "goals"), w: +m[1], h: +m[2], run: 0, auto: true });
    if (m[4]) setDark(m[4] === "dark");
  }, []);
  // Program screens (real): the app's own program screens with sample data. A link like
  // http://localhost:8096/#program=390x844,day1,step=5,dark opens one (all links: ProgramLab.tsx, programLabLinks.ts).
  const [pl, setPl] = useState<{ spec: LabSpec; run: number } | null>(() => { const sp = parseLabHash((globalThis as any).location?.hash ?? ""); return sp ? { spec: sp, run: 0 } : null; });
  useEffect(() => { if (pl?.spec.dark != null) setDark(pl.spec.dark); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const openPl = (hash: string) => { const sp = parseLabHash(hash); if (!sp) return; try { (globalThis as any).history.replaceState(null, "", hash); } catch { /* ignore */ } if (sp.dark != null) setDark(sp.dark); setDd(null); setPl(o => ({ spec: sp, run: (o?.run ?? 0) + 1 })); };
  // sound picks: role -> "ours" or a Freesound id
  const [picks, setPicks] = useState<Record<string, string>>(() => { try { const v = localStorage.getItem(KEY + ".sounds"); return v ? JSON.parse(v) : {}; } catch { return {}; } });
  const picksRef = useRef(picks);

  // every phone on the page does the same thing at the same moment
  const stages = useCallback(() => [stage.current, compare ? stageB.current : null].filter(Boolean) as PipStageHandle[], [compare]);
  const move = useCallback(async (m: PipBody) => {
    if (sound && moveSound) for (const [n, at] of MOVE_SFX[m] ?? []) setTimeout(() => playSfx(n as any, 0.7), at);
    const ee = CANDS.find(c => String(c.id) === picksRef.current["entry-exit"]);   // a picked come-in / leave sound
    if (sound && ee && (PIP_ENTER.includes(m) || PIP_EXIT.includes(m))) playUrl(ee.preview, 0.6);
    await Promise.all(stages().map(h => h.pip?.body(m)));
    if (PIP_ENTER.includes(m)) shown.current = true;
    if (PIP_EXIT.includes(m)) shown.current = false;
  }, [sound, moveSound, stages]);

  const play = useCallback(async (e: FxEffect) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setLast("");
    try {
      setEffect(e); await frame(); await frame(); await wait(60);
      if (!shown.current) await move(entry);
      (globalThis as any).__fxFire = { id: e.id, ms: e.ms, at: performance.now() };   // for the page checks (leftover particles)
      await Promise.all(stages().map(h => h.fire()));
      await wait(250); await move(exit);
    } finally { busyRef.current = false; setBusy(false); }
  }, [entry, exit, move, stages]);

  // one body move, with Pip already on the screen (he comes in first if he is not there); he stays afterwards
  const bodyMove = useCallback(async (m: PipBody, label: string) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setLast(label);
    try {
      if (PIP_ENTER.includes(m) && shown.current) { await move(exit); await wait(200); }
      if (!PIP_ENTER.includes(m) && !shown.current) { await move(entry); await wait(250); }
      if (!(PIP_EXIT.includes(m) && !shown.current)) await move(m);
    } finally { busyRef.current = false; setBusy(false); }
  }, [entry, exit, move]);

  const choose = (role: string, v: string) => setPicks(prev => { const n = { ...prev }; if (n[role] === v) delete n[role]; else n[role] = v; picksRef.current = n; try { localStorage.setItem(KEY + ".sounds", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  // set (no toggle): used by the sound choices inside an effect card
  // the ref is set at once (not in the state updater), so a play started right after the tap already hears the new choice
  const setPick = (role: string, v: string) => { const n = { ...picksRef.current, [role]: v }; picksRef.current = n; setPicks(n); try { localStorage.setItem(KEY + ".sounds", JSON.stringify(n)); } catch { /* ignore */ } };
  const audio = useRef<any>(null);
  const listen = (url: string) => { try { audio.current?.pause(); const a = new (globalThis as any).Audio(url); a.volume = 0.8; audio.current = a; a.play(); } catch { /* ignore */ } };
  // load every candidate as the page opens (about 2-3 MB), so a sound tried with an effect plays right on its beat
  useEffect(() => { CANDS.forEach((c, i) => setTimeout(() => playUrl(c.preview, 0), 200 + i * 60)); }, []);
  // while the page is open, a role with a picked Freesound candidate plays that candidate inside every effect
  useEffect(() => {
    setSfxOverride((name, vol) => { const c = CANDS.find(x => String(x.id) === picksRef.current[name]); if (!c) return false; playUrl(c.preview, vol); return true; });
    return () => setSfxOverride(null);
  }, []);
  const toggle = (id: string) => setRejects(prev => { const n = { ...prev }; if (n[id]) delete n[id]; else n[id] = true; save(n); return n; });
  const kept = FX_EFFECTS.filter(e => !rejects[e.id]), rejected = FX_EFFECTS.filter(e => rejects[e.id]);
  const playNext = () => {
    const i = effect ? FX_EFFECTS.findIndex(e => e.id === effect.id) : -1;
    for (let k = 1; k <= FX_EFFECTS.length; k++) { const e = FX_EFFECTS[(i + k) % FX_EFFECTS.length]; if (!rejects[e.id]) { play(e); return; } }
  };

  // a link like http://localhost:8096/#play=fireworks plays that effect when the page opens (the moments review page links here)
  useEffect(() => {
    const id = ((globalThis as any).location?.hash ?? "").match(/play=([a-z0-9-]+)/)?.[1]; if (!id) return;
    const e = FX_EFFECTS.find(x => x.id === id); if (!e) return;
    const h = setTimeout(() => play(e), 1200); return () => clearTimeout(h);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const answers = useCallback(() => ({
    rejectedEffects: FX_EFFECTS.filter(e => rejects[e.id]).map(e => `${e.id}: ${e.name}`),
    keptEffects: FX_EFFECTS.filter(e => !rejects[e.id]).map(e => `${e.id}: ${e.name}`),
    soundPicks: SOUND_ROLES.map(r => { const v = picks[r]; const c = CANDS.find(x => String(x.id) === v); return `${r}: ${!v ? "(not picked)" : v === "ours" ? "ours" : `${c?.name} by ${c?.author} (${c?.page})`}`; }),
    entry, exit, variant, compare, motion: compare ? "v1 and v2" : motion,
  }), [rejects, entry, exit, variant, picks, compare, motion]);
  useEffect(() => { (globalThis as any).reviewAnswers = answers; }, [answers]);
  const copy = () => { try { (navigator as any).clipboard?.writeText(JSON.stringify(answers(), null, 2)); } catch { /* ignore */ } };

  const Btn = ({ label, onPress, on, off, danger }: { label: string; onPress: () => void; on?: boolean; off?: boolean; danger?: boolean }) => (
    <Pressable onPress={onPress} disabled={off} style={[s.btn, { borderColor: T.line }, on && s.btnOn, danger && s.btnNo, off && { opacity: 0.4 }]}>
      <Text style={[s.btnT, { color: on || danger ? "#141311" : T.fg }]}>{label}</Text>
    </Pressable>);

  const Chip = ({ label, title, on, off, onPress }: { label: string; title?: string; on?: boolean; off?: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} disabled={off} accessibilityLabel={title ?? label} {...({ title } as any)} style={[s.chip, { borderColor: T.line }, on && s.btnOn, off && { opacity: 0.4 }]}>
      <Text style={[s.chipT, { color: on ? "#141311" : T.fg }]}>{label}</Text>
    </Pressable>);
  const narrow = narrowW;
  // bare link (what the phone frame's iframe loads): only the phone screen, filling the window, so the window IS the phone
  if (pl?.spec.bare) return <View style={{ flex: 1, backgroundColor: dark ? "#141311" : "#F7F4EE" }}><ProgramLab key={pl.run + ":" + dark} spec={pl.spec} dark={dark} /></View>;
  const plSrc = pl && typeof location !== "undefined" ? location.pathname + decodeURIComponent(location.hash || "").replace(/,(dark|light|bare)\b/g, "") + "," + (dark ? "dark" : "light") + ",bare" : "";
  return (
    <View style={[s.page, { backgroundColor: T.page, flexDirection: narrow ? "column" : "row" }]}>
      {/* the phone(s): a real-looking program step under Pip, so you see what the effect covers and what stays visible */}
      <View style={[s.phoneCol, narrow && { paddingBottom: 8 }]}>
        {dd ? (
          <View testID="dd-frame" style={[s.phone, { width: dd.w + 12, height: dd.h + 12, borderColor: dark ? "#2A2825" : "#CFC8BA" }]}>
            <ThemeProvider scheme={dark ? "dark" : "light"}>
              <DayDoneReal ref={ddRef} key={dd.sample + ":" + dd.w + "x" + dd.h + ":" + dd.run + ":" + dark} sample={dd.sample} autoPlay={dd.auto} sound={sound}
                insets={{ top: 44, bottom: 24 }} onHome={() => setLast("Day done: left the screen (Back to home)")} />
            </ThemeProvider>
          </View>) : null}
        {pl ? (
          <View testID="pl-frame" style={[s.phone, { width: pl.spec.w + 12, height: pl.spec.h + 12, borderColor: dark ? "#2A2825" : "#CFC8BA" }]}>
            {React.createElement("iframe", { key: pl.run + ":" + dark + ":" + plSrc, src: plSrc, title: "Program screen preview", style: { width: pl.spec.w, height: pl.spec.h, border: 0, display: "block", background: "transparent" } })}
          </View>) : null}
        <View style={{ flexDirection: "row", gap: 14, display: dd || pl ? "none" : "flex" }}>
          <Phone ref={stage} k={k} pw={pw} ph={ph} T={T} dark={dark} effect={effect} sound={sound} variant={variant} motion={compare ? "v1" : motion} caption={compare ? "Old motion" : undefined} winKey={win.width + "x" + win.height + ":" + compare} moment={compare ? undefined : momentRef} backdrop={backdrop} />
          {compare ? <Phone ref={stageB} k={k} pw={pw} ph={ph} T={T} dark={dark} effect={effect} sound={false} variant={variant} motion="v2" caption="New motion" winKey={win.width + "x" + win.height + ":" + compare} /> : null}
        </View>
        <Text style={[s.small, { color: T.sub, textAlign: "center" }]}>{busy ? "Playing: " + (last || effect?.name || "") : last || effect ? "Last played: " + (last || effect?.name) : "Pick an effect or a body move to play"}</Text>
      </View>

      <ScrollView style={s.list} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={[s.h2, { color: T.fg }]}>Pip effects: reject the ones you don't want</Text>
        <Text style={[s.small, { color: T.sub }]}>Each play shows the whole moment: empty screen, Pip comes in, the effect, Pip leaves. Everything not rejected is kept. Under each effect, tap a sound choice (Ours, A, B, C) and the effect plays with it; a choice applies to every effect that uses that sound.</Text>
        <View style={s.row}>
          <Btn label="Pip" on={variant === "pip"} onPress={() => setVariant("pip")} off={busy} />
          <Btn label="Pip-f" on={variant === "pip-f"} onPress={() => setVariant("pip-f")} off={busy} />
          <Btn label={dark ? "Dark screen" : "Light screen"} onPress={() => setDark(d => !d)} />
          <Btn label={sound ? "Sound: on" : "Sound: off"} on={sound} onPress={() => setSound(v => !v)} />
        </View>
        <View style={s.row}>
          <Text style={[s.lab, { color: T.sub }]}>Motion</Text>
          <Btn label="Compare old and new" on={compare} onPress={() => setCompare(v => !v)} off={busy} />
          {compare ? null : <Btn label="Old" on={motion === "v1"} onPress={() => setMotion("v1")} off={busy} />}
          {compare ? null : <Btn label="New" on={motion === "v2"} onPress={() => setMotion("v2")} off={busy} />}
        </View>
        <View style={[s.card, { backgroundColor: T.card, borderColor: "#E8A33D" }]}>
          <Text style={[s.title, { color: T.fg }]}>Program screens (real)</Text>
          <Text style={[s.small, { color: T.sub }]}>The app's own program screens with sample data (Dating, Intimacy and Vulnerability, Days 1 and 2). No login. Tap one; the address bar link can be reused in a screenshot. Light or dark follows the Dark / Light button above.</Text>
          <View style={s.row}>{pl ? <Btn label="Close" onPress={() => { try { (globalThis as any).history.replaceState(null, "", "#"); } catch { /* ignore */ } setPl(null); }} /> : null}</View>
          {PROGRAM_LAB_LINKS.map(g => (
            <View key={g.group}>
              <Text style={[s.lab, { color: T.sub, marginTop: 8 }]}>{g.group}</Text>
              <View style={s.row}>{g.items.map(it => <Btn key={it.label} label={it.label} onPress={() => openPl(labLink(it.word, 390, 844, it.rest, dark))} />)}</View>
            </View>))}
        </View>
        <View style={[s.card, { backgroundColor: T.card, borderColor: "#E8A33D" }]}>
          <Text style={[s.title, { color: T.fg }]}>Day done (real)</Text>
          <Text style={[s.small, { color: T.sub }]}>The app's own day-done screen with the real Pip, at a real phone size. The goals are a stand-in (nothing is saved). Tap the goals, "Not yet" and "Back to home" in the phone.</Text>
          <View style={s.row}>
            <Btn label="▶ Play beat 1" on onPress={() => setDd(d => ({ sample: d?.sample ?? "goals", w: d?.w ?? 360, h: d?.h ?? 740, run: (d?.run ?? 0) + 1, auto: true }))} />
            <Btn label="Continue" onPress={() => ddRef.current?.toBeat2()} off={!dd} />
            <Btn label="Reset" onPress={() => setDd(d => (d ? { ...d, run: d.run + 1, auto: false } : d))} off={!dd} />
            <Btn label="Close" onPress={() => setDd(null)} off={!dd} />
          </View>
          <View style={s.row}>{DAY_DONE_SAMPLES.map(([id, label]) => <Btn key={id} label={label} on={dd?.sample === id} onPress={() => setDd(d => ({ w: d?.w ?? 360, h: d?.h ?? 740, run: (d?.run ?? 0) + 1, sample: id, auto: true }))} />)}</View>
          <View style={s.row}>{([[360, 740], [390, 844], [430, 932]] as const).map(([w, h]) => <Btn key={w} label={w + " x " + h} on={dd?.w === w} onPress={() => setDd(d => ({ sample: d?.sample ?? "goals", run: (d?.run ?? 0) + 1, w, h, auto: true }))} />)}</View>
        </View>
        {compare ? null : <View style={[s.card, { backgroundColor: T.card, borderColor: "#E8A33D" }]}>
          <Text style={[s.title, { color: T.fg }]}>Moments in the app (your picks)</Text>
          <Text style={[s.small, { color: T.sub }]}>Pip comes in, the effect, the moment's text, Pip leaves. Watch each one over a dimmed screen and on the normal screen.</Text>
          <View style={s.row}>
            <Text style={[s.lab, { color: T.sub }]}>Screen</Text>
            <Btn label="Your picks" on={backdrop === undefined} onPress={() => setBackdrop(undefined)} off={busy} />
            <Btn label="Dimmed" on={backdrop === "dim"} onPress={() => setBackdrop("dim")} off={busy} />
            <Btn label="Normal screen" on={backdrop === "none"} onPress={() => setBackdrop("none")} off={busy} />
          </View>
          <View style={s.row}>{PIP_MOMENTS.map((m, i) => <Btn key={m.id} label={m.ref + " " + m.name} onPress={() => playMoment(i)} off={busy} />)}</View>
        </View>}
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.line }]}>
          <Text style={[s.title, { color: T.fg }]}>Body moves{compare ? ": both phones play at the same moment" : ""}</Text>
          <Text style={[s.small, { color: T.sub }]}>Pip stays on the screen. Play one move at a time.</Text>
          <View style={s.row}>{BODY_MOVES.map(([m, label]) => <Btn key={m} label={label} onPress={() => bodyMove(m, label)} off={busy} />)}</View>
          <View style={s.row}>
            <Btn label="▶ Come in" onPress={() => bodyMove(entry, "Comes in: " + (LABEL[entry] ?? entry))} off={busy} />
            <Btn label="▶ Leave" onPress={() => bodyMove(exit, "Leaves: " + (LABEL[exit] ?? exit))} off={busy} />
          </View>
        </View>
        <View style={s.row}><Text style={[s.lab, { color: T.sub }]}>Comes in</Text>{PIP_ENTER.map(m => <Btn key={m} label={LABEL[m] ?? m} on={entry === m} onPress={() => setEntry(m)} off={busy} />)}</View>
        <View style={s.row}><Text style={[s.lab, { color: T.sub }]}>Leaves</Text>{PIP_EXIT.map(m => <Btn key={m} label={LABEL[m] ?? m} on={exit === m} onPress={() => setExit(m)} off={busy} />)}</View>
        <View style={s.row}>
          <Text style={[s.lab, { color: T.sub }]}>Their sound</Text>
          <Chip label="None" on={!picks["entry-exit"] || picks["entry-exit"] === "ours"} onPress={() => { setPick("entry-exit", "ours"); bodyMove(shown.current ? exit : entry, "Sound: none"); }} off={busy} />
          {CANDS.filter(c => c.role === "entry-exit").sort((x, y) => x.rank - y.rank).map((c, j) => (
            <Chip key={c.id} label={"ABC"[j]} title={`${c.name} · ${c.author}`} on={picks["entry-exit"] === String(c.id)} onPress={() => { playUrl(c.preview, 0); setPick("entry-exit", String(c.id)); bodyMove(shown.current ? exit : entry, "Sound " + "ABC"[j]); }} off={busy} />))}
        </View>
        <View style={[s.row, { marginBottom: 8 }]}>
          <Text style={[s.count, { color: T.fg }]}>Kept {kept.length} · Rejected {rejected.length} of {FX_EFFECTS.length}</Text>
          <Btn label="▶ Play next" onPress={playNext} off={busy} on />
          <Btn label="Copy answers" onPress={copy} />
        </View>

        {FX_EFFECTS.map((e, i) => {
          const no = !!rejects[e.id], sel = effect?.id === e.id, snd = Array.from(new Set((e.sounds ?? []).map(x => x.name)));
          return (
            <View key={e.id} style={[s.card, { backgroundColor: T.card, borderColor: sel ? "#E8A33D" : T.line }, no && { opacity: 0.45 }]}>
              <View style={s.head}>
                <Text style={[s.title, { color: T.fg, flex: 1 }]}>{i + 1}. {e.name}{no ? "  (rejected)" : ""}</Text>
                <Btn label="▶ Play" onPress={() => play(e)} off={busy} />
                <Btn label={no ? "Undo reject" : "Reject"} danger={!no} onPress={() => toggle(e.id)} />
              </View>
              <Text style={[s.body, { color: T.fg }]}>{e.feel}</Text>
              <Text style={[s.small, { color: T.sub }]}>{(e.ms / 1000).toFixed(1)} s · {particles(e)} particles · {snd.length ? snd.length + " sounds" : "no sound"}</Text>
              {/* the effect's sounds: tap a choice and the whole effect plays with it (a choice applies to every effect using that sound) */}
              {snd.map(role => {
                const cands = CANDS.filter(c => c.role === role).sort((x, y) => x.rank - y.rank), cur = picks[role] ?? "ours";
                return (
                  <View key={role} style={s.sndPick}>
                    <Text style={[s.sndLab, { color: T.sub }]} numberOfLines={1}>{role}</Text>
                    <Chip label="Ours" on={cur === "ours"} onPress={() => { setPick(role, "ours"); play(e); }} off={busy} />
                    {cands.map((c, j) => <Chip key={c.id} label={"ABC"[j]} title={`${c.name} · ${c.author}`} on={cur === String(c.id)} onPress={() => { playUrl(c.preview, 0); setPick(role, String(c.id)); play(e); }} off={busy} />)}
                  </View>);
              })}
            </View>);
        })}

        <Text style={[s.h2, { color: T.fg, marginTop: 20 }]}>Sounds: pick one for each</Text>
        <Text style={[s.small, { color: T.sub }]}>"Ours" is the sound used now. The other three are free sounds from Freesound (CC0: free to use in the app, no credit needed); they play from Freesound, nothing is downloaded yet. Pick the best one per row.</Text>
        {SOUND_ROLES.map(role => {
          const cands = CANDS.filter(c => c.role === role).sort((x, y) => x.rank - y.rank), pick = picks[role];
          const ours = (SFX_NAMES as string[]).includes(role);
          return (
            <View key={role} style={[s.card, { backgroundColor: T.card, borderColor: pick ? "#E8A33D" : T.line }]}>
              <Text style={[s.title, { color: T.fg }]}>{role === "entry-exit" ? "Pip comes in / leaves" : role}<Text style={[s.small, { color: T.sub }]}>{USES[role] ? `   used in ${USES[role]} effects` : ""}</Text></Text>
              {ours ? (
                <View style={s.sndRow}>
                  <Btn label="▶" onPress={() => playSfx(role as any)} />
                  <Text style={[s.body, { color: T.fg, flex: 1, marginTop: 0 }]}>Ours</Text>
                  <Btn label={pick === "ours" ? "✓ Picked" : "Pick"} on={pick === "ours"} onPress={() => choose(role, "ours")} />
                </View>) : null}
              {cands.map(c => (
                <View key={c.id} style={s.sndRow}>
                  <Btn label="▶" onPress={() => listen(c.preview)} />
                  <Text style={[s.body, { color: T.fg, flex: 1, marginTop: 0 }]} numberOfLines={1}>{c.name} <Text style={{ color: T.sub }}>· {c.duration_s.toFixed(1)} s · {c.author}</Text></Text>
                  <Btn label={pick === String(c.id) ? "✓ Picked" : "Pick"} on={pick === String(c.id)} onPress={() => choose(role, String(c.id))} />
                </View>))}
            </View>);
        })}
      </ScrollView>
    </View>);
}

const s = StyleSheet.create({
  page: { height: "100%" as any, width: "100%" as any },
  phoneCol: { paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", gap: 6 },
  phone: { borderRadius: 36, borderWidth: 6, overflow: "hidden" },
  appTop: { height: 64, justifyContent: "flex-end" },
  cap: { fontSize: 15, fontWeight: "700" },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 28, fontWeight: "800", marginTop: 18 },
  meta: { fontSize: 15, marginTop: 4 },
  track: { height: 8, borderRadius: 4, marginTop: 18, overflow: "hidden" },
  fill: { width: "18%" as any, height: 8, borderRadius: 4, backgroundColor: "#FF9F57" },
  p: { fontSize: 17, lineHeight: 25, marginTop: 14 },
  next: { position: "absolute", right: 16, bottom: 28, height: 56, paddingHorizontal: 40, borderRadius: 28, backgroundColor: "#FF8F3F", alignItems: "center", justifyContent: "center" },
  nextT: { fontSize: 18, fontWeight: "700", color: "#141311" },
  stageBox: { position: "absolute", left: 0, top: 330 },
  list: { flex: 1 },
  h2: { fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 },
  lab: { fontSize: 14, width: 72 },
  count: { fontSize: 16, fontWeight: "700", marginRight: 8 },
  btn: { minHeight: 40, minWidth: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", cursor: "pointer" as any },
  btnOn: { backgroundColor: "#E8A33D", borderColor: "#E8A33D" },
  btnNo: { backgroundColor: "#F08A7A", borderColor: "#F08A7A" },
  btnT: { fontSize: 15, fontWeight: "600" },
  card: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 2 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 15, marginTop: 6 },
  small: { fontSize: 14, marginTop: 6 },
  sndPick: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  sndLab: { width: 92, fontSize: 14 },
  chip: { minHeight: 34, minWidth: 40, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", cursor: "pointer" as any },
  chipT: { fontSize: 14, fontWeight: "600" },
  sndRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  sfx: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, padding: 8, borderRadius: 12, borderWidth: 1 },
});
