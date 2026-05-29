import axiosClient from "../axiosClient";
import { generateUploadUrl } from "../file-handling";

import {
  CreateRecordingPayload,
  Recording,
  RecordingQueryParams,
} from "./types";

/**
 * Fetch recordings by optional userId and/or activityId
 */
export async function getRecordings(
  params?: RecordingQueryParams,
): Promise<Recording[]> {
  try {
    const response = await axiosClient.get<Recording[]>("/recordings", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error(
      "There was a problem with the getRecordings API call:",
      error,
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
      error,
    );
    throw error;
  }
}

import { uploadToS3 } from "../../util/functions/fileHandling";

/**
 * Create a new recording
 */
export async function createRecording(
  payload: Omit<CreateRecordingPayload, "audioUrl">,
  fileUri: string,
): Promise<Recording> {
  console.log("in createRecording", { payload, fileUri });
  try {
    const userId = payload?.userId;
    const activityId = payload?.activityId;
    const sourceType = payload?.sourceType;

    console.log(
      `[createRecording] Starting for User: ${userId}, Activity: ${activityId}, Source: ${sourceType}`,
    );
    if (!userId) throw new Error("Missing userId in payload");

    const fileName = `${sourceType}-${userId}-${new Date().toISOString()}.mp4`;
    const mimeType = "audio/mp4";

    console.log(`[createRecording] Requesting upload URL for: ${fileName}`);
    const uploadUrl = await generateUploadUrl(
      fileName,
      mimeType,
      "sw-voice-recording",
    );

    if (!uploadUrl) {
      console.error("[createRecording] Failed to get upload URL");
      throw new Error("Voice recording upload url generation failed");
    }
    console.log(
      `[createRecording] Got upload URL: ${uploadUrl.substring(0, 50)}...`,
    );

    // ✅ Use expo-file-system via uploadToS3 utility
    await uploadToS3(fileUri, uploadUrl, mimeType);
    console.log(
      "[createRecording] S3 upload successful. Creating DB record...",
    );

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
      requestBody,
    );
    console.log(
      `[createRecording] DB record created successfully: ${response.data}`,
    );
    return response.data;
  } catch (error) {
    console.error("[createRecording] API call sequence failed:", error);
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
      error,
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
      error,
    );
    throw error;
  }
}
