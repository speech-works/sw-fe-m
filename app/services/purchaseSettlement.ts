// app/services/purchaseSettlement.ts
//
// ── NEVER LET SOMEBODY PAY TWICE FOR ONE PROGRAM OR ONE CHECKOUT ──────────
// Pure decisions, plus one in-memory list, for what happens after the store's
// purchase call fails or the backend refuses to start a checkout.
//
// The rule the founder approved: once the store's purchase call has run, the
// app cannot know whether money moved. The tier SKUs and the credit top-up are
// consumables, so the store will take a second payment without a word. So any
// error from that call is treated as "paid, waiting for the grant", except the
// three that can only happen before a charge: the user cancelled, the device
// may not buy, or the product is not on sale. Those keep the normal retry.
//
// Errors from the product LOOKUP (getProducts) happen before the payment sheet
// exists, so they stay retryable whatever their code.
import { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { baseProductId } from "./selectStoreProduct";

/** Where in the purchase the store error came from. */
export type StorePhase = "lookup" | "purchase";

/**
 * What a store error means for the buyer.
 *
 *  cancelled                they backed out. Say nothing.
 *  retryable_before_charge  no payment can have been taken. Show the error and
 *                           keep the Buy button.
 *  pending_after_charge     the purchase call ran and failed in a way that can
 *                           only follow a real charge. Wait for the grant, no Buy.
 *  store_pending            the store says the payment is pending (a slow card
 *                           on Google Play). Wait for the grant, no Buy.
 */
export type StoreErrorOutcome =
  | "cancelled"
  | "retryable_before_charge"
  | "pending_after_charge"
  | "store_pending"
  /** We cannot tell whether money moved. Wait, but never claim it did. */
  | "unclear";

/**
 * The codes from the purchase call that can only mean "not charged". INELIGIBLE
 * is the store refusing an offer for this buyer before the sheet runs, and the
 * app already treats it the same as "not available".
 */
const NOT_CHARGED_CODES: ReadonlySet<string> = new Set([
  PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR,
  PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,
  PURCHASES_ERROR_CODE.INELIGIBLE_ERROR,
  // The store refused the payment itself (declined card, store outage, bad
  // purchase): no transaction exists, so nothing was taken. Treating these as
  // "payment received" hid Buy from someone whose card simply failed.
  PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
  PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR,
  PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR,
  PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS_ERROR,
  PURCHASES_ERROR_CODE.CONFIGURATION_ERROR,
  PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR,
  PURCHASES_ERROR_CODE.UNSUPPORTED_ERROR,
  PURCHASES_ERROR_CODE.INVALID_PROMOTIONAL_OFFER_ERROR,
]);

/**
 * The codes that can only follow a real charge: the store finished a
 * transaction and posting its receipt to RevenueCat then failed. "Payment
 * received" is true here. One line per code on why it belongs.
 */
const AFTER_CHARGE_CODES: ReadonlySet<string> = new Set([
  // RevenueCat answered the receipt post with something it could not read.
  PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR,
  // RevenueCat failed while handling the receipt the store just issued.
  PURCHASES_ERROR_CODE.UNKNOWN_BACKEND_ERROR,
  // A receipt exists to be judged invalid, so the store made a transaction.
  PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR,
  // Raised while reading the receipt to post it, after StoreKit returned.
  PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR,
  // The skill: refresh and check. For our consumables it means an earlier
  // charge the store still holds unconsumed, so a payment exists.
  PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR,
  // Building customer info from the posted receipt failed, so it was posted.
  PURCHASES_ERROR_CODE.CUSTOMER_INFO_ERROR,
]);

/**
 * The codes from the purchase call that may or may not follow a charge. We
 * wait (no second Buy, the checkout stays held) but never claim a payment.
 */
const UNCLEAR_CODES: ReadonlySet<string> = new Set([
  // The skill says prompt a retry, but the drop can come before or after the
  // store took the money, and a retry on a consumable can charge twice.
  PURCHASES_ERROR_CODE.NETWORK_ERROR,
  // Same as NETWORK_ERROR: offline before the sheet or before the receipt post.
  PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR,
  // Another purchase is running. Ours may never have started, theirs may charge.
  PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR,
  // The store receipt is tied to another app user. It proves an older payment,
  // not that this tap charged anyone. Rare under RevenueCat's "Transfer to new
  // App User ID". The next check decides by the server's foreign purchase
  // items, like any other wait (see foreignItemMatchesAttempt).
  PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR,
  // Same as RECEIPT_ALREADY_IN_USE_ERROR, for a subscription on another user.
  PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR,
]);

export function classifyStoreError(
  code: string | undefined,
  phase: StorePhase,
): StoreErrorOutcome {
  if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return "cancelled";
  if (phase === "lookup") return "retryable_before_charge";
  if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return "store_pending";
  if (code !== undefined && NOT_CHARGED_CODES.has(code)) {
    return "retryable_before_charge";
  }
  if (code !== undefined && AFTER_CHARGE_CODES.has(code)) {
    return "pending_after_charge";
  }
  if (code !== undefined && UNCLEAR_CODES.has(code)) return "unclear";
  // UNKNOWN_ERROR and anything new: wait like a charge (no second Buy), but
  // the words must not claim a payment we cannot see.
  return "unclear";
}

/**
 * The backend's 409s on POST /users/me/purchase-intent.
 *
 *  already_owned         they own the program. Show it as owned.
 *  checkout_in_progress  an earlier checkout for this program is under 15
 *                        minutes old and not finished. Do not open the store.
 *
 * The backend sends its error code as `code` (PurchaseIntentError); `errorCode`
 * is the shape of its global handler, read too so a move between the two does
 * not silently turn a 409 into "try again".
 */
export type IntentConflict = "already_owned" | "checkout_in_progress";

export function intentConflictFrom(error: unknown): IntentConflict | null {
  const res = (error as any)?.response;
  if (res?.status !== 409) return null;
  const code = res?.data?.code ?? res?.data?.errorCode;
  if (code === "ALREADY_OWNED") return "already_owned";
  if (code === "CHECKOUT_IN_PROGRESS") return "checkout_in_progress";
  return null;
}

// ── The server's emergency stop ───────────────────────────────────────────
//
// The backend can pause all selling. It says so in two places: GET
// /users/me/offers carries `purchasesPaused: true`, and POST
// /users/me/purchase-intent answers 503 with code PURCHASES_PAUSED. Either one
// means no surface opens a store sheet. Owned content and Restore keep working.
// An older server sends neither, which reads as "not paused".

export const PURCHASES_PAUSED_LINE =
  "Purchases are paused for a short while. Programs you own keep working.";

/** True only when the offers payload says selling is paused. */
export function offersPaused(
  offers: { purchasesPaused?: boolean } | null | undefined,
): boolean {
  return offers?.purchasesPaused === true;
}

/** True only for the backend's 503 PURCHASES_PAUSED on a checkout. */
export function purchasesPausedFrom(error: unknown): boolean {
  const res = (error as any)?.response;
  if (res?.status !== 503) return false;
  const code = res?.data?.code ?? res?.data?.errorCode;
  return code === "PURCHASES_PAUSED";
}

/** A restore found store purchases owned by another Speechworks account. */
export const FOREIGN_PURCHASES_LINE =
  "This purchase belongs to another Speechworks account. Sign in to that account to use it.";

// ── What the buyer reads ──────────────────────────────────────────────────

export type PendingKind =
  /** The purchase call failed after it ran. */
  | "after_charge"
  /** Google Play says the payment is pending. */
  | "store_pending"
  /** The backend says an earlier checkout is still open. */
  | "checkout_in_progress"
  /** We cannot tell whether a payment was taken. */
  | "unclear"
  /**
   * The server's reconcile lists a purchase of THIS attempt's product, made
   * since this attempt started, as paid for by another Speechworks account.
   * Nothing will unlock here, so nothing may say it will. Buy stays hidden and
   * "Check again" stays, because a grant that does arrive always wins.
   */
  | "other_account";

export type SettleProduct = "program" | "credits";

export const PROGRAM_SETTLING_LINE = "Payment received. Unlocking your program…";
export const CREDITS_SETTLING_LINE = "Payment received. Adding your call credits…";
export const SETTLE_TIMEOUT_LINE =
  "Your payment is being confirmed. It will unlock on its own. You do not need to pay again.";
export const PLAY_PENDING_PROGRAM_LINE =
  "Your payment is pending with Google Play. The program unlocks when it goes through.";
export const PLAY_PENDING_CREDITS_LINE =
  "Your payment is pending with Google Play. Your call credits arrive when it goes through.";
export const UNCLEAR_PROGRAM_LINE =
  "We are checking your payment. If it went through, your program unlocks on its own.";
export const UNCLEAR_CREDITS_LINE =
  "We are checking your payment. If it went through, your call credits arrive on their own.";
export const UNCLEAR_TIMEOUT_LINE =
  "We could not confirm a payment yet. If you were charged, it unlocks on its own. You will not be charged twice.";
/** A membership the store sold that our server has not confirmed yet. */
export const MEMBERSHIP_CONFIRMING_LINE =
  "Your purchase went through but is still being confirmed. It should appear shortly.";
export const CHECKOUT_IN_PROGRESS_LINE =
  "Your earlier payment is still being confirmed. It will unlock on its own.";

// ── Paid on the other account ─────────────────────────────────────────────
//
// One store account (Apple account, Google Play account) can sit under two
// Speechworks accounts on the same phone. The server keeps every payment with
// the account that paid (one payment, one account). So when B's purchase ends
// up with A, B's wait can never end, and "it unlocks on its own" is untrue.

export const OTHER_ACCOUNT_TITLE = "Paid on your other account";

/** The store account named the way the person knows it on this phone. */
export function storeAccountName(platformOS: string): string {
  return platformOS === "ios" ? "Apple account" : "Google Play account";
}

/** What to do about it: sign in there, or ask us to move it. */
export function otherAccountLine(platformOS: string = "android"): string {
  return `This ${storeAccountName(platformOS)} already paid for this on another Speechworks account. Sign in with that account to use it, or write to us and we will move it for you.`;
}

/** The heading for a pending state that has one of its own, else null. */
export function pendingTitle(kind: PendingKind | null): string | null {
  return kind === "other_account" ? OTHER_ACCOUNT_TITLE : null;
}

/** True when the screen shows the "Paid on your other account" notice. */
export function showsOtherAccount(kind: PendingKind | null): boolean {
  return kind === "other_account";
}

// ── This attempt ──────────────────────────────────────────────────────────
//
// The server's foreign items cover the whole store account: an old purchase
// the other account made months ago is listed too. So the notice needs THIS
// attempt's store product and start time, and only an item of that product
// bought since then (less the store clock slack) counts.

/** Store clocks and ours disagree a little. Two minutes of slack. */
export const STORE_CLOCK_SLACK_MS = 2 * 60 * 1000;

export interface PurchaseAttempt {
  /** The store product of this attempt: a tier SKU, a membership or credits. */
  productId: string;
  /** Our clock when the attempt started (ms). */
  startedAt: number;
}

/** The latest attempt per surface, in memory for this session. */
const attempts = new Map<string, PurchaseAttempt>();

/** The attempt key for a program checkout. */
export const programAttemptKey = (catalogKey: string) => `program:${catalogKey}`;
/** The attempt key for a fixed store product (credits, memberships). */
export const productAttemptKey = (productId: string) => `product:${productId}`;

export function rememberAttempt(key: string, attempt: PurchaseAttempt): void {
  attempts.set(key, attempt);
}

export function lastAttempt(key: string | undefined): PurchaseAttempt | null {
  return key ? (attempts.get(key) ?? null) : null;
}

/**
 * Does the reconcile's `foreignPurchaseItems` hold a purchase of this
 * attempt's product, made since it started? Tolerant on purpose: a missing
 * field (an older server), a wrong shape, a null or unreadable date, or no
 * attempt all answer false, which keeps the ordinary wait. Never the notice.
 */
export function foreignItemMatchesAttempt(
  items: unknown,
  attempt: PurchaseAttempt | null,
): boolean {
  if (!attempt || !Array.isArray(items)) return false;
  const wanted = baseProductId(attempt.productId);
  const since = attempt.startedAt - STORE_CLOCK_SLACK_MS;
  return items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const { productId, purchasedAt } = item as {
      productId?: unknown;
      purchasedAt?: unknown;
    };
    if (typeof productId !== "string" || typeof purchasedAt !== "string") {
      return false;
    }
    if (baseProductId(productId) !== wanted) return false;
    const at = Date.parse(purchasedAt);
    return Number.isFinite(at) && at >= since;
  });
}

/** A grant check's answer when the purchase is with another account. */
export const OTHER_ACCOUNT = "other_account" as const;
export type OtherAccount = typeof OTHER_ACCOUNT;

/**
 * What a grant check found. The grant wins whenever it landed. Only a check
 * that found nothing AND matched this attempt in the server's foreign items
 * (foreignItemMatchesAttempt) answers "other account". Otherwise it is still
 * a wait (null).
 */
export function grantCheckVerdict<T>(
  found: T | null,
  attemptIsForeign: boolean,
): T | OtherAccount | null {
  if (found !== null) return found;
  return attemptIsForeign ? OTHER_ACCOUNT : null;
}

/**
 * The one line to show while we wait for the grant.
 *
 * `timedOut` is true once the first wait has run out without the grant. A
 * Play pending payment keeps its own line throughout: "being confirmed" would
 * be wrong while Google is still waiting on the bank.
 */
export function pendingLine(
  kind: PendingKind,
  product: SettleProduct,
  timedOut: boolean,
  platformOS: string = "android",
): string {
  if (kind === "store_pending") {
    // Apple raises the same code for Ask to Buy. Naming Google Play on an
    // iPhone would be wrong, so the sentence names the App Store there.
    const line =
      product === "program" ? PLAY_PENDING_PROGRAM_LINE : PLAY_PENDING_CREDITS_LINE;
    return platformOS === "ios"
      ? line.replace("with Google Play", "with the App Store")
      : line;
  }
  if (kind === "checkout_in_progress") return CHECKOUT_IN_PROGRESS_LINE;
  if (kind === "other_account") return otherAccountLine(platformOS);
  if (kind === "unclear") {
    if (timedOut) return UNCLEAR_TIMEOUT_LINE;
    return product === "program" ? UNCLEAR_PROGRAM_LINE : UNCLEAR_CREDITS_LINE;
  }
  if (timedOut) return SETTLE_TIMEOUT_LINE;
  return product === "program" ? PROGRAM_SETTLING_LINE : CREDITS_SETTLING_LINE;
}

// ── This session's open payments ──────────────────────────────────────────
//
// In memory on purpose: the founder's rule is "never offer Buy again in this
// session while the wait is pending". A screen can unmount and mount again
// (back, then into the program again), so the latch cannot live in component
// state alone. A cold start clears it, and by then the RevenueCat SDK has
// re-sent any unfinished transaction and the app refreshes on launch.

const pendingPrograms = new Map<string, PendingKind>();

export function markProgramPending(catalogKey: string, kind: PendingKind): void {
  pendingPrograms.set(catalogKey, kind);
}

export function programPending(catalogKey: string): PendingKind | null {
  return pendingPrograms.get(catalogKey) ?? null;
}

export function clearProgramPending(catalogKey: string): void {
  pendingPrograms.delete(catalogKey);
}

/** The credit top-up waiting for its grant, and the balance it started from. */
export interface PendingCredits {
  kind: PendingKind;
  startingBalance: number | null;
}

let pendingCredits: PendingCredits | null = null;

export function markCreditsPending(p: PendingCredits): void {
  pendingCredits = p;
}

export function creditsPending(): PendingCredits | null {
  return pendingCredits;
}

export function clearCreditsPending(): void {
  pendingCredits = null;
}

/**
 * Did the credits land? The balance rose above where it stood before paying.
 * An unknown starting balance cannot be compared, so any wallet counts, which
 * is what the sheet did before.
 */
export function creditsLanded(
  startingBalance: number | null,
  balance: number,
): boolean {
  return startingBalance === null || balance > startingBalance;
}

/** Test only. */
export function __resetPendingForTests(): void {
  pendingPrograms.clear();
  attempts.clear();
  pendingCredits = null;
}

// ── "Purchases may have changed, read again" ──────────────────────────────
//
// Fired when the app comes to the front and when the RevenueCat SDK reports
// new customer info (it does so after it re-sends a transaction left
// unfinished when the app was killed). Screens that show ownership listen and
// re-read our own backend. Nothing here decides what anybody owns.

type Listener = () => void;
const listeners = new Set<Listener>();

export function onPurchasesMayHaveChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPurchasesMayHaveChanged(): void {
  for (const l of Array.from(listeners)) {
    try {
      l();
    } catch (error) {
      console.error("[purchaseSettlement] listener failed:", error);
    }
  }
}
