import axiosClient from "../axiosClient";
import { PracticeCategorySummaryResponse } from "./types";

export async function getPracticeCategorySummary(
  _userId?: string,
): Promise<PracticeCategorySummaryResponse> {
  try {
    const response = await axiosClient.get<PracticeCategorySummaryResponse>(
      "/practice-categories/me/summary",
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching practice category summary:", error);
    throw error;
  }
}
