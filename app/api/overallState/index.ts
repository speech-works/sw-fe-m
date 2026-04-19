// api/overallState/index.ts

import axiosClient from "../axiosClient";
import { OverallStateHistoryBucket, UserOverallStateAggregate } from "./types";

/**
 * Fetch the user's current combined state snapshot.
 * Contains clinical + engagement metrics for the current period.
 *
 * This data should be displayed on the home page.
 *
 * @returns Current overall state aggregate
 */
export async function getCurrentOverallState(): Promise<UserOverallStateAggregate> {
  try {
    const response =
      await axiosClient.get<UserOverallStateAggregate>("/overall-state");
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch historical snapshots of user state.
 *
 * @param weeks - Number of weekly buckets to fetch (default: 12)
 * @returns Chronological week buckets with placeholders for missing weeks
 */
export async function getOverallStateHistory(
  weeks: number = 12,
): Promise<OverallStateHistoryBucket[]> {
  try {
    const response = await axiosClient.get<OverallStateHistoryBucket[]>(
      "/overall-state/history",
      {
        params: { weeks },
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
