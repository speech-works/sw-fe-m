// api/quiz/index.ts

import axiosClient from "../axiosClient";
import {
  CanAccessResponse,
  QuizSubmissionResult,
  UserKnowledgeMastery,
} from "./types";

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

/**
 * Fetch all the user's quiz progress across all topics.
 *
 * @returns Array of mastery records for all topics
 */
export async function getAllMasteryRecords(): Promise<UserKnowledgeMastery[]> {
  try {
    const response =
      await axiosClient.get<UserKnowledgeMastery[]>("/quiz/mastery");
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get mastery data for a specific topic.
 *
 * @param topicId - The topic identifier
 * @returns Mastery record or null if not found
 */
export async function getTopicMastery(
  topicId: string,
): Promise<UserKnowledgeMastery | null> {
  try {
    const response = await axiosClient.get<UserKnowledgeMastery | null>(
      `/quiz/mastery/${topicId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if user can access gated content for a topic.
 * Access is granted when masteryScore >= 80 AND totalAttempts >= 3.
 *
 * @param topicId - The topic to check access for
 * @returns Whether the user can access the gated content
 */
export async function checkTopicAccess(
  topicId: string,
): Promise<CanAccessResponse> {
  try {
    const response = await axiosClient.get<CanAccessResponse>(
      `/quiz/can-access/${topicId}`,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}
