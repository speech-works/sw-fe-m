import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { OnboardingFlow, OnboardingQuestion } from "../../api/onboarding/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface OnboardingState {
  flow: OnboardingFlow | null;
  answers: Record<string, any>;
  currentScreen: number;

  // Actions
  setFlow: (flow: OnboardingFlow) => void;
  startFresh: (flow: OnboardingFlow) => void;
  /** Seed with already-given answers and jump to the first unanswered screen. */
  resumeFrom: (flow: OnboardingFlow, seeded: Record<string, any>) => void;
  setAnswer: (key: string, value: any) => void;
  toggleMultiAnswer: (key: string, option: any) => void;

  // Helpers
  getCurrentScreenQuestions: (screenNum?: number) => OnboardingQuestion[];
  getTotalScreens: () => number;
  isCurrentScreenValid: (screenNum?: number) => boolean;

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

      setFlow: (flow) => {
        set({ flow });
      },

      startFresh: (flow) => {
        const firstScreen =
          flow.questions.length > 0
            ? Math.min(...flow.questions.map((q) => q.screenNumber))
            : 1;

        set({
          flow,
          currentScreen: firstScreen,
          answers: {},
        });
      },

      resumeFrom: (flow, seeded) => {
        // Continue where Act 1 left off instead of starting over.
        //
        // The five pre-signup answers have just been replayed to the server, so
        // reasking them would be the app forgetting something the person had
        // already told it thirty seconds earlier. Jump to the first screen that
        // still has an unanswered required question.
        const screens = [
          ...new Set(flow.questions.map((q) => q.screenNumber)),
        ].sort((a, b) => a - b);

        const answered = (q: (typeof flow.questions)[number]) => {
          const v = seeded[q.adaptiveKey ?? q.id];
          if (v === undefined || v === null) return false;
          if (typeof v === "string" && v.trim() === "") return false;
          if (Array.isArray(v) && v.length === 0) return false;
          return true;
        };

        const firstUnanswered =
          screens.find((s) =>
            flow.questions
              .filter((q) => q.screenNumber === s)
              .some((q) => q.isRequired !== false && !answered(q)),
          ) ?? screens[screens.length - 1] ?? 1;

        set({ flow, answers: { ...seeded }, currentScreen: firstUnanswered });
      },

      setAnswer: (key, value) => {
        const prev = get().answers;
        set({ answers: { ...prev, [key]: value } });
      },

      toggleMultiAnswer: (key, option) => {
        const current = get().answers[key] || [];
        const updated = current.includes(option)
          ? current.filter((x: any) => x !== option)
          : [...current, option];

        set({ answers: { ...get().answers, [key]: updated } });
      },

      getCurrentScreenQuestions: (screenNum?: number) => {
        const { flow, currentScreen } = get();
        if (!flow) return [];
        const targetScreen = screenNum ?? currentScreen;
        return flow.questions.filter((q) => q.screenNumber === targetScreen);
      },

      getTotalScreens: () => {
        const { flow } = get();
        if (!flow || flow.questions.length === 0) return 0;

        return Math.max(...flow.questions.map((q) => q.screenNumber));
      },

      isCurrentScreenValid: (screenNum?: number) => {
        const questions = get().getCurrentScreenQuestions(screenNum);
        const answers = get().answers;

        return questions.every((q) => {
          // Default to TRUE (required) if 'isRequired' is undefined or true. Only skip if explicitly false.
          if (q.isRequired === false) return true;

          // 🔥 KEY LOGIC: determine storage key
          const key = q.adaptiveKey ?? q.id;
          const value = answers[key];

          if (value === undefined || value === null) return false;
          if (typeof value === "string" && value.trim() === "") return false;
          if (Array.isArray(value) && value.length === 0) return false;

          return true;
        });
      },

      nextScreen: () => {
        const { flow, currentScreen } = get();
        if (!flow) return;

        const maxScreen = Math.max(
          ...flow.questions.map((q) => q.screenNumber),
        );
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
    },
  ),
);
