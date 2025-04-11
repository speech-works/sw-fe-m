// api/users.ts
import axiosClient from "../axiosClient";

export interface User {
  id: string;
  email: string;
  password?: string;
  isVerified?: true;
  oauthId?: string;
  oauthProvider?: string;
  name: string;
  profilePictureUrl?: string;
  stripeCustomerId?: string;
  createdAt?: Date;
  updatedAt: Date;
  lastLogin?: Date;
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
