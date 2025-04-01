import { API_BASE_URL } from "../constants";
import { handleErrorsIfAny } from "../helper";
import { User } from "../users";

export interface ProgressReport {
  id: string;
  user: User;
  mainEffortScore: number;
  consistency: number; // number of consecutive days
  repetition: number; // weekly sessions (or weighted sessions)
  time: number; // total minutes in last 7 days
  assignedTags: string; // store JSON array or comma-separated
  createdAt: Date;
}

// get live report
export async function getLiveProgressReport(
  userId: string,
  applyRecencyBias?: boolean
): Promise<ProgressReport> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/progress/${userId}?recency=${applyRecencyBias}`
    );
    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the getting live progress report operation:",
      error
    );
    throw error;
  }
}

// get past report
export async function getPastProgressReports(
  userId: string,
  limit?: number // if limit is 5, show last 5 reports, default is 10
): Promise<ProgressReport[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/progress/${userId}/history?limit=${limit}`
    );
    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the getting past progress report operation:",
      error
    );
    throw error;
  }
}

// save report
export async function createProgressReport(
  userId: string,
  applyRecencyBias?: boolean
): Promise<ProgressReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recency: applyRecencyBias,
      }),
    });
    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the create progress report operation:",
      error
    );
    throw error;
  }
}
