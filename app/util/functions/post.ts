// util/functions/post.ts
//
// Pure helpers for composing a practice card-post. These decide ELIGIBILITY and
// PRESENTATION (which templates to offer, which fields a user may toggle, a friendly
// stigma-safe default name) — they never derive the private facts themselves. The
// server owns the real payload values and the fluency-exclusion guardrail.
import {
  PracticeActivity,
  PracticeActivityContentType,
} from "../../api/practiceActivities/types";
import { ActivityKind, PracticePayloadField, TemplateId } from "../../api/threads/types";

/** Map a completed activity to its share "kind". */
export const activityKindFor = (activity: PracticeActivity): ActivityKind =>
  activityKindFromContentType(activity.contentType);

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

/** Templates offered for an activity, best-first. Every list ends with `minimal` (custom). */
export const templatesForActivity = (
  kind: ActivityKind,
): TemplateId[] => {
  switch (kind) {
    case "EXPOSURE_PRACTICE":
      // The courage of facing it is the story — never the score.
      return ["courage", "milestone", "streak", "minimal"];
    case "COGNITIVE_PRACTICE":
      return ["calm", "streak", "milestone", "minimal"];
    case "READING_PRACTICE":
      return ["streak", "milestone", "calm", "minimal"];
    case "FUN_PRACTICE":
      return ["streak", "milestone", "minimal"];
    case "TECHNIQUE_PRACTICE":
    default:
      return ["milestone", "streak", "minimal"];
  }
};

/** Safe payload fields a user may toggle on/off for this activity. */
export const candidateFieldsFor = (
  kind: ActivityKind,
): PracticePayloadField[] => {
  const base: PracticePayloadField[] = [
    "activityName",
    "durationSeconds",
    "timeOfDay",
    "showedUp",
    "streakDays",
    "xpEarned",
    "leveledUp",
    "levelStageTitle",
    "milestoneLabel",
  ];
  // growthDelta is meaningful where effort maps to courage/confidence axes.
  if (kind === "EXPOSURE_PRACTICE" || kind === "COGNITIVE_PRACTICE") {
    return [...base, "growthDelta"];
  }
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
