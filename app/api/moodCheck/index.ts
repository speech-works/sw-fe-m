import axiosClient from "../axiosClient";
import { MoodCheck } from "./types";

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

export async function updateMoodByMoodId(
  moodId: string,
  moodData: Partial<Omit<MoodCheck, "userId">>
) {
  try {
    const response = await axiosClient.put(`/mood-check/${moodId}`, {
      ...moodData,
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating mood log by id: ${moodId}`, error);
    throw error;
  }
}
