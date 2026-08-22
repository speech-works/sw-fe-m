// util/functions/post.ts
//
// Pure helpers for composing a practice card-post. These decide ELIGIBILITY and
// PRESENTATION (which templates to offer, which fields a user may toggle, a friendly
// stigma-safe default name) — they never derive the private facts themselves. The
// server owns the real payload values and the fluency-exclusion guardrail.
import { PracticeActivityContentType } from "../../api/practiceActivities/types";
import { ActivityKind, PracticePayloadField, TemplateId } from "../../api/threads/types";

/**
 * Map a PracticeActivityContentType (what DonePractice holds) to a ActivityKind.
 * The enum values align 1:1 today; this stays explicit so a future divergence is caught.
 */
export const activityKindFromContentType = (
  contentType?: PracticeActivityContentType,
): ActivityKind => {
  switch (contentType) {
    case PracticeActivityContentType.READING_PRACTICE:
      return "READING_PRACTICE";
    case PracticeActivityContentType.FUN_PRACTICE:
      return "FUN_PRACTICE";
    case PracticeActivityContentType.COGNITIVE_PRACTICE:
      return "COGNITIVE_PRACTICE";
    case PracticeActivityContentType.EXPOSURE_PRACTICE:
      return "EXPOSURE_PRACTICE";
    default:
      // Library technique drills (no PracticeActivityContentType) or unknown.
      return "TECHNIQUE_PRACTICE";
  }
};

/**
 * Templates offered for an activity, best-first. Every list ends with `minimal` (custom).
 *
 * `"streak"` was in four of these five lists and is retired — see the note on
 * `getPostTemplate`. Where it led a list, the next-best template takes its place
 * rather than the list shrinking to two options.
 */
export const templatesForActivity = (
  kind: ActivityKind,
): TemplateId[] => {
  switch (kind) {
    case "EXPOSURE_PRACTICE":
      // The courage of facing it is the story — never the score.
      return ["courage", "milestone", "minimal"];
    case "COGNITIVE_PRACTICE":
      return ["calm", "milestone", "minimal"];
    case "READING_PRACTICE":
      return ["milestone", "calm", "minimal"];
    case "FUN_PRACTICE":
      return ["milestone", "calm", "minimal"];
    case "TECHNIQUE_PRACTICE":
    default:
      return ["milestone", "calm", "minimal"];
  }
};

/**
 * Safe payload fields a user may toggle on/off.
 *
 * Took an `ActivityKind` until `growthDelta` was deleted — that was the only
 * branch, so the list no longer varies by activity. The parameter is gone
 * rather than ignored, because a signature that promises kind-specific results
 * and returns the same array either way is a lie the next reader has to
 * disprove. Re-add it the day a field genuinely depends on the kind.
 */
export const candidateFields = (): PracticePayloadField[] => {
  const base: PracticePayloadField[] = [
    // Journey context first so it leads the "What to show" row when present.
    // These self-gate: the composer only shows a toggle when the preview returns
    // a value, so non-pack activities never surface them. (moduleCompleted /
    // journeyCompleted are NOT here — they're server-emitted milestone facts, not toggles.)
    "journeyTitle",
    "moduleTitle",
    "journeyProgress",
    "activityName",
    "durationSeconds",
    "timeOfDay",
    "showedUp",
    "xpEarned",
    "leveledUp",
    "levelStageTitle",
    "milestoneLabel",
  ];
  return base;
};

/**
 * A friendly, stigma-safe default activity name for the composer's initial state.
 * (The server resolves the authoritative name in the payload; this is a client fallback
 * used before/if the preview resolves.) Prefer any `practiceName` passed from the
 * completion screen over this default.
 */
export const defaultActivityNameForKind = (kind: ActivityKind): string => {
  switch (kind) {
    case "EXPOSURE_PRACTICE":
      return "Faced a challenge";
    case "COGNITIVE_PRACTICE":
      return "A mindful moment";
    case "READING_PRACTICE":
      return "Reading practice";
    case "FUN_PRACTICE":
      return "Fun practice";
    case "TECHNIQUE_PRACTICE":
    default:
      return "Technique practice";
  }
};
