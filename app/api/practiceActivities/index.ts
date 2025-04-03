import { PracticeSession } from "../practiceSessions";
import { Script } from "../scripts";
import { API_BASE_URL } from "../constants";
import * as SecureStore from "expo-secure-store";
import { handleErrorsIfAny } from "../helper";

export enum PracticeStepType {
  BREATHING = "BREATHING",
  AFFIRMATION = "AFFIRMATION",
  SMOOTH_SPEECH = "SMOOTH_SPEECH",
  EXPOSURE = "EXPOSURE",
}

export enum PracticeActivityOrder {
  BREATHING = 0,
  AFFIRMATION = 1,
  SMOOTH_SPEECH = 2,
  EXPOSURE = 3,
}

export interface PracticeActivity {
  id: string;
  session: PracticeSession;
  stepType: PracticeStepType;
  script: Script | null;
  status: "ongoing" | "completed";
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// get a practice activity by id
export async function getPracticeActivityById(
  id: string
): Promise<PracticeActivity> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the get practice activity by id operation:",
      error
    );
    throw error;
  }
}

// get all practice activities of a session
export async function getAllActivitiesOfSession(
  sessionId: string,
  stepType: PracticeStepType
): Promise<PracticeActivity[]> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(
      `${API_BASE_URL}/activities?sessionId=${sessionId}?stepType=${stepType}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the get all activities of session operation:",
      error
    );
    throw error;
  }
}

interface CreatePracticeActivityParams {
  sessionId: string;
  stepType: PracticeStepType;
  scriptId?: string;
}
// create a practice activity
export async function createPracticeActivity({
  sessionId,
  stepType,
  scriptId,
}: CreatePracticeActivityParams): Promise<PracticeActivity> {
  // Wait for the token
  const accessToken = await SecureStore.getItemAsync("accessToken");
  try {
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        sessionId,
        stepType,
        scriptId,
      }),
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the create activity operation:",
      error
    );
    throw error;
  }
}

// update a practice activity
export async function updatePracticeActivity(
  activityId: string,
  activityData: {
    status?: "ongoing" | "completed";
    startedAt?: Date;
    completedAt?: Date;
    scriptId?: string | null;
  }
): Promise<PracticeActivity> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/activities/${activityId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(activityData),
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the update activity operation:",
      error
    );
    throw error;
  }
}

// delete a practice activity
export async function deletePracticeActivity(
  activityId: string
): Promise<void> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/activities/${activityId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    await handleErrorsIfAny(response);
  } catch (error) {
    console.error(
      "There was a problem with the delete activity operation:",
      error
    );
    throw error;
  }
}
