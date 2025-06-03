import axiosClient from "../axiosClient";
import { User } from "../users";

export interface PracticeSession {
  id: string;
  user: User;
  status: "ONGOING" | "COMPLETED" | "ABORTED";
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PracticeSessionReq {
  id: string;
}

// Get a session by ID
export async function getSessionById({
  id,
}: PracticeSessionReq): Promise<PracticeSession> {
  try {
    const response = await axiosClient.get(`/sessions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting session by ID:", error);
    throw error;
  }
}

interface PracticeSessionsReq {
  userId: string;
  sessionStatus: "ONGOING" | "COMPLETED" | "ABORTED";
}

// Get all sessions of a user with a given status
export async function getAllSessionsOfUser({
  userId,
  sessionStatus,
}: PracticeSessionsReq): Promise<PracticeSession[]> {
  try {
    const response = await axiosClient.get("/sessions", {
      params: { userId, status: sessionStatus },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting sessions for user:", error);
    throw error;
  }
}

interface CreateSessionReq {
  userId: string;
}

// Create a new session
export async function createSession({
  userId,
}: CreateSessionReq): Promise<PracticeSession> {
  try {
    const response = await axiosClient.post("/sessions", { userId });
    return response.data;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

interface CompleteSessionReq {
  id: string;
}

// Complete a session (update its status)
export async function completeSession({
  id,
}: CompleteSessionReq): Promise<PracticeSession> {
  try {
    const response = await axiosClient.patch(`/sessions/${id}/complete`);
    return response.data;
  } catch (error) {
    console.error("Error completing session:", error);
    throw error;
  }
}

interface DeleteSessionReq {
  id: string;
}

// Delete a session
export async function deleteSession({
  id,
}: DeleteSessionReq): Promise<void | { error: string }> {
  try {
    const response = await axiosClient.delete(`/sessions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}
