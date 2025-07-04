// src/services/stats.ts

import axiosClient from "../axiosClient";
import { PracticeStatSummary, WeeklyStat, WeeklyStatsResponse } from "./types";

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
