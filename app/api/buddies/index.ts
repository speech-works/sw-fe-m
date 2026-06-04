// api/buddies/index.ts
import axiosClient from "../axiosClient";

/** Canonical cheer reaction keys (UI labels live in constants/buddyCheers.ts). */
export type CheerType = "proud" | "keep_going" | "well_done" | "high_five";

export type BuddyRole = "inviter" | "invitee";
export type BuddyLinkStatus = "pending" | "active" | "ended";
export type BuddyLinkSource = "invite_code" | "matchmaking";

export interface BuddyProfile {
  id: string;
  name: string;
  profilePictureUrl?: string;
}

export interface BuddyLink {
  id: string;
  status: BuddyLinkStatus;
  source: BuddyLinkSource;
  /** Whether the current user is the inviter or the invitee in this link. */
  role: BuddyRole;
  /** The other person. Null while the link is still pending (code not yet redeemed). */
  buddy: BuddyProfile | null;
  /** Report-sharing consent, from the current user's perspective. */
  iShareReports: boolean;
  buddySharesReports: boolean;
  createdAt: Date;
  /** Set when the invitee completes their first practice ("started"). */
  activatedAt?: Date | null;
}

export interface Cheer {
  id: string;
  type: CheerType;
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
}

export interface BuddySummary {
  /** The current user's own shareable invite code. */
  referralCode: string;
  /** The user's current link, or null if they have no buddy. */
  link: BuddyLink | null;
  /** Cheers the user has received (most recent first). */
  receivedCheers: Cheer[];
}

/**
 * The buddy's shared progress report. Shape mirrors the user's own progress/practice
 * report and is defined by the backend; rendered defensively on the Buddy screen.
 */
export type BuddySharedReport = Record<string, unknown>;

// Get my code, current buddy link, and received cheers
export async function getMyBuddy(): Promise<BuddySummary> {
  try {
    const response = await axiosClient.get("/buddies/me");
    return response.data;
  } catch (error) {
    console.error("Error fetching buddy summary:", error);
    throw error;
  }
}

// Validate a code before submitting (optional UX helper)
export async function validateInviteCode(
  code: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const response = await axiosClient.get("/buddies/validate", {
      params: { code },
    });
    return response.data;
  } catch (error) {
    console.error("Error validating invite code:", error);
    throw error;
  }
}

// Attach an invite code (new sign-ups only) — forms the pending buddy link.
// Server enforces "new sign-ups only" and same-device/email anti-fraud.
export async function attachInviteCode(code: string): Promise<BuddyLink> {
  try {
    const response = await axiosClient.post("/buddies/redeem", { code });
    return response.data;
  } catch (error) {
    console.error("Error attaching invite code:", error);
    throw error;
  }
}

// Get the buddy's shared progress report (gated server-side by their consent flag)
export async function getBuddyReport(): Promise<BuddySharedReport> {
  try {
    const response = await axiosClient.get("/buddies/report");
    return response.data;
  } catch (error) {
    console.error("Error fetching buddy report:", error);
    throw error;
  }
}

// Send a one-tap cheer to the buddy
export async function sendCheer(type: CheerType): Promise<Cheer> {
  try {
    const response = await axiosClient.post("/buddies/cheer", { type });
    return response.data;
  } catch (error) {
    console.error("Error sending cheer:", error);
    throw error;
  }
}

// Set whether I share my progress report with my buddy (consent)
export async function setReportConsent(shared: boolean): Promise<BuddyLink> {
  try {
    const response = await axiosClient.patch("/buddies/consent", { shared });
    return response.data;
  } catch (error) {
    console.error("Error updating report consent:", error);
    throw error;
  }
}

// Manually leave the current buddy (frees the slot)
export async function leaveBuddy(): Promise<void> {
  try {
    await axiosClient.post("/buddies/leave");
  } catch (error) {
    console.error("Error leaving buddy:", error);
    throw error;
  }
}
