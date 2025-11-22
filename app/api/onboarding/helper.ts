// onboarding/helper.ts

import { OnboardingFlow, OnboardingQuestion, OnboardingOption } from "./types";

/**
 * Normalize an onboarding flow:
 * - Ensures consistent ordering of screens & options
 * - Makes data frontend-safe
 */
export function normalizeOnboardingFlow(flow: OnboardingFlow): OnboardingFlow {
  const sortedQuestions = [...flow.questions].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const normalizedQuestions: OnboardingQuestion[] = sortedQuestions.map(
    (q) => ({
      ...q,
      options: [...(q.options ?? [])].sort(
        (a, b) => a.orderIndex - b.orderIndex
      ),
    })
  );

  return {
    ...flow,
    questions: normalizedQuestions,
  };
}

/**
 * Extract only the question list, grouped by screen number.
 * Optional helper if UI needs grouping.
 */
export function groupQuestionsByScreen(flow: OnboardingFlow) {
  const screenMap: Record<number, OnboardingQuestion[]> = {};

  flow.questions.forEach((q) => {
    if (!screenMap[q.screenNumber]) {
      screenMap[q.screenNumber] = [];
    }
    screenMap[q.screenNumber].push(q);
  });

  Object.values(screenMap).forEach((screenQs) =>
    screenQs.sort((a, b) => a.orderIndex - b.orderIndex)
  );

  return screenMap;
}
