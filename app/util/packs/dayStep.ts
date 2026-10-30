/**
 * The step a person left a day on, so Continue opens there. Kept on the phone
 * by step id: a day's steps can change between visits, and an index would then
 * point at the wrong one.
 */
export const dayStepKey = (packId: string, moduleId: string) =>
  `pack-${packId}-module-${moduleId}-step`;

/** Where the saved step is now. A step no longer in the day opens at step 1. */
export function resumeStepIndex(
  blocks: ReadonlyArray<{ id: string }> | undefined,
  savedStepId: string | null,
): number {
  if (!blocks || !savedStepId) return 0;
  return Math.max(0, blocks.findIndex((block) => block.id === savedStepId));
}
