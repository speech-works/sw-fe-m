import {
  GoalReport,
  GoalReportStyle,
} from "../../../api/programGoals/types";

/**
 * The three answers, in the words each program uses.
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
  Record<GoalReport, string>
> = {
  /** Eight programs. The plain case: did you do the thing you named? */
  did_it: {
    FULL: "Did it",
    PARTIAL: "Something smaller",
    NONE: "Not yet",
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
export const REPORT_ORDER: GoalReport[] = ["FULL", "PARTIAL", "NONE"];
