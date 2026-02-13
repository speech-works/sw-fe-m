import axios from "axios";
import axiosClient from "../axiosClient";
import { PracticeActivity, PracticeActivityContentType } from "./types";
import { triggerToast } from "../../util/functions/toast";
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

interface CreateActivityReq {
  sessionId?: string; // Optional (if pack context provided)
  packId?: string;
  moduleId?: string;
  contentType: PracticeActivityContentType;
  contentId: string;
}

// Create a new practice activity
export async function createPracticeActivity({
  sessionId,
  packId,
  moduleId,
  contentId,
  contentType,
}: CreateActivityReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivity called with:", {
      sessionId,
      packId,
      moduleId,
      contentId,
      contentType,
    });

    // Validate: Either sessionId OR (packId + moduleId) is required
    if (!sessionId && (!packId || !moduleId)) {
      throw new Error(
        "Missing context: require sessionId OR (packId + moduleId)",
      );
    }

    const payload: any = {
      contentId,
      contentType,
    };

    if (sessionId) payload.sessionId = sessionId;
    if (packId) payload.packId = packId;
    if (moduleId) payload.moduleId = moduleId;

    const response = await axiosClient.post("/practice-activities", payload);
    console.log("createPracticeActivity response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity:", error);
    throw error;
  }
}

interface UpdateActivityReq {
  id: string;
  userId: string;
}

// Start a practice activity (update its startedAt timestamp)
export async function startPracticeActivity({
  id,
  userId,
}: UpdateActivityReq): Promise<PracticeActivity> {
  console.log("in startPracticeActivity", { id, userId });
  try {
    const response = await axiosClient.post(
      `/practice-activities/${id}/start`,
      { userId },
    );
    return response.data;
  } catch (error) {
    //console.error("Error starting practice activity:", error);
    if (axios.isAxiosError(error) && error.response) {
      //console.error("Backend error details:", error.response.data);
      dispatchCustomEvent(EVENT_NAMES.SHOW_ERROR_MODAL, {
        errorMessage:
          error.response.data.error ||
          "An error occurred while starting the activity.",
        modalTitle: "Try later",
      });
      // triggerToast(
      //   "error",
      //   "Try Later",
      //   error.response.data.error ||
      //     "An error occurred while starting the activity."
      // );
    }
    throw error;
  }
}

// Complete a practice activity (update its status to COMPLETED)
export async function completePracticeActivity({
  id,
  userId,
  vitals,
}: UpdateActivityReq & {
  vitals?: {
    effortScore?: number;
    autonomyScore?: number;
    accuracyScore?: number;
  };
}): Promise<PracticeActivity> {
  try {
    const requestBody = {
      userId,
      ...vitals, // Spread vitals if provided
    };
    const response = await axiosClient.post(
      `/practice-activities/${id}/complete`,
      requestBody,
    );
    return response.data;
  } catch (error) {
    console.error("Error completing practice activity:", error);
    throw error;
  }
}
