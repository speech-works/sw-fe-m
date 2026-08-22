import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";
import { GrowthAxis } from "../../api/dailyPlan";

/**
 * ============================================================================
 * PUTTING A COUNT INTO WORDS WITHOUT CHANGING WHAT IT MEANS
 * ----------------------------------------------------------------------------
 * THE THREE AXES DO NOT COUNT THE SAME UNIT, so they cannot share a noun.
 * The server counts Braver by attempt, Wider by DISTINCT speech act and Regular
 * by DISTINCT day — deliberately, because "thirty phone calls" is not a wider
 * life and "six drills on Tuesday" is not six days of turning up. Rendering all
 * three as "N times" would quietly restate them as one unit and make two of the
 * three false: "2 times" under a line that says "how much of your life is back
 * in play" reads as two attempts, not two kinds of situation.
 *
 * NOTHING HERE IS A DURATION OR A RATE. Every phrase is a plain count or a
 * plain date, so nothing can shrink when somebody has a bad week.
 * ============================================================================
 */

/**
 * How each axis's number should be read aloud.
 *
 * EVERY UNIT SAYS WHAT IT COUNTS, so the phrase stands on its own with no axis
 * name beside it. That is the point: "11 times" needs "Braver" in front of it
 * to mean anything, and Braver is a word we invented and the reader has to be
 * taught. "11 hard things done" needs nothing.
 *
 * The progress report still shows the names, because that is the one screen
 * somebody opens on purpose and it prints the definition next to each. A chip
 * that flashes up after a practice does not get to teach vocabulary.
 */
const UNIT: Record<string, { one: string; many: string }> = {
  [GrowthAxis.BRAVER]: { one: "hard thing done", many: "hard things done" },
  // Not "times". Wider is a breadth count of distinct speech acts.
  [GrowthAxis.WIDER]: { one: "kind of situation", many: "kinds of situation" },
  // Not "times". Regular is a count of days you turned up.
  [GrowthAxis.REGULAR]: { one: "day practised", many: "days practised" },
  [GrowthAxis.STEADIER]: { one: "time you saw it through", many: "times you saw it through" },
};

export function countPhrase(axis: GrowthAxis | string, count: number): string {
  const unit = UNIT[axis] ?? { one: "time", many: "times" };
  return `${count} ${count === 1 ? unit.one : unit.many}`;
}

/**
 * When it last moved, as something a person would actually say.
 *
 * Recency softens on its own — "9 days ago" is a fact, and a fact does not need
 * a warning colour to be understood. There is deliberately no "X days ago"
 * branch beyond a week: past that it becomes a date, which reads as history
 * rather than as a countdown since you last managed it.
 *
 * Returns null when there is nothing to date, so the caller renders the
 * invitation instead of an empty half-sentence.
 */
export function lastAtPhrase(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  // Inside the last week, the weekday is the most human handle: "on Tuesday"
  // is instantly placeable in a way "on 28 Jul" is not.
  if (differenceInCalendarDays(new Date(), date) < 7) {
    return `on ${format(date, "EEEE")}`;
  }
  return `on ${format(date, "d MMM")}`;
}

/**
 * What would move this axis next, for somebody it has never moved for.
 *
 * NAMES THINGS THAT EXIST AND ARE FINDABLE. Both of the first attempts were
 * wrong rather than merely vague:
 *
 *   "Speak to someone outside the app" — false in both directions. Talking to
 *   a real person moves NOTHING unless it is logged through an Exposure
 *   activity, so it promised credit we cannot detect; and it implied the
 *   in-app interviews and social challenges, which DO move Wider, do not
 *   count. It described the spirit of the axis instead of its mechanics.
 *
 *   "Try a phone call or a challenge" — "a challenge" names nothing. The app
 *   has social challenges, real-life challenges AND a separate buddy weekly
 *   quest, so the one word points at three different things, one of which
 *   moves neither axis.
 *
 * Every activity behind Braver and Wider lives under Exposure, so the copy
 * names the two most recognisable ones rather than the category — "phone call"
 * and "interview" are things a person pictures; "Exposure" is a menu heading.
 *
 * NO "None yet." PREFIX. The row shows no number, which already says it; the
 * words are for what to do about it. Finisher is absent for the same reason it
 * is absent from VISIBLE_AXES.
 */
export const FIRST_STEP: Record<string, string> = {
  [GrowthAxis.BRAVER]: "Try a phone call or an interview.",
  // The axis counts DISTINCT kinds, so the prompt is about variety rather
  // than volume — doing another phone call moves Braver but not this.
  [GrowthAxis.WIDER]: "Try a new kind of situation.",
  [GrowthAxis.REGULAR]: "Any practice counts.",
};
