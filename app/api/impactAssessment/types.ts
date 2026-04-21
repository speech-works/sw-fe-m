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

export interface ImpactAssessmentDailyBatch {
  dayNumber: number;
  isComplete: boolean;
  questions: ImpactAssessmentQuestion[];
  metadata: {
    totalRemaining: number;
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
