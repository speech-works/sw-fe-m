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
  // not that this tap charged anyone.
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
  | "unclear";

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
