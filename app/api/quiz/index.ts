// api/quiz/index.ts

import axiosClient from "../axiosClient";
import { QuizSubmissionResult } from "./types";

/**
 * Submit a quiz answer and get mastery feedback.
 *
 * @param questionId - The question's UUID
 * @param selectedAnswers - Array of selected answer indices (0-based)
 * @param blockId - The QUIZ block that asked it, when the question came from a
 *   paid program day rather than the technique library. The server derives the
 *   whole program context from it: which pack, which day, and whether the
 *   question is about today or yesterday. Sending the context itself would let
 *   a client file its score against any day it liked.
 * @returns Submission result with mastery metrics
 */
export async function submitQuizAnswer(
  questionId: string,
  selectedAnswers: number[],
  blockId?: string,
): Promise<QuizSubmissionResult> {
  try {
    const response = await axiosClient.post<QuizSubmissionResult>(
      "/quiz/submit",
      {
        questionId,
        selectedAnswers,
        ...(blockId ? { blockId } : {}),
      },
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

