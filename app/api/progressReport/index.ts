// api/progressReports.ts
import axiosClient from "../axiosClient";
import { User } from "../users";

export interface ProgressReport {
  id: string;
  user: User;
  mainEffortScore: number;
  consistency: number; // number of consecutive days
  repetition: number; // weekly sessions (or weighted sessions)
  time: number; // total minutes in last 7 days
  assignedTags: string; // stored as JSON array or comma-separated
  createdAt: Date;
}

// Get live progress report
export async function getLiveProgressReport(
  userId: string,
  applyRecencyBias?: boolean
): Promise<ProgressReport> {
  try {
    const response = await axiosClient.get(`/progress/${userId}`, {
      params: { recency: applyRecencyBias },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting live progress report:", error);
    throw error;
  }
}

// Get past progress reports
export async function getPastProgressReports(
  userId: string,
  limit?: number // default limit is defined on the server if not provided
): Promise<ProgressReport[]> {
  try {
    const response = await axiosClient.get(`/progress/${userId}/history`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting past progress reports:", error);
    throw error;
  }
}

// Create a new progress report
export async function createProgressReport(
  userId: string,
  applyRecencyBias?: boolean
): Promise<ProgressReport> {
  try {
    const response = await axiosClient.post(`/progress/${userId}`, {
      recency: applyRecencyBias,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating progress report:", error);
    throw error;
  }
}
