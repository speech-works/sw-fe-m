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
