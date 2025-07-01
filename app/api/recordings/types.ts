import { PracticeActivity } from "../practiceActivities/types";
import { User } from "../users";

export interface Recording {
  user: User;
  activity: PracticeActivity | null;
  sourceType: RecordingSourceType;
  audioUrl: string;
  mimeType: string | null;
}
export enum RecordingSourceType {
  ACTIVITY = "ACTIVITY",
  MOOD_CHECK = "MOOD_CHECK",
}
export interface CreateRecordingPayload {
  userId: string;
  activityId?: string;
  sourceType: RecordingSourceType;
  audioUrl: string; // appended to the request after genrating upload URL
  mimeType?: string;
}
export interface RecordingQueryParams {
  userId?: string;
  activityId?: string;
}
