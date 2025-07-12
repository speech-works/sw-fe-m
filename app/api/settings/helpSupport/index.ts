import axiosClient from "../../axiosClient";
import {
  AppFeedback,
  CreateAppFeedbackPayload,
  CreateReportedIssuePayload,
  ReportedIssue,
} from "./types";

/**
 * Submit a new reported issue.
 */
export async function createReportedIssue(
  payload: CreateReportedIssuePayload
): Promise<ReportedIssue> {
  try {
    const response = await axiosClient.post<ReportedIssue>(
      "/reported-issues",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error creating reported issue:", error);
    throw error;
  }
}

/**
 * Fetch a single reported issue by its ID.
 */
export async function getReportedIssueById(id: string): Promise<ReportedIssue> {
  try {
    const response = await axiosClient.get<ReportedIssue>(
      `/reported-issues/${id}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching reported issue with id ${id}:`, error);
    throw error;
  }
}

/**
 * List all reported issues for a given user.
 */
export async function listReportedIssuesByUser(
  userId: string
): Promise<ReportedIssue[]> {
  try {
    const response = await axiosClient.get<ReportedIssue[]>(
      "/reported-issues",
      {
        params: { userId },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error listing reported issues for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Submit new app feedback.
 */
export async function submitAppFeedback(
  payload: CreateAppFeedbackPayload
): Promise<AppFeedback> {
  try {
    const response = await axiosClient.post<AppFeedback>(
      "/app-feedback",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting app feedback:", error);
    throw error;
  }
}

/**
 * List all feedback entries, optionally filtered by userEmail.
 */
export async function listAppFeedback(
  userEmail?: string
): Promise<AppFeedback[]> {
  try {
    const response = await axiosClient.get<AppFeedback[]>("/app-feedback", {
      params: userEmail ? { userEmail } : {},
    });
    return response.data;
  } catch (error) {
    console.error("Error listing app feedback:", error);
    throw error;
  }
}
