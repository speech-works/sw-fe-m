import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";
import { OnboardingFlow, OnboardingQuestion } from "../../api/onboarding/types";

interface OnboardingState {
  flow: OnboardingFlow | null;
  answers: Record<string, any>;
  currentScreen: number;

  // Actions
  setFlow: (flow: OnboardingFlow) => void; // Updates definition ONLY
  startFresh: (flow: OnboardingFlow) => void; // Updates definition AND resets to screen 1
  setAnswer: (questionId: string, value: any) => void;
  toggleMultiAnswer: (questionId: string, option: any) => void;

  // Helpers
  getCurrentScreenQuestions: () => OnboardingQuestion[];
  getTotalScreens: () => number; // <-- NEW HELPER
  isCurrentScreenValid: () => boolean;

  // Nav
  nextScreen: () => void;
  prevScreen: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      flow: null,
      answers: {},
      currentScreen: 1,

      // Only update the flow definition. DO NOT reset currentScreen here.
      setFlow: (flow) => {
        set({ flow });
      },

      // Explicitly start over (used by Welcome screen "Start" button)
      startFresh: (flow) => {
        const firstScreen =
          flow.questions.length > 0
            ? Math.min(...flow.questions.map((q) => q.screenNumber))
            : 1;

        set({
          flow,
          currentScreen: firstScreen,
          answers: {}, // Optional: clear answers if starting fresh
        });
      },

      setAnswer: (questionId, value) => {
        const prev = get().answers;
        set({ answers: { ...prev, [questionId]: value } });
      },

      toggleMultiAnswer: (questionId, option) => {
        const current = get().answers[questionId] || [];
        const updated = current.includes(option)
          ? current.filter((x: any) => x !== option)
          : [...current, option];
        set({ answers: { ...get().answers, [questionId]: updated } });
      },

      getCurrentScreenQuestions: () => {
        const { flow, currentScreen } = get();
        if (!flow) return [];
        return flow.questions.filter((q) => q.screenNumber === currentScreen);
      },

      // <-- NEW HELPER IMPLEMENTATION
      getTotalScreens: () => {
        const { flow } = get();
        if (!flow || flow.questions.length === 0) return 0;
        // Find the highest screenNumber used in the questions
        const screenNumbers = flow.questions.map((q) => q.screenNumber);
        return Math.max(...screenNumbers);
      },

      isCurrentScreenValid: () => {
        const questions = get().getCurrentScreenQuestions();
        const answers = get().answers;
        return questions.every((q) => {
          if (!q.isRequired) return true;
          const value = answers[q.id];
          if (value === undefined || value === null) return false;
          if (typeof value === "string" && value.trim() === "") return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        });
      },

      nextScreen: () => {
        const { flow, currentScreen } = get();
        if (!flow) return;
        const screenNumbers = flow.questions.map((q) => q.screenNumber);
        const maxScreen = Math.max(...screenNumbers);
        if (currentScreen < maxScreen) {
          set({ currentScreen: currentScreen + 1 });
        }
      },

      prevScreen: () => {
        const { currentScreen } = get();
        if (currentScreen > 1) {
          set({ currentScreen: currentScreen - 1 });
        }
      },

      resetOnboarding: () =>
        set({
          flow: null,
          answers: {},
          currentScreen: 1,
        }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_ONBOARDING,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.flow) {
          state.flow = reviveDatesInObject(state.flow) as OnboardingFlow;
        }
      },
    }
  )
);
