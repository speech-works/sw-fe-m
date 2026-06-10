// api/threads/index.ts
//
// Client for the unified buddy/community communication contract. Everything is thread-scoped
// (a buddy thread today; a community thread later — same calls). Reactions, supports and prompt
// replies are signal-scoped. Dates are revived from the API's serialized form.
import axiosClient from "../axiosClient";
import { reviveDatesInObject } from "../../util/functions/date";
import {
  CreateMomentInput,
  CreatePracticeInput,
  PracticePayload,
  ReactionType,
  SendSupportInput,
  Signal,
  Thread,
  TimelinePage,
} from "./types";

export * from "./types";

// ── Thread ───────────────────────────────────────────────────────────────────
/** The current user's buddy thread (members, bond/unread metadata). Null when unpaired. */
export async function getThread(): Promise<Thread | null> {
  try {
    const res = await axiosClient.get("/threads/me");
    return res.data.thread ? (reviveDatesInObject(res.data.thread) as Thread) : null;
  } catch (error) {
    console.error("Error fetching thread:", error);
    throw error;
  }
}

/** Mark a thread read up to now (clears the unread badge). */
export async function markThreadRead(threadId: string): Promise<void> {
  try {
    await axiosClient.post(`/threads/${threadId}/read`);
  } catch (error) {
    console.error("Error marking thread read:", error);
    throw error;
  }
}

// ── Timeline ───────────────────────────────────────────────────────────────────
/** Reverse-chronological signal stream for a thread, cursor-paginated. */
export async function getTimeline(
  threadId: string,
  cursor?: string,
  limit = 20,
): Promise<TimelinePage> {
  try {
    const res = await axiosClient.get(`/threads/${threadId}/timeline`, {
      params: { cursor, limit },
    });
    return reviveDatesInObject(res.data) as TimelinePage;
  } catch (error) {
    console.error("Error fetching timeline:", error);
    throw error;
  }
}

// ── Create signals ───────────────────────────────────────────────────────────
/** Create a practice card signal from a completed activity (server derives the safe payload). */
export async function createPracticeSignal(
  threadId: string,
  input: CreatePracticeInput,
): Promise<Signal> {
  try {
    const res = await axiosClient.post(`/threads/${threadId}/signals`, {
      type: "practice",
      ...input,
    });
    return reviveDatesInObject(res.data.signal) as Signal;
  } catch (error) {
    console.error("Error creating practice signal:", error);
    throw error;
  }
}

/** Resolve the safe practice payload for a draft WITHOUT persisting (powers a truthful preview). */
export async function previewPracticeSignal(
  threadId: string,
  input: CreatePracticeInput,
): Promise<PracticePayload> {
  try {
    const res = await axiosClient.post(`/threads/${threadId}/signals/preview`, {
      type: "practice",
      ...input,
    });
    return res.data.payload as PracticePayload;
  } catch (error) {
    console.error("Error previewing practice signal:", error);
    throw error;
  }
}

/** Share a canned "moment" (broad struggle/win state). No activity, no free text. */
export async function createMomentSignal(
  threadId: string,
  input: CreateMomentInput,
): Promise<Signal> {
  try {
    const res = await axiosClient.post(`/threads/${threadId}/signals`, {
      type: "moment",
      ...input,
    });
    return reviveDatesInObject(res.data.signal) as Signal;
  } catch (error) {
    console.error("Error creating moment signal:", error);
    throw error;
  }
}

// ── Reactions ──────────────────────────────────────────────────────────────────
/** React to a signal (idempotent upsert — switching reaction replaces it). */
export async function reactToSignal(signalId: string, type: ReactionType): Promise<Signal> {
  try {
    const res = await axiosClient.put(`/signals/${signalId}/reaction`, { type });
    return reviveDatesInObject(res.data.signal) as Signal;
  } catch (error) {
    console.error("Error reacting to signal:", error);
    throw error;
  }
}

/** Remove the current user's reaction from a signal. */
export async function unreactToSignal(signalId: string): Promise<void> {
  try {
    await axiosClient.delete(`/signals/${signalId}/reaction`);
  } catch (error) {
    console.error("Error removing reaction:", error);
    throw error;
  }
}

/** Delete the current user's own signal (server 403s if not the author). */
export async function deleteSignal(signalId: string): Promise<void> {
  try {
    await axiosClient.delete(`/signals/${signalId}`);
  } catch (error) {
    console.error("Error deleting signal:", error);
    throw error;
  }
}

// ── Crisis support (sensitive moments only) ──────────────────────────────────
/** Respond to a buddy's sensitive moment: a warm canned note, or a 988 lifeline hand-off.
 *  The server records it and sends a PRIORITY push to the author. */
export async function sendSupport({ signalId, ...body }: SendSupportInput): Promise<void> {
  try {
    await axiosClient.post(`/signals/${signalId}/support`, body);
  } catch (error) {
    console.error("Error sending support:", error);
    throw error;
  }
}

// ── Prompt cards ───────────────────────────────────────────────────────────────
/** Answer a prompt card with a one-tap canned reply (returns the updated card signal). */
export async function replyToPrompt(signalId: string, replyId: string): Promise<Signal> {
  try {
    const res = await axiosClient.post(`/signals/${signalId}/prompt-reply`, { replyId });
    return reviveDatesInObject(res.data.signal) as Signal;
  } catch (error) {
    console.error("Error replying to prompt:", error);
    throw error;
  }
}
