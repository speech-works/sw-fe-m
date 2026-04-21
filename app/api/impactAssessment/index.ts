// api/impactAssessment/index.ts

import axiosClient from "../axiosClient";
import {
    ImpactAssessmentDailyBatch,
    ImpactAssessmentProgress,
    SubmitImpactAssessmentBatchPayload,
} from "./types";

/**
 * Start or check status of the daily impact assessment flow.
 */
export async function startImpactAssessmentCollection(): Promise<void> {
  try {
    console.log(
      "[API-ImpactAssessment] Starting impact assessment via POST /impact-assessment/collect/start",
    );
    await axiosClient.post("/impact-assessment/collect/start");
    console.log("[API-ImpactAssessment] Successfully started collection.");
  } catch (error: any) {
    if (error.response) {
      console.error(
        "[API-ImpactAssessment] Error starting impact assessment:",
        error.response.status,
        error.response.data,
      );
    } else {
      console.error(
        "[API-ImpactAssessment] Error starting impact assessment:",
        error.message,
      );
    }
    throw error;
  }
}

/**
 * Get today's batch of 5-10 questions.
 */
export async function getTodayImpactAssessmentQuestions(): Promise<ImpactAssessmentDailyBatch> {
  try {
    console.log(
      "[API-ImpactAssessment] Fetching questions via GET /impact-assessment/collect/today",
    );
    const response = await axiosClient.get("/impact-assessment/collect/today");
    console.log("[API-ImpactAssessment] Questions response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "[API-ImpactAssessment] Error fetching impact assessment questions:",
      error,
    );
    throw error;
  }
}

/**
 * Submit answers for the current daily batch.
 */
export async function submitImpactAssessmentBatch(
  payload: SubmitImpactAssessmentBatchPayload,
): Promise<void> {
  try {
    await axiosClient.post("/impact-assessment/collect/submit", payload);
  } catch (error) {
    console.error(
      "[API-ImpactAssessment] Error submitting impact assessment batch:",
      error,
    );
    throw error;
  }
}

/**
 * Get overall progress for the 7-day impact assessment flow.
 */
export async function getImpactAssessmentProgress(): Promise<ImpactAssessmentProgress> {
  try {
    console.log(
      "[API-ImpactAssessment] Fetching progress via GET /impact-assessment/collect/progress",
    );
    const response = await axiosClient.get("/impact-assessment/collect/progress");
    console.log("[API-ImpactAssessment] Progress response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "[API-ImpactAssessment] Error fetching impact assessment progress:",
      error,
    );
    throw error;
  }
}
