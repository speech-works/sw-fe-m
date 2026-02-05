// api/quiz/types.ts

/**
 * Request body for submitting a quiz answer.
 */
export interface QuizSubmitRequest {
  questionId: string;
  selectedAnswers: number[]; // Array of selected answer indices (0-based)
}

/**
 * Response from quiz answer submission.
 * Contains feedback and updated mastery metrics.
 */
export interface QuizSubmissionResult {
  isCorrect: boolean;
  masteryScore: number; // 0-100, rounded to 1 decimal
  currentStreak: number; // Consecutive correct answers
  bestStreak: number; // All-time best streak
  passedThreshold: boolean; // true if score >= 80 AND attempts >= 3
  totalAttempts: number;
  correctCount: number;
}

/**
 * User's quiz progress for a specific topic.
 */
export interface UserKnowledgeMastery {
  id: string;
  topicId: string; // e.g., "AFFECTIVE_DISTRESS" or "breathing_techniques"
  totalAttempts: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  masteryScore: number; // 0-100
  passedThreshold: boolean;
  lastAttemptAt: string; // ISO timestamp
}

/**
 * Response for checking access to gated content.
 */
export interface CanAccessResponse {
  canAccess: boolean; // true if masteryScore >= 80 AND totalAttempts >= 3
}
