import axiosClient from "../axiosClient";
import { XPLog } from "../userXP/types";
import { ToolNudgeDirective } from "../tools/types";
import { ToolType } from "../tools/types";
import { AvatarManifest } from "../../types/avatar";

export interface User {
  id: string;
  email: string;
  bio?: string;
  name: string;
  profilePictureUrl?: string;
  dob?: Date;
  phoneNumber?: string;

  links?: {
    social: {
      twitter?: string;
      github?: string;
      linkedin?: string;
      website?: string;
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
      youtube?: string;
      tiktok?: string;
      reddit?: string;
      other?: string;
    };
  };

  totalXp?: number;
  xpLogs?: XPLog[];
  isPaid?: boolean;
  level?: number;
  currentStamina?: number;
  maxStaminaCap?: number;
  staminaRegenRateMs?: number;
  lastStaminaUpdate?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;

  // required for onboarding logic
  hasCompletedOnboarding?: boolean;
  onboardingVersionCompleted?: string | null;

  // Other optional backend fields
  password?: string;
  isVerified?: true;
  oauthId?: string;
  oauthProvider?: string;
  stripeCustomerId?: string;
  fearedSounds?: string[];

  // Practice Buddy (v1) — backend-provided
  referralCode?: string; // the user's own shareable invite code
  invitedByUserId?: string | null; // who invited them (null if organic)
  acquisitionSource?: "organic" | "buddy_invite";

  /**
   * Fluency-aid over-reliance nudge to surface on the activity start screen,
   * computed server-side and delivered with the user payload. Null when no
   * nudge is due (below threshold, within frequency cap, or insufficient data).
   */
  toolNudge?: ToolNudgeDirective | null;

  /** User-owned avatar (Phase D). Null until the first Save in the Avatar
   *  Studio; the client renders the default avatar for null. Mirrors the
   *  backend's `AvatarManifestData` and flows through `updateMyUser`. */
  avatarManifest?: AvatarManifest | null;

  vacationMode?: boolean;

  // Consent (production-readiness pass, WS5) — server-side record so a
  // reinstall doesn't silently re-collect consent that was already given.
  aiCallConsentAt?: Date | null;
  researchConsent?: boolean;
  researchConsentAt?: Date | null;
  consentVersion?: string | null;
}

export interface LevelStage {
  level: number;
  relativeLevel: number;
  romanRelative: string;
  title: string;
  fullTitle: string;
  shortDescription: string;
  progressReportCopy: string;
  minLevel: number;
  maxLevel: number | null;
  stamina: {
    max: number;
    regenMinutesPerPoint: number;
  };
  currentLevelXpFloor: number;
  nextLevelXpCeiling: number;
  totalXp: number;
  stages: {
    minLevel: number;
    maxLevel: number | null;
    title: string;
    shortDescription: string;
    progressReportCopy: string;
    stamina: {
      max: number;
      regenMinutesPerPoint: number;
    };
  }[];
}

// Get user by ID
export async function getUserById(id: string): Promise<User> {
  try {
    const response = await axiosClient.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
}

// Update user by ID
export async function updateUserById(
  id: string,
  user: Partial<Omit<User, "id" | "password" | "createdAt">>,
): Promise<User> {
  try {
    const response = await axiosClient.patch(`/users/${id}`, user);
    return response.data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// Delete user by ID
export async function deleteUserById(id: string): Promise<void> {
  try {
    await axiosClient.delete(`/users/${id}`);
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

// Permanently delete the authenticated user's own account. The server reads the
// user id from the verified auth token (DELETE /users/me), so the client never
// supplies an id; a user can only ever delete themselves.
export async function deleteMe(): Promise<void> {
  try {
    await axiosClient.delete("/users/me");
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
}

// Get my user (current authenticated user)
export async function getMyUser(): Promise<User> {
  try {
    const response = await axiosClient.get("/users/me");
    return response.data;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
}

// Update the current authenticated user (PATCH /users/me)
export async function updateMyUser(
  updates: Partial<Omit<User, "id" | "password" | "createdAt">>,
): Promise<User> {
  try {
    const response = await axiosClient.patch("/users/me", updates);
    return response.data;
  } catch (error) {
    console.error("Error updating current user:", error);
    throw error;
  }
}

/**
 * Dismiss the fluency-aid over-reliance nudge for a tool. Starts the 14-day
 * server-side frequency cap. Fired only when the user actually dismisses.
 */
export async function dismissToolNudge(tool: ToolType): Promise<void> {
  try {
    await axiosClient.post("/users/me/tool-nudge/dismiss", { tool });
  } catch (error) {
    console.error("Error dismissing tool nudge:", error);
    throw error;
  }
}

/**
 * Record server-side that the user acknowledged the AI-call consent modal
 * (production-readiness pass, WS5). Fire-and-forget — the FE gate itself
 * relies on the local `useAICallConsentStore` for the offline/first-run case.
 */
export async function postAiCallConsent(consentVersion?: string): Promise<void> {
  try {
    await axiosClient.post("/users/me/consent/ai-call", { consentVersion });
  } catch (error) {
    console.error("Error recording AI-call consent:", error);
    throw error;
  }
}

/**
 * Set (or revoke) the optional, opt-in research-use consent (WS5).
 */
export async function postResearchConsent(enabled: boolean): Promise<{ researchConsent: boolean }> {
  try {
    const response = await axiosClient.post("/users/me/consent/research", { enabled });
    return response.data;
  } catch (error) {
    console.error("Error setting research consent:", error);
    throw error;
  }
}

// Get level stage details for current user
export async function getLevelStage(): Promise<LevelStage> {
  try {
    const response = await axiosClient.get("/users/me/level-stage");
    return response.data;
  } catch (error) {
    console.error("Error getting level stage:", error);
    throw error;
  }
}

// Mirrors backend EntitlementKey (src/models/Entitlement.ts) — kept in sync
// manually. Pack keys are `pack:<slug>` (any pack in the server catalog).
export type EntitlementKey = `pack:${string}` | "membership" | "founderCohort";

export interface Wallet {
  balance: number;
  entitlements: EntitlementKey[];
  founderCohort: boolean;
}

// One purchasable pack from GET /users/me/offers. The store `tierProductId`
// and price are display hints; the authoritative price is re-resolved by the
// backend when a purchase intent is created (SPEECHWORKS-STRATEGY.md §6.14).
export interface OfferItem {
  key: string;
  title: string;
  shelf: "small" | "regular" | "deep";
  tierProductId: string;
  priceInr: number;
  priceUsd: number;
  owned: boolean;
}

/**
 * The two FIXED store products (no purchase intent — they're unambiguous).
 * Ids and prices are served by the backend so the app never hardcodes either.
 */
export interface TopupOffer {
  productId: string;
  credits: number;
  priceInr: number;
  priceUsd: number;
}

export interface MembershipOffer {
  productId: string;
  priceInr: number;
  priceUsd: number;
  annualProductId: string;
  annualPriceInr: number;
  annualPriceUsd: number;
}

export interface Offers {
  isFounderCohort: boolean;
  showMembershipOffer: boolean;
  items: OfferItem[];
  topup: TopupOffer;
  membership: MembershipOffer;
}

// Response of POST /users/me/purchase-intent — the store tier to buy for a pack.
export interface PurchaseIntentResponse {
  intentId: string;
  tierProductId: string;
  priceInr: number;
  priceUsd: number;
}

// GET /users/me/wallet — call-credit balance + active entitlements
// (PAYMENTS-PLAN.md §2). Lazily triggers a RevenueCat reconcile server-side.
export async function getWallet(): Promise<Wallet> {
  try {
    const response = await axiosClient.get("/users/me/wallet");
    return response.data;
  } catch (error) {
    console.error("Error getting wallet:", error);
    throw error;
  }
}

// GET /users/me/offers — the available packs with resolved tier/price, plus
// whether the membership offer should be surfaced.
export async function getOffers(): Promise<Offers> {
  try {
    const response = await axiosClient.get("/users/me/offers");
    return response.data;
  } catch (error) {
    console.error("Error getting offers:", error);
    throw error;
  }
}

// POST /users/me/purchase-intent — tell the backend which pack the user wants;
// it returns the store tier SKU to purchase (the authoritative price decision).
export async function createPurchaseIntent(
  catalogItemKey: string,
): Promise<PurchaseIntentResponse> {
  try {
    const response = await axiosClient.post("/users/me/purchase-intent", {
      catalogItemKey,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating purchase intent:", error);
    throw error;
  }
}
