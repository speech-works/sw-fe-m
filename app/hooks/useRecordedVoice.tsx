import { useState, useRef } from "react";
import { createRecording } from "../api";
import { RecordingSourceType } from "../api/recordings/types";
import { getFileFromUri } from "../util/functions/fileHandling";

export function useRecordedVoice(userId?: string) {
  const [voiceRecordingUri, setVoiceRecordingUriState] = useState<string | null>(null);
  const uriRef = useRef<string | null>(null);

  const setVoiceRecordingUri = (uri: string | null) => {
    uriRef.current = uri;
    setVoiceRecordingUriState(uri);
  };

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
    const currentUri = uriRef.current;
    if (!currentUri || !userId) return;
    try {
      // ✅ Pass URI directly; createRecording now handles S3 upload via expo-file-system
      const uploadedRecording = await createRecording(
        {
          userId: userId,
          sourceType: params.recordingSource,
          ...("activityId" in params ? { activityId: params.activityId } : {}),
        },
        currentUri
      );
      if (!uploadedRecording?.audioUrl) {
        throw new Error("Voice recording upload to S3 failed");
      }
      return uploadedRecording;
    } catch (error) {
      console.error("❌ Failed to submit voice recording:", error);
    }
  };

  const resetRecording = () => {
    setVoiceRecordingUri(null);
  };

  return {
    voiceRecordingUri,
    setVoiceRecordingUri,
    submitVoiceRecording,
    resetRecording,
  };
}
