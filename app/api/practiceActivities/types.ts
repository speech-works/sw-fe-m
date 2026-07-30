import {
    CognitivePractice,
    ExposurePractice,
    FunPractice,
    ReadingPractice,
} from "../dailyPractice/types";
import { PracticeSession } from "../practiceSessions";

///////////////// DAILY PRACTICE ACTIVITIES TYPES //////////////

export enum PracticeActivityContentType {
  FUN_PRACTICE = "FUN_PRACTICE",
  READING_PRACTICE = "READING_PRACTICE",
  EXPOSURE_PRACTICE = "EXPOSURE_PRACTICE",
  COGNITIVE_PRACTICE = "COGNITIVE_PRACTICE",
  // Add other types as needed for daily sessions
}

export interface PracticeActivity {
  id: string;
  session?: PracticeSession;
  status: "NOT_STARTED" | "ONGOING" | "COMPLETED" | "ABORTED";
  contentType: PracticeActivityContentType;
  funPractice?: FunPractice;
  readingPractice?: ReadingPractice;
  cognitivePractice?: CognitivePractice;
  exposurePractice?: ExposurePractice;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Which growth axes this attempt moved, resolved SERVER-SIDE from the growth
   * point registry. Computed per response, never stored.
   *
   * Enum values (`STEADIER`, not the "Finisher" label) — render through
   * AXIS_LABEL, and filter through VISIBLE_AXES. Absent on responses that do
   * not go through the enrichment path, and empty for the activity types the
   * registry deliberately omits.
   */
  axesMoved?: string[];
}

// Request interface for completing an activity with optional vitals
export interface CompleteActivityRequest {
  userId: string;
  effortScore?: number; // 20-100, always shown for EXPOSURE/COGNITIVE
  autonomyScore?: number; // 20-100, always shown for EXPOSURE/COGNITIVE
  accuracyScore?: number; // 20-100, only for TECHNIQUE_DRILL
}
