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
