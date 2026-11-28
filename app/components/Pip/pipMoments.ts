/**
 * Pip's moments that play OVER a screen (PipMomentHost, showPipMoment). The founder's final animations (Moments lab,
 * 2026-11-28; momentFx.ts) and the approved placement (MOMENTS-PLACEMENT.md, option A for all 24).
 * A moment = Pip comes in (PIP_IN), the moment's effect (its props, background, sounds and Pip's own acting), the moment's
 * words, Pip leaves (PIP_OUT).
 *
 * The other moments play IN their screen, where Pip already stands: the quiz answer sheet (PipPeek), the day's steps
 * (DayFrame), day done and further than ever (DayDone), the day not open yet, the practice done page, Home, the welcome
 * screen, the error sheet, loading and empty lists (PipMomentSpot), the notification ask (NotificationAsk).
 */
import type { PipBeat, PipFace } from "./Pip";
import type { MomentFxId } from "./fx/momentFx";

export type PipMomentId =
  | "onboarding-done" | "program-finished" | "purchase-done" | "level-up" | "mood-checkin" | "first-call-done" | "buddy-paired"
  | "recording-problem" | "avatar-saved";

export type PipMomentDef = {
  id: PipMomentId;
  /** The final animation (momentFx.ts); played with its usage rule (level-up takes turns). */
  fx?: MomentFxId;
  /** Avatar saved only: an older effect from fx/library.ts. */
  effect?: string;
  /** Pip's own beats when there is no effect. */
  beats?: PipBeat[];
  /** The face he comes in with (default calm). */
  face?: PipFace;
  /** The moment's words: the screen's own where the app has them, else lines the founder approved. */
  title?: string;
  body?: string;
  source?: string;
  /** "dim": rare big moments get the screen to themselves; "none": the screen stays as it is and stays usable. */
  backdrop: "dim" | "none";
  /** "user": the user's own kit avatar plays the moment in Pip's place (the avatar just saved). Default: Pip. */
  figure?: "pip" | "user";
};

export const PIP_MOMENTS: PipMomentDef[] = [
  { id: "onboarding-done", fx: "onboarding-done", title: "You're all set!", body: "Your first day is ready when you are.", source: "OnboardingDone.tsx; approved line", backdrop: "dim" },
  { id: "program-finished", fx: "program-finished", title: "That is the program done", body: "Your goals stay with you. Nothing here disappears.", source: "GoalsReport.tsx", backdrop: "dim" },
  { id: "purchase-done", fx: "purchase-done", title: "You're in", body: "Your program is unlocked. You can start now.", source: "ProgramDetail.tsx", backdrop: "dim" },
  // a new stage (only 4 ever): over the dimmed screen. A level on the done page plays there (DonePractice), not here.
  { id: "level-up", fx: "level-up", title: "New stage", body: "You reached the next stage of your practice.", source: "approved line", backdrop: "dim" },
  { id: "mood-checkin", fx: "mood-checkin", title: "Mood recorded", body: "Your check-in is saved.", source: "FollowUp.tsx; approved line", backdrop: "none" },
  { id: "first-call-done", fx: "first-call-done", title: "Your first call is done", body: "Next, a moment to note how it felt.", source: "approved line", backdrop: "dim" },
  { id: "buddy-paired", fx: "buddy-paired", title: "You're paired", body: "You and your buddy can now see each other's posts.", source: "approved line", backdrop: "none" },
  // after the mic dialog's OK, on the recorder screen (placement P15)
  { id: "recording-problem", fx: "recording-problem", title: "Let's try the mic again.", source: "approved line (P15)", backdrop: "none" },
  // Avatar saved: the user's own avatar plays it (founder 2026-11-27); not one of the 24 moments, unchanged
  { id: "avatar-saved", effect: "sticker-snap", title: "Avatar saved", source: "approved line", backdrop: "dim", figure: "user" },
];

export const pipMoment = (id: PipMomentId) => PIP_MOMENTS.find(m => m.id === id)!;
