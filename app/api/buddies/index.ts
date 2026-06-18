// api/buddies/index.ts
//
// The buddy RELATIONSHIP layer only: link lifecycle (invite-code), report-sharing consent, and
// cooperative scoring (bond/team/pulse). All COMMUNICATION (signals, reactions, support) lives in
// api/threads — cheering is now a reaction on a timeline signal, not a standalone buddy action.
import axiosClient from "../axiosClient";

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

export interface BuddySummary {
  /** The current user's own shareable invite code. */
  referralCode: string;
  /** The user's current link, or null if they have no buddy. */
  link: BuddyLink | null;
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

/** Cooperative "team" snapshot — effort-only, cumulative, never-lose-able. */
export interface BuddyTeam {
  hasBuddy: boolean;
  buddyName: string | null;
  buddyShares: boolean;
  combinedEffortTotal: number;
  daysTogether: number;
  weeklyCombinedDays: number;
  weeklyQuestTarget: number;
  combinedXpThisWeek: number;
  bothActiveThisWeek: boolean;
  myLastPracticeAt: string | Date | null;
  buddyLastPracticeAt: string | Date | null;
  // Bond Level — shared-era combined XP through the user level engine.
  bondXp: number;
  bondLevel: number;
  bondStageTitle: string;
  bondFullTitle: string;
  bondStageIcon: string;
  bondXpFloor: number;
  bondXpCeiling: number;
}

export interface CommunityPulse {
  activitiesThisWeek: number;
}

// Cooperative team snapshot (combined effort, weekly quest, momentum).
export async function getBuddyTeam(): Promise<BuddyTeam> {
  try {
    const response = await axiosClient.get("/buddies/team");
    return response.data;
  } catch (error) {
    console.error("Error fetching buddy team:", error);
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
