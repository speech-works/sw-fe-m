/**
 * Shared completion flag for the multi-route Mirror Work flow
 * (Prep → Session → Reflection → Summary).
 *
 * Summary marks the activity here the moment the user submits feedback (before
 * the async completion call). The confirm-on-exit hooks on Session/Reflection/
 * Summary include this in their `isCompleted` check, so the post-completion
 * stack-unwind (when DonePractice navigates away and pops the intermediate
 * routes) does NOT re-trigger a "Save this practice?" prompt.
 */
const completed = new Set<string>();

export const markMirrorWorkCompleted = (activityId: string): void => {
  completed.add(activityId);
};

export const wasMirrorWorkCompleted = (activityId?: string): boolean =>
  !!activityId && completed.has(activityId);
