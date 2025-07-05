import axiosClient from "../axiosClient";
import { WeeklyStatsResponse } from "./types";

/**
 * Minutes per day for the current local week
 * Used on Academy landing page
 */
export async function getDailyActivityStatsForTheWeek(
  userId: string
): Promise<WeeklyStatsResponse> {
  try {
    const response = await axiosClient.get<WeeklyStatsResponse>(
      `/report/${userId}/weekly-daily-activity-time`
    );
    console.log("getWeeklyStats api response", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    throw error;
  }
}

export async function getWeeklyMoodReport(
  userId: string
): Promise<Record<string, number>> {
  try {
    const response = await axiosClient.get(`/report/${userId}/weekly-mood`);
    console.log("getWeeklyMoodReport api response", response.data.moodCounts);
    return response.data.moodCounts;
  } catch (error) {
    console.error("Error fetching weekly mood report:", error);
    throw error;
  }
}
