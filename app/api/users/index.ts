import axiosClient from "../axiosClient";
import { XPLog } from "../userXP/types";
import { ToolNudgeDirective } from "../tools/types";
import { ToolType } from "../tools/types";

export interface User {
  id: string;
  email: string;
  bio?: string;
  name: string;
  profilePictureUrl?: string;
  dob?: Date;
  phoneNumber?: string;

  links?: {
    social: {
      twitter?: string;
      github?: string;
      linkedin?: string;
      website?: string;
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
      youtube?: string;
      tiktok?: string;
      reddit?: string;
      other?: string;
    };
  };

  totalXp?: number;
  xpLogs?: XPLog[];
  freeTasksRemaining?: number;
  lastFreeReset?: Date;
  isPaid?: boolean;
  level?: number;
  currentStamina?: number;
  maxStaminaCap?: number;
  staminaRegenRateMs?: number;
  lastStaminaUpdate?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;

  // required for onboarding logic
  hasCompletedOnboarding?: boolean;
  onboardingVersionCompleted?: string | null;

  // Other optional backend fields
  password?: string;
  isVerified?: true;
  oauthId?: string;
  oauthProvider?: string;
  stripeCustomerId?: string;
  fearedSounds?: string[];

  // Practice Buddy (v1) — backend-provided
  referralCode?: string; // the user's own shareable invite code
  invitedByUserId?: string | null; // who invited them (null if organic)
  acquisitionSource?: "organic" | "buddy_invite";

  /**
   * Fluency-aid over-reliance nudge to surface on the activity start screen,
   * computed server-side and delivered with the user payload. Null when no
   * nudge is due (below threshold, within frequency cap, or insufficient data).
   */
  toolNudge?: ToolNudgeDirective | null;
}

export interface LevelStage {
  level: number;
  relativeLevel: number;
  romanRelative: string;
  title: string;
  fullTitle: string;
  shortDescription: string;
  progressReportCopy: string;
  minLevel: number;
  maxLevel: number | null;
  stamina: {
    max: number;
    regenMinutesPerPoint: number;
  };
  currentLevelXpFloor: number;
  nextLevelXpCeiling: number;
  totalXp: number;
  stages: {
    minLevel: number;
    maxLevel: number | null;
    title: string;
    shortDescription: string;
    progressReportCopy: string;
    stamina: {
      max: number;
      regenMinutesPerPoint: number;
    };
  }[];
}

// Get user by ID
export async function getUserById(id: string): Promise<User> {
  try {
    const response = await axiosClient.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

// Update user by ID
export async function updateUserById(
  id: string,
  user: Partial<Omit<User, "id" | "password" | "createdAt">>,
): Promise<User> {
  try {
    const response = await axiosClient.patch(`/users/${id}`, user);
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// Delete user by ID
export async function deleteUserById(id: string): Promise<void> {
  try {
    await axiosClient.delete(`/users/${id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Permanently delete the authenticated user's own account. The server reads the
// user id from the verified auth token (DELETE /users/me), so the client never
// supplies an id; a user can only ever delete themselves.
export async function deleteMe(): Promise<void> {
  try {
    await axiosClient.delete("/users/me");
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
}

// Get my user (current authenticated user)
export async function getMyUser(): Promise<User> {
  try {
    const response = await axiosClient.get("/users/me");
    return response.data;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
}

// Update the current authenticated user (PATCH /users/me)
export async function updateMyUser(
  updates: Partial<Omit<User, "id" | "password" | "createdAt">>,
): Promise<User> {
  try {
    const response = await axiosClient.patch("/users/me", updates);
    return response.data;
  } catch (error) {
    console.error("Error updating current user:", error);
    throw error;
  }
}

/**
 * Dismiss the fluency-aid over-reliance nudge for a tool. Starts the 14-day
 * server-side frequency cap. Fired only when the user actually dismisses.
 */
export async function dismissToolNudge(tool: ToolType): Promise<void> {
  try {
    await axiosClient.post("/users/me/tool-nudge/dismiss", { tool });
  } catch (error) {
    console.error("Error dismissing tool nudge:", error);
    throw error;
  }
}

// Get level stage details for current user
export async function getLevelStage(): Promise<LevelStage> {
  try {
    const response = await axiosClient.get("/users/me/level-stage");
    return response.data;
  } catch (error) {
    console.error("Error getting level stage:", error);
    throw error;
  }
}
