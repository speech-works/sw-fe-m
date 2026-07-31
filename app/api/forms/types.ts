// api/forms/types.ts

/**
 * Request body for submitting form answers.
 * Used for exposure feedback, pack reflections, etc.
 * Note: Mood checks use the dedicated /mood-check endpoint instead.
 */
export interface FormSubmitRequest {
  answers: Record<string, any>;
  context?: FormContext;
}

export interface FormContext {
  packId?: string;
  moduleId?: string;
  activityId?: string;
}

/**
 * Response from form submission.
 */
export interface FormResponse {
  id: string;
  formKey: string; // e.g., "exposure.feedback"
  answers: Record<string, any>;
  context?: FormContext;
  promotedToClinical: boolean;
  promotedAt: string | null;
  createdAt: string;
}

/**
 * Combined response from form submission.
 */
/**
 * A `breakthrough: BreakthroughMetadata | null` used to ride along here and
 * drive a celebration modal. It is deleted, and the reason is not the modal.
 *
 * Its axes were `mastery | ease | courage | confidence | social` — the five
 * clinical domains taken off every screen in `baa856f7` because they are
 * written twice in a user's life and then frozen. This one surface survived
 * that sweep in a different file, and it rendered them by name with a raw
 * score: "Ease Evolved", "Now at 62".
 *
 * "Ease" in a stuttering app is read as MY SPEECH GOT EASIER. That is the
 * single claim this product refuses to make — the reason a growth axis was
 * renamed from Steadier to Finisher, the reason four push notifications were
 * rewritten, and the reason a `+Ease` chip was deleted before it could ever
 * reach another user's feed. This one could reach the user directly, and did:
 * the server genuinely populates it on a 5-point shift.
 *
 * Every submit now takes the ordinary success path, which already existed as
 * the fallback branch, so nothing is left without an outcome.
 */
export interface FormSubmitResponse {
  response: FormResponse;
}
