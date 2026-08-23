/**
 * WHAT A DAY-LOCKED SCREEN IS ALLOWED TO SAY.
 *
 * The screen this feeds used to say one fixed thing: "This day of the
 * programme opens later. Today's work is waiting for you on the pack page."
 * Both halves of the second sentence were usually false.
 *
 * You reach a locked day by asking for a day beyond the clock, and the ordinary
 * way to be standing there is to have just FINISHED today and reached for
 * tomorrow. So "today's work is waiting" was told to people who had completed
 * it seconds earlier, and it sent them to a pack page that carries no work at
 * all (ProgramDetail's owned branch is a read-only day list that ends with "You
 * own this. It's unlocked.").
 *
 * The fix is not better wording, it is asking first. `GET /packs/:id/progress`
 * has always returned `currentDay` and `nextIncompleteDay`; this module turns
 * them into a sentence that is true in each of the three cases:
 *
 *   1. Caught up      — everything up to the clock is done. Close the day.
 *   2. Behind         — an EARLIER day is still open (missed days stay open,
 *                       by design). Name it and offer to go there.
 *   3. Unknown        — the progress call failed. Say only the one thing that
 *                       cannot be wrong: this day opens later.
 *
 * Pure and separate from the screen so the three cases can be tested without a
 * navigator, the same way `packErrors` is.
 */

export interface DayLockState {
  /** The day they reached for. Null if progress didn't name it. */
  lockedDay: number | null;
  /** Which day is open by the clock. */
  currentDay: number | null;
  /** Earliest day with unfinished work, which may be behind `currentDay`. */
  nextIncompleteDay: number | null;
  /** A module inside `nextIncompleteDay` to send them to, when one is open. */
  openModuleId: string | null;
  /**
   * When the next day unlocks, from `PackProgress.nextDayOpensAt`. Optional:
   * an older backend does not send it and the message falls back to counting
   * days.
   */
  nextDayOpensAt?: Date | string | null;
}

export type DayLockAction =
  /** Go do the earlier day that is still open. */
  | "catchUp"
  /** Leave the arc. Nothing here to do right now. */
  | "leave";

export interface DayLockMessage {
  title: string;
  body: string;
  actionLabel: string;
  action: DayLockAction;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long until the next day opens, in words, rounded UP.
 *
 * Always up. A wait rounded down promises the day is ready before it is, and
 * sends somebody back to the locked screen they just left. Rounded up, the
 * worst case is that they arrive to find it already open.
 *
 * Returns null when we were not told the instant, so the caller can fall back
 * to counting days.
 */
function waitPhrase(opensAt: Date | string | null | undefined, now: number): string | null {
  if (!opensAt) return null;
  const target = new Date(opensAt).getTime();
  if (!Number.isFinite(target)) return null;
  const left = target - now;
  // Already open, or so close that any number would be stale before it is read.
  if (left <= MINUTE_MS) return "in a moment";
  if (left < HOUR_MS) {
    const m = Math.ceil(left / MINUTE_MS);
    // Rounding up can land on 60, and "in 60 minutes" is a thing nobody says.
    if (m >= 60) return "in 1 hour";
    return `in ${m} ${m === 1 ? "minute" : "minutes"}`;
  }
  if (left < DAY_MS) {
    const h = Math.ceil(left / HOUR_MS);
    return `in ${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = Math.ceil(left / DAY_MS);
  return `in ${d} ${d === 1 ? "day" : "days"}`;
}

/**
 * "opens in 20 hours" / "opens in 3 days" / "opens later" — never a guess.
 *
 * It used to say "opens tomorrow" for the one-day case, and that was wrong in
 * two ways at once. The gate is 24 hours from when the day was started, not a
 * calendar boundary, so a day begun at 9pm opens the next one at 9pm rather
 * than at midnight. And anybody reading it after midnight is already IN
 * tomorrow, and is being told to wait for a day that has, as far as they can
 * tell, arrived. Both go away once the app says how LONG instead of when.
 *
 * `opensAt` comes from the server (`PackProgress.nextDayOpensAt`) and is never
 * derived here: the same arithmetic held in two places is how a wait ends up
 * disagreeing with the lock it describes. Without it we count days, as before.
 */
function opensPhrase(
  lockedDay: number | null,
  currentDay: number | null,
  opensAt?: Date | string | null,
  now: number = Date.now(),
): string {
  const day = lockedDay == null ? "This day" : `Day ${lockedDay}`;
  const wait = waitPhrase(opensAt, now);
  if (wait) return `${day} opens ${wait}.`;

  if (lockedDay == null || currentDay == null) return "This day opens later.";
  const daysAway = lockedDay - currentDay;
  if (daysAway <= 0) {
    // Shouldn't happen (the day would be open), but claiming a wait for a
    // day that is already open is exactly the class of lie this module exists
    // to stop.
    return `Day ${lockedDay} opens later.`;
  }
  if (daysAway === 1) return `Day ${lockedDay} opens in a day.`;
  return `Day ${lockedDay} opens in ${daysAway} days.`;
}

export function dayLockMessage(state: DayLockState | null): DayLockMessage {
  // CASE 3 — we don't know. The old copy's failure was asserting through
  // ignorance, so the fallback asserts nothing beyond the 403 itself.
  if (!state || state.currentDay == null) {
    return {
      title: "Not yet",
      body: "This day of the programme opens later.",
      actionLabel: "Go back",
      action: "leave",
    };
  }

  const { lockedDay, currentDay, nextIncompleteDay, openModuleId } = state;
  const opens = opensPhrase(lockedDay, currentDay, state.nextDayOpensAt);

  const caughtUp =
    nextIncompleteDay == null || nextIncompleteDay > currentDay;

  // CASE 1 — every day up to the clock is finished. They are not blocked, they
  // are done. Say so, because "not yet" reads as a refusal to someone who has
  // just earned the opposite.
  if (caughtUp) {
    return {
      title: "That's today done",
      body: opens,
      actionLabel: "Done for today",
      action: "leave",
    };
  }

  // CASE 2 — there is real work behind them. Name the day rather than pointing
  // vaguely at a page, and only offer to go there if we actually have a module
  // to open.
  const behindBody = `${opens} Day ${nextIncompleteDay} is still open.`;

  if (openModuleId) {
    return {
      title: "Not yet",
      body: behindBody,
      actionLabel: `Go to day ${nextIncompleteDay}`,
      action: "catchUp",
    };
  }

  return {
    title: "Not yet",
    body: behindBody,
    actionLabel: "Go back",
    action: "leave",
  };
}

/**
 * The line the SUCCESS screen shows when the day they just finished was the
 * last open one. Same job as `dayLockMessage`, one step earlier: this is what
 * the app says instead of offering a "next module" that cannot open yet.
 */
export function dayCloseLine(state: {
  finishedDay: number | null;
  nextDay: number | null;
  currentDay: number | null;
  /** From `PackProgress.nextDayOpensAt`. Optional; see `opensPhrase`. */
  nextDayOpensAt?: Date | string | null;
}): string {
  // No "Day N done" prefix: "opens in 20 hours" already says today is done.
  // A day open finished it, so naming it again was the same fact twice.
  return opensPhrase(state.nextDay, state.currentDay, state.nextDayOpensAt);
}
