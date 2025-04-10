import { User } from "../users";
import { API_BASE_URL } from "../constants";
import * as SecureStore from "expo-secure-store";
import { handleErrorsIfAny } from "../helper";

interface PracticeSessionReq {
  id: string;
}
export interface PracticeSession {
  id: string;
  user: User;
  status: "ongoing" | "completed";
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// get a session by id
export async function getSessionById({
  id,
}: PracticeSessionReq): Promise<PracticeSession> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the get session by id operation:",
      error
    );
    throw error;
  }
}

// get all sessions of a user
interface PracticeSessionsReq {
  userId: string;
  sessionStatus: "ongoing" | "completed";
}
export async function getAllSessionsOfUser({
  userId,
  sessionStatus,
}: PracticeSessionsReq): Promise<PracticeSession[]> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(
      `${API_BASE_URL}/sessions?userId=${userId}&status=${sessionStatus}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the get all sessions operation:",
      error
    );
    throw error;
  }
}

// create a new session
interface CreateSessionReq {
  userId: string;
}
export async function createSession({
  userId,
}: CreateSessionReq): Promise<PracticeSession> {
  try {
    // Wait for the token
    const accessToken = await SecureStore.getItemAsync("accessToken");
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the create session operation:",
      error
    );
    throw error;
  }
}

// complete a session
interface CompleteSessionReq {
  id: string;
}
export async function completeSession({
  id,
}: CompleteSessionReq): Promise<PracticeSession> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the complete session operation:",
      error
    );
    throw error;
  }
}

// delete a session
interface DeleteSessionReq {
  id: string;
}
export async function deleteSession({ id }: DeleteSessionReq): Promise<void | {
  error: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const resJson = await handleErrorsIfAny(response);
    return resJson;
  } catch (error) {
    console.error(
      "There was a problem with the delete session operation:",
      error
    );
    throw error;
  }
}
