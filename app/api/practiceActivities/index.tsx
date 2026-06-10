import axios from "axios";
import axiosClient from "../axiosClient";
import { PracticeActivity, PracticeActivityContentType } from "./types";
import { ToolType } from "../tools/types";

import { EVENT_NAMES } from "../../stores/events/constants";
import { dispatchCustomEvent } from "../../util/functions/events";

interface GetActivitiesBySessionIdReq {
  sessionId: string;
  includeContent?: boolean;
}

export async function getAllPracticeActivitiesBySessionId({
  sessionId,
  includeContent = false,
}: GetActivitiesBySessionIdReq): Promise<PracticeActivity[]> {
  try {
    const response = await axiosClient.get(
      `/practice-activities/session/${sessionId}`,
      {
        params: {
          includeContent,
        },
      },
    );
    console.log("getAllPracticeActivitiesBySessionId", { response });
    return response.data;
  } catch (error) {
    console.error("Error getting practice activities by session ID:", error);
    throw error;
  }
}

export async function getCurrentPracticeActivityForSession({
  sessionId,
  includeContent,
}: GetActivitiesBySessionIdReq): Promise<PracticeActivity> {
  try {
    const response = await axiosClient.get(
      `/practice-activities/session/${sessionId}/current`,
      {
        params: {
          includeContent,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error getting current practice activity for session:",
      error,
    );
    throw error;
  }
}

interface CreateActivitySessionReq {
  sessionId?: string; // Optional: backend handles auto-session creation
  contentType: PracticeActivityContentType;
  contentId: string;
}

interface CreateActivityPackReq {
  packId?: string; // Optional: backend handles auto-session creation
  moduleId?: string; // Optional: backend handles auto-session creation
  contentType: PracticeActivityContentType;
  contentId: string;
}

// Create a new practice activity (Session Context)
export async function createPracticeActivity({
  sessionId,
  contentId,
  contentType,
}: CreateActivitySessionReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivity called with:", {
      sessionId,
      contentId,
      contentType,
    });

    const payload = {
      sessionId,
      contentId,
      contentType,
    };

    const response = await axiosClient.post("/practice-activities", payload);
    console.log("createPracticeActivity response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity:", error);
    throw error;
  }
}

// Create a new practice activity (Pack Context)
export async function createPracticeActivityFromPack({
  packId,
  moduleId,
  contentId,
  contentType,
}: CreateActivityPackReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivityFromPack called with:", {
      packId,
      moduleId,
      contentId,
      contentType,
    });

    const payload = {
      packId,
      moduleId,
      contentId,
      contentType,
    };

    const response = await axiosClient.post("/practice-activities", payload);
    console.log("createPracticeActivityFromPack response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity from pack:", error);
    throw error;
  }
}

interface UpdateActivityReq {
  id: string;
  userId: string;
  packId?: string;
  moduleId?: string;
  refundResources?: boolean;
}

// Start a practice activity (update its startedAt timestamp)
export async function startPracticeActivity({
  id,
  userId,
}: UpdateActivityReq): Promise<PracticeActivity> {
  console.log(">> API: Starting Practice Activity", { id, userId });
  try {
    const response = await axiosClient.post(
      `/practice-activities/${id}/start`,
      { userId },
    );
    console.log(
      "<< API: Practice Activity Started Successfully",
      response.data,
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const { errorCode, error: backendError } = error.response.data;

      if (errorCode === "INSUFFICIENT_STAMINA") {
        dispatchCustomEvent(EVENT_NAMES.SHOW_STAMINA_UPSELL, {
          errorMessage: backendError,
        });
      } else {
        dispatchCustomEvent(EVENT_NAMES.SHOW_ERROR_MODAL, {
          errorMessage:
            error.response.data.error ||
            "An error occurred while starting the activity.",
          modalTitle: "Try later",
        });
      }
    }
    throw error;
  }
}

// Complete a practice activity (update its status to COMPLETED)
export async function completePracticeActivity({
  id,
  userId,
  packId,
  moduleId,
  vitals,
  toolsUsed,
}: UpdateActivityReq & {
  vitals?: {
    effortScore?: number;
    autonomyScore?: number;
    accuracyScore?: number;
  };
  /** Fluency tools actually activated during this activity (DAF/Chorus/...). */
  toolsUsed?: ToolType[];
}): Promise<PracticeActivity> {
  try {
    const requestBody: any = {
      userId,
      ...vitals, // Spread vitals if provided
    };

    if (packId) requestBody.packId = packId;
    if (moduleId) requestBody.moduleId = moduleId;
    if (toolsUsed && toolsUsed.length > 0) requestBody.toolsUsed = toolsUsed;

    console.log(">> API: Completing Practice Activity", { id, requestBody });
    const response = await axiosClient.post(
      `/practice-activities/${id}/complete`,
      requestBody,
    );
    console.log(
      "<< API: Practice Activity Completed Successfully",
      response.data,
    );
    return response.data;
  } catch (error) {
    console.error("Error completing practice activity:", error);
    throw error;
  }
}

export interface MirrorWorkCompletionApiPayload {
  detectedSignals: Record<string, { eventCount: number }>;
  awarenessScores: {
    gazeMaintained: number;
    jawEase: number;
    lipEase: number;
    overallEaseScore: number;
  };
  vitals: {
    effortScore: number;
    autonomyScore: number;
  };
  detectionAccuracyRating: number;
  reflectionText: string;
  promptsAttempted: number;
  nudgeMode: 'ON' | 'OFF';
  sessionDurationSeconds: number;
}

/**
 * Complete a Mirror Work practice activity.
 *
 * Calls the dedicated POST /practice-activities/{id}/complete-mirror-work
 * endpoint, which stores the full session payload (signals, scores, vitals,
 * reflection) and feeds overallEaseScore into the IMPAIRMENT_STRUGGLE
 * clinical domain trend.
 */
export async function completeMirrorWorkActivity(
  id: string,
  userId: string,
  mirrorWorkPayload: MirrorWorkCompletionApiPayload,
): Promise<PracticeActivity> {
  console.log('>> API: Completing Mirror Work Activity', { id, mirrorWorkPayload });
  const response = await axiosClient.post(
    `/practice-activities/${id}/complete-mirror-work`,
    { userId, mirrorWorkPayload },
  );
  console.log('<< API: Mirror Work Activity Completed Successfully', response.data);
  return response.data;
}



// Abort a practice activity (update its status to ABORTED)
export async function abortPracticeActivity({
  id,
  userId,
  packId,
  moduleId,
  refundResources,
}: UpdateActivityReq): Promise<PracticeActivity> {
  try {
    const requestBody: any = { userId };
    if (packId) requestBody.packId = packId;
    if (moduleId) requestBody.moduleId = moduleId;
    if (refundResources) requestBody.refundResources = true;

    console.log(">> API: Aborting Practice Activity", { id, requestBody });
    const response = await axiosClient.patch(
      `/practice-activities/${id}`,
      { status: "ABORTED", ...requestBody },
    );
    console.log("<< API: Practice Activity Aborted Successfully", response.data);
    return response.data;
  } catch (error) {
    console.error("Error aborting practice activity:", error);
    throw error;
  }
}

// Fetch a specific practice activity by ID
export async function getPracticeActivity(
  id: string,
): Promise<PracticeActivity> {
  console.log("Fetching practice activity:", id);
  const response = await axiosClient.get(
    `/practice-activities/${id}?includeContent=true`,
  );
  return response.data;
}

// Shape of the AI-generated post-call feedback report (mirrors the backend).
export interface PhoneCallReportData {
  headline: string;
  summary: string;
  what_went_well: string[];
  areas_to_improve: string[];
  handled_pressure?: string;
  scores?: { confidence: number; clarity: number; engagement: number };
  score_rationale?: { confidence: string; clarity: string; engagement: string };
  disfluency_moments?: { quote: string; note?: string }[];
  suggested_next_practice?: string;
  encouragement: string;
  // The conversation transcript, returned so the user can verify the report.
  transcript?: string;
}

/**
 * Generate (and cache) the AI post-call feedback report for a completed
 * phone-call practice. The backend generates it from the saved transcript on
 * the first call, then returns the cached report on subsequent calls. We allow
 * extra time because the first call runs an LLM generation.
 */
export async function getPhoneCallReport(
  practiceActivityId: string,
): Promise<PhoneCallReportData | null> {
  try {
    console.log(">> API: Generating phone-call report", { practiceActivityId });
    const response = await axiosClient.post(
      `/practice-activities/${practiceActivityId}/phone-call-report`,
      {},
      { timeout: 30000 },
    );
    // 204 = no report for this call (e.g. running on the Groq provider). Empty
    // body → treat as "no report" so the app skips straight to the done flow.
    if (response.status === 204 || !response.data) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error("Error generating phone call report:", error);
    throw error;
  }
}
