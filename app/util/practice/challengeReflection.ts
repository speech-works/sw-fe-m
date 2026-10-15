/**
 * Whether a real-life challenge step finishes straight from "Log My
 * Experience", with no reflection page (step 2).
 *
 * A program day says it asks nothing after a step by setting the step's
 * completion prompt to an empty string (`completionPromptOverride: ""` on the
 * server, which reaches this screen as `completionCriteria: ""`). With no
 * question there is nothing to put over the box, so the page is skipped and
 * the step is completed.
 *
 * Only in a program. Outside one, and whenever the prompt is missing, the page
 * stays as it always was, with the screen's own default question.
 */
export function skipsReflection(
  packId: string | null | undefined,
  completionCriteria: unknown,
): boolean {
  return (
    !!packId &&
    typeof completionCriteria === "string" &&
    completionCriteria.trim() === ""
  );
}
