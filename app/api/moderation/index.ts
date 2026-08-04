// api/moderation/index.ts
//
// Report and block. Required by App Store Guideline 1.2, which asks any app
// carrying user-generated content for a way to report it, a way to block a
// user, a way to filter objectionable material, and published contact info.
//
// The free text that reaches another human is narrower than it looks: the
// practice-share caption, and the display name (which renders as the author on
// every timeline card and inside the buddy's push notifications). Everything
// else on that surface is a fixed, server-validated vocabulary.
import axiosClient from "../axiosClient";

export type ReportReason =
  | "harassment"
  | "hate"
  | "sexual"
  | "self_harm"
  | "spam"
  | "other";

export interface BlockedUser {
  userId: string;
  name: string;
  createdAt: string;
}

interface ReportPayload {
  targetType: "signal" | "user";
  signalId?: string;
  reportedUserId?: string;
  reason: ReportReason;
  details?: string;
}

/**
 * File a report. Idempotent per (reporter, signal) server-side, so a double tap
 * is a no-op rather than an error.
 */
export async function reportContent(payload: ReportPayload): Promise<void> {
  await axiosClient.post("/moderation/reports", payload);
}

/**
 * Block someone, which also ends any active pairing with them and (by default)
 * files a report alongside it.
 */
export async function blockUser(
  userId: string,
  reason?: ReportReason,
): Promise<void> {
  await axiosClient.post("/moderation/blocks", {
    userId,
    reason,
    alsoReport: !!reason,
  });
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const res = await axiosClient.get("/moderation/blocks");
  return res.data as BlockedUser[];
}

/** The recovery path. People do block in the wrong thread. */
export async function unblockUser(userId: string): Promise<void> {
  await axiosClient.delete(`/moderation/blocks/${userId}`);
}
