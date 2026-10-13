/**
 * What the quiz's one button would do right now, for a host that draws that
 * button itself (a program day's bottom bar). Kept pure so the choice is
 * testable without a React Native tree.
 *
 *   "none"  nothing to press: no answer picked yet, or the last answer has
 *           been explained and the quiz is over.
 *   "check" an answer is picked and not yet explained.
 *   "next"  an answer has been explained and another question follows (or,
 *           without explanations, an answer is picked).
 */
export type QuizFooterAction = "none" | "check" | "next";

export interface QuizFooterState {
  action: QuizFooterAction;
  /** An answer is being sent. The host shows its button as loading. */
  busy: boolean;
}

export const NO_QUIZ_FOOTER: QuizFooterState = { action: "none", busy: false };

export function quizFooterAction({
  hasSelection,
  revealed,
  isLast,
  revealExplanation,
}: {
  hasSelection: boolean;
  revealed: boolean;
  isLast: boolean;
  revealExplanation: boolean;
}): QuizFooterAction {
  if (!hasSelection) return "none";
  if (!revealExplanation) return "next";
  if (!revealed) return "check";
  return isLast ? "none" : "next";
}
