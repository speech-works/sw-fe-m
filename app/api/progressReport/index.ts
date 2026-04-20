import axiosClient from "../axiosClient";
import {
  LifetimeReportResponse,
  WeeklyReportResponse,
  WeeklyStatsResponse,
} from "./types";

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

export async function getWeeklyReport(
  userId: string,
): Promise<WeeklyReportResponse> {
  try {
    const response = await axiosClient.get<WeeklyReportResponse>(
      `/report/${userId}/weekly-report`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly report:", error);
    throw error;
  }
}

export async function getLifetimeReport(
  userId: string,
): Promise<LifetimeReportResponse> {
  try {
    const response = await axiosClient.get<LifetimeReportResponse>(
      `/report/${userId}/lifetime-report`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching lifetime report:", error);
    throw error;
  }
}
