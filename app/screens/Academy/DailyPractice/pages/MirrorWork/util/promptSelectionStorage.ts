import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../../../../../constants/asyncStorageKeys";

/**
 * Persistence for the "which prompts have opened a session" cursor, used to keep
 * the opening prompt fresh across sessions. Separate from the pure selector so
 * selectSessionPrompts stays unit-testable. The key lives in ASYNC_KEYS_NAME, so
 * logout cleanup (clearUserState) drops it with every other user-scoped key.
 */
const KEY = ASYNC_KEYS_NAME.SW_MIRROR_PROMPT_SEEN;
// Cap the stored history so it can't grow unbounded (well above the ~180 eligible openers).
const MAX_SEEN = 400;

export async function loadSeenOpeners(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function recordSeenOpener(id: string | null): Promise<void> {
  if (!id) return;
  try {
    const current = await loadSeenOpeners();
    if (current.includes(id)) return;
    const next = [...current, id].slice(-MAX_SEEN);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Non-fatal — opener freshness just won't persist this time.
  }
}
