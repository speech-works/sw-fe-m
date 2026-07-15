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

  // 2) Reset in-memory state for EVERY store that holds user-scoped,
  //    session-visible data — otherwise the previous user's data lingers in
  //    memory until app restart (log out → log in as a different account in
  //    the same session → transiently see the prior user's mood/activities/
  //    assessment answers). Dynamic imports avoid load-order / circular-import
  //    issues. Each reset runs independently so one failing store never skips
  //    the rest.
  const resets: Array<[string, () => unknown | Promise<unknown>]> = [];
  try {
    const [
      { useUserStore },
      { useToolConsentStore },
      { useAICallConsentStore },
      { useUserBehaviorTrendsStore },
      { useProgressReportStore },
      { usePracticeCategorySummaryStore },
      { useStaminaNotificationStore },
      { useVoicePreferenceStore },
      { useSessionStore },
      { useMoodCheckStore },
      { useActivityStore },
      { useReminderStore },
      { useOnboardingStore },
      { useImpactAssessmentStore },
    ] = await Promise.all([
      import("../../stores/user"),
      import("../../stores/toolConsent"),
      import("../../stores/aiCallConsent"),
      import("../../stores/userBehaviorTrends"),
      import("../../stores/progressReport"),
      import("../../stores/practiceCategorySummary"),
      import("../../stores/staminaNotification"),
      import("../../stores/voicePreference"),
      import("../../stores/session"),
      import("../../stores/mood"),
      import("../../stores/activity"),
      import("../../stores/reminders"),
      import("../../stores/onboarding"),
      import("../../stores/impactAssessment"),
    ]);
    resets.push(
      ["user", () => useUserStore.getState().clearUser()],
      ["toolConsent", () => useToolConsentStore.getState().reset()],
      ["aiCallConsent", () => useAICallConsentStore.getState().reset()],
      ["userBehaviorTrends", () => useUserBehaviorTrendsStore.getState().clearTrends()],
      ["progressReport", () => useProgressReportStore.getState().clearProgressReport()],
      ["practiceCategorySummary", () => usePracticeCategorySummaryStore.getState().clearSummary()],
      ["staminaNotification", () => useStaminaNotificationStore.getState().resetAll()],
      ["voicePreference", () => useVoicePreferenceStore.getState().reset()],
      ["session", () => useSessionStore.getState().clearSession()],
      ["mood", () => useMoodCheckStore.getState().clearMood()],
      ["activity", () => useActivityStore.getState().clearActivities()],
      // removeAll also cancels the OS-scheduled notifications so a logged-out
      // user's reminders can't fire for the next account on a shared device.
      ["reminders", () => useReminderStore.getState().removeAll()],
      ["onboarding", () => useOnboardingStore.getState().resetOnboarding()],
      ["impactAssessment", () => useImpactAssessmentStore.getState().resetImpactAssessment()],
    );
  } catch (e) {
    console.warn("[clearUserState] loading stores for reset failed:", e);
  }
  for (const [name, reset] of resets) {
    try {
      await reset();
    } catch (e) {
      console.warn(`[clearUserState] reset for store "${name}" failed:`, e);
    }
  }
}
