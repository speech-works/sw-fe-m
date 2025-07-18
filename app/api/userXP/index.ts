import axiosClient from "../axiosClient";
import { XPLog } from "./types";

/**
 * Fetch paginated XP logs for a given user.
 *
 * @param userId  — UUID of the user.
 * @param skip    — how many records to skip (default 0).
 * @param take    — how many records to return (default 50).
 */
export async function getXpLogs(
  userId: string,
  skip = 0,
  take = 50
): Promise<XPLog[]> {
  try {
    const response = await axiosClient.get<XPLog[]>("/xp", {
      params: { userId, skip, take },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching XP logs for user ${userId} (skip=${skip}, take=${take}):`,
      error
    );
    throw error;
  }
}
