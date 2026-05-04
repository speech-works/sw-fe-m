import axiosClient from "../axiosClient";
import { Phoneme } from "./types";

/**
 * Fetch all available phonemes for selection
 */
export async function getPhonemes(): Promise<Phoneme[]> {
  try {
    const response = await axiosClient.get("/phonemes");
    return response.data;
  } catch (error) {
    console.error("Error fetching phonemes:", error);
    throw error;
  }
}
