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

/**
 * Can these stored answers still be understood against this flow?
 *
 * "Do answers exist?" is the wrong question, and asking it is how questions get
 * repeated in one direction and silently skipped in the other:
 *
 *   - Someone who backed out at question 8 has answers and must CONTINUE.
 *     Treating a populated store as "already used up" restarts them at 1 and
 *     throws away everything after signup too.
 *   - Someone whose answers are the old random `opt-…` tokens has answers that
 *     mean nothing. `resumeFrom` only checks that a key is present, so it would
 *     count each one as answered and skip straight past questions that were
 *     never really answered.
 *
 * So the test is whether every stored value is one this flow's questions
 * actually offer. Free-form and scale questions carry no options and are taken
 * at face value; keys belonging to some other flow are ignored rather than
 * counted against it.
 */
const answersAreReadable = (
  flow: OnboardingFlow,
  answers: Record<string, any>,
): boolean => {
  const entries = Object.entries(answers ?? {});
  if (entries.length === 0) return false;

  return entries.every(([key, value]) => {
    const question = flow.questions.find((q) => (q.adaptiveKey ?? q.id) === key);
    if (!question?.options?.length) return true;

    const offered = new Set(question.options.map((o) => String(o.value)));
    const given = Array.isArray(value) ? value : [value];
    return given.every((v) => offered.has(String(v)));
  });
};

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
        const { pendingResume, answers: stored } = get();

        // 1. The replay staged a resume, or there is readable progress already.
        //
        // `resumeFrom` is re-run against the flow just fetched rather than
        // trusting the screen number worked out earlier, so a flow that changed
        // in between cannot strand anyone on a screen that no longer exists.
        if (pendingResume || answersAreReadable(flow, stored)) {
          get().resumeFrom(flow, stored);
          get().consumeResume();
          return get().currentScreen;
        }

        // 2. The replay may simply not have landed yet.
        //
        // `replayOnboardingDraft` runs from a MainNavigator effect and makes
        // two network round-trips before it stages the resume, while this
        // screen is already on-screen and tappable. Someone who taps Continue
        // straight away beats it and would get all twelve questions —
        // intermittently, which is how this was described: sometimes repeated,
        // sometimes not. The answers are on the device the whole time, so read
        // them from there rather than racing the network. Seeding twice is
        // harmless: both paths seed the same values.
        const draft = useOnboardingDraftStore.getState().answers;
        if (Object.keys(draft).length > 0) {
          get().resumeFrom(flow, draft);
          get().consumeResume();
          return get().currentScreen;
        }

        // 3. Nothing usable to continue from.
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
