import type { WeekReviewEntry, WeekReviewWillingness } from "../../api/packs/types";

/**
 * The willingness line of the week review: the first number and today's.
 *
 * `firstDay` and `latestDay` are the program days the two numbers were saved
 * on. The server reads each answer's day from the module it was given in. A
 * number is "Today" only when it was saved on a later day than the first.
 * Somebody who has answered only on day 1 used to read "Willing, day 1: 4 out
 * of 10. Today: 4 out of 10." They now read the day 1 number alone.
 */
export function willingnessLine(
  w: WeekReviewWillingness | undefined,
): string | null {
  if (!w) return null;
  const hasFirst = w.first !== null && w.first !== undefined;
  const hasLatest = w.latest !== null && w.latest !== undefined;
  const later =
    typeof w.latestDay === "number" &&
    typeof w.firstDay === "number" &&
    w.latestDay > w.firstDay;
  const firstPart = hasFirst
    ? `Willing, day ${w.firstDay ?? 1}: ${w.first} out of 10.`
    : null;
  const latestPart = hasLatest && later ? `Today: ${w.latest} out of 10.` : null;
  if (firstPart && latestPart) return `${firstPart} ${latestPart}`;
  return firstPart ?? latestPart;
}

export type WeekReviewGroup = {
  /** The step title, shown above the lines. Absent when the day has one group. */
  title?: string;
  entries: WeekReviewEntry[];
};

/**
 * One day's lines, split by the step they were logged on.
 *
 * The server sets `group` only on a day that asked the same form on more
 * than one step (Speech Toolkit day 2 logs a trial after each of two tools),
 * and sends a group's lines next to each other in step order. A day with one
 * group, or none, comes back as a single untitled group, so ordinary days look
 * as they always did.
 *
 * maxPerDay caps the whole day on an ordinary day. On a grouped day it caps
 * each group, the same rule the server applies, so the second log is never
 * cut out by the first.
 */
export function groupWeekReviewEntries(
  entries: WeekReviewEntry[],
  maxPerDay: number,
): WeekReviewGroup[] {
  const groups: { key: string | undefined; entries: WeekReviewEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.key === entry.group) last.entries.push(entry);
    else groups.push({ key: entry.group, entries: [entry] });
  }

  const titled = new Set(groups.map((g) => g.key)).size > 1;
  if (!titled) return [{ entries: entries.slice(0, maxPerDay) }];

  return groups.map((g) => ({
    ...(g.key ? { title: g.key } : {}),
    entries: g.entries.slice(0, maxPerDay),
  }));
}
