import { useOnboardingStore } from "../../stores/onboarding";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { OnboardingFlow, OnboardingQuestion } from "../../api/onboarding/types";
import { ACT_ONE_FLOW } from "../../constants/onboardingActOne";

/**
 * Where the question screen gets its questions and puts its answers.
 *
 * Two flows use the same screen:
 *
 *   PRE-AUTH  — the five Act-1 questions, bundled in the app, answers held on
 *               the device. There is no account yet, so nothing may be sent.
 *   POST-AUTH — the full flow fetched from the server, answers submitted as the
 *               person goes.
 *
 * They differ in exactly two ways: where the data lives, and whether answering
 * transmits. Everything else — layout, validation, progress, auto-advance, the
 * back-swipe-to-revise behaviour — is identical, so the screen is shared rather
 * than forked. It carries three separately-documented race fixes (the hook-order
 * guard, the `isAdvancing` double-fire latch, the `hasFlow` dependency); a copy
 * would quietly lose them the first time someone fixed a bug on one side only.
 */
export interface QuestionSource {
  flow: OnboardingFlow | null;
  answers: Record<string, any>;
  setAnswer: (key: string, value: string | string[]) => void;
  getCurrentScreenQuestions: (screenNum?: number) => OnboardingQuestion[];
  isCurrentScreenValid: (screenNum?: number) => boolean;
  nextScreen: () => void;
  /** False pre-auth: answers stay on the device until an account exists. */
  canSubmitToServer: boolean;
}

/**
 * Both stores are subscribed unconditionally — hooks cannot be called
 * conditionally, and subscribing to a zustand store you then ignore is cheap.
 * Only the returned adapter differs.
 */
export function useQuestionSource(preAuth: boolean): QuestionSource {
  const onboarding = useOnboardingStore();
  const draft = useOnboardingDraftStore();

  if (preAuth) {
    return {
      flow: ACT_ONE_FLOW,
      answers: draft.answers,
      setAnswer: draft.setAnswer,
      getCurrentScreenQuestions: draft.getCurrentScreenQuestions,
      isCurrentScreenValid: draft.isCurrentScreenValid,
      nextScreen: draft.nextScreen,
      canSubmitToServer: false,
    };
  }

  return {
    flow: onboarding.flow,
    answers: onboarding.answers,
    setAnswer: onboarding.setAnswer,
    getCurrentScreenQuestions: onboarding.getCurrentScreenQuestions,
    isCurrentScreenValid: onboarding.isCurrentScreenValid,
    nextScreen: onboarding.nextScreen,
    canSubmitToServer: true,
  };
}
