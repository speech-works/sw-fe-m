import axiosClient from "../axiosClient";
import { generateUploadUrl } from "../file-handling";
import {
  Recording,
  CreateRecordingPayload,
  RecordingQueryParams,
} from "./types";

/**
 * Fetch recordings by optional userId and/or activityId
 */
export async function getRecordings(
  params?: RecordingQueryParams
): Promise<Recording[]> {
  try {
    const response = await axiosClient.get<Recording[]>("/recordings", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with the getRecordings API call:",
      error
    );
    throw error;
  }
}

/**
 * Fetch a single recording by its ID
 */
export async function getRecordingById(id: string): Promise<Recording> {
  try {
    const response = await axiosClient.get<Recording>(`/recordings/${id}`);
    return response.data;
  } catch (error) {
    console.error(
      `There was a problem with the getRecordingById API call (ID: ${id}):`,
      error
    );
    throw error;
  }
}

/**
 * Create a new recording
 */
export async function createRecording(
  payload: Omit<CreateRecordingPayload, "audioUrl">,
  file: File
): Promise<Recording> {
  console.log("in createRecording", { payload, file });
  try {
    const userId = payload?.userId;
    const activityId = payload?.activityId;
    const sourceType = payload?.sourceType;

    if (!userId) throw new Error("Missing userId in payload");

    const fileName = `${sourceType}-${userId}-${new Date().toISOString()}`;
    const mimeType = "audio/mp4";
    const uploadUrl = await generateUploadUrl(
      fileName,
      mimeType,
      "sw-voice-recording"
    );
    if (!uploadUrl) {
      throw new Error("Voice recording upload url generation failed");
    }
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("Voice recording upload failed");
    }

    const audioUrlKey = fileName;

    const requestBody: CreateRecordingPayload = {
      userId,
      activityId,
      sourceType,
      mimeType,
      audioUrl: audioUrlKey,
    };
    const response = await axiosClient.post<Recording>(
      "/recordings",
      requestBody
    );
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with the createRecording API call:",
      error
    );
    throw error;
  }
}

/**
 * Delete a recording by its ID
 */
export async function deleteRecording(id: string): Promise<void> {
  try {
    await axiosClient.delete(`/recordings/${id}`);
  } catch (error) {
    console.error(
      `There was a problem with the deleteRecording API call (ID: ${id}):`,
      error
    );
    throw error;
  }
}

/**
 * Delete all recordings for a given user
 */
export async function deleteRecordingsByUser(userId: string): Promise<void> {
  try {
    await axiosClient.delete("/recordings", {
      params: { userId },
    });
  } catch (error) {
    console.error(
      `There was a problem with the deleteRecordingsByUser API call (userId: ${userId}):`,
      error
    );
    throw error;
  }
}
