import axiosClient from "../axiosClient";
import { PracticeStatSummary } from "./types";

export async function getUserStats(
  userId: string
): Promise<PracticeStatSummary[]> {
  try {
    const response = await axiosClient.get(`/stats/${userId}`);
    const rawStats = response.data;
    return rawStats.map((stat: any) => ({
      contentType: stat.contentType,
      itemsCompleted: stat.itemsCompleted,
      totalTime: stat.totalTime,
    }));
  } catch (error) {
    console.error("Error fetching user stats:", error);
    throw error;
  }
}
