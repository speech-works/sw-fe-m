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

/** How each axis's number should be read aloud. */
const UNIT: Record<string, { one: string; many: string }> = {
  [GrowthAxis.BRAVER]: { one: "time", many: "times" },
  // Not "times". Wider is a breadth count of distinct speech acts.
  [GrowthAxis.WIDER]: { one: "kind of situation", many: "kinds of situation" },
  // Not "times". Regular is a count of days you turned up.
  [GrowthAxis.REGULAR]: { one: "day", many: "days" },
  [GrowthAxis.STEADIER]: { one: "time", many: "times" },
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
 * The whole line for one axis: "6 times · last on Tuesday".
 *
 * A zero never reaches here as "0 times" — the caller shows the per-axis
 * invitation instead, because "0 times" under "taking on harder things" is a
 * verdict about a person and the invitation is a door.
 */
export function totalLine(
  axis: GrowthAxis | string,
  count: number,
  lastAt: string | null,
): string {
  const when = lastAtPhrase(lastAt);
  return when ? `${countPhrase(axis, count)} · last ${when}` : countPhrase(axis, count);
}

/**
 * What would move this axis next, for somebody it has never moved for.
 *
 * Names concrete things in the app rather than restating the subtitle, because
 * the question a stuck user is actually asking is "what do I press". Finisher
 * is absent for the same reason it is absent from VISIBLE_AXES.
 */
export const FIRST_STEP: Record<string, string> = {
  [GrowthAxis.BRAVER]:
    "Not yet — a phone call, an interview or a real-life challenge would be the first.",
  [GrowthAxis.WIDER]:
    "Not yet — this one moves when you do something out in the world.",
  [GrowthAxis.REGULAR]: "Not yet — anything at all counts here.",
};
