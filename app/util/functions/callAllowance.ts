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
    };
  }

  if (wallet.freeCallAvailable) return { badge: "FREE CALL", subtitle: null };

  if (wallet.freeCallAvailable === false && wallet.nextFreeCallAt) {
    const waitMs = new Date(wallet.nextFreeCallAt).getTime() - now.getTime();
    if (Number.isNaN(waitMs)) return null;
    // The wallet is a snapshot; a screen left open past the unlock instant must
    // not keep telling somebody to wait for a call they can already make.
    if (waitMs <= 0) return { badge: "FREE CALL", subtitle: null };

    const days = Math.ceil(waitMs / DAY_MS);
    return {
      badge: null,
      subtitle:
        days <= 1
          ? "Next free call tomorrow"
          : `Next free call in ${days} days`,
    };
  }

  return null;
}
