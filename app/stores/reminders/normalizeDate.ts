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
