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
// One more is not a charge of THIS attempt: Google's "You already own this
// item" (an earlier purchase of the same consumable is still open). It gets
// its own wait, which finishes the earlier purchase and then offers Buy.
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
 *  earlier_purchase_open    the store refused THIS purchase because an earlier
 *                           one of the same consumable is still open (Google's
 *                           "You already own this item"). Nothing was charged
 *                           for this attempt. Finish the earlier one, then Buy.
 */
export type StoreErrorOutcome =
  | "cancelled"
  | "retryable_before_charge"
  | "pending_after_charge"
  | "store_pending"
  | "earlier_purchase_open"
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
  // PRODUCT_ALREADY_PURCHASED_ERROR is NOT here any more. Google raises it
  // before its payment sheet, when an EARLIER purchase of the same consumable
  // (every ₹999 program shares `sw.tier.999`) is still unconsumed. That earlier
  // payment is real, but it is not this attempt's: this program was never paid
  // for, and "Payment received" said it was (Android, build 43, 8 Nov 2026).
  // It has its own outcome, earlier_purchase_open, below.
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
  if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
    return "earlier_purchase_open";
  }
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
  // "checkout_in_progress" is gone. The backend's 409 says a checkout is open,
  // not that anybody paid, so it no longer lands on this pending screen. The
  // program page shows "Checking your payment…" instead (see BuyGate below).
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

// ── Waits that are not a payment of this attempt ──────────────────────────
//
// F1: Google refused this purchase because an earlier one of the same product
// is still open. F3: the backend (or this phone) knows a checkout for this
// program is open, and we do not know yet whether it was paid. Neither may say
// "Payment received", "Almost there" or "You do not need to pay again". The
// founder approved every word below on 8 Nov 2026.

/** F1, under the title while the earlier purchase finishes. */
export const EARLIER_PURCHASE_WAIT_LINE =
  "Your last purchase is still finishing. Please wait a moment.";
/** F1, the disabled Buy button while the earlier purchase finishes. */
export const PLEASE_WAIT_LABEL = "Please wait…";
/** F1, the one-time note above Buy once the earlier purchase finished. */
export const EARLIER_PURCHASE_DONE_PROGRAM_NOTE =
  "Your last purchase has finished. Nothing was charged for this program. You can buy it now.";
/** The same note for the call-credit top-up (also a consumable). */
export const EARLIER_PURCHASE_DONE_CREDITS_NOTE =
  "Your last purchase has finished. Nothing was charged for these call credits. You can buy them now.";
/** F3, the disabled Buy button while an open checkout is checked. No line. */
export const CHECKING_PAYMENT_LABEL = "Checking your payment…";
/** F3, the one-time note above Buy once it is certain nothing was paid. */
export const NO_PAYMENT_NOTE =
  "No payment went through. Nothing was charged. You can buy it now.";

/**
 * What the Buy button of a program (or the credit top-up) may do right now.
 *
 *  ready              Buy works. `note` is a one-time line above it, or null.
 *  finishing_earlier  F1: the earlier purchase is being finished. Disabled.
 *  checking_payment   F3: an open checkout is being checked. Disabled.
 */
export type BuyNote = "earlier_finished" | "no_payment";
export type BuyGate =
  | { state: "ready"; note: BuyNote | null }
  | { state: "finishing_earlier" }
  | { state: "checking_payment" };

export const BUY_READY: BuyGate = { state: "ready", note: null };

/** What the screen draws for a gate. Null fields mean "the normal one". */
export interface BuyGateView {
  /** A line under the title, or null. */
  line: string | null;
  /** The disabled button's label (with a spinner), or null for normal Buy. */
  busyLabel: string | null;
  /** The one-time note above Buy (neutral info icon), or null. */
  note: string | null;
}

export function buyGateView(gate: BuyGate, product: SettleProduct): BuyGateView {
  if (gate.state === "finishing_earlier") {
    return { line: EARLIER_PURCHASE_WAIT_LINE, busyLabel: PLEASE_WAIT_LABEL, note: null };
  }
  if (gate.state === "checking_payment") {
    return { line: null, busyLabel: CHECKING_PAYMENT_LABEL, note: null };
  }
  if (gate.note === "earlier_finished") {
    return {
      line: null,
      busyLabel: null,
      note:
        product === "program"
          ? EARLIER_PURCHASE_DONE_PROGRAM_NOTE
          : EARLIER_PURCHASE_DONE_CREDITS_NOTE,
    };
  }
  if (gate.note === "no_payment") {
    return { line: null, busyLabel: null, note: NO_PAYMENT_NOTE };
  }
  return { line: null, busyLabel: null, note: null };
}

/**
 * The program sales page's caption under Buy in its normal state (founder,
 * L3, 9 Nov 2026), and the same line the checkout sheet carries under
 * "Unlock now". Grey, one line.
 */
export const NOTHING_CHARGED_UNTIL_CONFIRM = "Nothing is charged until you confirm.";

/**
 * Every message the slot under Buy can show for this product. The slot is
 * sized to the tallest, so moving between them never shifts the page.
 */
export function waitMessageCandidates(product: SettleProduct): string[] {
  return product === "program"
    ? [EARLIER_PURCHASE_WAIT_LINE, EARLIER_PURCHASE_DONE_PROGRAM_NOTE, NO_PAYMENT_NOTE]
    : [EARLIER_PURCHASE_WAIT_LINE, EARLIER_PURCHASE_DONE_CREDITS_NOTE];
}

/** True for a gate that shows a wait or a note: the slot under Buy is in use. */
export function gateUsesMessageSlot(gate: BuyGate): boolean {
  return gate.state !== "ready" || gate.note !== null;
}

/**
 * The message under Buy, as the founder laid it out (9 Nov 2026): the first
 * sentence on its own line in the brighter ink, the rest under it in grey.
 * Splits after the first full stop; a message of one sentence has no rest.
 */
export function splitWaitMessage(text: string): { lead: string; rest: string | null } {
  const m = /^([\s\S]*?\.)\s+([\s\S]+)$/.exec(text.trim());
  return m ? { lead: m[1], rest: m[2] } : { lead: text.trim(), rest: null };
}

/**
 * The note is one-time: a tap on Buy spends it. A busy gate is unchanged (its
 * button cannot be tapped anyway). Leaving the screen drops it with the
 * screen's state, so nothing here has to remember it.
 */
export function gateAfterBuyTap(gate: BuyGate): BuyGate {
  return gate.state === "ready" && gate.note !== null ? BUY_READY : gate;
}

/**
 * How long to wait before asking the store again to finish an earlier
 * purchase. 2 s, doubling, capped at 30 s, so an offline phone is not asked
 * every second and a brief drop recovers fast.
 */
export function finishRetryDelayMs(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  return Math.min(2000 * 2 ** n, 30_000);
}

// ── F3: is it CERTAIN no payment exists for an open checkout? ─────────────
//
// What the app can really see (checked against sw-be-2 on 8 Nov 2026):
//   - No backend route reports an intent's status or age. GET /users/me/offers
//     carries `owned` only. The only intent signals are the 409
//     CHECKOUT_IN_PROGRESS on a new checkout and the answer of
//     POST .../cancel (200 cancelled, 409 ALREADY_FULFILLED = it was paid).
//   - The hold is 15 minutes from the intent's createdAt
//     (CHECKOUT_IN_PROGRESS_MS in purchaseIntent.service.ts).
//   - The store: after RevenueCat has re-posted every open purchase (restore
//     on Android, which also consumes them; sync on iOS), its customer info
//     lists every consumable transaction with its date.
//
// So "certain" needs all of: the program is not owned, the backend checkout
// has ended (we cancelled it, or its 15 minutes are over by OUR clock with
// slack), the store sync succeeded just now, and the store lists no purchase
// of this product since the checkout could have started. Anything short of
// that keeps "Checking your payment…".

/** Mirrors CHECKOUT_IN_PROGRESS_MS in sw-be-2 purchaseIntent.service.ts. */
export const CHECKOUT_HOLD_MS = 15 * 60 * 1000;

/** An open checkout this phone knows about, for one program. */
export interface OpenCheckout {
  /** Our user id. A checkout never carries over to another account. */
  userId: string;
  catalogKey: string;
  /** The backend intent, when this phone created it. Null after a bare 409. */
  intentId: string | null;
  /** The store product of the checkout (the program's tier SKU). */
  productId: string;
  /** The earliest the checkout can have started (ms, our clock). */
  startedAt: number;
  /** When the backend's hold is over for sure (ms, our clock, with slack). */
  holdEndsAt: number;
  /**
   * The store said no money moved for this attempt (cancelled, declined, or
   * already-owned), and only the release call failed. Retrying the release is
   * then safe.
   */
  noCharge: boolean;
  /**
   * The purchase call came back as a payment (or maybe one). Such a checkout
   * is never "no payment": the screen waits on the grant instead.
   */
  charge: "after_charge" | "store_pending" | "unclear" | null;
  /**
   * A BOUNDED wait (F1, after the earlier purchase finished): the instant the
   * wait must end with the note + Buy if this program is still not owned and
   * the store sync succeeded. Absent on an ordinary F3 checkout, which ends by
   * certainNoPayment instead.
   */
  releaseAfter?: number;
  /**
   * F1 waits only: true when no record of THIS program explains the purchase,
   * so another program becoming owned explains it and ends the wait.
   */
  explainableByOthers?: boolean;
  /** F1 waits only: the programs the account owned when the attempt started. */
  othersOwnedBefore?: string[];
}

/** A checkout this phone just started (intent created, sheet about to open). */
export function checkoutStartedNow(
  base: Pick<OpenCheckout, "userId" | "catalogKey" | "intentId" | "productId">,
  now: number,
): OpenCheckout {
  return {
    ...base,
    startedAt: now,
    holdEndsAt: now + CHECKOUT_HOLD_MS + STORE_CLOCK_SLACK_MS,
    noCharge: false,
    charge: null,
  };
}

/**
 * A checkout we only know of from the backend's 409. It is younger than 15
 * minutes, so it started at most 15 minutes ago and its hold ends at most 15
 * minutes from now. Both bounds get the clock slack.
 */
export function checkoutFromConflict(
  base: Pick<OpenCheckout, "userId" | "catalogKey" | "productId">,
  now: number,
): OpenCheckout {
  return {
    ...base,
    intentId: null,
    startedAt: now - CHECKOUT_HOLD_MS - STORE_CLOCK_SLACK_MS,
    holdEndsAt: now + CHECKOUT_HOLD_MS + STORE_CLOCK_SLACK_MS,
    noCharge: false,
    charge: null,
  };
}

/**
 * Does the store's transaction list hold a purchase of `productId` since
 * `since`? Tolerant in the SAFE direction: an unreadable list, entry or date
 * answers TRUE (a purchase may exist), which keeps the wait.
 */
export function storeHasPurchaseSince(
  transactions: unknown,
  productId: string,
  since: number,
): boolean {
  if (!Array.isArray(transactions)) return true;
  const wanted = baseProductId(productId);
  return transactions.some((t) => {
    if (!t || typeof t !== "object") return true;
    const { productIdentifier, purchaseDate } = t as {
      productIdentifier?: unknown;
      purchaseDate?: unknown;
    };
    if (typeof productIdentifier !== "string") return true;
    if (baseProductId(productIdentifier) !== wanted) return false;
    const at = typeof purchaseDate === "string" ? Date.parse(purchaseDate) : NaN;
    if (!Number.isFinite(at)) return true;
    return at >= since - STORE_CLOCK_SLACK_MS;
  });
}

export interface NoPaymentEvidence {
  checkout: OpenCheckout;
  now: number;
  /** The program is owned (the grant landed). Then it was paid, not "none". */
  owned: boolean;
  /** This phone cancelled the intent and the backend said "cancelled". */
  intentReleased: boolean;
  /** RevenueCat re-posted open purchases just now and answered. */
  storeSynced: boolean;
  /** The synced store lists a purchase of this product since the start. */
  storeHasPurchase: boolean;
}

/** The F3 rule. True only when every signal agrees nothing was paid. */
export function certainNoPayment(e: NoPaymentEvidence): boolean {
  if (e.owned) return false;
  if (e.checkout.charge !== null) return false;
  const holdOver = e.intentReleased || e.now >= e.checkout.holdEndsAt;
  if (!holdOver) return false;
  return e.storeSynced && !e.storeHasPurchase;
}

// ── F1: may the earlier purchase have been THIS program? ──────────────────
//
// The founder's rule is zero risk of a double charge. Once the earlier open
// purchase is finished, Google sells the SKU again. If that earlier purchase
// paid for THIS program and its grant is still on the way, a note + Buy is a
// second charge for one program. So the note shows only when neither signal
// points at this program; otherwise the page goes to F3 ("Checking your
// payment…") and leaves it only through "You're in" or certainNoPayment.

/**
 * The store purchases of `productId` that the finish step may just have
 * posted, as the earliest such purchase time (ms), or null when there are none.
 *
 *  `before`  the store's transaction list read BEFORE finishing (RevenueCat's
 *            cached customer info), or null when it could not be read.
 *  `after`   the list the finish step answered with.
 *
 * With `before`, a suspect is a transaction of this product that was not in
 * it: that is exactly what the finish step posted, whatever its age. Without
 * `before`, every transaction of this product since `attemptStartedAt` minus a
 * full checkout hold and the clock slack counts. Anything unreadable in
 * `after` answers that window's start: a purchase may exist.
 */
export function earlierPurchaseSuspectSince(input: {
  before: unknown;
  after: unknown;
  productId: string;
  attemptStartedAt: number;
}): number | null {
  const windowStart =
    input.attemptStartedAt - CHECKOUT_HOLD_MS - STORE_CLOCK_SLACK_MS;
  if (!Array.isArray(input.after)) return windowStart;
  const wanted = baseProductId(input.productId);
  const known = new Set<string>();
  const beforeReadable = Array.isArray(input.before);
  if (beforeReadable) {
    for (const t of input.before as unknown[]) {
      const id = (t as { transactionIdentifier?: unknown } | null)?.transactionIdentifier;
      if (typeof id === "string") known.add(id);
    }
  }
  let earliest: number | null = null;
  const consider = (at: number) => {
    earliest = earliest === null ? at : Math.min(earliest, at);
  };
  for (const t of input.after as unknown[]) {
    if (!t || typeof t !== "object") {
      consider(windowStart);
      continue;
    }
    const { productIdentifier, purchaseDate, transactionIdentifier } = t as {
      productIdentifier?: unknown;
      purchaseDate?: unknown;
      transactionIdentifier?: unknown;
    };
    if (typeof productIdentifier !== "string") {
      consider(windowStart);
      continue;
    }
    if (baseProductId(productIdentifier) !== wanted) continue;
    const at = typeof purchaseDate === "string" ? Date.parse(purchaseDate) : NaN;
    if (beforeReadable) {
      if (typeof transactionIdentifier === "string" && known.has(transactionIdentifier)) {
        continue;
      }
      consider(Number.isFinite(at) ? at : windowStart);
    } else if (!Number.isFinite(at)) {
      consider(windowStart);
    } else if (at >= windowStart) {
      consider(at);
    }
  }
  return earliest;
}

/**
 * The longest any F1 wait may last from the suspect purchase: the backend
 * links a store purchase to the checkout open at purchase time and grants it
 * within the 15-minute hold. Not granted by then means it was not this one.
 */
// The hold plus STORE_CLOCK_SLACK_MS (2 min), written out because that
// constant is declared further down this file.
export const EARLIER_PURCHASE_BOUND_MS = CHECKOUT_HOLD_MS + 2 * 60 * 1000;

/**
 * Is a suspect purchase EXPLAINED by another program, so it is not this one?
 *  (a) another program has an open-checkout record, not known "no charge",
 *      that started before the purchase (plus clock slack), or
 *  (b) the account newly owns another program since this attempt started.
 */
export function suspectExplained(input: {
  suspectSince: number | null;
  /** Open-checkout records of OTHER programs (this one's left out). */
  otherRecords: OpenCheckout[];
  newlyOwnedOthers: string[];
}): boolean {
  if (input.newlyOwnedOthers.length > 0) return true;
  if (input.suspectSince === null) return false;
  const at = input.suspectSince;
  return input.otherRecords.some(
    (r) => !r.noCharge && r.startedAt <= at + STORE_CLOCK_SLACK_MS,
  );
}

/** Other programs owned now that were not owned when the attempt started. */
export function newlyOwnedOthers(
  before: readonly string[] | null | undefined,
  now: readonly string[] | null | undefined,
  catalogKey: string,
): string[] {
  if (!before || !now) return [];
  const had = new Set(before);
  return now.filter((k) => k !== catalogKey && !had.has(k));
}

/**
 * The store call of this record came back as a payment: "purchased" (or a
 * failure that only follows a charge), or a payment Google Play holds as
 * pending. Such a record NEVER gets the note + Buy back, at any time: if the
 * grant does not come, the payment was parked and needs a manual grant, and a
 * second charge is never acceptable (founder, 9 Nov 2026). "unclear" is not
 * known to be paid.
 */
export function knownPaid(checkout: Pick<OpenCheckout, "charge"> | null | undefined): boolean {
  return checkout?.charge === "after_charge" || checkout?.charge === "store_pending";
}

export type EarlierFinishedDecision =
  | { kind: "note" }
  | { kind: "wait"; checkout: OpenCheckout }
  /** This program's own record is known paid: the "Payment received" pending screen. */
  | { kind: "paid"; pendingKind: "after_charge" | "store_pending" };

/**
 * After the F1 finish step: the one-time note + Buy, or a BOUNDED F3 wait.
 *
 *  `prior`        this program's on-disk record from before the refused
 *                 attempt (purchaseCatalogItem keeps it). Not known "no
 *                 charge" means the earlier purchase may be this program's.
 *  `suspectSince` earlierPurchaseSuspectSince's answer.
 *
 * Note when nothing points at this program, or when a suspect purchase is
 * explained by another program and no record of this one exists. Otherwise
 * wait, at most EARLIER_PURCHASE_BOUND_MS from the suspect purchase (from the
 * prior record's start when no purchase time is known), and never less than
 * the clock slack from now: the purchase was posted just now, and its webhook
 * needs a moment. So no wait is longer than 17 minutes.
 */
export function decideAfterEarlierFinished(input: {
  prior: OpenCheckout | null;
  suspectSince: number | null;
  otherRecords: OpenCheckout[];
  newlyOwnedOthers: string[];
  othersOwnedBefore: string[] | null;
  userId: string;
  catalogKey: string;
  productId: string;
  now: number;
}): EarlierFinishedDecision {
  const prior =
    input.prior && !input.prior.noCharge && input.prior.catalogKey === input.catalogKey
      ? input.prior
      : null;
  if (prior && knownPaid(prior)) {
    return {
      kind: "paid",
      pendingKind: prior.charge === "store_pending" ? "store_pending" : "after_charge",
    };
  }
  if (!prior && input.suspectSince === null) return { kind: "note" };
  if (
    !prior &&
    suspectExplained({
      suspectSince: input.suspectSince,
      otherRecords: input.otherRecords.filter((r) => r.catalogKey !== input.catalogKey),
      newlyOwnedOthers: input.newlyOwnedOthers,
    })
  ) {
    return { kind: "note" };
  }
  const anchor = input.suspectSince ?? (prior as OpenCheckout).startedAt;
  const releaseAfter = Math.max(
    anchor + EARLIER_PURCHASE_BOUND_MS,
    input.now + STORE_CLOCK_SLACK_MS,
  );
  const starts = [prior?.startedAt, input.suspectSince].filter(
    (v): v is number => typeof v === "number",
  );
  return {
    kind: "wait",
    checkout: {
      userId: input.userId,
      catalogKey: input.catalogKey,
      intentId: prior?.intentId ?? null,
      productId: prior?.productId ?? input.productId,
      startedAt: Math.min(...starts),
      holdEndsAt: releaseAfter,
      noCharge: false,
      charge: prior?.charge ?? null,
      releaseAfter,
      explainableByOthers: !prior,
      othersOwnedBefore: input.othersOwnedBefore ?? undefined,
    },
  };
}

/** What one F3 round decides. */
export type F3Verdict =
  /** The grant landed: the usual "You're in". */
  | "owned"
  /** certainNoPayment passed: "No payment went through…" + Buy. */
  | "note_no_payment"
  /** A bounded F1 wait ended: "Your last purchase has finished…" + Buy. */
  | "note_earlier_finished"
  | "keep_checking";

/**
 * One round of the F3 wait. An ordinary checkout ends by certainNoPayment. A
 * bounded F1 wait ends when another program newly became owned (only when no
 * record of this program exists), or when its bound passed with this program
 * still not owned and a store sync that succeeded (nothing left open).
 */
export function f3RoundVerdict(
  e: NoPaymentEvidence & { newlyOwnedOthers: string[] },
): F3Verdict {
  if (e.owned) return "owned";
  const c = e.checkout;
  if (c.releaseAfter !== undefined) {
    // Belt and braces: a known payment never reaches Buy again.
    if (knownPaid(c)) return "keep_checking";
    if (c.explainableByOthers && e.newlyOwnedOthers.length > 0) {
      return "note_earlier_finished";
    }
    if (e.now >= c.releaseAfter && e.storeSynced) return "note_earlier_finished";
    return "keep_checking";
  }
  return certainNoPayment(e) ? "note_no_payment" : "keep_checking";
}

/** Records older than this are dropped (the backend's intent TTL). */
export const OPEN_CHECKOUT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
