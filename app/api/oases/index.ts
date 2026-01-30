// api/oases/index.ts

import axiosClient from "../axiosClient";
import {
  OasesDailyBatch,
  OasesProgress,
  SubmitOasesBatchPayload,
} from "./types";

/**
 * Start or check status of daily OASES collection.
 *
 * @returns 200 OK if started/active.
 * @throws 400 Bad Request if user hasn't completed Phase 1 (Onboarding).
 */
export async function startOasesCollection(): Promise<void> {
  try {
    // Idempotent call to start timer or get active status
    console.log(
      "[API-OASES] Starting OASES collection via POST /oases/collect/start",
    );
    await axiosClient.post("/oases/collect/start");
    console.log("[API-OASES] Successfully started collection.");
  } catch (error: any) {
    if (error.response) {
      console.error(
        "[API-OASES] Error starting OASES collection:",
        error.response.status,
        error.response.data,
      );
    } else {
      console.error(
        "[API-OASES] Error starting OASES collection:",
        error.message,
      );
    }
    throw error;
  }
}

/**
 * Get today's batch of 5-10 questions.
 */
export async function getTodayOasesQuestions(): Promise<OasesDailyBatch> {
  try {
    console.log("[API-OASES] Fetching questions via GET /oases/collect/today");
    const response = await axiosClient.get("/oases/collect/today");
    console.log("[API-OASES] Questions response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[API-OASES] Error fetching OASES questions:", error);
    throw error;
  }
}

/**
 * Submit answers for the current daily batch.
 */
export async function submitOasesBatch(
  payload: SubmitOasesBatchPayload,
): Promise<void> {
  try {
    await axiosClient.post("/oases/collect/submit", payload);
  } catch (error) {
    console.error("Error submitting OASES batch:", error);
    throw error;
  }
}

/**
 * Get overall progress for the OASES 7-day flow.
 */
export async function getOasesProgress(): Promise<OasesProgress> {
  try {
    console.log(
      "[API-OASES] Fetching progress via GET /oases/collect/progress",
    );
    const response = await axiosClient.get("/oases/collect/progress");
    console.log("[API-OASES] Progress response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[API-OASES] Error fetching OASES progress:", error);
    throw error;
  }
}
