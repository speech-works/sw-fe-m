/**
 * Pip's moments in the app (phase 3). The founder picked one effect per moment on 2026-11-26 (moments review page, M1 to M13).
 * A moment = Pip comes in (PIP_IN), the effect (or his own beats when there is no effect), the moment's text, Pip leaves (PIP_OUT).
 * Text: the screen's own words where the app already has them; new lines approved by the founder (D2 A).
 * Not a moment on purpose (the app's rules say no celebration): a program step done, the daily goal tick, the furthest-ever
 * moment, a recording saved, the day-locked screen.
 */
import type { PipBeat, PipFace } from "./Pip";

export type PipMomentId =
  | "onboarding-done" | "welcome" | "quiz-right" | "quiz-not-this" | "day-done" | "program-done" | "program-bought"
  | "practice-done" | "new-stage" | "mood-saved" | "first-call-done" | "avatar-saved" | "buddy-paired";

export type PipMomentDef = {
  id: PipMomentId;
  /** Review page id (M1...). */
  ref: string;
  name: string;
  /** An effect from fx/library.ts, or none: then `beats` act it out. */
  effect?: string;
  /** Pip's own beats (ms after he has come in). With no effect they are the whole moment; with an effect they replace
   *  the effect's own beats for Pip (its particles and sounds still play). */
  beats?: PipBeat[];
  /** The face he comes in with (default calm). */
  face?: PipFace;
  /** The moment's text. None when the screen already says it right next to Pip (the quiz's answer sheet). */
  title?: string;
  body?: string;
  /** Where the text comes from: the app's own words, or a line the founder approved (2026-11-26, D2 A). */
  source?: string;
  /** "dim": rare big moments get the screen to themselves; "none": frequent ones play over the screen as it is (D1 A). */
  backdrop: "dim" | "none";
};

export const PIP_MOMENTS: PipMomentDef[] = [
  { id: "onboarding-done", ref: "M1", name: "Onboarding done", effect: "fireworks", title: "You're all set!", body: "Your first day is ready when you are.", source: "title: OnboardingDone.tsx; body: approved line", backdrop: "dim" },
  { id: "welcome", ref: "M2", name: "First launch welcome", beats: [{ at: 0, move: "h-wave", face: "smile", haptic: "light" }], title: "Welcome to Speechworks", body: "A few questions first, then your first day.", source: "approved line", backdrop: "dim" },
  // The two quiz answers (program screens system, 2026-11-27). Right: the spark pop as built, Pip proud with ONE nod.
  // Not this one: he comes up thinking and puts a hand to his chin once (h-chin, 340 + 3800 ms), no bounce, never a
  // laugh or a smile at a wrong pick; then he keeps thinking.
  { id: "quiz-right", ref: "M3", name: "Quiz answer right", effect: "shockwave", face: "proud", beats: [{ at: 0, face: "proud", body: "nod", haptic: "light" }, { at: 2400, face: "warm" }], backdrop: "none" },
  { id: "quiz-not-this", ref: "M4", name: "Quiz answer not this one", face: "thinking", beats: [{ at: 0, face: "thinking" }, { at: 500, move: "h-chin" }, { at: 500 + 340 + 3800 + 80, face: "thinking" }], backdrop: "none" },
  { id: "day-done", ref: "M5", name: "Day done", effect: "star-burst", title: "Day 3 done", source: "dayDoneTitle() in dayLock.ts (the day number is the real one)", backdrop: "none" },
  { id: "program-done", ref: "M6", name: "Program finished", effect: "gold-shower", title: "That is the program done", body: "Your goals stay with you. Nothing here disappears.", source: "GoalsReport.tsx", backdrop: "dim" },
  { id: "program-bought", ref: "M7", name: "Program bought", effect: "sticker-gift", title: "You're in", body: "Your program is unlocked. You can start now.", source: "ProgramDetail.tsx", backdrop: "dim" },
  { id: "practice-done", ref: "M8", name: "Practice done", effect: "confetti-burst", title: "Great job!", source: "doneTitle.ts", backdrop: "none" },
  { id: "new-stage", ref: "M9", name: "New stage reached", effect: "spark-fountain", title: "New stage", body: "You reached the next stage of your practice.", source: "approved line", backdrop: "dim" },
  { id: "mood-saved", ref: "M10", name: "Mood check-in saved", effect: "speech-heart", title: "Mood recorded", body: "Your check-in is saved.", source: "title: FollowUp.tsx; body: approved line (shortened)", backdrop: "none" },
  { id: "first-call-done", ref: "M11", name: "First AI call done", beats: [{ at: 0, face: "warm", body: "nod" }, { at: 1400, face: "smile", body: "settle" }, { at: 2600, face: "calm" }], title: "Your first call is done", body: "Next, a moment to note how it felt.", source: "approved line", backdrop: "dim" },
  { id: "avatar-saved", ref: "M12", name: "Avatar saved", effect: "sticker-snap", title: "Avatar saved", source: "approved line", backdrop: "none" },
  { id: "buddy-paired", ref: "M13", name: "Buddy paired", effect: "hearts", title: "You're paired", body: "You and your buddy can now see each other's posts.", source: "approved line", backdrop: "none" },
];

export const pipMoment = (id: PipMomentId) => PIP_MOMENTS.find(m => m.id === id)!;
