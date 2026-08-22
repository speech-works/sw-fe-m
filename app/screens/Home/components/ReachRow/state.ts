import { ProgramGoal, ReachSummary } from "../../../../api/programGoals/types";

/**
 * How bright the row is, and whether it is lit at all.
 *
 * ── THE LIGHT HAS TO EARN ITS WAY ON ───────────────────────────────────────
 * A halo is a celebration, and most of the states below are not celebrations.
 * A green glow over "you have done none of them yet" is the app being pleased
 * with itself at somebody's expense.
 *
 * So the rule is: the halo appears only when something was actually DONE, and
 * strengthens when everything was. Its absence is a signal too.
 *
 * `warm` is the one exception. A program still running has nothing to
 * celebrate and nothing to apologise for, so it takes the brand hue rather than
 * the success one: the row reads as live without claiming an outcome.
 */
export type ReachGlow = "none" | "warm" | "on" | "strong";

export interface ReachRowState {
  /** Which case this is. Only for tests and analytics; nothing renders it. */
  kind:
    | "empty"
    | "running"
    | "none_done"
    | "some_done"
    | "all_done"
    | "predictions";
  eyebrow: string;
  /** The big line. Their sentence, except in the two states that have none. */
  said: string;
  /** One short line under the dots. Empty when the state carries a button. */
  sub: string;
  glow: ReachGlow;
  /** One dot per goal, filled for done. Empty past the point they stop counting. */
  dots: { total: number; done: number };
  /** The empty state is the only one that asks for anything. */
  cta: string | null;
}

/**
 * Past this many, dots stop being countable and become a stripe. The row keeps
 * the sentence and drops them rather than printing confetti.
 */
export const MAX_DOTS = 8;

const goalText = (g: ProgramGoal | null): string => g?.text ?? "";

/**
 * ===========================================================================
 * ONE FUNCTION, NINE STATES
 * ---------------------------------------------------------------------------
 * Kept out of the component because the states are the hard part, not the
 * markup: which of them may be lit, which may print a count, and which two have
 * no sentence to show at all. All of that is testable here and invisible in a
 * screenshot.
 *
 * ── WORDS THAT NEVER APPEAR ────────────────────────────────────────────────
 * complete, progress, achievement, streak, score, percent, well done. Counts
 * are written out ("Two done"), never as ratios or percentages: these are real
 * conversations somebody had, not a checklist reaching sixty-seven per cent.
 * ===========================================================================
 */
export function resolveReachRow(
  summary: ReachSummary | null,
): ReachRowState | null {
  if (!summary) return null;

  const { total, done, waiting, predictions } = summary;

  // 1 · Never set one. The only state that explains instead of reporting, and
  // the only one with a button. No count: zero of zero is not worth printing.
  if (total === 0) {
    return {
      kind: "empty",
      eyebrow: "REACH",
      said: "What you want to do outside the app",
      sub: "",
      glow: "none",
      dots: { total: 0, done: 0 },
      cta: "See how it works",
    };
  }

  // 2 · Fears, not deeds, and nothing else to go on.
  //
  // Checked before everything below because this person looks empty to every
  // other test: no done deed, nothing waiting, nothing unreported. No green and
  // no praise either — nothing here was done, so the row points at the record.
  if (predictions === total && !summary.latestDone && !summary.oldestWaiting) {
    return {
      kind: "predictions",
      eyebrow: "WHAT YOU EXPECTED",
      said: `You named ${countWord(total)} things you were afraid of`,
      sub: "See what actually happened",
      glow: "none",
      dots: { total: 0, done: 0 },
      cta: null,
    };
  }

  // 3 · Everything they named, done.
  if (done > 0 && done === total) {
    return {
      kind: "all_done",
      eyebrow: total === 1 ? "YOU DID IT" : `ALL ${countWord(total).toUpperCase()}`,
      said: goalText(summary.latestDone),
      sub: "Everything you set out to do.",
      glow: "strong",
      dots: { total, done },
      cta: null,
    };
  }

  // 4 · Some done.
  if (done > 0) {
    return {
      kind: "some_done",
      eyebrow: "YOU DID THIS",
      said: goalText(summary.latestDone),
      sub: subForSomeDone(done, total, waiting),
      glow: "on",
      dots: { total, done },
      cta: null,
    };
  }

  // 5 · Answered, and none of them done.
  //
  // The state that decides whether anybody trusts this feature. No glow, no
  // count, and the only sentence is permission. "Not yet" is a state, not a
  // debt, and the app has to behave as though it believes that.
  if (waiting > 0) {
    return {
      kind: "none_done",
      eyebrow: "STILL ON YOUR LIST",
      said: goalText(summary.oldestWaiting),
      sub: "No rush. They stay here.",
      glow: "none",
      dots: { total, done: 0 },
      cta: null,
    };
  }

  // 6 · Set, and the program is still running. Nothing answered yet, so the
  // light is the brand hue: live, but claiming nothing.
  return {
    kind: "running",
    eyebrow: "ON YOUR LIST",
    said: goalText(summary.oldestUnreported),
    sub: `You wrote ${countWord(total)} of these on day one`,
    glow: "warm",
    dots: { total, done: 0 },
    cta: null,
  };
}

/**
 * "Your first" rather than "1 of 3". It marks a BEGINNING instead of a
 * fraction, and it reads the same whether somebody has three goals or ten.
 */
function subForSomeDone(done: number, total: number, waiting: number): string {
  const left = total - done;
  if (done === 1) {
    return left === 1
      ? "Your first. One more when you want it."
      : `Your first. ${capitalise(countWord(left))} more when you want them.`;
  }
  if (waiting === 0 && left > 0) {
    // Done some, and the rest have not been answered at all yet.
    return `${capitalise(countWord(done))} done so far.`;
  }
  return left === 1
    ? `${capitalise(countWord(done))} done. One still on your list.`
    : `${capitalise(countWord(done))} done. ${capitalise(countWord(left))} still on your list.`;
}

const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** Small numbers read better as words in a sentence. Past ten, use the figure. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
