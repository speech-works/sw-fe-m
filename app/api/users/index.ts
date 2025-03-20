import { API_BASE_URL } from "..";

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
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
export async function deleteUserById(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
