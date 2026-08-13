// api/quiz/types.ts

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

