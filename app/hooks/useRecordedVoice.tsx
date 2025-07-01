import { useState } from "react";
import { RecordingSourceType } from "../api/recordings/types";
import { getFileFromUri } from "../util/functions/fileHandling";
import { createRecording } from "../api";

export function useRecordedVoice(userId?: string) {
  const [voiceRecordingUri, setVoiceRecordingUri] = useState<string | null>(
    null
  );

  const submitVoiceRecording = async (
    params:
      | {
          activityId: string;
          recordingSource: RecordingSourceType.ACTIVITY;
        }
      | {
          recordingSource: RecordingSourceType.MOOD_CHECK;
        }
  ) => {
    if (!voiceRecordingUri || !userId) return;
    try {
      const file = await getFileFromUri(voiceRecordingUri, "audio/mp4");
      // ✅ upload to s3 and create a record in DB
      const uploadedRecording = await createRecording(
        {
          userId: userId,
          sourceType: params.recordingSource,
          // Only add activityId if it exists in params
          ...("activityId" in params ? { activityId: params.activityId } : {}),
        },
        file
      );
      if (!uploadedRecording?.audioUrl) {
        throw new Error("Voice recording upload to S3 failed");
      }
      return uploadedRecording;
    } catch (error) {
      console.error("❌ Failed to submit voice recording:", error);
    }
  };

  return { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording };
}
