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
    console.log("getAllSessionsOfUser called with:", { userId, sessionStatus });
    const response = await axiosClient.get("/sessions", {
      params: { userId, status: sessionStatus },
    });
    console.log("getAllSessionsOfUser returned with:", { response });
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
  } catch (error: any) {
    console.error("Error creating session:", error);
    if (error.response) {
      console.error("Backend Error Data:", error.response.data);
    }
    throw error;
  }
}

