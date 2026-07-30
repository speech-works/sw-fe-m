import type { OnboardingFlow, OnboardingQuestion } from "../../api/onboarding/types";

/**
 * What's left of onboarding, measured in ANSWERS rather than position.
 *
 * The app used to describe progress with `currentScreen` — where somebody last
 * was. That is not the same as what they have done, and the gap between the two
 * produced a Home card reading "Step 13 of 13" with a full bar and twelve
 * questions unanswered. It also cannot describe a person with a hole in the
 * middle, which is exactly what skipping Act 1 and answering Act 2 creates.
 *
 * These are pure so the rules live somewhere testable, and so the same
 * definition of "answered" is used everywhere instead of being re-implemented
 * per caller (it was written out four separate times across the two stores and
 * the backend, which is how they drifted apart).
 */

/** The key an answer is filed under. Prefers the stable adaptive key. */
export function answerKey(q: Pick<OnboardingQuestion, "adaptiveKey" | "id">): string {
  return (q.adaptiveKey as string) ?? q.id;
}

/**
 * Has this actually been answered?
 *
 * Present-but-empty is NOT answered — an empty array is what a multi-select
 * leaves behind when somebody taps an option and unpicks it, and treating that
 * as progress made the app offer to "resume" a flow nobody had started.
 */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/** Required questions only — this must agree with the server's completion rule. */
function requiredQuestions(flow: OnboardingFlow): OnboardingQuestion[] {
  return (flow?.questions ?? []).filter((q) => q.isRequired !== false);
}

/**
 * How much of the flow is genuinely done.
 *
 * Counts REQUIRED questions only, so the number the card shows agrees with the
 * server's `isFlowComplete` — otherwise the card could read "13 of 13" while
 * the account is still marked incomplete, which is the contradiction this whole
 * pass exists to remove.
 */
export function answeredRequiredCount(
  flow: OnboardingFlow | null,
  answers: Record<string, any>,
): { answered: number; total: number } {
  if (!flow) return { answered: 0, total: 0 };
  const required = requiredQuestions(flow);
  const answered = required.filter((q) =>
    isAnswered(answers?.[answerKey(q)]),
  ).length;
  return { answered, total: required.length };
}

/**
 * The next question they'd actually be asked — used for the card's subtitle.
 *
 * Naming the real question is the only wording that stays true whether the gap
 * is in Act 1, Act 2, or both.
 */
export function nextUnansweredQuestion(
  flow: OnboardingFlow | null,
  answers: Record<string, any>,
): OnboardingQuestion | null {
  if (!flow) return null;
  const sorted = [...requiredQuestions(flow)].sort(
    (a, b) => a.screenNumber - b.screenNumber || a.orderIndex - b.orderIndex,
  );
  return sorted.find((q) => !isAnswered(answers?.[answerKey(q)])) ?? null;
}
