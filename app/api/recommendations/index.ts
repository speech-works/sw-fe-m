import axiosClient from "../axiosClient";
import { PracticeSuggestion } from "./types";

/**
 * Fetch practice suggestions based on mood.
 * The backend automatically filters by age and skill level based on the user's profile.
 */
export async function getPracticeSuggestions(
  mood: string,
  hardMode?: boolean
): Promise<PracticeSuggestion[]> {
  try {
    const response = await axiosClient.get("/practice-suggestions", {
      params: {
        mood,
        hardMode,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching practice suggestions:", error);
    throw error;
  }
}
