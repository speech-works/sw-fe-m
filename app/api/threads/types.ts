// api/threads/types.ts
//
// The unified "Signals on a Thread" model for buddy (and, later, community) communication.
// A THREAD is a shared timeline scoped to an audience (buddy = 2 members, community = N).
// A SIGNAL is anything in that timeline — discriminated by `type`. Cheering is NOT a signal;
// it is a REACTION (one small fixed branded set). Curated ambient content (prompts/affirmations)
// lives in the BE `community_cards` table and arrives resolved inside a `card` signal's payload.
//
// This module is audience-agnostic by design: a buddy thread and a community thread differ by a
// single field (`kind` + member count + nullable `communityId`), so nothing here needs a rename
// when the full community ships.

// ── Members ────────────────────────────────────────────────────────────────
/** A person in a thread. (Structurally the old BuddyProfile.) */
export interface MemberProfile {
  id: string;
  name: string;
  profilePictureUrl?: string;
}

// ── Thread ───────────────────────────────────────────────────────────────────
export type ThreadKind = "buddy" | "community";

export interface Thread {
  id: string;
  kind: ThreadKind;
  /** 2 for a buddy thread, N for a community thread — same entity. */
  members: MemberProfile[];
  /** The ONLY field a community thread adds; null for a buddy thread. */
  communityId: string | null;
  createdAt: Date;
  /** Delivery/unread support (server-resolved for the current user). */
  lastSignalAt: Date | null;
  unreadCount: number;
}

// ── Reactions — ONE small fixed branded set (the "Speechworks reactions") ─────
// Universal: the same five show on every signal; the viewer picks the one that fits
// (celebration → empathy). NSA-aligned; none reference fluency. Replaces the old 12-type,
// 4-catalog cheer system. Visuals live in constants/reactions.ts.
export type ReactionType = "courage" | "proud" | "strength" | "with_you" | "celebrate";

export interface ReactionOption {
  type: ReactionType;
  emoji: string;
  label: string;
}

export interface Reaction {
  id: string;
  signalId: string;
  type: ReactionType;
  fromUserId: string;
  createdAt: Date;
}

// ── Practice signal payload (the only safe facts a practice card may render) ──
// Carried over verbatim from the old PostPayload. Process-only, populated SERVER-SIDE; NOTHING
// fluency/outcome-related is ever included (no scores, disfluency, tension, mastery%).
export type ActivityKind =
  | "READING_PRACTICE"
  | "FUN_PRACTICE"
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "TECHNIQUE_PRACTICE";

/** Card template ids — visuals in constants/postTemplates.ts. */
export type TemplateId = "milestone" | "streak" | "courage" | "calm" | "minimal";

export type GrowthAxis = "mastery" | "ease" | "courage" | "confidence" | "social";

export interface PracticePayload {
  v: 1;
  activityName: string;
  durationSeconds?: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  showedUp?: boolean;
  streakDays?: number;
  xpEarned?: number;
  leveledUp?: boolean;
  levelStageTitle?: string;
  milestoneLabel?: string;
  growthDelta?: { axis: GrowthAxis; direction: "up" };
  // ── Journey (pack/module) context ──────────────────────────────────────────
  // Server-derived from the activity's pack/module link and SNAPSHOTTED into the
  // stored signal at share time (so "X of N"/completion stay truthful as the user
  // advances). Names + progress + completion ONLY — never clinical taxonomy
  // (PackCategory/Philosophy/Intensity), vitals, scores, or toolsUsed. "Pack" is
  // surfaced to the buddy as a "Journey".
  journeyTitle?: string;
  moduleTitle?: string;
  /** 1-based position of this module within the journey, e.g. { moduleIndex: 4, moduleTotal: 8 } → "4 of 8". */
  journeyProgress?: { moduleIndex: number; moduleTotal: number };
  /** This activity's completion finished its module. Emitted SERVER-SIDE ungated (not a toggle). */
  moduleCompleted?: boolean;
  /** This activity's completion finished the whole journey. Emitted SERVER-SIDE ungated (not a toggle). */
  journeyCompleted?: boolean;
}

/** Toggleable payload fields when composing a practice signal. */
export type PracticePayloadField = Exclude<keyof PracticePayload, "v">;

// ── Moment statements — a COMPACT, BROAD set of states (not specific events) ──
// Text/emoji/valence/sensitivity live in constants/momentMessages.ts.
export type MomentValence = "struggle" | "win";

export type MomentId =
  // wins (broad)
  | "a_win"
  | "faced_a_fear"
  | "spoke_up"
  | "proud_moment"
  // struggles (broad); the last two are `sensitive` → "Reach out" + crisis prompt
  | "tough_day"
  | "anxious"
  | "really_struggling"
  | "weighed_down";

// ── Crisis support notes (the "Reach out" reply vocabulary) ──────────────────
export type SupportNoteId = "here_for_you" | "not_going_anywhere" | "you_matter";

// ── Signals — the timeline union ─────────────────────────────────────────────
export type SignalType =
  | "practice" // user-authored: an auto card from a completed practice
  | "moment" //   user-authored: a canned struggle/win check-in
  | "beat" //     system: a relationship/group beat COMPUTED from activity
  | "card"; //    system: CURATED content broadcast from the CommunityCard table

interface BaseSignal {
  id: string;
  threadId: string;
  type: SignalType;
  /** System signals use a "Speechworks" sentinel author. */
  author: MemberProfile;
  authorIsMe: boolean;
  createdAt: Date;
  reactions: Reaction[];
  myReaction?: ReactionType | null;
  // FUTURE (non-breaking): commentCount?, commentsEnabled? ← community comments
}

export interface PracticeSignal extends BaseSignal {
  type: "practice";
  activityKind: ActivityKind;
  templateId: TemplateId;
  payload: PracticePayload;
  /** The poster's own optional words — the ONLY free text, practice-only. */
  caption?: string;
}

export interface MomentSignal extends BaseSignal {
  type: "moment";
  momentId: MomentId;
  /** Sensitive moment only: has the current user already reached out (a support beat exists)? */
  iReachedOut?: boolean;
}

/** Server-COMPUTED relationship/group beats (cooperative only, never competitive, no fluency). */
export interface BeatSignal extends BaseSignal {
  type: "beat";
  beatKind:
    | "bond_level_up"
    | "anniversary"
    | "shared_streak"
    | "both_active_week"
    | "community_pulse"
    | "resurfaced_win"
    | "support_note"
    | "support_lifeline";
  payload: { label: string; body?: string; value?: number; icon?: string; refSignalId?: string };
}

/** CURATED editorial content (the signal is the per-thread instance; content lives in the card). */
export interface CardSignal extends BaseSignal {
  type: "card";
  cardId: string;
  cardKind: "prompt" | "affirmation" | "tip" | "challenge";
  payload: { title?: string; body: string; icon?: string };
  /** prompts only: the tiny canned reply set + collected one-tap answers. */
  replyOptions?: { id: string; label: string }[];
  replies?: { fromUserId: string; replyId: string }[];
  /** Non-prompt card only: has the buddy seen this (opened the timeline after it appeared)? */
  seenByBuddy?: boolean;
}

export type Signal = PracticeSignal | MomentSignal | BeatSignal | CardSignal;

export const isPractice = (s: Signal): s is PracticeSignal => s.type === "practice";
export const isMoment = (s: Signal): s is MomentSignal => s.type === "moment";
export const isBeat = (s: Signal): s is BeatSignal => s.type === "beat";
export const isCard = (s: Signal): s is CardSignal => s.type === "card";

// ── Inputs & paging ──────────────────────────────────────────────────────────
export interface CreatePracticeInput {
  /** The completed PracticeActivity this signal is about. */
  activityId: string;
  templateId: TemplateId;
  includedFields: PracticePayloadField[];
  caption?: string;
}

export interface CreateMomentInput {
  momentId: MomentId;
}

export interface SendSupportInput {
  signalId: string;
  kind: "note" | "lifeline";
  /** Required when kind === "note". */
  noteId?: SupportNoteId;
}

export interface TimelinePage {
  signals: Signal[];
  nextCursor: string | null;
}
