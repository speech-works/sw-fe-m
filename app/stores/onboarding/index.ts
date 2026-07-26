import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { OnboardingFlow, OnboardingQuestion } from "../../api/onboarding/types";
import { useOnboardingDraftStore } from "../onboardingDraft";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface OnboardingState {
  flow: OnboardingFlow | null;
  answers: Record<string, any>;
  currentScreen: number;
  /**
   * A resume has been staged by the pre-signup replay and not yet consumed.
   *
   * PERSISTED ON PURPOSE: the replay runs from a MainNavigator effect the
   * moment an account exists, but the welcome screen that acts on it may not be
   * reached until after the app is killed and reopened. An in-memory flag would
   * be lost in that window and the person would be reasked everything.
   *
   * An EXPLICIT flag rather than inferring "are there answers already?" —
   * answers persist across sessions, so someone who abandoned onboarding, or
   * whose old unreadable answers were reset server-side, also has a populated
   * store. Those people need a clean start; only a genuine replay should skip
   * ahead. Inferring it would silently skip questions for exactly the users
   * whose stored answers cannot be trusted.
   */
  pendingResume: boolean;

  // Actions
  setFlow: (flow: OnboardingFlow) => void;
  startFresh: (flow: OnboardingFlow) => void;
  /** Seed with already-given answers and jump to the first unanswered screen. */
  resumeFrom: (flow: OnboardingFlow, seeded: Record<string, any>) => void;
  /** Clear the staged resume once a screen has acted on it. */
  consumeResume: () => void;
  /**
   * Enter the post-signup flow and return the screen to navigate to.
   *
   * THE DECISION LIVES HERE, NOT IN THE SCREEN. The welcome screen used to
   * make it inline — and got it wrong in two independent ways at once: it
   * called `startFresh` unconditionally (wiping the replayed answers) and then
   * hard-navigated to screen 1 (ignoring the computed resume point). Either
   * alone was enough to reask all twelve questions.
   *
   * A screen that only navigates cannot reintroduce that, and unlike a screen
   * this is reachable from a test.
   */
  enterFlow: (flow: OnboardingFlow) => number;
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
      pendingResume: false,

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
          // A deliberate fresh start outranks any staged resume.
          pendingResume: false,
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

        set({
          flow,
          answers: { ...seeded },
          currentScreen: firstUnanswered,
          pendingResume: true,
        });
      },

      consumeResume: () => set({ pendingResume: false }),

      enterFlow: (flow) => {
        const { pendingResume, answers: seeded } = get();

        if (pendingResume) {
          // Recomputed against the flow just fetched rather than trusting the
          // screen number worked out at replay time, so a flow that changed in
          // between cannot strand anyone on a screen that no longer exists.
          get().resumeFrom(flow, seeded);
          get().consumeResume();
          return get().currentScreen;
        }

        // THE REPLAY MAY SIMPLY NOT HAVE LANDED YET.
        //
        // `replayOnboardingDraft` runs from a MainNavigator effect and makes
        // two network round-trips before it calls `resumeFrom`, while this
        // screen is already on-screen and tappable. Someone who taps Continue
        // straight away beats it, finds `pendingResume` still false, and gets
        // all twelve questions — intermittently, which is exactly how this was
        // described: sometimes repeated, sometimes not.
        //
        // The answers are on the device the whole time, so read them from
        // there instead of racing. Seeding twice is harmless — both paths seed
        // the same values — and the replay's own transmit is unaffected.
        const draft = useOnboardingDraftStore.getState().answers;
        if (Object.keys(draft).length > 0) {
          get().resumeFrom(flow, draft);
          get().consumeResume();
          return get().currentScreen;
        }

        get().startFresh(flow);
        return get().currentScreen;
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
          pendingResume: false,
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
