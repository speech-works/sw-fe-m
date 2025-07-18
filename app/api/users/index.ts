import axiosClient from "../axiosClient";
import { XPLog } from "../userXP/types";

export interface User {
  id: string;
  email: string;
  bio?: string;
  name: string;
  profilePictureUrl?: string;
  totalXp?: number;
  xpLogs?: XPLog[];
  freeTasksRemaining?: number;
  lastFreeReset?: Date;
  isPaid?: boolean;
  level?: number;
  currentStamina?: number;
  lastStaminaUpdate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;

  // Extra fields that may not be present in all user objects
  password?: string;
  isVerified?: true;
  oauthId?: string;
  oauthProvider?: string;
  stripeCustomerId?: string;
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
  user: Partial<Omit<User, "id" | "password" | "createdAt">>
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
