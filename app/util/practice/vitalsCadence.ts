import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * ===========================================================================
 * HOW OFTEN WE ASK "HOW DID IT GO?"
 * ---------------------------------------------------------------------------
 * It used to be every single practice: three sliders, twelve call sites, after
 * everything. That is a toll booth on the way out of the thing they came to do,
 * and it is charged most often to the people who practise most.
 *
 * ── WHAT WE KEEP FOR FREE ──────────────────────────────────────────────────
 * Duration and which tools were used are recorded anyway and cost the user
 * nothing, because they do not have to answer anything. Only the sliders are
 * rationed. The schema does not change: the same fields, filled in less often.
 *
 * ── WHY A COOLDOWN AND A COIN TOSS, NOT ONE OR THE OTHER ───────────────────
 * A cooldown alone always lands on the FIRST practice after it expires, and the
 * first practice of a session is not a random practice: people warm up on the
 * easy one. Every sample would be biased easy. The coin toss moves the ask
 * somewhere inside the session instead.
 *
 * A coin toss alone would ask twice in one evening often enough to be
 * irritating, which is the thing we are fixing.
 * ===========================================================================
 */

/** Days between asks. Three, so a daily user sees this about twice a week. */
export const VITALS_COOLDOWN_DAYS = 3;

/** Once the cooldown is up, how likely any one completion is the one asked. */
export const VITALS_ASK_RATE = 0.5;

const KEY = "vitals:lastAskedAt";

/** Local midnight, so "days ago" counts calendar days the user recognises. */
const startOfLocalDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The whole rule, pure so it can be tested.
 *
 * @param lastAskedAt when we last showed the sliders, or null if never
 * @param roll        a number in [0, 1). Injected rather than rolled inside,
 *                    so a test is not at the mercy of Math.random.
 */
export function shouldAskVitals(
  lastAskedAt: Date | null,
  now: Date,
  roll: number,
): boolean {
  // Never asked. Ask, so somebody who does one practice and stops has still
  // told us something, and so the first sample is not three days away.
  if (!lastAskedAt) return true;

  const daysSince = Math.floor(
    (startOfLocalDay(now) - startOfLocalDay(lastAskedAt)) / DAY_MS,
  );

  // A clock that moved backwards (timezone change, manual set) would otherwise
  // read as a negative gap and count as "long enough ago".
  if (daysSince < VITALS_COOLDOWN_DAYS) return false;

  return roll < VITALS_ASK_RATE;
}

/**
 * The same decision, against what is actually stored. Records the ask when the
 * answer is yes, so the cooldown starts from the question rather than from the
 * answer: somebody who dismisses the sliders should not be asked again tomorrow
 * for having declined.
 */
export async function askVitalsNow(now: Date = new Date()): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const lastAskedAt = stored ? new Date(stored) : null;
    const valid =
      lastAskedAt && !Number.isNaN(lastAskedAt.getTime()) ? lastAskedAt : null;

    if (!shouldAskVitals(valid, now, Math.random())) return false;

    await AsyncStorage.setItem(KEY, now.toISOString());
    return true;
  } catch {
    // Storage is unreadable. Ask: the old behaviour was to ask every time, so
    // failing towards it cannot be a regression.
    return true;
  }
}
