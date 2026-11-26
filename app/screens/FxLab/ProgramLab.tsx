/**
 * DEV ONLY (preview harness, web page and phone lab): the REAL program screens with sample data and no login.
 * The screens are the app's own (PackModule, ProgramDetail, Programs, ForYouCarousel, PackForm, RealLifeChallenge);
 * only their API answers are sample data (labApi.ts, switched on while a lab screen is shown) and they sit in a
 * stand-in navigator. Nothing in the normal app imports this file.
 *
 * Links (web: http://localhost:8096/#<link>), parts separated by commas, in any order after the first:
 *   program=390x844,day1,step=3[,part=2][,done=6+7][,do=<actions>][,dark|light]
 *       a day of the program. day = 1 or 2. step = 1-based step. part = lesson part (a "Next part" tap per part).
 *       done = steps shown as finished (their cards show "Completed"). do = actions, joined with ";" (see below).
 *   steps=...   same as program=..., with the steps sheet opened.       reading=...  the lesson reading sheet opened.
 *   practice=...  the practice screen the "Start practice" button opens (Day 1 step 6 or Day 2 step 6).
 *   form=...    the log form screen the log card opens (day1 or day2, step 7).
 *   daydone=... is the existing DayDoneReal link (FxWeb) and is left as it is.
 *   programpage=390x844,owned|notowned[,scrolled][,dark|light]      the program page
 *   programs=390x844,yours|browse                                   the Programs screen
 *   home=390x844[,day1|day2]                                        the Home "For you" card
 * Actions (do=), run in order after the screen has loaded (web only; they tap the real buttons):
 *   tap:<text>  tap the button or text with that label     pick:<n>  tap the n-th (1-based) quiz answer
 *   steps  reading  check  next  finish  back              wait:<ms>  scroll:<px>  type:<text> (types in the first box)
 * Example (quiz question, answered, answer sheet open):  #program=390x844,day1,step=5,do=pick:2;tap:Check,dark
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { NavigationContainer, NavigationIndependentTree, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaFrameContext, SafeAreaInsetsContext } from "react-native-safe-area-context";
import { ThemeProvider } from "../../design-system";
import PackModuleScreen from "../Academy/PackModule";
import PackFormScreen from "../Academy/PackFormScreen";
import ProgramDetailScreen from "../Programs/ProgramDetail";
import ProgramsScreen from "../Programs";
import GoalsAskScreen from "../Programs/GoalsAsk";
import GoalsReportScreen from "../Programs/GoalsReport";
import RealLifeChallenge from "../Academy/DailyPractice/pages/RealLifeChallenge";
import ForYouCarousel from "../../components/Dashboard/ForYouCarousel";
import { useUserStore } from "../../stores/user";
import { installLabApi, setLabScenario } from "./labApi";
import { DATING_RAW } from "./fixtures/datingPack";

export type LabKind = "program" | "practice" | "form" | "programpage" | "programs" | "home";
export type LabSpec = {
  kind: LabKind; w: number; h: number; dark: boolean | null;
  day: number; step: number; part: number; done: number[]; acts: string[];
  owned: boolean; scrolled: boolean; yours: boolean;
  /** The page is only the phone screen (it is what the page's phone frame loads, and what the screenshot script shoots). */
  bare: boolean;
  /** practice= only: the same practice screen opened OUTSIDE a program (no pack context), to check it keeps its own look. */
  plain?: boolean;
};

/** Reads a lab link (the text after "#"). Null when it is not one of ours. */
export function parseLabHash(hash: string): LabSpec | null {
  const m = decodeURIComponent(hash.replace(/^#/, "")).match(/^(program|steps|reading|practice|form|programpage|programs|home)=(\d+)x(\d+)((?:,.*)?)$/);
  if (!m) return null;
  const [, word, w, h, rest] = m;
  const kind: LabKind = word === "steps" || word === "reading" ? "program" : (word as LabKind);
  const spec: LabSpec = { kind, w: +w, h: +h, dark: null, day: 1, step: 1, part: 0, done: [], acts: [], owned: true, scrolled: false, yours: false, bare: false };
  if (word === "steps") spec.acts.push("steps", "wait:900");
  if (word === "reading") spec.acts.push("reading", "wait:900");
  for (const raw of rest.split(",").filter(Boolean)) {
    const t = raw.trim(); let v: RegExpMatchArray | null;
    if (t === "dark" || t === "light") spec.dark = t === "dark";
    else if ((v = t.match(/^day(\d+)$/))) spec.day = +v[1];
    else if ((v = t.match(/^step=(\d+)$/))) spec.step = +v[1];
    else if ((v = t.match(/^part=(\d+)$/))) spec.part = +v[1];
    else if ((v = t.match(/^done=([\d+ ]+)$/))) spec.done = v[1].split(/[+ ]/).filter(Boolean).map(Number);
    else if (t.startsWith("do=")) spec.acts.push(...t.slice(3).split(";").filter(Boolean));
    else if (t === "owned") spec.owned = true;
    else if (t === "notowned") spec.owned = false;
    else if (t === "scrolled") spec.scrolled = true;
    else if (t === "yours") spec.yours = true;
    else if (t === "bare") spec.bare = true;
    else if (t === "noprogram") spec.plain = true;
  }
  return spec;
}

/** The hash link for a spec-like object (used by the phone lab and the page's buttons). */
export const labLink = (word: string, w: number, h: number, rest: string[], dark: boolean) => `#${word}=${w}x${h}${rest.length ? "," + rest.join(",") : ""},${dark ? "dark" : "light"}`;

const Stack = createNativeStackNavigator<any>();
const PACK_ID = "pack-dating";

// ---- web only: the tap / scroll driver ---------------------------------------------------------------------------------
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function fire(el: Element) {
  const o = { bubbles: true, cancelable: true, view: window } as any;
  const r = (el as HTMLElement).getBoundingClientRect();
  const p = { ...o, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, pointerType: "mouse", isPrimary: true };
  el.dispatchEvent(new PointerEvent("pointerdown", p)); el.dispatchEvent(new MouseEvent("mousedown", p));
  el.dispatchEvent(new PointerEvent("pointerup", p)); el.dispatchEvent(new MouseEvent("mouseup", p));
  el.dispatchEvent(new MouseEvent("click", p));
}
function findByText(root: Element, text: string, nth = 0): Element | null {
  const want = text.trim().toLowerCase();
  const all = Array.from(root.querySelectorAll("*")) as HTMLElement[];
  const hits = all.filter((e) => {
    if (e.getAttribute("aria-label")?.trim().toLowerCase() === want) return true;
    return e.children.length === 0 && (e.textContent ?? "").trim().toLowerCase() === want;
  });
  const CLICK = '[role="button"],[role="radio"],[role="checkbox"],[tabindex="0"],a,button';
  const clickable = hits.map((e) => e.closest(CLICK)).filter(Boolean) as Element[];
  return clickable[nth] ?? hits[nth] ?? null;
}
async function runActs(root: Element, acts: string[]) {
  await wait(1500);
  for (const a of acts) {
    const [name, ...r] = a.split(":"); const arg = r.join(":");
    if (name === "wait") { await wait(+arg || 500); continue; }
    if (name === "scroll") {
      const sc = (Array.from(root.querySelectorAll("*")) as HTMLElement[]).filter((e) => e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((x, y) => y.scrollHeight - x.scrollHeight)[0];
      if (sc) sc.scrollTop = +arg || 400;
      await wait(500); continue;
    }
    if (name === "type") {
      const inp = root.querySelector("textarea,input") as HTMLInputElement | null;
      if (inp) { const proto = inp.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(inp, arg); inp.dispatchEvent(new Event("input", { bubbles: true })); (inp as HTMLElement).focus(); }
      await wait(400); continue;
    }
    let target: Element | null = null;
    // a sheet is a modal outside the lab root (the quiz answer sheet's "Next question" / "Continue"): look there too
    if (name === "tap") target = findByText(root, arg) ?? (typeof document !== "undefined" ? findByText(document.body, arg) : null);
    else if (name === "pick") { const opts = (Array.from(root.querySelectorAll('[tabindex="0"]')) as HTMLElement[]).filter((e) => e.tagName !== "BUTTON" && !e.getAttribute("aria-label") && (e.textContent ?? "").trim().length >= 18); target = opts[(+arg || 1) - 1] ?? null; }
    else if (name === "steps") target = findByText(root, "Today's steps");
    else if (name === "reading") target = findByText(root, "Text size and the parts of this lesson");
    else if (name === "check") target = findByText(root, "Check");
    else if (name === "next") target = findByText(root, "Next part") ?? findByText(root, "Next");
    else if (name === "finish") target = findByText(root, "Finish");
    else if (name === "back") target = findByText(root, "Back");
    if (!target) console.warn("[lab] action not found: " + a); else fire(target);
    await wait(700);
  }
  try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch { /* ignore */ }
}

function stepsOf(day: number) { return (DATING_RAW.modules.find((m: any) => m.dayIndex === day) ?? DATING_RAW.modules[0]).blocks; }

/** The day's practice as an activity with NO program around it (what Explore or the daily practice hands the screen). */
function plainActivity(blocks: any[]) {
  const c = blocks.find((b: any) => b.type === "ACTIVITY")?.content ?? {};
  const now = new Date().toISOString();
  return {
    id: "act-lab-plain", status: "NOT_STARTED", contentType: "EXPOSURE_PRACTICE", startedAt: null, completedAt: null, createdAt: now, updatedAt: now,
    exposurePractice: { id: c.refId, type: "TECHNIQUE_DRILL", name: c.titleOverride ?? "Practice", description: c.descriptionOverride ?? "", difficulty: "EASY",
      realLifeChallengeData: { category: "TECHNIQUE_DRILL", instructions: c.instructionsOverride ?? c.descriptionOverride ?? "", encouragement: c.encouragementOverride ?? "", completionCriteria: c.completionPromptOverride || "What did you notice?", completionPlaceholder: c.completionPlaceholderOverride ?? "" } },
  };
}

export function ProgramLab({ spec, dark }: { spec: LabSpec; dark: boolean }) {
  const root = useRef<View>(null);
  const [ready, setReady] = useState(false);
  const blocks = stepsOf(spec.day);
  const doneIds = useMemo(() => spec.done.map((n) => blocks[n - 1]?.id).filter(Boolean) as string[], [spec, blocks]);
  // sample data on, real client back when this screen goes away
  useEffect(() => {
    try { if (Platform.OS === "web") Object.keys(localStorage).filter((k) => k.startsWith("pack-") || k.includes("doneBlocks") || k.includes("done-blocks")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    setLabScenario({ owned: spec.owned, currentDay: spec.kind === "home" ? spec.day : Math.max(spec.day, 1), doneDays: spec.kind === "home" && spec.day > 1 ? [1] : [], doneBlocks: doneIds });
    const off = installLabApi();
    useUserStore.setState({ user: { id: "lab-user", email: "lab@example.test", firstName: "Sam", name: "Sam" } as any });
    setReady(true);
    return off;
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  // web: run the actions once the screen is up
  useEffect(() => {
    if (!ready || Platform.OS !== "web") return;
    const acts = [...(spec.kind === "practice" && !spec.plain ? ["tap:Start practice"] : []), ...(spec.part > 0 ? Array(spec.part).fill("next") : []), ...(spec.kind === "programpage" && spec.scrolled ? ["scroll:700"] : []), ...(spec.kind === "programs" && spec.yours ? ["wait:800", "tap:Yours", "wait:900"] : []), ...spec.acts];
    const el = (root.current as any) as Element | null;
    const node: Element | null = el && (el as any).querySelectorAll ? el : (typeof document !== "undefined" ? document.querySelector('[data-lab-root="1"]') : null);
    if (node && acts.length) void runActs(node, acts);
  }, [ready]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  const moduleId = `mod-d${spec.day}`;
  const first = spec.kind === "program" ? "PackModule" : spec.kind === "practice" ? (spec.plain ? "RealLifeChallenge" : "PackModule") : spec.kind === "form" ? "PackForm" : spec.kind === "programpage" ? "ProgramDetail" : spec.kind === "programs" ? "Programs" : "Home";
  const formBlock = blocks.find((b: any) => b.type === "FORM") ;
  const initial: Record<string, any> = {
    PackModule: { packId: PACK_ID, moduleId, initialBlockIndex: Math.max(0, spec.step - 1) },
    PackForm: { configuration: formBlock?.content.configuration, formId: formBlock?.content.formId, packId: PACK_ID, moduleId, blockId: formBlock?.id, titleOverride: formBlock?.content.titleOverride, descriptionOverride: formBlock?.content.descriptionOverride, hasRecall: false, accentKey: "purple" },
    ProgramDetail: { catalogKey: "dating_intimacy", packId: PACK_ID },
    Programs: {}, Home: {},
    RealLifeChallenge: spec.plain ? { practiceActivity: plainActivity(blocks) } : undefined,
  };
  const acts = spec.kind === "practice" ? [] : [];
  void acts;
  const Home = () => <View style={{ flex: 1, justifyContent: "center", paddingTop: 60, paddingHorizontal: 16 }}><ForYouCarousel /></View>;
  const Missing = ({ route }: any) => <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}><Text style={{ color: dark ? "#fff" : "#000", textAlign: "center" }}>Lab: the screen "{route.name}" is not part of the preview.</Text></View>;
  const nav = dark ? DarkTheme : DefaultTheme;
  return (
    // fixed phone insets: on web SafeAreaProvider measures the browser (0) and drops initialMetrics, so give the contexts directly
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: spec.w, height: spec.h }}>
    <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 24, left: 0, right: 0 }}>
      <ThemeProvider scheme={dark ? "dark" : "light"}>
        <View ref={root} {...({ dataSet: { labRoot: "1" } } as any)} style={{ flex: 1, backgroundColor: dark ? "#141311" : "#F7F4EE" }}>
          {/* the phone lab sits inside the app's own navigator: keep this one separate */}
          <NavigationIndependentTree>
          <NavigationContainer theme={{ ...nav, colors: { ...nav.colors, background: dark ? "#141311" : "#F7F4EE" } }} documentTitle={{ enabled: false }}>
            <Stack.Navigator initialRouteName={first} screenOptions={{ headerShown: false, animation: "none" }}>
              <Stack.Screen name="PackModule" component={PackModuleScreen} initialParams={initial.PackModule} />
              <Stack.Screen name="PackForm" component={PackFormScreen} initialParams={initial.PackForm} />
              <Stack.Screen name="ProgramDetail" component={ProgramDetailScreen} initialParams={initial.ProgramDetail} />
              <Stack.Screen name="Programs" component={ProgramsScreen} />
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="RealLifeChallenge" component={RealLifeChallenge} initialParams={initial.RealLifeChallenge} />
              <Stack.Screen name="ProgramGoalsAsk" component={GoalsAskScreen} />
              <Stack.Screen name="ProgramGoalsReport" component={GoalsReportScreen} />
              <Stack.Screen name="Missing" component={Missing} />
            </Stack.Navigator>
          </NavigationContainer>
          </NavigationIndependentTree>
        </View>
      </ThemeProvider>
    </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>);
}
