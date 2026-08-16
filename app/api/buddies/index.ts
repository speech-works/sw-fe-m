// api/buddies/index.ts
//
// The buddy RELATIONSHIP layer only: link lifecycle (invite-code), report-sharing consent, and
// cooperative scoring (bond/team/pulse). All COMMUNICATION (signals, reactions, support) lives in
// api/threads — cheering is now a reaction on a timeline signal, not a standalone buddy action.
import axiosClient from "../axiosClient";
import { isClientError } from "../../util/functions/apiError";
import type { AvatarManifest } from "../../types/avatar";

export type BuddyRole = "inviter" | "invitee";
export type BuddyLinkStatus = "pending" | "active" | "ended";
export type BuddyLinkSource = "invite_code" | "matchmaking";

export interface BuddyProfile {
  id: string;
  name: string;
  /** Google/OAuth photo. Kept only as the fallback behind `avatarManifest`. */
  profilePictureUrl?: string;
  /**
   * The buddy's own avatar. Absent/null = never customized, in which case
   * UserAvatar renders the default character (NOT the OAuth photo — the face
   * a person chose, or the app's own, is what a buddy should see).
   */
  avatarManifest?: AvatarManifest | null;
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

/**
 * What entering a code did.
 *
 * Two honest outcomes rather than one optimistic one. A brand-new account
 * redeeming a code it was plainly sent is paired on the spot; everyone else
 * has ASKED, and the code's owner still has to say yes. The screen renders the
 * difference — it never claims a pairing that is waiting on someone.
 */
export interface PairResult {
  status: "paired" | "requested";
  /** Present only when `status` is "paired". */
  link: BuddyLink | null;
}

// Pair with the owner of a code. Either pairs you or sends them a request —
// the server decides which, and says so.
export async function attachInviteCode(code: string): Promise<PairResult> {
  try {
    const response = await axiosClient.post("/buddies/redeem", { code });
    return response.data as PairResult;
  } catch (error) {
    // A rejected code is an ANSWER, not a fault — the server distinguishes six
    // reasons and every one is something the person can act on. `console.error`
    // raised a dev redbox over a mistyped code, which made a handled outcome
    // look like a crash. Callers surface the message; faults still get logged.
    if (!isClientError(error)) {
      console.error("Error attaching invite code:", error);
    }
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

// ── Buddy requests ──────────────────────────────────────────────────────────
// Unlike `attachInviteCode`, which pairs you the instant the code is accepted,
// these put a consent step in front of pairing — which is what makes it safe to
// reach someone who never handed you a code.

export interface BuddyRequest {
  id: string;
  /** "incoming" = they asked you. "outgoing" = you asked them. */
  direction: "incoming" | "outgoing";
  profile: BuddyProfile;
  createdAt: string;
  /**
   * What the sender chose to publish about themselves, copied from their
   * discovery card — the same strings, server-phrased, nothing added.
   *
   * WHY THIS IS NOT A PRIVACY WIDENING. A `BuddyProfile` is deliberately thin
   * ("a pending request must never expose more about a person than being their
   * buddy does"). These fields sit alongside it rather than inside it because
   * they are a different kind of thing: not facts the app knows about someone,
   * but a card they wrote and asked to have shown. The server sends them only
   * while the sender is still discoverable, so withdrawing the card withdraws
   * this too.
   *
   * OPTIONAL, and every consumer must degrade rather than fill the gap. An
   * older server sends none of it, and a person with nothing published sends an
   * empty list. In both cases the honest UI is a shorter card, never a vaguer
   * one — the same rule `matchReason` already carries.
   */
  tags?: string[];
  /** Why they were surfaced to each other, or null when there is nothing
   *  honest to say. Render nothing at all when null. */
  matchReason?: string | null;
  /** Coarse "on Speechworks since" date. Month precision, never a last-seen. */
  memberSince?: string | null;
  /**
   * OUTGOING ONLY: they have paired with somebody else since you asked.
   *
   * The request is still pending and still yours to cancel; it simply cannot be
   * answered right now. Without this the sender waits on a screen that will
   * never change, which is the one thing a hold must not do to them.
   */
  recipientPaired?: boolean;
}

/** Everything unanswered, both directions. */
export async function getBuddyRequests(): Promise<BuddyRequest[]> {
  const res = await axiosClient.get("/buddies/requests");
  return res.data as BuddyRequest[];
}

/** Ask someone to pair. */
export async function sendBuddyRequest(userId: string): Promise<BuddyRequest> {
  const res = await axiosClient.post("/buddies/requests", { userId });
  return res.data as BuddyRequest;
}

/** Accept an incoming request — this is what forms the pairing. */
export async function acceptBuddyRequest(requestId: string): Promise<BuddyLink> {
  const res = await axiosClient.post(`/buddies/requests/${requestId}/accept`);
  return res.data as BuddyLink;
}

/** Refuse a request. The sender is never told, and can't ask again. */
export async function declineBuddyRequest(requestId: string): Promise<void> {
  await axiosClient.post(`/buddies/requests/${requestId}/decline`);
}

/** Withdraw a request you sent. */
export async function cancelBuddyRequest(requestId: string): Promise<void> {
  await axiosClient.delete(`/buddies/requests/${requestId}`);
}

// ── Discovery ───────────────────────────────────────────────────────────────
// For people who don't already know anyone here. Opt-in on BOTH ends: you only
// appear if you asked to, and your card says what you chose to say — never your
// onboarding answers republished.

export interface DiscoveryProfile {
  discoverable: boolean;
  /** The tag ids currently shown on your card. */
  tags: string[];
  /** Tags you could pick, drawn from your own onboarding answers. */
  suggestions: string[];
  /** Why you can't be listed AT ALL, or null. Hard: the server refuses the
   *  write too, so the switch must be disabled while this is set. */
  blockedReason: string | null;
  /**
   * Why you are not appearing right now despite the switch being on, or null.
   *
   * Soft. Holiday mode and already having a buddy both drop you from the
   * candidate query, and neither used to be told to anyone — the switch said
   * "on" while the server said no. Informational only: the preference is still
   * yours to change while paused.
   */
  pausedReason?: string | null;
}

export interface DiscoveryCandidate {
  userId: string;
  name: string;
  avatarManifest?: AvatarManifest | null;
  /** Already phrased for display by the server. */
  tags: string[];
  /**
   * Why they were surfaced, or NULL when there's nothing honest to say. Render
   * nothing at all when null — never substitute a vaguer line.
   */
  matchReason: string | null;
}

export interface DiscoveryPage {
  candidates: DiscoveryCandidate[];
  nextCursor: string | null;
}

export async function getDiscoveryProfile(): Promise<DiscoveryProfile> {
  const res = await axiosClient.get("/buddies/discovery-profile");
  return res.data as DiscoveryProfile;
}

export async function setDiscoveryProfile(
  discoverable: boolean,
  tags: string[],
): Promise<DiscoveryProfile> {
  const res = await axiosClient.patch("/buddies/discovery-profile", {
    discoverable,
    tags,
  });
  return res.data as DiscoveryProfile;
}

export async function discoverBuddies(cursor?: string): Promise<DiscoveryPage> {
  const res = await axiosClient.get("/buddies/discover", {
    params: cursor ? { cursor } : undefined,
  });
  return res.data as DiscoveryPage;
}
