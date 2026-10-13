import type { QuizFooterAction } from "../../components/Quiz/quizFooter";

/**
 * The primary button in a program day's bottom bar.
 *
 * WHY A QUIZ STEP DRIVES IT. The quiz's own Check button sat at the bottom of
 * the card, below the fold once the options and question were on screen, while
 * the bar showed "Skip". People picked an answer, saw only "Skip", and tapped
 * it. So while a quiz answer is waiting to be checked, or another question
 * follows an explained one, the bar is the quiz's button.
 *
 * While an answer is being sent the bar stays the quiz's (loading) button. On
 * the last question the quiz has nothing left to press at that point, and
 * the bar would otherwise show "Skip" for a moment under the finger that just
 * tapped Check.
 *
 * Kept pure so the choice is testable without a React Native tree.
 */
export type PackFooterKind =
  | "quizCheck"
  | "quizNext"
  | "skip"
  | "next"
  | "complete";

export function packFooterKind({
  quizAction,
  quizBusy = false,
  isInteractive,
  isCompleted,
  isLastBlock,
}: {
  quizAction: QuizFooterAction;
  quizBusy?: boolean;
  isInteractive: boolean;
  isCompleted: boolean;
  isLastBlock: boolean;
}): PackFooterKind {
  if (quizBusy) return quizAction === "next" ? "quizNext" : "quizCheck";
  if (quizAction === "check") return "quizCheck";
  if (quizAction === "next") return "quizNext";
  if (isInteractive && !isCompleted) return "skip";
  return isLastBlock ? "complete" : "next";
}
