import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * ===========================================================================
 * HOW OFTEN WE ARE ALLOWED TO ASK
 * ---------------------------------------------------------------------------
 * One membership ask per person per week, wherever it comes from.
 *
 * ── WHY THIS EXISTS BEFORE THE THING THAT USES IT ──────────────────────────
 * The plan is to ask in more places than we do today: after a session that
 * went well, on day 28 of a pack buyer's free month, beside a locked
 * technique. Every one of those is a better moment than the one we use now,
 * which is the instant somebody runs out of practice.
 *
 * But "more places" without a shared limit is just nagging, and nagging is
 * measurably worse than asking once: a person who has said no three times this
 * week has stopped reading the sheet. So the limit lands FIRST, and every new
 * surface goes through it.
 *
 * ── WHY IT LIVES ON THE DEVICE ─────────────────────────────────────────────
 * The server does not need to know, and a network round trip before deciding
 * whether to render a dock would either block the screen or flash it. The
 * worst case of losing this state is one extra ask after a reinstall, which is
 * a much better failure than a blocked screen.
 *
 * ── WHAT COUNTS AS AN ASK ──────────────────────────────────────────────────
 * SHOWING one. Not tapping it, not dismissing it. If somebody saw the offer
 * and kept practising, they answered, and the answer was no for now.
 * ===========================================================================
 */

const KEY = "membership_ask_last_shown_at";

/** Seven days, in milliseconds. */
export const ASK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * May we ask right now?
 *
 * Returns true when nothing has ever been recorded, so the first ask always
 * lands. `now` is injectable for tests; nothing in the app should pass it.
 *
 * NEVER THROWS. A storage failure returns false — quiet rather than noisy.
 * Getting this backwards would turn a broken read into an ask on every single
 * screen, which is the exact failure mode the limit exists to prevent.
 */
export async function canAskForMembership(now: Date = new Date()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return true;

    const last = Number(raw);
    // A corrupt value is not a licence to ask forever. Treat it as "just
    // asked" and let the week pass, rather than as "never asked".
    if (!Number.isFinite(last)) return false;

    return now.getTime() - last >= ASK_INTERVAL_MS;
  } catch {
    return false;
  }
}

/**
 * Record that we asked.
 *
 * Call this when the offer becomes VISIBLE, not when it is acted on. Swallows
 * its own failures: an unrecorded ask means one extra ask next week, which is
 * not worth failing a render over.
 */
export async function recordMembershipAsk(now: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(now.getTime()));
  } catch {
    // Deliberately silent. See above.
  }
}

/**
 * Forget every ask.
 *
 * For sign-out, so the next person on a shared device starts clean, and for
 * tests. Not for "the user became a member": a member is not asked at all, and
 * clearing on purchase would mean asking them immediately if they lapsed.
 */
export async function resetMembershipAsks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Deliberately silent.
  }
}
