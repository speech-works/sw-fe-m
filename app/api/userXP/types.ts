/**
 * Enum of possible XP sources—must match backend XPSource.
 */
export enum XPSource {
  PRACTICE = "PRACTICE",
  QUIZ = "QUIZ",
  TUTORIAL = "TUTORIAL",
  MOOD = "MOOD",
  STREAK = "STREAK",
  BONUS = "BONUS",
}

/**
 * Shape of the POST /xp payload.
 */
export interface AwardXpPayload {
  userId: string;
  amount: number;
  source: XPSource;
  // optional ISO timestamp of when the activity occurred;
  // if omitted, server uses current time.
  timestamp?: string;
}

/**
 * Shape of each XP log entry returned by both POST and GET.
 */
export interface XPLog {
  id: string;
  userId: string;
  amount: number;
  source: XPSource;
  // ISO string in UTC
  createdAt: string;
}
