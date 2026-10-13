/**
 * The headline on the finish screen, and whether confetti falls behind it.
 *
 * Kept pure so the choice is testable without a React Native tree.
 *
 * INSIDE A PROGRAM IT IS "Step done", PLAINLY. The screen cannot tell a full
 * rep from a smaller version or a step somebody opened and closed, and the
 * program asks for all three. "Great Job!" with confetti over a step done
 * halfway reads as the app not having noticed, so a program step gets a
 * statement of fact and no celebration. Outside programs nothing changes.
 */
export function donePracticeHeadline({
  isAborted,
  inProgram,
}: {
  isAborted: boolean;
  inProgram: boolean;
}): { title: string; confetti: boolean } {
  if (isAborted) return { title: "That's okay.", confetti: false };
  if (inProgram) return { title: "Step done", confetti: false };
  return { title: "Great Job!", confetti: true };
}
