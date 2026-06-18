// onboarding/index.ts

import axiosClient from "../axiosClient";
import { normalizeOnboardingFlow } from "./helper";
import {
    OnboardingFlow,
    SubmitAnswersPayload,
    SubmitAnswersResponsePayload,
    UserOnboardingAnswer
} from "./types";

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

// -----------------------------------------------------
// USER ANSWERS
// -----------------------------------------------------

/**
 * Submit answers for the active onboarding flow.
 * Automatically triggers adaptive profile calculation backend-side.
 */
export async function submitOnboardingAnswers(
  payload: SubmitAnswersPayload,
): Promise<SubmitAnswersResponsePayload> {
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
  userId: string,
): Promise<UserOnboardingAnswer[]> {
  try {
    const response = await axiosClient.get(`/onboarding/answers/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching onboarding answers:", error);
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
