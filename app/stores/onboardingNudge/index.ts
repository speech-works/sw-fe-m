import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

/**
 * Whether we may still take the whole screen to ask someone to finish
 * onboarding.
 *
 * THIS STORE HOLDS NO ENTITLEMENT. Whether onboarding is complete is
 * `user.hasCompletedOnboarding` — the server's answer and only the server's.
 * All this records is that the person asked to be left alone, which changes how
 * loudly we ask, never whether they are allowed in. Same doctrine as
 * `stores/firstCall`, deliberately.
 *
 * WHY IT HAS TO BE PERSISTED. The skip used to live in a `useState` inside
 * MainNavigator, so it died with the process. Every cold start re-latched the
 * questionnaire over the entire app for anyone not finished — which, in an app
 * whose users are anxiety-sensitive, meant being met by a thirteen-question
 * interrogation about the situations you avoid and how distressed you are,
 * every single time you opened it, after you had already declined once. There
 * was no visible way out: the entry screen has one button and no close control.
 *
 * A TIMESTAMP RATHER THAN A BOOLEAN, even though nothing expires today. It
 * costs nothing now and means a "remind me in a week" policy has somewhere to
 * live without a migration. `isOnboardingQuieted` is where any such rule would
 * go — the same shape as `isFirstCallQuieted`.
 */
interface OnboardingNudgeState {
  /** When they last asked us to stop asking. Null means never. */
  skippedAt: number | null;
  /** They chose to leave onboarding unfinished. */
  markSkipped: () => void;
  /** They finished, or deliberately restarted — the nudge is live again. */
  clearSkip: () => void;
}

export const useOnboardingNudgeStore = create<OnboardingNudgeState>()(
  persist(
    (set) => ({
      skippedAt: null,
      markSkipped: () => set({ skippedAt: Date.now() }),
      clearSkip: () => set({ skippedAt: null }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_ONBOARDING_NUDGE,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * True while onboarding must NOT be forced over the top of the app.
 *
 * Pure and exported so it can be tested without mounting a navigator — the
 * property that matters here is behavioural, not visual.
 *
 * Note what this does NOT do: it never hides the Home card. Somebody who
 * skipped still sees the reminder, still has every unanswered question waiting
 * for them, and can pick it up whenever they choose. Quieting is not removal.
 */
export function isOnboardingQuieted(state: {
  skippedAt: number | null;
}): boolean {
  return state.skippedAt !== null;
}
