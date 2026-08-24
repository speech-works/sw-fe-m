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
  /**
   * Membership, as the server decided it.
   *
   * Replaces the old `isPaid` boolean, which the server kept as a cached flag
   * that nothing cleared when a membership expired. It is an OBJECT rather than
   * a date on purpose, and the split is the important part:
   *
   *   active  the ONLY thing to gate on. Computed on the server.
   *   until   DISPLAY ONLY. Never compare it against the device clock.
   *
   * A phone with the wrong date, or one the user set forward deliberately,
   * would grant itself membership if the app decided this locally. The server
   * has the only clock that counts.
   */
  membership?: {
    active: boolean;
    /** ISO instant, or null when they are not a member or have no end date. */
    until: string | null;
    /** Whole days left in the USER'S OWN calendar, computed server-side. */
    daysRemaining: number | null;
    /**
     * Will it renew on its own?
     *
     * True for a store subscription, which Apple or Google renew without
     * anyone doing anything. False for a membership we granted, above all the
     * thirty free days a first-time pack buyer gets: that one simply stops,
     * unannounced, and is the only case worth saying anything about.
     */
    willRenew?: boolean;
  };
  level?: number;
  currentStamina?: number;
  /**
   * What one practice costs, from the server. Lets the app say "5 practices
   * left" rather than "35%". See `practicesLeftFor`.
   */
  practiceStaminaCost?: number;
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

  /**
   * When their ONCE-IN-A-LIFETIME first call actually connected, or null/absent
   * if it is still waiting. Read-only here: the client uses it purely to skip
   * asking the server for an offer that cannot exist, never to decide whether
   * somebody is entitled to one — that answer is `GET /first-call`'s alone.
   */
  firstCallTakenAt?: Date | null;
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
  /**
   * The free weekly call — one every seven days for a user with no credits.
   *
   * Both fields are computed by the server from the SAME code the start-gate
   * runs, so a card that says "Free call ready" cannot sit over a screen that
   * refuses to dial. Do NOT re-derive either of these from a timestamp in the
   * app: the window is a rolling seven days from the last call (nothing resets
   * on a Monday), and the gate decides under a row lock that no client-side
   * arithmetic can reproduce.
   */
  freeCallAvailable?: boolean;
  /** ISO instant the next free call unlocks; null while one is available. */
  nextFreeCallAt?: string | null;
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
  /**
   * The pack's standing shelf price, in our own two-currency price book.
   *
   * FALLBACK ONLY — prefer `anchorTierProductId`. These come off a hardcoded
   * backend constant whose own header says the store is the source of truth, so
   * the moment a store price point or a regional override diverges they stop
   * describing what anyone is charged. Striking one of these over a real store
   * price is how a fabricated "was" gets on screen, which is why
   * `resolvePriceDisplay` only reaches for them when no store anchor resolved,
   * and only for an INR or USD buyer.
   */
  anchorPriceInr: number;
  anchorPriceUsd: number;
  /**
   * The STORE PRODUCT ID of the tier the anchor quotes — the "was" as its own
   * purchasable product. Look it up in the store exactly like `tierProductId`
   * and the struck price becomes a real, store-localized string in the buyer's
   * own currency, so the launch/founder discount is visible in all ~170
   * countries instead of only the two we keep a price book for.
   *
   * Null when nothing is discounted, or when the backend cannot name a tier to
   * anchor against. Treat null — and a missing field, from a backend older than
   * this contract — identically: no store anchor is available, fall back to
   * `anchorPriceInr`/`anchorPriceUsd`, and show no strike in any other currency
   * rather than converting one ourselves.
   */
  anchorTierProductId: string | null;
  owned: boolean;
  /**
   * The pack this offer sells, for opening GET /packs/{id}/brochure.
   * Null means the catalog advertises something no pack delivers — a config
   * mistake the backend's catalog:verify and boot-time drift check both flag.
   * Treat null as "not openable" rather than assuming a pack exists.
   */
  packId: string | null;
  /** Length of the guided arc in days, for "8-day guided arc". Null if none. */
  arcDays: number | null;
  /** One-line pitch, straight from the pack — never written in the app. */
  blurb: string | null;
  /** AI practice calls bundled with the pack. 0 for most; 8–10 on premium. */
  creditGrantAmount: number;
  /**
   * Days of membership gifted on purchase. ONLY show this alongside
   * `Offers.bonusMembershipEligible` — the backend grants it to first-time
   * pack buyers only, so advertising it unconditionally promises a gift a
   * repeat buyer will never receive.
   */
  bonusMembershipDays: number;
  /**
   * Why this pack was matched to this user, or null when we have no signal
   * that justifies a claim. Render a "matched to you" badge ONLY when present
   * — the backend refuses to fabricate one.
   */
  match: { level: "top" | "strong"; reason?: string } | null;
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
  /** Annual's honest anchor = 12 × the monthly price. Struck through to show "2 months free". */
  annualAnchorInr: number;
  annualAnchorUsd: number;
}

export interface Offers {
  isFounderCohort: boolean;
  showMembershipOffer: boolean;
  /**
   * How much the backend actually knows about this user.
   * `"none"` = no onboarding signal at all: show NO match badges anywhere and
   * prompt onboarding instead. `"intent"` = they told us their situations/goal
   * but haven't finished onboarding. `"full"` = clinical baseline exists too.
   */
  signalLevel: "none" | "intent" | "full";
  /**
   * Whether the first-purchase bonus membership month would really be granted.
   * False for a repeat buyer, or anyone who has ever held a membership. Gate
   * every "free month included" line on this.
   */
  bonusMembershipEligible: boolean;
  /** Ranked best-first by the backend. Render in the order given. */
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

/**
 * The reconcile endpoint's answer: the wallet, plus whether the reconcile it
 * was asked to run actually finished.
 *
 * The flag matters because the endpoint deliberately does NOT fail when
 * RevenueCat is unreachable — it still returns the wallet it has, so a store
 * outage never turns into a 500 in the user's face. Without `reconciled` the
 * app could not tell "we checked and you own nothing" from "we could not
 * check", and those two owe the user completely different sentences.
 *
 * Optional, and absent means TRUE: an older build of the backend answers with a
 * plain Wallet, and treating that silence as a failure would tell every user
 * their restore did not complete when it did.
 */
export interface ReconciledWallet extends Wallet {
  reconciled?: boolean;
}

/**
 * POST /users/me/wallet/reconcile — force a RevenueCat reconcile NOW and return
 * the wallet that results from it.
 *
 * GET /users/me/wallet also reconciles, but lazily and at most once every ten
 * minutes per user. Both screens that host a Restore Purchases button load the
 * wallet when they open, which spends that window before the user's thumb can
 * reach the button, so restore had nothing left to trigger. This route bypasses
 * the throttle; it exists for restore and should not be used for ordinary
 * wallet reads.
 */
export async function reconcileWallet(): Promise<ReconciledWallet> {
  try {
    const response = await axiosClient.post("/users/me/wallet/reconcile");
    return response.data;
  } catch (error) {
    console.error("Error reconciling wallet:", error);
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
