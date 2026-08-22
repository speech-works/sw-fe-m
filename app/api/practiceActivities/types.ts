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

/*
 * Completing an activity carries nothing but who did it.
 *
 * It used to accept `effortScore`, `autonomyScore` and `accuracyScore` from a
 * modal shown after every practice. Those were stored, averaged, and read by a
 * five-axis model that no screen in this app ever displayed. Removed with it.
 */
export interface CompleteActivityRequest {
  userId: string;
}
