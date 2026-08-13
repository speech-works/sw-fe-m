// api/quiz/index.ts

import axiosClient from "../axiosClient";
import { QuizSubmissionResult } from "./types";

/**
 * Submit a quiz answer and get mastery feedback.
 *
 * @param questionId - The question's UUID
 * @param selectedAnswers - Array of selected answer indices (0-based)
 * @returns Submission result with mastery metrics
 */
export async function submitQuizAnswer(
  questionId: string,
  selectedAnswers: number[],
): Promise<QuizSubmissionResult> {
  try {
    const response = await axiosClient.post<QuizSubmissionResult>(
      "/quiz/submit",
      {
        questionId,
        selectedAnswers,
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

