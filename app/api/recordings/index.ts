// api/recordings.ts
import axiosClient from "../axiosClient";

export interface Recording {
  id: string;
  user: any; // or import a User interface
  activity: any; // or use PracticeActivity if available
  audioUrl: string;
  duration: number | null;
  mimeType: string;
  createdAt: Date;
}

// Get latest recording using query parameters
export async function getLatestRecording(
  userId?: string,
  activityId?: string,
  scriptId?: string
): Promise<Recording> {
  try {
    // Build query parameters using axios params feature
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (activityId) params.activityId = activityId;
    if (scriptId) params.scriptId = scriptId;

    const response = await axiosClient.get("/recordings/latest", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get all recordings using query parameters
export async function getAllRecordings(
  userId?: string,
  activityId?: string,
  scriptId?: string
): Promise<Recording[]> {
  try {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (activityId) params.activityId = activityId;
    if (scriptId) params.scriptId = scriptId;

    const response = await axiosClient.get("/recordings", { params });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Get a recording by its ID
export async function getRecordingById(
  recordingId: string
): Promise<Recording> {
  try {
    const response = await axiosClient.get(`/recordings/${recordingId}`);
    return response.data;
  } catch (error) {
    console.error("Error getting recording by ID:", error);
    throw error;
  }
}

interface CreateRecordingReq {
  userId: string;
  activityId: string;
  scriptId: string;
  audioUrl: string;
  duration?: number;
  mimeType?: string;
}

// Create a recording
export async function createRecording({
  userId,
  activityId,
  scriptId,
  audioUrl,
  duration,
  mimeType,
}: CreateRecordingReq): Promise<Recording> {
  try {
    const response = await axiosClient.post("/recordings", {
      userId,
      activityId,
      scriptId,
      audioUrl,
      duration,
      mimeType,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating recording:", error);
    throw error;
  }
}

// Get presigned upload URL (Note: if not needing SecureStore token manually, use axiosClient)
export async function getUploadUrl(
  fileName: string,
  fileType: string
): Promise<string> {
  try {
    const response = await axiosClient.get("/recordings/generateUploadUrl", {
      params: { fileName, fileType },
    });
    return response.data.uploadURL;
  } catch (error) {
    console.error("Error getting upload URL:", error);
    throw error;
  }
}

// Get presigned download URL
export async function getDownloadUrl(fileName: string): Promise<string> {
  try {
    const response = await axiosClient.get("/recordings/generateDownloadUrl", {
      params: { fileName },
    });
    return response.data.downloadURL;
  } catch (error) {
    console.error("Error getting download URL:", error);
    throw error;
  }
}
