/**
 * Mirrors `ProgramMastery` in sw-be-2/src/services/quiz.service.ts.
 *
 * `program` is null until the user has answered a question in this program, and
 * `days` holds only the days that have actually been tested. An untested day is
 * absent rather than zero: zero would be a claim about the user, and the truth
 * is that we have not asked them yet.
 */
export interface ProgramMastery {
  program: {
    /** 0 to 100. A moving average, so a bad day does not sink it. */
    score: number;
    totalAttempts: number;
    correctCount: number;
    passedThreshold: boolean;
  } | null;
  days: {
    dayIndex: number;
    score: number;
    totalAttempts: number;
    correctCount: number;
  }[];
}
