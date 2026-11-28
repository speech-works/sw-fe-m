/**
 * "FURTHER THAN EVER BEFORE" (Pip moment P9, founder 2026-11-28): the day-done screen adds a golden shower and the line
 * "New best: Day N" only when this is the furthest day the person has reached.
 *
 * WHAT COUNTS. The record is the furthest program day they ever finished, in any program, kept on the phone. A day beats
 * it when its number is higher AND the record was set in another program. Inside one program every new day is a new
 * furthest, so counting those would play the moment every day; the founder's brief calls it very rare. So it plays when
 * a later program carries them past where an earlier one stopped (stopped at day 4 once, now day 5 in this one).
 * Finishing day N always moves the record up to N (in this program), so the moment plays once per new best.
 *
 * Kept on the phone only: a new phone starts with no record, so the first program never plays it there either.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FURTHEST_KEY = "pip.furthestDay";
export type FurthestRecord = { day: number; packId: string };

/** Pure: does finishing `day` of `packId` beat `record`? And the record after it. */
export function furthestAfter(record: FurthestRecord | null, packId: string, day: number): { furthest: boolean; record: FurthestRecord | null } {
  if (!Number.isFinite(day) || day < 1) return { furthest: false, record };
  if (!record) return { furthest: false, record: { day, packId } };
  if (day <= record.day) return { furthest: false, record };
  return { furthest: record.packId !== packId, record: { day, packId } };
}

/** A day was finished: is it further than ever before? Updates the record. A storage failure answers "no". */
export async function recordDayFinished(packId: string, day: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FURTHEST_KEY);
    const old = raw ? (JSON.parse(raw) as FurthestRecord) : null;
    const next = furthestAfter(old && typeof old.day === "number" && typeof old.packId === "string" ? old : null, packId, day);
    if (next.record && next.record !== old) await AsyncStorage.setItem(FURTHEST_KEY, JSON.stringify(next.record));
    return next.furthest;
  } catch {
    return false;
  }
}
