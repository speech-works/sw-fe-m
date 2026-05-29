// api/forms/index.ts

import axiosClient from "../axiosClient";
import { FormContext, FormSubmitResponse, FormSubmitRequest } from "./types";

/**
 * Submit a form response.
 * Used for exposure feedback, pack reflections, etc.
 *
 * Note: Mood checks use the dedicated /mood-check endpoint (app/api/moodCheck).
 *
 * @param formId - The UUID of the form to submit
 * @param answers - Key-value pairs of question answers
 * @param context - Optional context (packId, moduleId, activityId)
 * @returns The saved form response
 */
export async function submitFormResponse(
  formId: string,
  answers: Record<string, any>,
  context?: FormContext,
): Promise<FormSubmitResponse> {
  try {
    const payload: FormSubmitRequest = { answers };
    if (context) {
      payload.context = context;
    }

    const response = await axiosClient.post<FormSubmitResponse>(
      `/forms/${formId}/submit`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
