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
