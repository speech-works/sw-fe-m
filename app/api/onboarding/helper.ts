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
        .map((opt: any) => {
          // THE `id` IS THE ANSWER — it is what gets submitted and stored.
          //
          // This used to be `opt.id ?? \`opt-${Math.random()...}\``, a fallback
          // added to silence React key warnings. But the server never sends an
          // `id` on an option (they carry only text/value/orderIndex), so that
          // fallback ALWAYS fired — and the option picker submits this field as
          // the answer. Every onboarding answer was therefore a random string
          // like "opt-lxxk5rw21", which nothing downstream can read: the
          // clinical snapshot fell back to the population mean for all five
          // domains, stated-situation matching never matched, and the shop's
          // "you said X" badge silently degraded to a clinical guess.
          //
          // `value` is what every consumer compares against (SpeechSituation,
          // AvoidanceFrequency, SpeechGoal...), so it is the only correct
          // answer token. This mirrors the assessment flow, which already does
          // `id: String(opt.value)` for exactly this reason.
          const answerToken = opt.value ?? opt.orderIndex;
          if (__DEV__ && opt.value === undefined) {
            console.warn(
              `[onboarding] Option "${opt.text ?? opt.answer}" has no \`value\` — falling back to orderIndex. This is a seed defect; the stored answer will not match any enum.`,
            );
          }
          return {
            ...opt,
            // Backend might send 'answer' or 'text' instead of 'optionText'
            optionText: opt.optionText ?? opt.answer ?? opt.text ?? "",
            id: String(answerToken),
          };
        }),
    }),
  );

  return {
    ...flow,
    questions: normalizedQuestions,
  };
}