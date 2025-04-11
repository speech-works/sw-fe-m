import { PracticeActivity } from "../practiceActivities";
import { User } from "../users";
import { API_BASE_URL } from "../constants";
import { handleErrorsIfAny } from "../helper";
import * as SecureStore from "expo-secure-store";

export interface Recording {
  id: string;
  user: User;
  activity: PracticeActivity;
  audioUrl: string;
  duration: number | null;
  mimeType: string;
  createdAt: Date;
}

export async function getLatestRecording(
  userId?: string,
  activityId?: string,
  scriptId?: string
): Promise<Recording> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    let queryParams = "";
    if (userId !== undefined) {
      queryParams += `userId=${userId}&`;
    }
    if (activityId !== undefined) {
      queryParams += `activityId=${activityId}&`;
    }
    if (scriptId !== undefined) {
      queryParams += `scriptId=${scriptId}&`;
    }

    // Remove the trailing '&' if there are any query parameters
    if (queryParams.endsWith("&")) {
      queryParams = queryParams.slice(0, -1);
    }

    const url = `${API_BASE_URL}/recordings/latest${
      queryParams ? `?${queryParams}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.log(
      "There was a problem with the get recording by id operation:",
      error
    );
    throw error;
  }
}
// get all recordings of user or practice activity / script
export async function getAllRecordings(
  userId?: string,
  activityId?: string,
  scriptId?: string
): Promise<Recording[]> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");

    let queryParams = "";
    if (userId !== undefined) {
      queryParams += `userId=${userId}&`;
    }
    if (activityId !== undefined) {
      queryParams += `activityId=${activityId}&`;
    }
    if (scriptId !== undefined) {
      queryParams += `scriptId=${scriptId}&`;
    }

    // Remove the trailing '&' if there are any query parameters
    if (queryParams.endsWith("&")) {
      queryParams = queryParams.slice(0, -1);
    }

    const url = `${API_BASE_URL}/recordings${
      queryParams ? `?${queryParams}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
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
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/recordings/${recordingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
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
  scriptId: string;
  audioUrl: string;
  duration?: number;
  mimeType?: string;
}
export async function createRecording({
  userId,
  activityId,
  scriptId,
  audioUrl,
  duration,
  mimeType,
}: CreateRecordingReq): Promise<Recording> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/recordings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        activityId,
        scriptId,
        audioUrl,
        duration,
        mimeType,
      }),
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the create recording operation:",
      error
    );
    throw error;
  }
}

export async function getUploadUrl(fileName: string, fileType: string) {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(
      `${API_BASE_URL}/recordings/generateUploadUrl?fileName=${encodeURIComponent(
        fileName
      )}&fileType=${encodeURIComponent(fileType)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    return data.uploadURL;
  } catch (error) {
    console.error(
      "There was a problem with the getUploadUrl operation:",
      error
    );
    throw error;
  }
}

export async function getDownloadUrl(fileName: string) {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(
      `${API_BASE_URL}/recordings/generateDownloadUrl?fileName=${encodeURIComponent(
        fileName
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const data = await response.json();
    return data.downloadURL;
  } catch (error) {
    console.error(
      "There was a problem with the getDownloadUrl operation:",
      error
    );
    throw error;
  }
}
