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
  /**
   * When they FINISHED. Null means they never have on this device.
   *
   * Recorded so other screens can leave somebody alone for the rest of that
   * day. It is not an entitlement and never gates anything — see the store
   * note above.
   */
  completedAt: number | null;
  /**
   * Whether the four growth words have been introduced yet.
   *
   * ONE INTRODUCTION, WHEREVER IT LANDS FIRST. Somebody who practises first
   * meets them on the completion screen; somebody whose first count came from
   * the welcome call meets them on Home, because that call ends on a feelings
   * check-in we deliberately keep free of scorekeeping. A flag per surface
   * would say the same thing twice to anyone who does both.
   *
   * SET ON ACKNOWLEDGEMENT, NOT ON RENDER. It flips when the person has
   * actually had the chance to read it — otherwise a mood sheet covering Home,
   * or a completion screen dismissed in half a second, burns the one
   * explanation the vocabulary gets.
   */
  growthIntroducedAt: number | null;
  /** They chose to leave onboarding unfinished. */
  markSkipped: () => void;
  /** They finished it. */
  markCompleted: () => void;
  /** They finished, or deliberately restarted — the nudge is live again. */
  clearSkip: () => void;
  /** They have now been told what the growth words mean. */
  markGrowthIntroduced: () => void;
}

export const useOnboardingNudgeStore = create<OnboardingNudgeState>()(
  persist(
    (set) => ({
      skippedAt: null,
      completedAt: null,
      growthIntroducedAt: null,
      markSkipped: () => set({ skippedAt: Date.now() }),
      markCompleted: () => set({ completedAt: Date.now(), skippedAt: null }),
      clearSkip: () => set({ skippedAt: null }),
      markGrowthIntroduced: () =>
        // Idempotent: the first surface to acknowledge owns it, and a later one
        // must not move the timestamp and make the introduction look recent.
        set((s) =>
          s.growthIntroducedAt ? s : { growthIntroducedAt: Date.now() },
        ),
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

/**
 * True on the day somebody finished onboarding.
 *
 * ONE INTERRUPTION PER DAY IS PLENTY, AND ONBOARDING SPENT IT. Finishing means
 * thirteen questions about the situations you avoid and how much they distress
 * you. Landing on Home half a second later and being asked, in a sheet you have
 * to dismiss, how you are feeling is the app taking a second bite of somebody
 * who has just given it a great deal.
 *
 * Calendar day, not a rolling window, so it always ends at a boundary the user
 * would recognise. Nothing else is suppressed — cards, rows and the practice
 * hub are all untouched, because none of them take the screen.
 */
export function completedOnboardingToday(state: {
  completedAt: number | null;
}): boolean {
  if (!state.completedAt) return false;
  const then = new Date(state.completedAt);
  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}
