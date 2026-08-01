/**
 * Coerce a stored reminder `date` to the `YYYY-MM-DD` contract.
 *
 * Two screens once wrote two formats — the Academy reminder wrote ISO, the
 * Settings screen wrote MM/DD/YYYY — and only ISO survives the `split("-")`
 * every consumer uses. A slashed value parsed to NaN, so the trigger silently
 * never fired while the row still displayed as ON.
 *
 * Lives in its own module (rather than beside the store) so it can be tested
 * without pulling in the store's transitive native dependencies.
 */
/**
 * When a ONE_TIME reminder is due, as epoch ms — or null if it can't be read.
 *
 * Three places used to parse `date`/`time` inline and compare to now, which is
 * how the MM/DD/YYYY bug managed to mean three slightly different things at
 * once. One reader, one answer.
 *
 * Returns null rather than NaN so callers must decide what a malformed row
 * means instead of silently getting `false` from every comparison.
 */
export function reminderFiresAt(
  date: string | undefined,
  time: string | undefined,
): number | null {
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  if ([y, m, d, h, min].some(Number.isNaN)) return null;
  const t = new Date(y, m - 1, d, h, min).getTime();
  return Number.isNaN(t) ? null : t;
}

/** A one-time reminder whose moment has gone — or whose date is unreadable. */
export function isSpentOneTime(
  rem: { type: string; date?: string; time?: string },
  now: number,
): boolean {
  if (rem.type !== "ONE_TIME") return false;
  const at = reminderFiresAt(rem.date, rem.time);
  return at === null || at <= now;
}

export function normalizeReminderDate(date: string | undefined): string {
  if (!date) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;

  const slashed = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashed) {
    const [, month, day, year] = slashed;
    return `${year}-${month}-${day}`;
  }

  // Unrecognized: return "" rather than a value that parses to NaN, so the
  // reminder reads as malformed once instead of silently never firing.
  console.warn(`[Reminders] unrecognized date format discarded: ${date}`);
  return "";
}
