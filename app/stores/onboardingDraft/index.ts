import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { ACT_ONE_FLOW } from "../../constants/onboardingActOne";
import { OnboardingQuestion } from "../../api/onboarding/types";

export type ActOneAnswers = Record<string, string | string[]>;

interface OnboardingDraftState {
  /** adaptiveKey -> the option `value` (or values) the person chose. */
  answers: ActOneAnswers;
  /** Which Act-1 screen they're on (1-based), so we resume rather than restart. */
  stepIndex: number;
  /** Set when all required Act-1 questions are answered. */
  completedAt: string | null;
  /** Set once the answers have been handed to the server post-signup. */
  replayedAt: string | null;

  setAnswer: (key: string, value: string | string[]) => void;
  setStep: (step: number) => void;
  markCompleted: () => void;
  markReplayed: () => void;
  clear: () => void;
  /** True when there is something worth replaying to the server. */
  hasPendingReplay: () => boolean;

  // ── The shape OnboardingQuestionScreen reads ────────────────────────────
  // Mirrors `useOnboardingStore` so the SAME screen can render Act 1 without
  // being forked. The screen holds three separately-documented race fixes
  // (hook-order guard, isAdvancing latch, hasFlow dep); a copy would silently
  // lose them the first time someone edited one side. The only difference is
  // where the questions come from — bundled here, fetched there.
  getCurrentScreenQuestions: (screenNum?: number) => OnboardingQuestion[];
  getTotalScreens: () => number;
  isCurrentScreenValid: (screenNum?: number) => boolean;
  nextScreen: () => void;
}

/**
 * Act 1's answers, held ON THE DEVICE until there is an account.
 *
 * These are health-adjacent answers about an identifiable person — which
 * situations they avoid, how heavy things feel right now. Under GDPR Art. 9
 * that needs an Art. 6 basis PLUS explicit consent, and pre-signup we have
 * neither. So nothing is transmitted: the answers sit here, and only anonymous
 * step numbers (`onboarding_step_viewed`) ever leave the device. After signup
 * they are replayed once to the server and this store is cleared.
 *
 * Deliberately SEPARATE from `stores/onboarding`, which caches the server flow
 * and is scoped to a logged-in session. This one exists precisely for the
 * window where no session exists yet.
 */
export const useOnboardingDraftStore = create<OnboardingDraftState>()(
  persist(
    (set, get) => ({
      answers: {},
      stepIndex: 1,
      completedAt: null,
      replayedAt: null,

      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),

      setStep: (stepIndex) => set({ stepIndex }),

      markCompleted: () => set({ completedAt: new Date().toISOString() }),

      markReplayed: () => set({ replayedAt: new Date().toISOString() }),

      clear: () =>
        set({ answers: {}, stepIndex: 1, completedAt: null, replayedAt: null }),

      hasPendingReplay: () => {
        const { answers, replayedAt } = get();
        return !replayedAt && Object.keys(answers).length > 0;
      },

      getCurrentScreenQuestions: (screenNum?: number) => {
        const target = screenNum ?? get().stepIndex;
        return ACT_ONE_FLOW.questions.filter((q) => q.screenNumber === target);
      },

      getTotalScreens: () =>
        Math.max(...ACT_ONE_FLOW.questions.map((q) => q.screenNumber)),

      isCurrentScreenValid: (screenNum?: number) => {
        const questions = get().getCurrentScreenQuestions(screenNum);
        const { answers } = get();

        // Same rule as the post-signup store: required unless explicitly false,
        // and an empty string / empty array does not count as answered.
        return questions.every((q) => {
          if (q.isRequired === false) return true;
          const value = answers[q.adaptiveKey ?? q.id];
          if (value === undefined || value === null) return false;
          if (typeof value === "string" && value.trim() === "") return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        });
      },

      nextScreen: () => {
        const { stepIndex, getTotalScreens } = get();
        if (stepIndex < getTotalScreens()) set({ stepIndex: stepIndex + 1 });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_ONBOARDING_DRAFT,
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the data only. The question list is bundled and the helpers are
      // derived, so writing them would just bake a stale copy of ACT_ONE_FLOW
      // into storage and serve it after the app's own copy had moved on.
      partialize: (s) => ({
        answers: s.answers,
        stepIndex: s.stepIndex,
        completedAt: s.completedAt,
        replayedAt: s.replayedAt,
      }),
      // Versioned from the start — unlike `stores/onboarding`, which has no
      // version and would happily rehydrate a stale shape after a schema change.
      version: 1,
      migrate: (persisted, from) => {
        // No prior versions yet; an unknown shape starts clean rather than
        // replaying half-parsed answers into a real account.
        if (from !== 1) {
          return {
            answers: {},
            stepIndex: 1,
            completedAt: null,
            replayedAt: null,
          } as OnboardingDraftState;
        }
        return persisted as OnboardingDraftState;
      },
    },
  ),
);
