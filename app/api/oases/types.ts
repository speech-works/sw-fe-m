// api/oases/types.ts

import { QuestionType } from "../onboarding/types";

export interface OasesQuestionOption {
  id: string;
  value: number | string; // The value to submit (usually number for Likert)
  text: string;
  orderIndex: number;
}

export interface OasesQuestion {
  id: string;
  text: string;
  type: QuestionType; // Re-use strict "SINGLE" | "MULTI" | "SLIDER"
  options: OasesQuestionOption[];
}

export interface OasesDailyBatch {
  dayNumber: number;
  isComplete: boolean;
  questions: OasesQuestion[];
  metadata: {
    totalRemaining: number;
    estimatedMinutesRemaining: number;
  };
}

export interface OasesAnswerSubmission {
  questionId: string;
  answer: number | string | string[]; // Matches the 'value' from option
}

export interface SubmitOasesBatchPayload {
  answers: OasesAnswerSubmission[];
}

export interface OasesProgress {
  completionPercentage: number;
  totalAnswered: number;
  dayNumber: number;
}
