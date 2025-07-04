import axiosClient from "../axiosClient";
import { WeeklyStatsResponse } from "./types";

/**
 * Minutes per day for the current local week
 */
export async function getWeeklyStats(
  userId: string
): Promise<WeeklyStatsResponse> {
  try {
    const response = await axiosClient.get<WeeklyStatsResponse>(
      `/report/${userId}/weekly`
    );
    console.log("getWeeklyStats api response", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    throw error;
  }
}
