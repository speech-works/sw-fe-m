import axios from "axios";
import axiosClient from "../axiosClient";
import { PracticeActivity, PracticeActivityContentType } from "./types";

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
    //console.error("Error starting practice activity:", error);
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
}: UpdateActivityReq & {
  vitals?: {
    effortScore?: number;
    autonomyScore?: number;
    accuracyScore?: number;
  };
}): Promise<PracticeActivity> {
  try {
    const requestBody: any = {
      userId,
      ...vitals, // Spread vitals if provided
    };

    if (packId) requestBody.packId = packId;
    if (moduleId) requestBody.moduleId = moduleId;

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
