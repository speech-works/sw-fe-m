import { API_BASE_URL } from "../constants";
import * as SecureStore from "expo-secure-store";
import { handleErrorsIfAny } from "../helper";

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

export async function getUserById(id: string): Promise<User> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
export async function updateUserById(
  id: string,
  user: Partial<Omit<User, "id" | "password" | "createdAt">>
): Promise<User> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(user),
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
export async function deleteUserById(id: string): Promise<void> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await handleErrorsIfAny(response);
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
export async function getMyUser(): Promise<User> {
  console.log("getMyUser called", {
    accessToken: SecureStore.getItemAsync("accessToken"),
  });
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
