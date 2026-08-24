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

  // `opensAt` is the instant ONE day opens: the day after `currentDay`. Read
  // against any other day it states a wait that is too SHORT, and a wait that
  // is too short sends somebody back to the screen they just left — the exact
  // failure `waitPhrase` rounds up to avoid. So it is only used for the day it
  // actually describes, and the day count below answers for the rest.
  //
  // THIS GUARD IS LIVE, NOT DEFENSIVE. Users reach it today, and it is not
  // about gaps in an arc: every shipped arc runs day 1 to arcDays with one
  // module per day. The day named here is the next INCOMPLETE day, and that is
  // free to sit far ahead of the clock.
  //
  // A restart is how. It nulls `status` on every module row while
  // `firstCompletedAt` survives, so every day the user has ever finished is
  // replayable at once and can be redone the same day, while a day they never
  // finished stays behind the clock. Skip Interview Ready's optional day 10,
  // finish the pack, restart it, replay days 1 to 9 that afternoon:
  // `nextIncompleteDay` is 10 and `currentDay` is 1. `nextDayOpensAt` is when
  // day 2 opens, nine days short of the truth, and InProgressSlide prints that
  // pair as one sentence on the Home card.
  //
  // The SERVER does not promise the two agree either.
  // `PackAccessService.resolveDayState` reads the days the pack really has, "so
  // a gap in the middle is found rather than skipped past", while
  // `nextDayOpensAt` stays `startedAt + currentDay * DAY_MS`.
  //
  // Both-null is left alone: with no days to compare, the timestamp is the best
  // fact available, and "This day opens later" is worse than a close estimate.
  const describesLockedDay =
    lockedDay == null || currentDay == null || lockedDay === currentDay + 1;
  const wait = describesLockedDay ? waitPhrase(opensAt, now) : null;
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

/** The subset of `ModuleProgress` this decision reads. */
export interface NextModuleCandidate {
  moduleId: string;
  orderIndex: number;
  /** Absent on an older backend. Only an explicit `false` means locked. */
  unlocked?: boolean;
  /**
   * The first time this user EVER finished this module, on any run of the pack.
   * `null` means they never have. Absent on an older backend.
   *
   * It is the only field that can tell "never done" apart from "done before,
   * then the pack was restarted", because a restart nulls both `status` and
   * `completedAt`. See UserPackModuleProgress.firstCompletedAt.
   */
  firstCompletedAt?: Date | string | null;
  /**
   * Optional (bonus) modules can be skipped, so a pack can reach COMPLETED
   * without them. Absent reads as mandatory.
   */
  isMandatory?: boolean;
}

/** The pack-level facts the per-module rule needs. Both absent on an older backend. */
export interface OfferablePackContext {
  /** `PackProgress.packStatus`. Only the literal "COMPLETED" changes anything. */
  packStatus?: string | null;
  /** Non-null means this pack is a day-gated arc. */
  arcDays?: number | null;
}

/**
 * WOULD THE SERVER LET THIS PERSON OPEN THIS MODULE RIGHT NOW.
 *
 * One place for the rule, because two screens ask it: the success screen (which
 * module to offer next) and the day list on ProgramDetail (which rows to make
 * tappable). When they disagreed, the day list drew a row that dead-ended.
 *
 * There are two independent reasons the server says no, and they need different
 * fields:
 *
 *  1. The day has not opened yet. `unlocked` answers this.
 *  2. The pack is FINISHED and this module never was. `firstCompletedAt`
 *     answers this, and nothing else can.
 *
 * Both read an absent field as "no opinion", never as a refusal, so an app
 * talking to a backend one deploy behind keeps working the way it did before
 * the field existed.
 */
export function isModuleOfferable(
  module: NextModuleCandidate,
  pack: OfferablePackContext,
): boolean {
  // 1. Tomorrow's day. On a day-gated arc the module at orderIndex+1 is usually
  //    TOMORROW's; offering it dropped the user onto the day-locked screen one
  //    tap after finishing, on a button we drew ourselves.
  if (module.unlocked === false) return false;

  // 2. An unfinished module on a finished pack.
  //
  //    This is the case a comment here used to say could not exist. It said
  //    `unlocked` was the only gate needed because "a pack's status describes
  //    the run, not this module". That is true of a module the user FINISHED,
  //    and it is why a replay is offered freely. It is false for a module they
  //    never finished: an OPTIONAL day can be skipped, so a pack reaches
  //    COMPLETED with that day still undone, and once the pack is finished the
  //    clock sits past every day — so `unlocked` is true for that day too and
  //    cannot filter it. Interview Ready's day 10 is exactly this shape.
  if (pack.packStatus !== "COMPLETED") return true;
  // Only an explicit `null` means "never finished", for the same
  // absent-is-no-opinion reason as `unlocked`.
  if (module.firstCompletedAt !== null) return true;

  // Which unfinished modules the server actually refuses, mirroring
  // PackProgressService.startModule:
  //   - any module on a day-gated arc → PackCompletedError (409). A restart
  //     moves `startedAt`, which re-locks every later day, so it has to be
  //     asked for rather than done silently.
  //   - an optional module on any pack → refused outright.
  // The one case it allows is a MANDATORY module on a pack with no arc: that
  // quietly reopens the pack (the Refresher flow), so keep offering it.
  if (pack.arcDays != null) return false;
  return module.isMandatory !== false;
}

/**
 * THE MODULE THE SUCCESS SCREEN OFFERS NEXT, or null for "no button".
 *
 * The other half of `dayCloseLine`: one of the two always answers, because a
 * screen that offers nothing and says nothing reads as the app having run out
 * of things to say.
 *
 * ── THE TWO TESTS THAT USED TO LIVE HERE ───────────────────────────────────
 * The screen used to skip this decision when the pack was COMPLETED, and to
 * require the next module to be NOT_STARTED. Together they meant that a user
 * repeating a program they had already finished never got this button once, on
 * any module. Every repeated module ended at "Back to Home", and the only route
 * to the next one was Home, then Programs, then the pack, then the day list.
 * That was the whole of a second pass through a program they had paid for.
 *
 * The NOT_STARTED test was simply wrong: a module's status describes what the
 * user did BEFORE, which is not what is being asked.
 *
 * The pack-COMPLETED test was too broad, but it was not pointless, and this
 * comment used to claim it was. It was the only thing standing between a
 * skipped optional day and a button that leads nowhere. `isModuleOfferable`
 * replaces it with the narrow version: on a finished pack, refuse the modules
 * the server refuses, and keep offering every module the user has finished.
 */
export function nextOpenModuleId(
  modules: NextModuleCandidate[],
  finishedOrderIndex: number,
  pack: OfferablePackContext,
): string | null {
  const next = modules.find((m) => m.orderIndex === finishedOrderIndex + 1);
  if (!next) return null;
  return isModuleOfferable(next, pack) ? next.moduleId : null;
}

