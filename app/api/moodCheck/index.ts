import axiosClient from "../axiosClient";
import { MoodCheck, MoodType } from "./types";

export async function logMood(moodLog: MoodCheck) {
  try {
    const { userId, mood, voiceNoteUrl, textNote } = moodLog;
    const response = await axiosClient.post(`/mood-check`, {
      userId,
      mood,
      voiceNoteUrl,
      textNote,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating mood log:", error);
    throw error;
  }
}

/**
 * Has this person already answered the mood question today (their local day,
 * decided by the server from the timezone header)? Returns null when the server
 * cannot say: offline, or an older server without this endpoint. The caller
 * then trusts the flag on the phone. (D2, 10 Nov 2026)
 */
export async function getTodayMood(): Promise<{
  answered: boolean;
  mood: MoodType | null;
} | null> {
  try {
    const response = await axiosClient.get(`/mood-check/today`);
    const data = response?.data;
    if (!data || typeof data.answered !== "boolean") return null;
    return { answered: data.answered, mood: data.mood ?? null };
  } catch {
    return null;
  }
}
