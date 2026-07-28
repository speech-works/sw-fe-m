import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { ACT_ONE_FLOW } from "../../constants/onboardingActOne";
import { OnboardingQuestion } from "../../api/onboarding/types";

export type ActOneAnswers = Record<string, string | string[]>;

/** The two keys the narrowing below joins together. */
const SITUATION_KEY = "speech.situations";
const SITUATION_FREQUENCY_KEY = "situation.most_frequent";

/** Escape answers carry no act, so they can never be the "most frequent" one. */
const ESCAPES = new Set(["none", "not_sure"]);

/** The acts they actually named as hard, in the order they picked them. */
function realSituations(answers: ActOneAnswers): string[] {
  const raw = answers[SITUATION_KEY];
  const picked = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return picked.filter((v) => typeof v === "string" && !ESCAPES.has(v));
}

/**
 * ASK ABOUT THEIR PICKS, NOT ALL NINE.
 *
 * The two situation questions measure different things over one bank — how hard
 * and how often — which is the whole reason both exist. But the second was
 * offering the full list, so it could be answered with an act they had just
 * declined to call hard. That produced a `most_frequent` outside `situations`,
 * and the three things that read it disagreed about what to do: the shop ranker
 * discarded it, the day plan scored it top, and the first call routed the whole
 * welcome on it.
 *
 * Narrowing fixes that at the source rather than in three places — membership
 * becomes true by construction — and it removes the thing that made the screen
 * read as a repeat: the same nine options, twice.
 *
 * `not_sure` survives the filter. Someone who cannot rank their own picks has
 * given us a real answer, and taking the option away would force a false one.
 */
function narrowFrequencyOptions(
  question: OnboardingQuestion,
  answers: ActOneAnswers,
): OnboardingQuestion["options"] {
  const picks = realSituations(answers);
  if (picks.length === 0) return question.options;
  const keep = new Set([...picks, "not_sure"]);
  const narrowed = (question.options ?? []).filter((o) =>
    keep.has(String((o as { value?: string }).value)),
  );
  // Count the REAL acts, not the escape hatch. Narrowing to one act plus
  // "not sure" is not a question, it is a formality — and the screen is skipped
  // in that case anyway, so this only matters if the skip is ever bypassed.
  const realCount = narrowed.filter(
    (o) => !ESCAPES.has(String((o as { value?: string }).value)),
  ).length;
  return realCount > 1 ? narrowed : question.options;
}

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
  /**
   * The next screen worth showing after `from`, or `getTotalScreens() + 1` when
   * there is none. Act 1 can skip a screen it already knows the answer to —
   * see `SITUATION_FREQUENCY_KEY` below.
   */
  nextAnswerableScreen: (from: number) => number;
  /**
   * Fill in what a skipped screen would have asked. Called when ADVANCING past
   * one — never during render, because it writes.
   */
  settleSkipped: (from: number, to: number) => void;
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
        return ACT_ONE_FLOW.questions
          .filter((q) => q.screenNumber === target)
          .map((q) =>
            q.adaptiveKey === SITUATION_FREQUENCY_KEY
              ? { ...q, options: narrowFrequencyOptions(q, get().answers) }
              : q,
          );
      },

      /**
       * Walks forward past any screen Act 1 does not need to ask.
       *
       * PURE — it is read during render to decide the Next label, so it must
       * not write. Filling in what a skipped screen would have asked is
       * `settleSkipped`, which runs from the advance handler.
       */
      nextAnswerableScreen: (from: number) => {
        const total = get().getTotalScreens();
        const picks = realSituations(get().answers);
        for (let n = from + 1; n <= total; n += 1) {
          const qs = ACT_ONE_FLOW.questions.filter((q) => q.screenNumber === n);
          const skippable =
            qs.length > 0 &&
            qs.every(
              (q) => q.adaptiveKey === SITUATION_FREQUENCY_KEY && picks.length <= 1,
            );
          if (!skippable) return n;
        }
        return total + 1;
      },

      settleSkipped: (from: number, to: number) => {
        const picks = realSituations(get().answers);
        // Exactly one hard act means it is also the most frequent OF THOSE —
        // that is arithmetic, not a guess, so recording it is honest. None at
        // all means there is nothing to rank: the signal stays unset, and every
        // consumer already falls back correctly.
        if (picks.length !== 1) return;
        for (let n = from + 1; n < to; n += 1) {
          const asks = ACT_ONE_FLOW.questions.some(
            (q) => q.screenNumber === n && q.adaptiveKey === SITUATION_FREQUENCY_KEY,
          );
          if (asks) {
            set((st) => ({
              answers: { ...st.answers, [SITUATION_FREQUENCY_KEY]: picks[0] },
            }));
          }
        }
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
