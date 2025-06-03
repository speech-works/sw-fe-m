import axiosClient from "../axiosClient";
import { PracticeSession } from "../practiceSessions";
import { Script } from "../scripts";

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
    const response = await axiosClient.get(`/activities/${id}`);
    return response.data;
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
    const response = await axiosClient.get("/activities", {
      params: { sessionId, stepType },
    });
    return response.data;
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
  try {
    console.log("Creating practice activity...", {
      sessionId,
      stepType,
      scriptId,
    });
    const response = await axiosClient.post("/activities", {
      sessionId,
      stepType,
      scriptId,
    });
    return response.data;
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
    const response = await axiosClient.patch(
      `/activities/${activityId}`,
      activityData
    );
    return response.data;
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
    await axiosClient.delete(`/activities/${activityId}`);
  } catch (error) {
    console.error(
      "There was a problem with the delete activity operation:",
      error
    );
    throw error;
  }
}
