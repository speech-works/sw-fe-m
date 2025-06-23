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
  session: PracticeSession;
  status: "ONGOING" | "COMPLETED" | "ABORTED";
  contentType: PracticeActivityContentType;
  funPractice?: FunPractice;
  readingPractice?: ReadingPractice;
  cognitivePractice?: CognitivePractice;
  exposurePractice?: ExposurePractice;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
