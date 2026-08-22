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

/** "opens tomorrow" / "opens in 3 days" / "opens later" — never a guess. */
function opensPhrase(lockedDay: number | null, currentDay: number | null): string {
  if (lockedDay == null || currentDay == null) return "This day opens later.";
  const daysAway = lockedDay - currentDay;
  if (daysAway <= 0) {
    // Shouldn't happen (the day would be open), but claiming "tomorrow" for a
    // day that is already open is exactly the class of lie this module exists
    // to stop.
    return `Day ${lockedDay} opens later.`;
  }
  if (daysAway === 1) return `Day ${lockedDay} opens tomorrow.`;
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

  const caughtUp =
    nextIncompleteDay == null || nextIncompleteDay > currentDay;

  // CASE 1 — every day up to the clock is finished. They are not blocked, they
  // are done. Say so, because "not yet" reads as a refusal to someone who has
  // just earned the opposite.
  if (caughtUp) {
    return {
      title: "That's today done",
      body: opensPhrase(lockedDay, currentDay),
      actionLabel: "Done for today",
      action: "leave",
    };
  }

  // CASE 2 — there is real work behind them. Name the day rather than pointing
  // vaguely at a page, and only offer to go there if we actually have a module
  // to open.
  const behindBody = `${opensPhrase(lockedDay, currentDay)} Day ${nextIncompleteDay} is still open.`;

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
}): string {
  const { finishedDay, nextDay, currentDay } = state;
  const opens = opensPhrase(nextDay, currentDay);
  if (finishedDay == null) return `That's you for today. ${opens}`;
  return `Day ${finishedDay} done. ${opens}`;
}
