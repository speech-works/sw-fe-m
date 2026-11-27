/**
 * The founder's final Pip moments (picked 2026-11-28 in the Moments lab), one list per moment id.
 * A list with several effects means: alternate between them (level-up), or use them by context (welcome A + C, waiting: mostly the
 * sand timer, the goldfish and the snail where they fit). The three early picks made of beats only (quiz right, quiz not this one,
 * day start) are wrapped as effects with their picked sound.
 */
import type { FxEffect } from "./types";
import type { PipBeat } from "../Pip";
import { PIP_MOMENTS } from "../moments";
import { SAMPLE_MOMENTS } from "./samples";

const pick = (moment: string, id: string): FxEffect => {
  const e = SAMPLE_MOMENTS[moment]?.find(x => x.id === id);
  if (!e) throw new Error(`final: no sample ${moment}/${id}`);
  return e;
};
const fromBeats = (moment: string, id: string, sound: string): FxEffect => {
  const o = PIP_MOMENTS.find(m => m.id === moment)!.options.find(x => x.id === id)!;
  const beats = (o.beats ?? []) as PipBeat[];
  return { id, name: o.name, feel: o.feel, ms: o.ms, emitters: [], sounds: [{ name: sound, at: 0, volume: 0.8 }], pip: beats };
};

export const FINAL_MOMENTS: Record<string, FxEffect[]> = {
  "quiz-right": [fromBeats("quiz-right", "quiz-right-b", "lab-pick-ding-a")],
  "quiz-not-this-one": [fromBeats("quiz-not-this-one", "quiz-not-this-one-b", "lab-pick-boop-c")],
  "step-done": [pick("step-done", "sd-tick-it-off")],
  "day-start": [fromBeats("day-start", "day-start-a", "lab-pick-chimeup-b")],
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
  "permission-ask": [pick("permission-ask", "pa-polite-bell")],
};
/** How a moment with several finals uses them (shown in the lab). */
export const FINAL_NOTES: Record<string, string> = {
  "level-up": "All 3 kept: they take turns.",
  "welcome-first-launch": "A and B both kept: used by context.",
  "waiting-empty": "Sand timer mostly; goldfish and snail where they fit.",
  "error-safe": "Shows with its words: your work is safe.",
};
