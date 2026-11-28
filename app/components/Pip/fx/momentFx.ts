/**
 * Pip's moments in the app: the founder's final pick(s) per moment (Moments lab, 2026-11-28), and where each was designed.
 * Placement (where it plays, background, words): ../MOMENTS-PLACEMENT.md (all option A, approved 2026-11-28).
 *
 * A moment with several finals uses them by a rule (momentFx below):
 *   level-up              all 3 take turns (one after the other, kept on the phone)
 *   welcome-first-launch  the welcome mat the first time; the HELLO letters after that
 *   waiting-empty         the sand timer for loading; the goldfish or the snail on an empty list
 * VARIANTS (each pick's `feel` describes them; the screen says which one with `variant`):
 *   mood-checkin          "low" (a soft blue sticker, no sound, no sparkles: never cheerful at a low mood), "neutral", "high"
 *   level-up              a plain level (the turn's final as it is) or "stage": the same final plus a golden shower, a
 *                         fanfare and a big hop (a new stage happens 4 times ever)
 *   home-greeting         normal, or "away" (back after 2+ days): the bird brings a flower and Pip waves
 *   waiting-empty         "loading" (the sand timer, looping); "goldfish" / "snail" on an empty list (the snail without its
 *                         loading dots: nothing is loading)
 *   permission-ask        "ask", or "not-now": the bell dozes
 * The three early picks made of Pip's beats only (quiz right, quiz not this one, day start) are written out here as effects
 * with their picked sound.
 * Each effect's props were placed on a lab screen with Pip at MOMENT_SPOT; PipStage's `design` fits them to where Pip
 * really stands (fitFx.ts).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FxEffect } from "./types";
import type { FxSpot } from "./fitFx";
import { SAMPLE_MOMENTS } from "./samples";
import { PERMISSION_DOZE } from "./samples-b2b";
import { HOME_AWAY, MOOD_HIGH, MOOD_LOW } from "./samples-b2a";

export type MomentFxId =
  | "quiz-right" | "quiz-not-this-one" | "step-done" | "day-start" | "reflection-saved" | "step-skipped" | "day-done" | "day-closed"
  | "furthest-moment" | "program-finished" | "practice-done" | "practice-ended-early" | "first-call-done" | "level-up"
  | "recording-problem" | "home-greeting" | "mood-checkin" | "welcome-first-launch" | "onboarding-done" | "buddy-paired"
  | "purchase-done" | "error-safe" | "waiting-empty" | "permission-ask";

const pick = (moment: string, id: string): FxEffect => {
  const e = SAMPLE_MOMENTS[moment]?.find(x => x.id === id);
  if (!e) throw new Error(`momentFx: no effect ${moment}/${id}`);
  return e;
};
const beats = (id: string, name: string, feel: string, ms: number, sound: string, pip: FxEffect["pip"]): FxEffect =>
  ({ id, name, feel, ms, emitters: [], sounds: [{ name: sound, at: 0, volume: 0.8 }], pip });

export const MOMENT_FX: Record<MomentFxId, FxEffect[]> = {
  "quiz-right": [beats("quiz-right-b", "Little lift", "One small hop with a smile; the blob wobbles under him as he lands.", 420, "fx-ding-soft",
    [{ at: 0, face: "smile", body: "hop", haptic: "selection" }])],
  "quiz-not-this-one": [beats("quiz-not-this-one-b", "Thinks, then listens", "A short thinking look, then a listening face turned to the explanation.", 450, "fx-boop-soft",
    [{ at: 0, face: "thinking" }, { at: 110, face: "listening" }])],
  "step-done": [pick("step-done", "sd-tick-it-off")],
  "day-start": [beats("day-start-a", "Slides in", "Pip slides in with a small tilt and a smile.", 650, "fx-chime-start",
    [{ at: 0, face: "smile", body: "peek" }])],
  "reflection-saved": [pick("reflection-saved", "rs3-heart-jar")],
  "step-skipped": [pick("step-skipped", "sk3-sneaker-car")],
  "day-done": [pick("day-done", "dd2-stars")],
  "day-closed": [pick("day-closed", "nd-calendar")],
  "furthest-moment": [pick("furthest-moment", "fm-gold")],
  "program-finished": [pick("program-finished", "pf-grand-finale")],
  "practice-done": [pick("practice-done", "pd-todo-check")],
  "practice-ended-early": [pick("practice-ended-early", "pe-bookmark")],
  "first-call-done": [pick("first-call-done", "fc-mic-drop")],
  "level-up": [pick("level-up", "lu-bonus-block"), pick("level-up", "lu-ladder"), pick("level-up", "lu-star-row")],
  "recording-problem": [pick("recording-problem", "rp-plugged-in")],
  "home-greeting": [pick("home-greeting", "hg-bird-hello")],
  "mood-checkin": [pick("mood-checkin", "mc-sticker-today")],
  "welcome-first-launch": [pick("welcome-first-launch", "wf-welcome-mat"), pick("welcome-first-launch", "wf-hello-letters")],
  "onboarding-done": [pick("onboarding-done", "od-lift-off")],
  "buddy-paired": [pick("buddy-paired", "bp-puzzle-click")],
  "purchase-done": [pick("purchase-done", "pd-golden-ticket")],
  "error-safe": [pick("error-safe", "es-calm-computer")],
  "waiting-empty": [pick("waiting-empty", "we-sand-timer"), pick("waiting-empty", "we-goldfish"), pick("waiting-empty", "we-snail-spinner")],
  "permission-ask": [pick("permission-ask", "pa-polite-bell"), PERMISSION_DOZE],
};

/** How a moment with several finals uses them (the lab shows this). */
export const MOMENT_FX_NOTES: Partial<Record<MomentFxId, string>> = {
  "level-up": "All 3 kept: they take turns.",
  "welcome-first-launch": "A and B both kept: the mat the first time, the letters after.",
  "waiting-empty": "Sand timer for loading; goldfish and snail on empty lists.",
  "error-safe": "Shows with its words: your work is safe.",
  "permission-ask": "The ask; after Not now the bell dozes (B).",
  "mood-checkin": "Variants: low (soft, silent), neutral, high.",
  "home-greeting": "Variant: back after 2+ days, the bird brings a flower.",
};

/** The lab screens the moments were designed on (390 x 844 points): Pip's picture's top-left and width. */
export const LAB_SPOTS = {
  quizRight: { x: 254, y: 419, size: 132 }, quizWrong: { x: 255, y: 445, size: 130 },
  start: { x: 165, y: 140, size: 219 }, close: { x: 165, y: 140, size: 218 }, practice: { x: 52, y: 157, size: 286 },
  dayDone: { x: -26, y: 331, size: 441 }, goals: { x: 170, y: 205, size: 212 }, form: { x: 254, y: 136, size: 132 },
  practiceDone: { x: 250, y: 84, size: 138 }, home: { x: 95, y: 90, size: 200 }, stage: { x: 75, y: 250, size: 240 },
} satisfies Record<string, FxSpot>;

/** Where each moment was designed (fitFx moves its props to Pip's real place). */
export const MOMENT_SPOT: Record<MomentFxId, FxSpot> = {
  "quiz-right": LAB_SPOTS.quizRight, "quiz-not-this-one": LAB_SPOTS.quizWrong, "step-done": LAB_SPOTS.close, "day-start": LAB_SPOTS.start,
  "reflection-saved": LAB_SPOTS.form, "step-skipped": LAB_SPOTS.practice, "day-done": LAB_SPOTS.dayDone, "day-closed": LAB_SPOTS.goals,
  "furthest-moment": LAB_SPOTS.dayDone, "program-finished": LAB_SPOTS.dayDone, "practice-done": LAB_SPOTS.practiceDone,
  "practice-ended-early": LAB_SPOTS.practiceDone, "home-greeting": LAB_SPOTS.home, "mood-checkin": LAB_SPOTS.home,
  "first-call-done": LAB_SPOTS.stage, "level-up": LAB_SPOTS.stage, "recording-problem": LAB_SPOTS.stage, "welcome-first-launch": LAB_SPOTS.stage,
  "onboarding-done": LAB_SPOTS.stage, "buddy-paired": LAB_SPOTS.stage, "purchase-done": LAB_SPOTS.stage, "error-safe": LAB_SPOTS.stage,
  "waiting-empty": LAB_SPOTS.stage, "permission-ask": LAB_SPOTS.stage,
};

/** A new stage: the level's final, then a golden shower over the whole screen, a fanfare on its hit, and a big hop. */
function newStage(base: FxEffect): FxEffect {
  const gold = MOMENT_FX["furthest-moment"][0];
  const hit = Math.round(base.ms * 0.55);
  return {
    ...base, id: base.id + "-stage", name: base.name + " (new stage)", ms: Math.max(base.ms, hit + gold.ms),
    emitters: [...base.emitters, ...gold.emitters.map(e => ({ ...e, at: (e.at ?? 0) + hit }))],
    sounds: [...(base.sounds ?? []), { name: "fx-success-fanfare-1", at: hit, volume: 0.7 }],
    pip: [...(base.pip ?? []), { at: hit + 80, face: "laugh", body: "bighop", haptic: "success" }],
  };
}
/** The snail on an empty list: no loading dots, no ticks. */
function quietSnail(base: FxEffect): FxEffect {
  return { ...base, id: base.id + "-empty", emitters: base.emitters.filter(e => e.shapes[0] !== "b2-dot"), sounds: [] };
}

/** Which final a moment plays. `variant` picks one by name where the screen knows the context:
 *  waiting-empty: "loading" (sand timer, the default), "goldfish", "snail"; permission-ask: "ask" (default), "not-now". */
export function momentFxNow(id: MomentFxId, variant?: string): FxEffect {
  const list = MOMENT_FX[id];
  if (id === "waiting-empty") return variant === "goldfish" ? list[1] : variant === "snail" ? quietSnail(list[2]) : list[0];
  if (id === "permission-ask") return list[variant === "not-now" ? 1 : 0];
  if (id === "mood-checkin") return variant === "low" ? MOOD_LOW : variant === "high" ? MOOD_HIGH : list[0];
  if (id === "home-greeting") return variant === "away" ? HOME_AWAY : list[0];
  return list[0];
}

// turns kept on the phone: level-up takes turns, welcome plays the mat first
const TURN_KEY = "pip.momentTurn.";
const turns: Partial<Record<MomentFxId, number>> = {};
async function nextTurn(id: MomentFxId): Promise<number> {
  let n = turns[id];
  if (n == null) { try { n = Number(await AsyncStorage.getItem(TURN_KEY + id)) || 0; } catch { n = 0; } }
  turns[id] = n + 1;
  AsyncStorage.setItem(TURN_KEY + id, String(n + 1)).catch(() => undefined);
  return n;
}

/** The final to play now, following the usage rules (it counts a turn for level-up and welcome). */
export async function momentFx(id: MomentFxId, variant?: string): Promise<FxEffect> {
  const list = MOMENT_FX[id];
  if (id === "level-up") { const fx = list[(await nextTurn(id)) % list.length]; return variant === "stage" ? newStage(fx) : fx; }
  if (id === "welcome-first-launch") return list[(await nextTurn(id)) === 0 ? 0 : 1];
  return momentFxNow(id, variant);
}
