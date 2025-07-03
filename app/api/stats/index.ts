// src/services/stats.ts

import axiosClient from "../axiosClient";
import { PracticeStatSummary, WeeklyStat } from "./types";

/**
 * Lifetime totals per contentType
 */
export async function getUserStats(
  userId: string
): Promise<PracticeStatSummary[]> {
  try {
    const response = await axiosClient.get<PracticeStatSummary[]>(
      `/stats/${userId}`
    );
    return response.data.map((stat) => ({
      contentType: stat.contentType,
      itemsCompleted: stat.itemsCompleted,
      totalTime: stat.totalTime,
    }));
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
}

/**
 * Minutes per day for the current local week
 */
export async function getWeeklyStats(userId: string): Promise<WeeklyStat[]> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await axiosClient.get<WeeklyStat[]>(
      `/stats/${userId}/weekly`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    throw error;
  }
}
