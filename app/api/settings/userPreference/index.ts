import axiosClient from "../../axiosClient";
import { UpdateUserPreferencePayload, UserPreference } from "./types";

export async function getUserPreferences(userId: string) {
  try {
    const response = await axiosClient.get(`/user-preference`, {
      params: { userId },
    });
    return response.data as UserPreference | null;
  } catch (error) {
    console.error(
      `Error fetching user preferences for userId: ${userId}`,
      error
    );
    throw error;
  }
}

export async function updateUserPreferences(
  userId: string,
  updates: UpdateUserPreferencePayload
) {
  try {
    const response = await axiosClient.put(`/user-preference/${userId}`, {
      ...updates,
    });
    return response.data as UserPreference;
  } catch (error) {
    console.error(
      `Error updating user preferences for userId: ${userId}`,
      error
    );
    throw error;
  }
}
