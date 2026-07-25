// api/impactAssessment/types.ts

import { QuestionType } from "../onboarding/types";

export interface ImpactAssessmentQuestionOption {
  id: string;
  value: number | string; // The value to submit (usually number for Likert)
  text: string;
  orderIndex: number;
}

export interface ImpactAssessmentQuestion {
  id: string;
  text: string;
  type: QuestionType; // Re-use strict "SINGLE" | "MULTI" | "SLIDER"
  options: ImpactAssessmentQuestionOption[];
}

/**
 * BASELINE  — the one-sitting starting point that fills every Growth Profile bar.
 * ONGOING   — the slow deepening afterwards, one item at a time.
 * EXHAUSTED — the whole bank has been answered.
 */
export type AssessmentPhase = "BASELINE" | "ONGOING" | "EXHAUSTED";

export interface ImpactAssessmentDailyBatch {
  dayNumber: number;
  /** True once the BASELINE sitting is done — not once all 42 are answered. */
  isComplete: boolean;
  /** Optional so an older server (no `phase`) still parses. */
  phase?: AssessmentPhase;
  questions: ImpactAssessmentQuestion[];
  metadata: {
    /**
     * Answered so far. The server has always sent this; it was missing from
     * this type, so the widget invented a denominator instead of deriving the
     * real one from `totalAnswered + totalRemaining`.
     */
    totalAnswered: number;
    totalRemaining: number;
    /**
     * Items left in the CURRENT phase, and that phase's target. A progress bar
     * must divide by these — not by the 42-item bank, which would leave a
     * finished baseline reading ~48% done.
     */
    phaseRemaining?: number;
    phaseTarget?: number;
    estimatedMinutesRemaining: number;
  };
}

export interface ImpactAssessmentAnswerSubmission {
  questionId: string;
  answer: number | string | string[]; // Matches the 'value' from option
}

export interface SubmitImpactAssessmentBatchPayload {
  answers: ImpactAssessmentAnswerSubmission[];
}

export interface ImpactAssessmentProgress {
  completionPercentage: number;
  totalAnswered: number;
  dayNumber: number;
}
