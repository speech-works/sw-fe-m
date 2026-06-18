// onboarding/helper.ts

import { OnboardingFlow, OnboardingQuestion } from "./types";

/**
 * Normalize an onboarding flow:
 * - Ensures consistent ordering of screens & options
 * - Makes data frontend-safe
 */
export function normalizeOnboardingFlow(flow: OnboardingFlow): OnboardingFlow {
  const sortedQuestions = [...flow.questions].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const normalizedQuestions: OnboardingQuestion[] = sortedQuestions.map(
    (q: any) => ({
      ...q,
      // Backend might send 'question' or 'text' instead of 'questionText'
      questionText: q.questionText ?? q.question ?? q.text ?? "",
      // Force all questions to be required unless explicitly saying false
      isRequired: q.isRequired !== false,
      options: [...(q.options ?? [])]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((opt: any) => ({
          ...opt,
          // Backend might send 'answer' or 'text' instead of 'optionText'
          optionText: opt.optionText ?? opt.answer ?? opt.text ?? "",
          id: opt.id ?? `opt-${Math.random().toString(36).substr(2, 9)}`, // Fallback ID to prevent key warnings
        })),
    }),
  );

  return {
    ...flow,
    questions: normalizedQuestions,
  };
}