import type { Wallet } from "../../api/users";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CallAllowance {
  /** Corner-badge text. UPPERCASE, kept short — it sits in the same pill the
   *  cognitive cards use for "FREE", which has room for about "TOP MATCH". */
  label: string;
  /** Can they start a call right now? Drives the badge's colour, not its text:
   *  green reads as "go", and a countdown must never wear it. */
  ready: boolean;
}

/**
 * WHAT THE CALL BADGE SAYS — the one string on the Exposure screen that makes
 * a promise the next screen has to keep.
 *
 * Kept in its own module, with a TYPE-ONLY import, so it can be tested without
 * dragging in the API barrel (and through it the RevenueCat native module,
 * which does not exist in a test process).
 *
 * Two rules run through all of it:
 *
 *   · Nothing to say beats guessing. Every branch that cannot be described
 *     truthfully returns null and the badge disappears — a card with no badge
 *     is honest, a card with a wrong badge is not.
 *   · Round the wait UP, never down. Saying "IN 4 DAYS" when it is 3.2 means
 *     somebody arrives to find the call waiting; rounding down means they
 *     arrive to a locked door, which is the dead end the badge replaces.
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
      label: `${wallet.balance} CALL${wallet.balance === 1 ? "" : "S"}`,
      ready: true,
    };
  }

  // The card's subtitle already says "One free call a week", so the badge only
  // has to answer the question that subtitle raises: can I have it now?
  if (wallet.freeCallAvailable) return { label: "READY", ready: true };

  if (wallet.freeCallAvailable === false && wallet.nextFreeCallAt) {
    const waitMs = new Date(wallet.nextFreeCallAt).getTime() - now.getTime();
    if (Number.isNaN(waitMs)) return null;
    // The wallet is a snapshot; a screen left open past the unlock instant must
    // not keep telling somebody to wait for a call they can already make.
    if (waitMs <= 0) return { label: "READY", ready: true };

    const days = Math.ceil(waitMs / DAY_MS);
    return {
      label: days <= 1 ? "TOMORROW" : `IN ${days} DAYS`,
      ready: false,
    };
  }

  return null;
}
