// onboarding/types.ts
export interface OnboardingOption {
  id: string;
  optionText: string;
  description?: string;
  value?: string;
  orderIndex: number;
}

export type QuestionType = "SINGLE" | "MULTI" | "SLIDER";

export interface OnboardingQuestion {
  id: string;
  screenNumber: number;
  orderIndex: number;
  questionText: string;
  description?: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: OnboardingOption[];
  /**
   * Choice layout. Absent (the server never sends it today) means "list",
   * which is the pre-existing rendering — so nothing changes for a
   * server-driven question until someone deliberately opts it in.
   * See OnboardingQuestion's `layout` prop for why this cannot be inferred.
   */
  layout?: "list" | "wrap" | "scale";
  adaptiveKey?: string | null;
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
