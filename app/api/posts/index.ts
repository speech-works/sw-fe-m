// api/posts/index.ts
//
// Practice "card-post" feed. Generic / audience-agnostic by design: a post is a
// post regardless of who sees it. The audience lives in `visibility` (today only
// 'buddy'); community later adds 'community' + a community_id with NO rename here.
// Buddy *relationships* stay buddy-named (see api/buddies); only post CONTENT is
// generic. Reaction vocabulary reuses CheerType from api/buddies.
import axiosClient from "../axiosClient";
import { BuddyProfile, CheerType } from "../buddies";
import { reviveDatesInObject } from "../../util/functions/date";

/** Which practice family a post is about (mirrors PracticeActivityContentType + Library). */
export type PostActivityKind =
  | "READING_PRACTICE"
  | "FUN_PRACTICE"
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "TECHNIQUE_PRACTICE";

/** Card template ids. Visuals live in constants/postTemplates.ts (mirrors buddyCheers.ts). */
export type PostTemplateId =
  | "milestone"
  | "streak"
  | "courage"
  | "calm"
  | "minimal";

/** Post kind discriminator — future-proofs audio/other media without a breaking change. */
export type PostKind = "card"; // future: "card_audio" | "text" | "video"

/** Audience scope. 'buddy' today; community/public are additive later. */
export type PostVisibility = "buddy"; // future: "community" | "public"

export type GrowthAxis =
  | "mastery"
  | "ease"
  | "courage"
  | "confidence"
  | "social";

/**
 * SAFE, process-only facts a card may render. Every field is OPTIONAL and is
 * populated SERVER-SIDE from the activity. NOTHING fluency/outcome-related is ever
 * included (no scores, disfluency, tension, mastery%). The client never invents these.
 * `v` is a schema version so the payload can evolve without breaking old clients.
 */
export interface PostPayload {
  v: 1;
  activityName: string; // e.g. "Story practice", "Faced a phone-call challenge"
  durationSeconds?: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  showedUp?: boolean; // "showed up today"
  streakDays?: number; // server-computed
  xpEarned?: number;
  leveledUp?: boolean;
  levelStageTitle?: string; // from LevelStage.title
  /** "Your Nth READING practice" — CATEGORY-level only in v1. */
  milestoneLabel?: string;
  /** A single growth axis to celebrate, framed as effort (e.g. courage for exposure). */
  growthDelta?: { axis: GrowthAxis; direction: "up" };
  // FUTURE (non-breaking): audioUrl?, audioDurationSeconds?, waveformPeaks?
}

/** The subset of payload fields a user may toggle on/off when composing. */
export type PostPayloadField = Exclude<keyof PostPayload, "v">;

/** A reaction on a post. Reuses the CheerType vocabulary — no new reaction enum. */
export interface PostReaction {
  id: string;
  postId: string;
  type: CheerType;
  fromUserId: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  kind: PostKind;
  visibility: PostVisibility;
  /** The author. Reuses the existing BuddyProfile shape. */
  author: BuddyProfile;
  /** Server-resolved: drives the "You" label + delete affordance. */
  authorIsMe: boolean;
  activityKind: PostActivityKind;
  templateId: PostTemplateId;
  /** The safe facts actually chosen for display (resolved server-side). */
  payload: PostPayload;
  /** The poster's own optional words — the only free text in v1. */
  caption?: string;
  /** All reactions on this post. */
  reactions: PostReaction[];
  /** The current user's reaction, if any (for toggle UI). */
  myReaction?: CheerType | null;
  createdAt: Date;
  // FUTURE (non-breaking): comments?, commentsEnabled?, commentCount?
}

export interface CreatePostInput {
  /** The completed PracticeActivity this post is about. */
  activityId: string;
  templateId: PostTemplateId;
  /** Fields the user kept visible; server intersects with what's actually safe + available. */
  includedFields: PostPayloadField[];
  caption?: string;
  visibility: PostVisibility;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

/** Scope of a feed read — which audience's posts to show. */
export type FeedScope = "buddy"; // future: "community"

// Create a post from a completed activity. Server derives the safe payload
// (streak/xp/levelUp/milestone/growth) and enforces the fluency-exclusion allow-list.
export async function createPost(input: CreatePostInput): Promise<Post> {
  try {
    const response = await axiosClient.post("/posts", input);
    return reviveDatesInObject(response.data.post) as Post;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

// Resolve the safe payload for a draft WITHOUT persisting — powers a truthful composer
// preview (server runs the same builder + allow-list). Optional dependency: if the BE
// endpoint isn't available yet, callers should fall back to locally-known fields only
// (never fabricate server-derived values like streak/xp).
export async function previewPost(input: CreatePostInput): Promise<PostPayload> {
  try {
    const response = await axiosClient.post("/posts/preview", input);
    return response.data.payload as PostPayload;
  } catch (error) {
    console.error("Error previewing post:", error);
    throw error;
  }
}

// Fetch the feed for a scope (reverse-chronological, cursor-paginated).
export async function getFeed(
  scope: FeedScope = "buddy",
  cursor?: string,
  limit = 20,
): Promise<FeedPage> {
  try {
    const response = await axiosClient.get("/posts/feed", {
      params: { scope, cursor, limit },
    });
    return reviveDatesInObject(response.data) as FeedPage;
  } catch (error) {
    console.error("Error fetching feed:", error);
    throw error;
  }
}

// React to a post (idempotent upsert — switching reaction just replaces it).
export async function reactToPost(
  postId: string,
  type: CheerType,
): Promise<Post> {
  try {
    const response = await axiosClient.put(`/posts/${postId}/reaction`, {
      type,
    });
    return reviveDatesInObject(response.data.post) as Post;
  } catch (error) {
    console.error("Error reacting to post:", error);
    throw error;
  }
}

// Remove the current user's reaction from a post.
export async function unreactToPost(postId: string): Promise<void> {
  try {
    await axiosClient.delete(`/posts/${postId}/reaction`);
  } catch (error) {
    console.error("Error removing reaction:", error);
    throw error;
  }
}

// Delete the current user's own post (server returns 403 if not the author).
export async function deletePost(postId: string): Promise<void> {
  try {
    await axiosClient.delete(`/posts/${postId}`);
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error;
  }
}
