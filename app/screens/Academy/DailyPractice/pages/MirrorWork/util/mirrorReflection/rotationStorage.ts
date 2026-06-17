import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../../../../../../constants/asyncStorageKeys";
import { RotationState } from "./types";

/**
 * Persistence for the reflection rotation cursor. Kept separate from rotation.ts
 * (the pure picker) so the buildReflection import graph stays free of native
 * deps and remains unit-testable. The key lives in ASYNC_KEYS_NAME so logout
 * cleanup (clearUserState) drops it along with every other user-scoped key.
 */
export const ROTATION_STORAGE_KEY = ASYNC_KEYS_NAME.SW_MIRROR_REFLECTION_ROTATION;

export async function loadRotationState(): Promise<RotationState> {
  try {
    const raw = await AsyncStorage.getItem(ROTATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RotationState) : {};
  } catch {
    return {};
  }
}

export async function saveRotationState(state: RotationState): Promise<void> {
  try {
    await AsyncStorage.setItem(ROTATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal — rotation just won't persist across this transition.
  }
}
