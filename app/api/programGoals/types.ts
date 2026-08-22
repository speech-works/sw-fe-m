/**
 * The goal harness: one question a program asks before it starts, and the
 * report it will not close without.
 *
 * Every field here is server-owned. The app renders the copy it is given and
 * never composes a question, a verb or a button label of its own.
 */

/** What the user said happened to one goal. Labels come from `reportStyle`. */
export type GoalReport = "FULL" | "PARTIAL" | "NONE";

/**
 * "deed" for the eight programs that ask what somebody will do.
 * "prediction" for the one that asks what they are afraid will happen.
 */
export type GoalAnswerType = "deed" | "prediction";

/** Which three labels the report screen shows. See REPORT_LABELS. */
export type GoalReportStyle = "did_it" | "still_true" | "came_true";

export interface GoalHarness {
  /** The question, exactly as written. Never edited on the device. */
  question: string;
  /** Wraps the answer: "Call {}" plus "the landlord" is "Call the landlord". */
  verb: string;
  /** One word for what they are naming. Drives the cue rule. */
  noun: string;
  /** How many answers. 3 everywhere except Word Swap, which asks 5. */
  count: number;
  /** Tappable examples above the keyboard. Without them the field is blank. */
  cues: string[];
  placeholder: string;
  /** "Which call would you make first?" Their order, never ours. */
  orderPrompt: string;
  /** Shown in grey under the middle report button. */
  smallerExample: string;
  reportPrompt: string;
  reportStyle: GoalReportStyle;
  answerType: GoalAnswerType;
  version: number;
}

export interface ProgramGoal {
  id: string;
  /** What the user typed, exactly. */
  noun: string;
  /** What they committed to: verb and noun already joined by the server. */
  text: string;
  rank: number;
  report: GoalReport | null;
  reportedAt: string | null;
  closedAt: string | null;
  answerType: GoalAnswerType;
  reportStyle: GoalReportStyle;
}

export interface ProgramGoalState {
  /** Null when the program deliberately asks nothing. */
  harness: GoalHarness | null;
  runIndex: number;
  goals: ProgramGoal[];
  /** Ask the three screens. True only before the first module is finished. */
  needsAsk: boolean;
  /** Show the report gate. True only once the work is done. */
  needsReport: boolean;
}

export interface GoalBlock {
  packId: string;
  packTitle: string;
  question: string;
  goals: ProgramGoal[];
}

/** Four counts and one sentence. The Home row, and nothing more. */
export interface ReachSummary {
  /** Every goal ever named, across programs and reruns. */
  total: number;
  /**
   * Deeds they said they did. NEVER predictions: FULL on a prediction means the
   * feared thing happened, and that is not an achievement.
   */
  done: number;
  /** Answered, but not finished. These keep surfacing. */
  waiting: number;
  /** The newest thing they did, in their own words. */
  latestDone: ProgramGoal | null;
  /** Shown instead when nothing is done yet, so the row is never empty. */
  oldestWaiting: ProgramGoal | null;
}
