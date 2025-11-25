// onboarding/types.ts
export interface OnboardingOption {
  id: string;
  optionText: string;
  description?: string;
  value?: string;
  orderIndex: number;
}

export type QuestionType = "single" | "multi" | "slider";

export interface OnboardingQuestion {
  id: string;
  screenNumber: number;
  orderIndex: number;
  questionText: string;
  description?: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: OnboardingOption[];
  adaptiveKey: string | null;
}

export interface OnboardingFlow {
  id: string;
  version: string;
  isActive: boolean;
  questions: OnboardingQuestion[];
  createdAt: string;
  updatedAt: string;
}

// ------------ User Answers ------------

export type UserAnswerMap = Record<string, any>;

export interface UserOnboardingAnswer {
  id: string;
  userId: string;
  flow: {
    id: string;
    version: string;
  };
  answers: UserAnswerMap;

  createdAt: string;
  updatedAt: string;
}

export interface SubmitAnswersPayload {
  answers: UserAnswerMap;
}

export interface SubmitAnswersResponsePayload {
  answer: UserOnboardingAnswer;
  isComplete: boolean;
  profileCompletionPercent: number;
}

export interface UpdateAnswersPayload {
  answers?: UserAnswerMap;
}
