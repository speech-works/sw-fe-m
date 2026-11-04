import {
  GoalReport,
  GoalReportStyle,
  ProgramGoal,
} from "../../../api/programGoals/types";

/** The three answers every style has. */
type CoreReport = Exclude<GoalReport, "NO_NEED" | "PLANNED">;

/**
 * The three answers, in the words each program uses, and the fourth ("No
 * need") where the program offers it.
 *
 * ── WHY THIS IS IN THE APP AND NOT THE SEED ────────────────────────────────
 * These are not per-program copy. They are the three faces of one stored value,
 * and `reportStyle` is the contract that picks a set. Putting nine copies in the
 * seed would let two programs of the same style drift apart in wording for no
 * reason, and the database would carry the same three strings nine times.
 *
 * ── FULL IS NOT ALWAYS GOOD ────────────────────────────────────────────────
 * On `came_true`, FULL means the feared thing HAPPENED. Nothing that reads a
 * report may treat FULL as a win without checking the answer type first.
 */
export const REPORT_LABELS: Record<
  GoalReportStyle,
  Record<CoreReport, string> & { NO_NEED?: string; PLANNED?: string }
> = {
  /** The plain case: did you do the thing you named? */
  did_it: {
    FULL: "Did it",
    PARTIAL: "Something smaller",
    NONE: "Not yet",
  },

  /**
   * Art of Disclosure and Hard Conversations (A6, 2026-10-12). Both say that
   * deciding somebody does not need to know, or that a call is not needed, is
   * a finished answer. "No need" closes the goal, so Home does not ask again.
   */
  did_it_no_need: {
    FULL: "Did it",
    PARTIAL: "Something smaller",
    NONE: "Not yet",
    NO_NEED: "No need",
  },

  /**
   * The Art of Disclosure (2026-10-29). Day 7 asks the reader to pick a day for
   * the people they have not told yet, so "Planned" comes with a date picker.
   * The goal stays open; Home waits for that day and a reminder goes out on it.
   */
  did_it_planned: {
    FULL: "Did it",
    PARTIAL: "Something smaller",
    NONE: "Not yet",
    NO_NEED: "No need",
    PLANNED: "Planned",
  },

  /**
   * Dating and Intimacy. That program spends its last day arguing that being
   * pushed into a difficult moment before you are ready can cost you a real
   * relationship. "Did you do it?" would be the deadline it refuses to set, so
   * it asks where the thing has got to instead, and its third answer carries no
   * "yet".
   */
  still_true: {
    FULL: "Said it",
    PARTIAL: "Got closer",
    NONE: "Same as day 1",
  },

  /**
   * Breaking Thought Traps. The user named what they were afraid people would
   * do, so the question is whether it happened, not whether they did it.
   */
  came_true: {
    FULL: "It happened",
    PARTIAL: "Partly",
    NONE: "It did not",
  },
};

/** Left to right, easiest claim last. The order never changes. */
export const REPORT_ORDER: CoreReport[] = ["FULL", "PARTIAL", "NONE"];

/** The answers a goal of this style can get, in order. "No need" goes last. */
export function reportOptions(style: GoalReportStyle): GoalReport[] {
  const labels = REPORT_LABELS[style];
  // "Planned" sits after "Something smaller": a day picked is more than
  // "not yet", and less than done.
  const core: GoalReport[] = labels?.PLANNED
    ? ["FULL", "PARTIAL", "PLANNED", "NONE"]
    : REPORT_ORDER;
  return labels?.NO_NEED ? [...core, "NO_NEED"] : core;
}

/** "YYYY-MM-DD" as a short, local day: "Tue 4 Nov". Empty for anything else. */
export function formatPlannedDay(day: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? "");
  if (!m) return "";
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // By hand: Hermes on iOS returned "" for toLocaleDateString with these
  // options, so the row read "Planned for" with no day. The app is English.
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The answer as one line, with the day for a plan: "Planned for Tue 4 Nov". */
export function reportSummary(goal: Pick<ProgramGoal, "reportStyle" | "report" | "plannedFor">): string {
  if (!goal.report) return "";
  if (goal.report === "PLANNED" && goal.plannedFor) {
    return `Planned for ${formatPlannedDay(goal.plannedFor)}`;
  }
  return reportLabel(goal.reportStyle, goal.report);
}

/** The label for one answer, or "" when this style has no such answer. */
export function reportLabel(style: GoalReportStyle, report: GoalReport): string {
  return REPORT_LABELS[style]?.[report] ?? "";
}

/**
 * The question over the report, in the singular when only one goal is shown.
 * "You named these" over one person read wrong (AoD walkthrough, 2026-11-04).
 * Every program's prompt is written for a list, so only its plural words move.
 */
export function reportTitle(prompt: string, shown: number): string {
  if (shown !== 1) return prompt;
  return prompt
    .replace(/\bthese as things\b/, "this as a thing")
    .replace(/\bnamed these\b/, "named this")
    .replace(/\bWhere are they now\?/, "Where is it now?")
    .replace(/\bDid they happen\?/, "Did it happen?");
}
