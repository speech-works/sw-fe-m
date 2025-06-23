import axiosClient from "../axiosClient";
import { PracticeActivity, PracticeActivityContentType } from "./types";

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
      }
    );
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
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error getting current practice activity for session:",
      error
    );
    throw error;
  }
}

interface CreateActivityReq {
  sessionId: string;
  contentType: PracticeActivityContentType;
  contentId: string;
}

// Create a new practice activity
export async function createPracticeActivity({
  sessionId,
  contentId,
  contentType,
}: CreateActivityReq): Promise<PracticeActivity> {
  try {
    console.log("createPracticeActivity called with:", {
      sessionId,
      contentId,
      contentType,
    });
    const response = await axiosClient.post("/practice-activities", {
      sessionId,
      contentId,
      contentType,
    });
    console.log("createPracticeActivity response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating practice activity:", error);
    throw error;
  }
}

interface UpdateActivityReq {
  id: string;
}

// Start a practice activity (update its startedAt timestamp)
export async function startPracticeActivity({
  id,
}: UpdateActivityReq): Promise<PracticeActivity> {
  try {
    const response = await axiosClient.post(`/practice-activities/${id}/start`);
    return response.data;
  } catch (error) {
    console.error("Error starting practice activity:", error);
    throw error;
  }
}

// Complete a practice activity (update its status to COMPLETED)
export async function completePracticeActivity({
  id,
}: UpdateActivityReq): Promise<PracticeActivity> {
  try {
    const response = await axiosClient.post(
      `/practice-activities/${id}/complete`
    );
    return response.data;
  } catch (error) {
    console.error("Error completing practice activity:", error);
    throw error;
  }
}
