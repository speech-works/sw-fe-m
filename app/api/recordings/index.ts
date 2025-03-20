import { PracticeActivity } from "../practiceActivities";
import { User } from "../users";
import { API_BASE_URL } from "..";

export interface Recording {
  id: string;
  user: User;
  activity: PracticeActivity;
  audioUrl: string;
  duration: number | null;
  mimeType: string;
  createdAt: Date;
}

// get all recordings of user or practice activity
export async function getAllRecordings(
  userId: string,
  activityId: string
): Promise<Recording[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/recordings?userId=${userId}&activityId=${activityId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the get all recordings operation:",
      error
    );
    throw error;
  }
}

// get recording by id
export async function getRecordingById(
  recordingId: string
): Promise<Recording> {
  try {
    const response = await fetch(`${API_BASE_URL}/recordings/${recordingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the get recording by id operation:",
      error
    );
    throw error;
  }
}

// create a recording
interface CreateRecordingReq {
  userId: string;
  activityId: string;
  audioUrl: string;
  duration?: number;
  mimeType?: string;
}
export async function createRecording({
  userId,
  activityId,
  audioUrl,
  duration,
  mimeType,
}: CreateRecordingReq): Promise<Recording | { error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/recordings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        activityId,
        audioUrl,
        duration,
        mimeType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the create recording operation:",
      error
    );
    throw error;
  }
}
