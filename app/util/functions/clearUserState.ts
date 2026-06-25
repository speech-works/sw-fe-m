import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

// Local push-token cache key (mirrors the const in notifications.ts).
const PUSH_TOKEN_KEY = "SW_EXPO_PUSH_TOKEN";

/**
 * Wipes ALL locally-persisted, user-scoped state so nothing carries across
 * accounts on a shared device (used by logout and account deletion).
 *
 * Two steps are required:
 *  1. Remove every persisted AsyncStorage key — this clears data at rest.
 *  2. Reset the in-memory zustand stores that hold session-visible data, which
 *     otherwise retain the previous user's state until the app is restarted
 *     (e.g. logout → log in as a different account in the same session).
 */
export async function clearAllPersistedUserState(): Promise<void> {
  // 1) Remove every persisted key (all zustand stores + flags + push token).
  try {
    await AsyncStorage.multiRemove([
      ...Object.values(ASYNC_KEYS_NAME),
      PUSH_TOKEN_KEY,
    ]);
  } catch (e) {
    console.warn("[clearUserState] multiRemove failed:", e);
  }

  // 2) Reset in-memory state for stores with session-visible data. Dynamic
  //    imports avoid load-order / circular-dependency issues.
  try {
    const [
      { useUserStore },
      { useToolConsentStore },
      { useAICallConsentStore },
      { useUserBehaviorTrendsStore },
      { useProgressReportStore },
      { usePracticeCategorySummaryStore },
      { useStaminaNotificationStore },
      { useFreeActivityNotificationStore },
      { useVoicePreferenceStore },
    ] = await Promise.all([
      import("../../stores/user"),
      import("../../stores/toolConsent"),
      import("../../stores/aiCallConsent"),
      import("../../stores/userBehaviorTrends"),
      import("../../stores/progressReport"),
      import("../../stores/practiceCategorySummary"),
      import("../../stores/staminaNotification"),
      import("../../stores/freeActivityNotification"),
      import("../../stores/voicePreference"),
    ]);
    useUserStore.getState().clearUser();
    useToolConsentStore.getState().reset();
    useAICallConsentStore.getState().reset();
    useUserBehaviorTrendsStore.getState().clearTrends();
    useProgressReportStore.getState().clearProgressReport();
    usePracticeCategorySummaryStore.getState().clearSummary();
    useStaminaNotificationStore.getState().resetAll();
    useFreeActivityNotificationStore.getState().resetAll();
    useVoicePreferenceStore.getState().reset();
  } catch (e) {
    console.warn("[clearUserState] in-memory reset failed:", e);
  }
}
