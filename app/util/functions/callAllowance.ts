import type { Wallet } from "../../api/users";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CallAllowance {
  /**
   * Corner-pill text, or null when there is nothing good to claim.
   *
   * The pill is a POSITIVE signal only, exactly like the "FREE" badge on the
   * cognitive cards — it says "there is one waiting", never "there isn't".
   * A greyed-out pill was the first attempt and it failed twice over: it
   * disappeared against the dark canvas it overhangs, and "IN 7 DAYS" on its
   * own does not say what happens in seven days.
   */
  badge: string | null;
  /**
   * Replaces the card's subtitle while the call is spent; null keeps the
   * default. The wait moves here because this is where there is room to say it
   * as a whole sentence — "Next free call in 7 days" cannot be misread, where
   * a three-word pill could mean the activity takes a week, or expires in one.
   */
  subtitle: string | null;
  /**
   * `subtitle` split around its day count, so the digit can be rendered as a
   * flip tile without the sentence being written out a second time in the
   * card. Built from the same parts `subtitle` is joined from, so the two can
   * never drift. Null whenever there is no number to animate — an available
   * call, or "tomorrow".
   */
  countdown: { before: string; days: number; after: string } | null;
}

/**
 * WHAT THE CALL CARD SAYS ABOUT ITS OWN LIMIT.
 *
 * Kept in its own module, with a TYPE-ONLY import, so it can be tested without
 * dragging in the API barrel (and through it the RevenueCat native module,
 * which does not exist in a test process).
 *
 * Two rules run through all of it:
 *
 *   · Nothing to say beats guessing. Every branch that cannot be described
 *     truthfully returns null and the card falls back to its plain state —
 *     saying nothing is honest, saying the wrong thing is not.
 *   · Round the wait UP, never down. "in 4 days" when it is 3.2 means somebody
 *     arrives to find the call waiting; rounding down means they arrive to a
 *     locked door, which is the dead end this is here to remove.
 *
 * Every input comes from the server, which computes it with the same code the
 * start-gate runs. Nothing here re-derives the seven-day window.
 */
export function describeAllowance(
  wallet: Wallet | null,
  now: Date = new Date(),
): CallAllowance | null {
  if (!wallet) return null;

  // Bought credits outrank the free call: somebody holding three of them must
  // never be told to come back on Thursday. The weekly call is the floor.
  if (wallet.balance > 0) {
    return {
      badge: `${wallet.balance} CALL${wallet.balance === 1 ? "" : "S"}`,
      subtitle: null,
      countdown: null,
    };
  }

  if (wallet.freeCallAvailable)
    return { badge: "FREE CALL", subtitle: null, countdown: null };

  if (wallet.freeCallAvailable === false && wallet.nextFreeCallAt) {
    const waitMs = new Date(wallet.nextFreeCallAt).getTime() - now.getTime();
    if (Number.isNaN(waitMs)) return null;
    // The wallet is a snapshot; a screen left open past the unlock instant must
    // not keep telling somebody to wait for a call they can already make.
    if (waitMs <= 0)
      return { badge: "FREE CALL", subtitle: null, countdown: null };

    // Always a number, never "tomorrow". A worded countdown has no digit, so
    // the block vanishes for the last day of the wait — which is precisely the
    // day somebody is most likely to be checking. `days` is ceil'd, so this
    // floors at 1 and never reaches zero.
    const days = Math.ceil(waitMs / DAY_MS);

    // ONE source for the sentence. `subtitle` is joined from these parts
    // rather than written out beside them, so the animated version and the
    // plain one cannot say different things.
    const countdown = {
      before: "Next free call in ",
      days,
      // One day, not one days.
      after: days === 1 ? " day" : " days",
    };
    return {
      badge: null,
      subtitle: `${countdown.before}${countdown.days}${countdown.after}`,
      countdown,
    };
  }

  return null;
}

/**
 * ===========================================================================
 * "OUT OF CALLS" BEFORE "CONNECT HEADPHONES" (H1, founder, 9 Nov 2026)
 * ---------------------------------------------------------------------------
 * With no calls left, the call button used to ask for headphones first and
 * only then say "Out of calls": the 402 NO_CREDITS comes from starting the
 * activity, which runs after the headphones gate. Starting it earlier is not
 * an option, because that start SPENDS the call (a credit, the weekly free
 * call, the first call), and being blocked for want of headphones must never
 * spend one.
 *
 * So the call screen reads the wallet fresh at the tap and, only when it is
 * CERTAIN no call can start, shows the "Out of calls" sheet before the gate.
 * The server's start gate (practiceActivity.service.ts startActivity) decides,
 * in order: a reviewer's free review call (program calls only), the once-ever
 * first call (its own screen, never this one), a credit (membership calls are
 * credits too), then the weekly free call, which a program's own call never
 * gets. Hence "certain" is:
 *   balance === 0, and
 *     - a program call by a user whose role is known and is not "reviewer", or
 *     - a library call with freeCallAvailable === false (not a reviewer).
 * Anything missing or unsure answers "proceed": today's flow exactly, with the
 * 402 still the source of truth.
 * ===========================================================================
 */
export type CallPrecheck = "no_calls" | "proceed";

export function precheckCallAllowance(input: {
  wallet: Pick<Wallet, "balance" | "freeCallAvailable"> | null | undefined;
  inProgram: boolean;
  /** The user's role from GET /users/me, or undefined when not known. */
  role: string | null | undefined;
}): CallPrecheck {
  const { wallet, inProgram, role } = input;
  if (!wallet || typeof wallet.balance !== "number") return "proceed";
  if (wallet.balance !== 0) return "proceed";
  // A reviewer may have a free review call the app cannot see.
  if (role === "reviewer") return "proceed";
  if (inProgram) {
    // A program call never runs as the weekly free call, but a reviewer's
    // can be free: only a KNOWN non-reviewer role is certain.
    return typeof role === "string" && role.length > 0 ? "no_calls" : "proceed";
  }
  return wallet.freeCallAvailable === false ? "no_calls" : "proceed";
}

/** How long the pre-check waits for the wallet before it gives up. */
export const CALL_PRECHECK_TIMEOUT_MS = 3000;

/**
 * Read the wallet with a time limit. Null on any error or timeout, which the
 * pre-check treats as "proceed".
 */
export async function walletWithin(
  read: () => Promise<Wallet>,
  timeoutMs: number = CALL_PRECHECK_TIMEOUT_MS,
): Promise<Wallet | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Run a screen's pre-check before the call gate. True means "stop here, the
 * screen answered the tap". A missing pre-check, or one that throws, is false:
 * the call goes on exactly as without it.
 */
export async function runBeforeCallGate(
  before: (() => Promise<boolean>) | null | undefined,
): Promise<boolean> {
  if (!before) return false;
  try {
    return (await before()) === true;
  } catch (error) {
    console.warn("[CallGate] pre-check failed, continuing:", error);
    return false;
  }
}
