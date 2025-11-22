// onboarding/index.ts

import axiosClient from "../axiosClient";
import {
  OnboardingFlow,
  SubmitAnswersPayload,
  UpdateAnswersPayload,
  UserOnboardingAnswer,
} from "./types";
import { normalizeOnboardingFlow } from "./helper";

// -----------------------------------------------------
// FLOW FETCHING
// -----------------------------------------------------

/**
 * Fetch the currently active onboarding flow.
 */
export async function getActiveOnboardingFlow(): Promise<OnboardingFlow> {
  try {
    const response = await axiosClient.get(`/onboarding/flows/active`);
    const flow = response.data;

    return normalizeOnboardingFlow(flow);
  } catch (error) {
    console.error("Error fetching active onboarding flow:", error);
    throw error;
  }
}

/**
 * Fetch flow by version (rarely needed on app).
 */
export async function getOnboardingFlowByVersion(
  version: string
): Promise<OnboardingFlow> {
  try {
    const response = await axiosClient.get(
      `/onboarding/flows/version/${version}`
    );

    return normalizeOnboardingFlow(response.data);
  } catch (error) {
    console.error("Error fetching flow by version:", error);
    throw error;
  }
}

// -----------------------------------------------------
// USER ANSWERS
// -----------------------------------------------------

/**
 * Submit answers for the active onboarding flow.
 * Automatically triggers adaptive profile calculation backend-side.
 */
export async function submitOnboardingAnswers(
  payload: SubmitAnswersPayload
): Promise<UserOnboardingAnswer> {
  try {
    const response = await axiosClient.post(`/onboarding/answers`, payload);
    return response.data;
  } catch (error) {
    console.error("Error submitting onboarding answers:", error);
    throw error;
  }
}

/**
 * Get all onboarding answer entries for a user.
 */
export async function getUserOnboardingAnswers(
  userId: string
): Promise<UserOnboardingAnswer[]> {
  try {
    const response = await axiosClient.get(`/onboarding/answers/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching onboarding answers:", error);
    throw error;
  }
}

/**
 * Update (merge) answers for a user.
 * Backend automatically recalculates adaptive profile.
 */
export async function updateUserOnboardingAnswers(
  userId: string,
  payload: UpdateAnswersPayload
): Promise<UserOnboardingAnswer> {
  try {
    const response = await axiosClient.patch(
      `/onboarding/answers/${userId}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Error updating onboarding answers:", error);
    throw error;
  }
}

/**
 * Delete all onboarding answers for a user.
 */
export async function deleteUserOnboardingAnswers(
  userId: string
): Promise<void> {
  try {
    await axiosClient.delete(`/onboarding/answers/${userId}`);
  } catch (error) {
    console.error("Error deleting onboarding answers:", error);
    throw error;
  }
}

// -----------------------------------------------------
// ONBOARDING STATUS
// -----------------------------------------------------

export interface OnboardingStatus {
  hasCompleted: boolean;
  completedFlowVersion?: string;
  latestFlowVersion: string;
  answers?: Record<string, any>;
}

/**
 * Determines whether the user has completed the latest onboarding flow.
 */
export async function getLatestUserOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const activeFlow = await getActiveOnboardingFlow();
  const latestFlowVersion = activeFlow.version;

  const records = await getUserOnboardingAnswers(userId);

  // No onboarding done yet
  if (!records || records.length === 0) {
    return {
      hasCompleted: false,
      latestFlowVersion,
    };
  }

  // The newest onboarding answer entry
  const latest = records[0];

  return {
    hasCompleted: true,
    latestFlowVersion,
    completedFlowVersion: latest.flow.version,
    answers: latest.answers,
  };
}
