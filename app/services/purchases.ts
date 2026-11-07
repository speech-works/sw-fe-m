// app/services/purchases.ts
//
// Thin wrapper around the RevenueCat SDK (react-native-purchases). Our own
// backend — not RevenueCat — is the source of truth for entitlements/wallet
// balance (PAYMENTS-PLAN.md §2): every purchase here is followed by polling
// GET /users/me/wallet until the grant lands (delivered via RC webhook, with
// a lazy reconcile fallback baked into that endpoint). Nothing in this file
// ever reads `CustomerInfo` to decide what the user owns.
//
// ── WE DELIBERATELY DO NOT USE REVENUECAT "OFFERINGS" ─────────────────────
// An Offering is a set of products configured in the RevenueCat dashboard that
// the app fetches with `getOfferings()` and renders — a remote-controlled
// paywall you can re-merchandise without shipping an app update.
//
// We don't, because OUR BACKEND already owns that decision. The app asks the
// server for the offer, gets a `tierProductId` back, and asks the store for
// that ONE product by id (`getProducts`, resolved through selectStoreProduct).
// Turning Offerings on would put a second system in charge of what is for sale
// and at what price, and the two would drift — on the one thing least tolerable
// to get wrong, which is the amount a real person is charged.
//
// CONSEQUENCE, so nobody "fixes" it: in dev you will see the SDK log
// `[RevenueCat] Error fetching offerings ... no App Store products registered`.
// That is the SDK's own background fetch of an offering we never read. It is
// harmless, it is invisible in release builds (LogBox is __DEV__-only), and
// registering the products in App Store Connect will NOT silence it — only
// attaching them to an offering would, which buys us nothing. RevenueCat's own
// message says as much: "If you don't want to use the offerings system, you can
// safely ignore this message."
import { Linking, Platform } from "react-native";
import Purchases, {
  PRODUCT_CATEGORY,
  STORE_REPLACEMENT_MODE,
  PURCHASES_ERROR_CODE,
  type StoreProductChangeInfo,
  type PurchasesError,
  type PurchasesStoreProduct,
} from "react-native-purchases";
import {
  PAYMENTS_ENABLED,
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_IOS_API_KEY,
  REVENUECAT_TEST_STORE_KEY,
} from "../constants/features";
import {
  getMyUser,
  getWallet,
  reconcileWallet,
  createPurchaseIntent,
  cancelPurchaseIntent,
  type Wallet,
  type ReconciledWallet,
} from "../api";
import type { User } from "../api/users";
import { STORE_SUBSCRIPTIONS_URL } from "../util/functions/paywallView";
import { baseProductId, selectStoreProduct } from "./selectStoreProduct";
import { httpStatus } from "../util/functions/apiError";
import {
  classifyStoreError,
  intentConflictFrom,
  notifyPurchasesMayHaveChanged,
  type StorePhase,
} from "./purchaseSettlement";
import type { StorePrice } from "./priceDisplay";

/**
 * The RevenueCat Test Store key, only in a development build and only when it
 * really is a test key. Two locks: app.config.js drops it from production
 * builds, and __DEV__ is false in every release build.
 */
export function testStoreKey(dev: boolean, key: string | undefined): string | null {
  return dev && typeof key === "string" && key.startsWith("test_") ? key : null;
}

const getPlatformApiKey = (): string =>
  testStoreKey(__DEV__, REVENUECAT_TEST_STORE_KEY) ??
  (Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY);

/** True only when payments are on AND we actually have a key for this platform. */
export const purchasesAvailable = (): boolean =>
  PAYMENTS_ENABLED && !!getPlatformApiKey();

/**
 * The id prefix that marks a product as an auto-renewing subscription. Only the
 * two memberships (`sw.membership.monthly`, `sw.membership.annual`) carry it;
 * every tier SKU and the credit top-up are one-time products.
 */
const SUBSCRIPTION_ID_PREFIX = "sw.membership.";

/**
 * Which store product TYPE to ask for when looking an id up.
 *
 * This is not cosmetic, and it cost us every Android sale. `getProducts(ids)`
 * takes a second argument the SDK defaults to SUBSCRIPTION when it is omitted.
 * Apple ignores it, so a one-argument call looks perfectly healthy on iOS. Play
 * does not: it maps the category straight onto BillingClient's `SUBS` / `INAPP`
 * query, which is a hard either/or with no fallback. Asking for `sw.tier.999`
 * as a subscription therefore returns NOTHING, selectStoreProduct reports
 * `not_found`, and the buyer is told the pack is unavailable while the paywall
 * quietly falls back to the hardcoded INR price.
 *
 * So the id itself decides, and the default is never relied on again.
 */
export function productCategoryFor(productId: string): PRODUCT_CATEGORY {
  return productId.startsWith(SUBSCRIPTION_ID_PREFIX)
    ? PRODUCT_CATEGORY.SUBSCRIPTION
    : PRODUCT_CATEGORY.NON_SUBSCRIPTION;
}

let configured = false;

/**
 * Configure the RevenueCat SDK. Safe to call multiple times (no-ops after the
 * first successful call) and safe to call before a user is known — logIn()
 * below links the real userId once it's available. Call once at app boot.
 */
export function configurePurchases(): void {
  if (configured || !purchasesAvailable()) return;
  Purchases.configure({ apiKey: getPlatformApiKey() });
  configured = true;

  // A PURCHASE MADE BEFORE THE APP WAS KILLED. The SDK re-sends any transaction
  // it had not finished as soon as it is configured on the next launch, and
  // reports fresh customer info when it has. That is the moment a screen that
  // still shows "not owned" should ask our backend again. The info itself is
  // not read: our backend stays the only answer to what somebody owns.
  try {
    Purchases.addCustomerInfoUpdateListener(() => {
      notifyPurchasesMayHaveChanged();
    });
  } catch (error) {
    console.warn("[purchases] could not listen for customer info:", error);
  }
}

/**
 * Link the current app session to our own userId, so RevenueCat webhooks
 * carry it as `app_user_id` (RevenueCatService keys off that field). Called
 * from stores/user's fetchUser() once the user object is known.
 *
 * RETURNS whether the link actually holds. It used to swallow its own failure
 * into a console.error and return void, and the cost of that was real money.
 * App.tsx configures the SDK with no appUserID, so the SDK mints an anonymous
 * `$RCAnonymousID:...` first and only this call replaces it. If it failed and
 * nobody noticed, the next purchase was filed under the anonymous id, our
 * webhook handler tried to match that string against a uuid column, Postgres
 * raised 22P02, we answered 500, and RevenueCat retried the delivery forever.
 * The user paid and the grant never reached their account.
 *
 * So the result is reported, and `ensurePurchasesIdentity` below turns it into
 * a precondition of charging anyone.
 */
export async function loginPurchasesUser(userId: string): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  configurePurchases();
  try {
    await Purchases.logIn(userId);
    // Trust the check, not the call. logIn resolving is not proof the SDK is
    // now us: it can resolve against a cached identity, and this one bridge
    // call is all that separates a real link from an assumed one.
    const current = await Purchases.getAppUserID();
    if (current !== userId) {
      console.error(
        `[purchases] logIn("${userId}") resolved but the SDK is still "${current}". ` +
          `Refusing to treat this session as identified.`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[purchases] logIn failed:", error);
    return false;
  }
}

/**
 * Who we are according to the SDK, or null if it cannot say.
 *
 * `Purchases.getAppUserID()` is the CURRENT id and the only one worth checking.
 * Deliberately not `CustomerInfo.originalAppUserId`: that is the FIRST id this
 * customer ever had, which for anyone who opened the app before signing in is
 * the anonymous one. Comparing against it would refuse to charge exactly the
 * users whose identity is fine.
 */
async function currentPurchasesUserId(): Promise<string | null> {
  try {
    return await Purchases.getAppUserID();
  } catch (error) {
    console.error("[purchases] getAppUserID failed:", error);
    return null;
  }
}

/**
 * Our own user id.
 *
 * Read LAZILY, because stores/user imports this file: a static import back the
 * other way is a cycle that Metro resolves to undefined at load time.
 *
 * A function-scope `require` rather than `await import`, deliberately. Both are
 * equally lazy in Metro, but `import()` needs a host that supports the dynamic
 * import callback, and where it does not exist the call THROWS — which lands in
 * the catch below, returns null, and refuses every purchase in the app. A guard
 * on the money path should not depend on a module-loading feature. `typeof
 * import(...)` is a type-only annotation, erased at compile time, so this keeps
 * full typing with no runtime import.
 */
async function ourUserId(): Promise<string | null> {
  try {
    const { useUserStore } =
      require("../stores/user") as typeof import("../stores/user");
    return useUserStore.getState().user?.id ?? null;
  } catch (error) {
    console.error("[purchases] could not read the signed-in user:", error);
    return null;
  }
}

export type IdentityCheck =
  | { ok: true }
  | { ok: false; reason: "no_user" | "login_failed" | "mismatch" };

/**
 * IDENTITY IS A PRECONDITION OF CHARGING. Run before every purchase.
 *
 * Three ways this says no, all of which mean the money would land on the wrong
 * account (or on no account at all):
 *   no_user       we have nobody signed in, so there is no id to file under.
 *   login_failed  the SDK would not take our id, so it is still anonymous.
 *   mismatch      the SDK insists it is somebody else even after a logIn.
 *
 * Refusing to sell is the cheap failure. Selling under an id our backend
 * cannot resolve is the expensive one: the charge succeeds, the grant does
 * not, and the fix is a manual refund.
 */
export async function ensurePurchasesIdentity(): Promise<IdentityCheck> {
  const userId = await ourUserId();
  if (!userId) return { ok: false, reason: "no_user" };

  const current = await currentPurchasesUserId();
  if (current === userId) return { ok: true };

  // Either the boot-time logIn failed, or a previous account is still attached.
  // One retry here, because this is the last moment it can still be repaired.
  const linked = await loginPurchasesUser(userId);
  if (linked) return { ok: true };

  return { ok: false, reason: current ? "mismatch" : "login_failed" };
}

/** One sentence for a refusal to charge. Nothing technical reaches the user:
 *  they cannot act on an anonymous app user id, only on signing in again. */
const IDENTITY_REFUSAL_MESSAGE =
  "We couldn't confirm your account, so we didn't charge you. Please sign out, sign back in, and try again.";

/**
 * Unlink the RevenueCat identity on sign-out.
 *
 * Without this, the SDK keeps the previous user's `app_user_id` attached. On a
 * shared or handed-down phone, the next person to sign in and buy something has
 * their purchase webhook delivered under the PREVIOUS user's id — we grant the
 * pack to the wrong account, and the person who actually paid gets nothing.
 *
 * Never allowed to throw: RevenueCat raises if the current user is already
 * anonymous, and an unhandled rejection here would break signing out entirely.
 * Failing to unlink is bad; failing to log out is worse.
 */
export async function logoutPurchasesUser(): Promise<void> {
  if (!purchasesAvailable()) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error("[purchases] logOut failed:", error);
  }
}

export type PurchaseOutcome =
  | { status: "purchased" }
  | { status: "cancelled" }
  | { status: "error"; message: string }
  /**
   * Paid, or possibly paid, and the grant has not landed. Only returned to a
   * caller that opted in (`settleAfterCharge`, and every pack purchase). The
   * caller must wait for the grant and never offer Buy again meanwhile. See
   * purchaseSettlement.ts.
   */
  | { status: "pending"; kind: "after_charge" | "store_pending" | "unclear" }
  /** The backend says they already own this program (409 ALREADY_OWNED). */
  | { status: "already_owned" }
  /** An earlier checkout for this program is still open (409 CHECKOUT_IN_PROGRESS). */
  | { status: "checkout_in_progress" };

/**
 * ── WHAT THE USER IS TOLD WHEN A PURCHASE FAILS ──────────────────────────────
 *
 * We used to hand `purchasesError.message` straight to the error sheet. That
 * string is written for developers: it names the SDK, the store's own API, and
 * occasionally an underlying receipt condition. A person who just tried to buy
 * a pack cannot act on any of it, and it reads as if the app broke.
 *
 * So every code we can recognise gets one short human sentence, and the SDK's
 * own text stays in the console (Sentry keeps console breadcrumbs, so the
 * developer detail is not lost by moving it out of the UI).
 *
 * Codes are the SDK's real enum, PURCHASES_ERROR_CODE, whose values are STRING
 * digits ("1", "2", …) rather than numbers. Compare against the enum members,
 * never against a number literal.
 */
export function storeErrorMessage(code: string | undefined): string {
  switch (code) {
    // The store took the payment attempt and the bank or Apple/Google said no.
    case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
      return "Your payment didn't go through. Check your payment method and try again.";

    // Purchases are blocked on this device (parental controls, managed device).
    // A different sentence, because retrying will not help until it is changed.
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return "This device isn't allowed to make purchases. Check your device settings and try again.";

    // Slow payment method (bank transfer, cash, a parent's approval). Not a
    // failure, so it must not read like one.
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return "Your payment is still being confirmed. We'll unlock this as soon as it clears.";

    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASES_ERROR_CODE.INELIGIBLE_ERROR:
      return "That item isn't available for purchase right now.";

    // Already owned. Point at Restore rather than leaving them to guess.
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return "You already own this. Use Restore Purchases to get it back.";

    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
    case PURCHASES_ERROR_CODE.API_ENDPOINT_BLOCKED:
      return "We couldn't reach the store. Check your connection and try again.";

    // The store itself is unhappy (App Store / Play outage, sandbox trouble).
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR:
      return "The payment did not go through, so you were not charged. Please try again.";

    // A charge is in flight AT THIS MOMENT. "Try again" is the one thing that
    // must not be said here: tapping Buy again while the store is mid-purchase
    // is how a consumable gets bought twice.
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return "A purchase is already going through. Give it a moment.";

    // ── WHY THE CATCH-ALL NEVER PROMISES "YOU WERE NOT CHARGED" ──────────────
    // It used to, and the app cannot know it. Several codes land here only
    // AFTER the store has taken the money, because they are receipt and
    // backend failures that happen once a payment already exists:
    // INVALID_RECEIPT_ERROR "8", MISSING_RECEIPT_FILE_ERROR "9",
    // UNEXPECTED_BACKEND_RESPONSE_ERROR "12", UNKNOWN_BACKEND_ERROR "16", and
    // the SDK's own catch-all UNKNOWN_ERROR "0".
    //
    // So the old sentence paired a false claim with the worst possible advice.
    // Buy the two-call top-up, let Play take the payment, let the receipt post
    // to RevenueCat fail, and the buyer was told "you were not charged, please
    // try again" and charged a second time for a consumable that can be bought
    // twice over.
    //
    // Every code that IS safe to reassure about has its own case above, so this
    // branch is only ever reached for cases we cannot classify. Unknown must
    // therefore read as cautious, not as reassuring. Restore Purchases comes
    // first because it is free, it is idempotent, and it is the one action that
    // recovers a payment that really did land. Both surfaces that show this
    // sentence carry that button (ExhaustionSheet and Payments), so the advice
    // is never a dead end.
    default:
      return "Something went wrong. If you were charged, tap Restore Purchases before you try again.";
  }
}

/**
 * Turn whatever the SDK threw into an outcome. Cancelling is the one case that
 * is NOT an error: the user chose it, they know they did it, and showing a
 * sheet about it is the app arguing with them.
 */
function outcomeFromStoreError(
  error: unknown,
  context: string,
  phase: StorePhase,
  settleAfterCharge: boolean,
): PurchaseOutcome {
  const purchasesError = error as PurchasesError | undefined;
  const code = purchasesError?.code as string | undefined;

  const classified = classifyStoreError(code, phase);
  if (classified === "cancelled") return { status: "cancelled" };

  // Developer detail lives here and only here.
  console.error(`[purchases] ${context} failed (code ${code ?? "none"}):`, error);

  // A caller that can wait for the grant gets told to wait. Retry advice after
  // the purchase call ran is how a consumable gets bought twice.
  if (settleAfterCharge) {
    if (classified === "pending_after_charge") {
      return { status: "pending", kind: "after_charge" };
    }
    if (classified === "store_pending") {
      return { status: "pending", kind: "store_pending" };
    }
    if (classified === "unclear") {
      return { status: "pending", kind: "unclear" };
    }
  }
  return { status: "error", message: storeErrorMessage(code) };
}

/**
 * Buy a catalog PACK (SPEECHWORKS-STRATEGY.md §6.14 tier-SKU architecture).
 * The store never knows packs — it only sells price-point tiers. So: ask our
 * backend which tier to buy for this pack (it decides the price authoritatively
 * — founder cohort etc.), record the intent, then purchase that tier SKU. The
 * webhook resolves the intent back to this pack and grants it.
 */
export async function purchaseCatalogItem(
  catalogItemKey: string,
): Promise<PurchaseOutcome> {
  if (!purchasesAvailable()) {
    return { status: "error", message: "Purchases are not available yet." };
  }
  configurePurchases();

  // Before the intent, not just before the charge: an intent recorded for a
  // session we cannot bill cleanly is a row the webhook will never resolve.
  const identity = await ensurePurchasesIdentity();
  if (!identity.ok) {
    console.error(
      `[purchases] refusing to sell "${catalogItemKey}": identity check failed (${identity.reason}).`,
    );
    return { status: "error", message: IDENTITY_REFUSAL_MESSAGE };
  }

  let tierProductId: string;
  let intentId: string | undefined;
  try {
    const intent = await createPurchaseIntent(catalogItemKey);
    tierProductId = intent.tierProductId;
    intentId = intent.intentId;
  } catch (error) {
    // The backend refuses a second checkout with a 409. Neither one is a
    // failure, and neither may open the store sheet.
    const conflict = intentConflictFrom(error);
    if (conflict === "already_owned") return { status: "already_owned" };
    if (conflict === "checkout_in_progress") {
      return { status: "checkout_in_progress" };
    }
    console.error("[purchases] createPurchaseIntent failed:", error);
    return {
      status: "error",
      message: "Couldn't start the purchase. Please try again.",
    };
  }

  const outcome = await chargeForProduct(tierProductId, null, {
    settleAfterCharge: true,
  });
  // No money moved (they cancelled, or the store refused the payment): release
  // the checkout so trying again is never blocked. Any other outcome keeps it
  // open; that is what stops a second charge while a payment settles.
  if (intentId && releasesCheckout(outcome)) {
    cancelPurchaseIntent(intentId).catch((err: unknown) =>
      console.warn("[purchases] could not release the checkout:", err),
    );
  }
  return outcome;
}

/** True when the purchase ended with no charge, so the checkout can be released. */
export function releasesCheckout(outcome: PurchaseOutcome): boolean {
  return outcome.status === "cancelled" || outcome.status === "error";
}

/**
 * Buy a single product by its exact store product id. Used directly for the
 * FIXED SKUs that need no intent (the credit top-up `sw.credits.2` and the
 * membership subscriptions) — and internally by purchaseCatalogItem once the
 * pack's tier is resolved. Looks the product up fresh each time rather than
 * relying on a cached RevenueCat "offering".
 *
 * The identity check used to live only in purchaseCatalogItem, which left the
 * two most valuable products in the app unguarded: both memberships and the
 * credit top-up are bought straight through here. An unlinked session buying a
 * membership is the worst version of the bug the check exists for — a recurring
 * charge whose webhooks never resolve to an account, so every month renews and
 * every month grants nothing.
 */
export async function purchaseProductById(
  productId: string,
  options: {
    googleProductChangeInfo?: StoreProductChangeInfo | null;
    /**
     * Return `pending` instead of an error when the purchase call fails in a
     * way that can follow a real charge. For the credit top-up, whose sheet
     * waits for the grant. The memberships leave it off and keep their error
     * sheet: a subscription the store already sold is refused a second time.
     */
    settleAfterCharge?: boolean;
  } = {},
): Promise<PurchaseOutcome> {
  if (!purchasesAvailable()) {
    return { status: "error", message: "Purchases are not available yet." };
  }
  configurePurchases();

  const identity = await ensurePurchasesIdentity();
  if (!identity.ok) {
    console.error(
      `[purchases] refusing to sell "${productId}": identity check failed (${identity.reason}).`,
    );
    return { status: "error", message: IDENTITY_REFUSAL_MESSAGE };
  }

  return chargeForProduct(productId, options.googleProductChangeInfo ?? null, {
    settleAfterCharge: options.settleAfterCharge ?? false,
  });
}

/**
 * The plan change Google Play needs for a Monthly to Annual upgrade, or null.
 *
 * On Play the two memberships are separate subscription products, so buying
 * Annual with no change info starts a SECOND subscription beside the monthly
 * one, and both bill. Naming the monthly product as the one being replaced
 * makes Play swap them. Time proration (RevenueCat's advice for an upgrade)
 * starts Annual now and credits the unused monthly days against it.
 *
 * Only on Android, and only when the plan being replaced is a monthly one on
 * Google Play, or one whose store we were not told. Apple keeps both plans in
 * one subscription group and swaps them itself, so iOS gets nothing.
 *
 * `oldProductIdentifier` is the subscription id with NO base plan suffix
 * ("sw.membership.monthly", never "sw.membership.monthly:monthly"): Play
 * matches it against the subscription the user owns.
 */
export function playUpgradeChangeInfo(input: {
  platformOS: string;
  membership: User["membership"] | null | undefined;
  /** The monthly product id the app sells, from the server's offer. */
  monthlyProductId: string | null | undefined;
}): StoreProductChangeInfo | null {
  const m = input.membership;
  if (input.platformOS !== "android") return null;
  if (!m?.active || m.plan !== "monthly") return null;
  const store = m.store ?? null;
  if (store !== "play_store" && store !== null && store !== "unknown") return null;
  if (!input.monthlyProductId) return null;
  return {
    oldProductIdentifier: baseProductId(input.monthlyProductId),
    // The current API (GoogleProductChangeInfo/PRORATION_MODE are deprecated).
    // Time proration: the switch happens now and the unused monthly days are
    // credited, which is what RevenueCat recommends for an upgrade.
    replacementMode: STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION,
  };
}

/**
 * The store lookup and the charge, with NO identity check of its own.
 *
 * Separate from purchaseProductById so the check runs EXACTLY ONCE per purchase.
 * purchaseCatalogItem has to check before it records an intent, then hand off to
 * the charge; if the charge re-checked, every pack sale would make a second
 * round of `getAppUserID`/`logIn` bridge calls between the intent and the
 * payment sheet, for an answer it already has. Private, so the only way to reach
 * a charge from outside this file is through a function that checks first.
 */
async function chargeForProduct(
  productId: string,
  googleProductChangeInfo: StoreProductChangeInfo | null = null,
  { settleAfterCharge = false }: { settleAfterCharge?: boolean } = {},
): Promise<PurchaseOutcome> {
  // TWO PHASES, TWO MEANINGS FOR AN ERROR. The lookup runs before any payment
  // sheet exists, so its failures are always safe to retry. The purchase call
  // is where money can move, so its failures go through classifyStoreError.
  let products: PurchasesStoreProduct[];
  try {
    products = await Purchases.getProducts(
      [productId],
      productCategoryFor(productId),
    );
  } catch (error) {
    return outcomeFromStoreError(
      error,
      `product lookup of "${productId}"`,
      "lookup",
      settleAfterCharge,
    );
  }

  // NOT products[0] — a Play subscription returns one product per base plan.
  // See selectStoreProduct.ts for why guessing here is a wrong-price charge.
  const selection = selectStoreProduct(productId, products);
  if (!selection.ok) {
    if (selection.reason === "ambiguous") {
      console.error(
        `[purchases] AMBIGUOUS "${productId}": the store returned ${selection.candidates.length} ` +
          `base plans (${selection.candidates.join(", ")}). Refusing to guess which one to bill. ` +
          `Fix: request the fully-qualified "<subscriptionId>:<basePlanId>" instead.`,
      );
    } else {
      console.error(
        `[purchases] product "${productId}" not found in the store as a ` +
          `${productCategoryFor(productId)} product. Check it exists, is ACTIVE, that the id ` +
          `matches ProductCatalog.ts exactly, and that its type in the console agrees with the ` +
          `category above (a one-time SKU queried as a subscription comes back empty on Play).`,
      );
    }
    return {
      status: "error",
      message: "That item isn't available for purchase right now.",
    };
  }

  try {
    // The change info only means something to Play. Never sent on iOS, where
    // the subscription group already swaps the plans.
    if (googleProductChangeInfo && Platform.OS === "android") {
      await Purchases.purchaseStoreProduct(selection.product, googleProductChangeInfo);
    } else {
      await Purchases.purchaseStoreProduct(selection.product);
    }
    return { status: "purchased" };
  } catch (error) {
    return outcomeFromStoreError(
      error,
      `purchase of "${productId}"`,
      "purchase",
      settleAfterCharge,
    );
  }
}

/**
 * Look up what the STORE says these products cost, in the user's own currency.
 *
 * Needed because the backend prices only in INR and USD, while Google/Apple
 * charge in the buyer's local currency. Without this every paywall showed
 * "₹499" to everyone on earth and then charged them something else entirely.
 *
 * Resolution goes through `selectStoreProduct` — the SAME function the purchase
 * path uses — so the price on screen and the price charged can never disagree.
 * If a product is ambiguous there (several base plans), it is omitted here too:
 * better to fall back to the INR default than to advertise one price and bill
 * another.
 *
 * Never throws and never rejects. Every failure mode — payments disabled, no
 * network, product not yet created in the console — returns an empty/partial
 * map, and callers fall back to the backend price.
 */
export async function getStorePrices(
  productIds: string[],
): Promise<Record<string, StorePrice>> {
  const out: Record<string, StorePrice> = {};
  if (!purchasesAvailable() || productIds.length === 0) return out;

  const unique = Array.from(new Set(productIds.filter(Boolean)));
  if (unique.length === 0) return out;

  try {
    configurePurchases();

    // One call per CATEGORY, not one call for the lot. Play answers a
    // getProducts query against a single BillingClient product type, so a mixed
    // list (tier SKUs plus a membership, which is exactly what the paywall
    // asks for) can never be satisfied by one request: whichever category loses
    // comes back empty and its prices silently fall back to the backend's INR.
    const byCategory = new Map<PRODUCT_CATEGORY, string[]>();
    for (const id of unique) {
      const category = productCategoryFor(id);
      const bucket = byCategory.get(category);
      if (bucket) bucket.push(id);
      else byCategory.set(category, [id]);
    }

    // allSettled, not all: one category failing must not take the other's
    // prices down with it. A partial map is the documented contract here, and
    // half the paywall priced correctly beats all of it falling back.
    const batches = await Promise.allSettled(
      Array.from(byCategory, ([category, ids]) =>
        Purchases.getProducts(ids, category),
      ),
    );
    const products: PurchasesStoreProduct[] = [];
    for (const batch of batches) {
      if (batch.status === "fulfilled") products.push(...batch.value);
      else console.warn("[purchases] getStorePrices batch failed:", batch.reason);
    }

    for (const id of unique) {
      const selection = selectStoreProduct(id, products);
      if (!selection.ok) continue;
      const { priceString, price, currencyCode } = selection.product;
      if (!priceString || !currencyCode || !Number.isFinite(price)) continue;
      out[id] = { priceString, price, currencyCode };
    }
  } catch (error) {
    // Offline, store unreachable, products not created yet — all benign here.
    console.warn("[purchases] getStorePrices failed, using backend prices:", error);
  }

  return out;
}

/**
 * What a Restore tap actually resolved to.
 *
 * Four outcomes, because they need four different sentences. Collapsing them is
 * what produced the original bug: the old shape was `{ foundInStore, wallet }`,
 * every non-throwing path with a wallet read as success, and cancelling the
 * App Store sign-in sheet got a "Purchases restored" celebration.
 *
 *  restored      the store had purchases AND our backend reconciled against them.
 *  unverified    the store had purchases, but the reconcile could not run. The
 *                wallet is still readable and still right as far as we know it,
 *                we just cannot claim we checked. Saying "restored" here would
 *                be a claim we did not earn; saying "failed" would be wrong too.
 *  nothing_found the store had nothing for THIS store account.
 *  throttled     tapped again inside the backend's cooldown. Not a failure and
 *                not a restore, so it gets its own sentence.
 *
 * `activeInStore` rides along because "restored" plus an EMPTY wallet is two
 * different situations wearing the same clothes, and only the store can say
 * which: something active the reconcile failed to hand over (ours to fix), or a
 * lapsed member with nothing left to hand over (nobody's fault). Without it the
 * caller can only guess, and it used to guess wrong.
 */
export type RestoreResult =
  | { status: "restored"; wallet: Wallet; activeInStore: boolean }
  | { status: "unverified"; wallet: Wallet; activeInStore: boolean }
  | { status: "nothing_found" }
  | { status: "throttled"; retryAfterSeconds: number };

/** Fallback wait to quote when a 429 arrives without a usable number. */
const RESTORE_RETRY_FALLBACK_SECONDS = 5;

/**
 * Force the reconcile, degrading instead of failing.
 *
 * Two things are deliberately NOT treated as errors:
 *
 *  - 429. The backend is rate-limiting a button, which is a "wait a moment",
 *    not a fault. It carries its own wait in the body and in Retry-After.
 *  - 404/501. The app ships to stores independently of the backend deploy, so a
 *    build with this code can reach a backend that predates the force route.
 *    Falling back to GET /users/me/wallet keeps restore working exactly as well
 *    as it did before this route existed, rather than telling those users their
 *    purchases could not be restored.
 */
async function forceReconcile(): Promise<
  | { ok: true; wallet: Wallet; reconciled: boolean }
  | { ok: false; retryAfterSeconds: number }
> {
  try {
    const wallet: ReconciledWallet = await reconcileWallet();
    return {
      ok: true,
      wallet,
      // ABSENT MEANS TRUE. Only a backend new enough to send the flag can send
      // `false`, so `!wallet.reconciled` would report every older backend as a
      // failed check. Compare against false explicitly.
      reconciled: wallet.reconciled !== false,
    };
  } catch (error) {
    const status = httpStatus(error);

    if (status === 429) {
      const quoted = (error as any)?.response?.data?.retryAfterSeconds;
      return {
        ok: false,
        retryAfterSeconds:
          typeof quoted === "number" && quoted > 0
            ? Math.ceil(quoted)
            : RESTORE_RETRY_FALLBACK_SECONDS,
      };
    }

    if (status === 404 || status === 501) {
      console.warn(
        "[purchases] this backend has no force-reconcile route; falling back to the lazy one.",
      );
      // getWallet() triggers the server's throttled maybeReconcile. Reported as
      // reconciled, because that is precisely what restore did before the force
      // route existed — no reason to start hedging at users whose only problem
      // is a backend one deploy behind.
      return { ok: true, wallet: await getWallet(), reconciled: true };
    }

    throw error;
  }
}

/**
 * Restore previous purchases (Settings → Restore Purchases) and force our
 * backend to reconcile immediately, rather than waiting for the next lazy
 * reconcile window on GET /users/me/wallet.
 *
 * WHY THE STORE IS ASKED FIRST, AND WHY ITS ANSWER IS BELIEVED OVER OURS. A
 * restore that finds NOTHING does not throw. On iOS, dismissing the App Store
 * sign-in sheet resolves `restorePurchases()` with the cached (empty)
 * CustomerInfo, and this function used to return `getWallet()` unconditionally.
 * A Wallet object always comes back for a signed-in user, so the caller's
 * "nothing restored" branch was unreachable and cancelling produced a
 * celebration. CustomerInfo is the only thing here that knows whether the store
 * gave us anything, so the answer is read from it and not from our own wallet.
 *
 * Returns null only when payments are switched off for this build.
 */
export async function restorePurchasesAndReconcile(): Promise<RestoreResult | null> {
  if (!purchasesAvailable()) return null;
  configurePurchases();

  const customerInfo = await Purchases.restorePurchases();

  // TWO DIFFERENT QUESTIONS, KEPT APART ON PURPOSE.
  //
  // `allPurchasedProductIdentifiers` is documented as "Set of purchased skus,
  // active and inactive", so it is a LIFETIME record: it stays populated for a
  // member who lapsed, a buyer who was refunded, and a top-up whose credits are
  // long spent. That makes it the right test for "has this store account ever
  // bought from us", which is what decides whether there is any point asking our
  // backend, and the WRONG test for "does the store owe them something now".
  //
  // Collapsing both into one `foundInStore` is what let the caller announce "the
  // store has them and we don't" at people whose wallet was empty for the most
  // ordinary reason there is.
  const activeInStore = Object.keys(customerInfo.entitlements.active).length > 0;
  const everBoughtInStore =
    customerInfo.allPurchasedProductIdentifiers.length > 0;

  if (!activeInStore && !everBoughtInStore) return { status: "nothing_found" };

  // Forced, not lazy. Both screens that host this button read the wallet as they
  // open, which spends the server's 10-minute lazy window seconds before the
  // user's thumb can reach Restore, so the old getWallet() call here reliably
  // reconciled nothing at all.
  const outcome = await forceReconcile();
  if (!outcome.ok) {
    return { status: "throttled", retryAfterSeconds: outcome.retryAfterSeconds };
  }

  return {
    status: outcome.reconciled ? "restored" : "unverified",
    wallet: outcome.wallet,
    activeInStore,
  };
}

/**
 * Poll GET /users/me/wallet until `predicate` passes or we time out. Used
 * right after a purchase completes, since the grant lands via an async
 * RevenueCat webhook, not the purchase call itself.
 *
 * READS OUR OWN LEDGER AND LITTLE ELSE, so do not reach for it to answer a
 * question a user asked out loud. The endpoint's `maybeReconcile` is the only
 * thing here that can repair a missed webhook and it is throttled to one pass
 * per user per ten minutes, so in practice these reads confirm the grant the
 * webhook already delivered and nothing more. `recheckWalletUntil` below is the
 * one for an explicit tap.
 */
export async function pollWalletUntil(
  predicate: (wallet: Wallet) => boolean,
  { timeoutMs = 30_000, intervalMs = 1_500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<Wallet | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const wallet = await getWallet();
      if (predicate(wallet)) return wallet;
    } catch (error) {
      console.error("[purchases] pollWalletUntil getWallet failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/**
 * Poll GET /users/me until the membership passes `predicate`, or time out.
 *
 * For a MEMBERSHIP purchase, and the reason it is not `pollWalletUntil`: the
 * wallet's "membership" entitlement is already there for somebody on free
 * days (a pack's bonus month), so waiting on it ended before the purchase had
 * been seen and told them it was confirmed. The user payload says what KIND of
 * membership it is (`plan`, `source`), which is the thing that changes.
 *
 * Returns the fresh user so the caller can put it in the store, or null.
 */
export async function pollMembershipUntil(
  predicate: (membership: User["membership"]) => boolean,
  { timeoutMs = 30_000, intervalMs = 1_500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<User | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const user = await getMyUser();
      if (predicate(user?.membership)) return user;
    } catch (error) {
      console.error("[purchases] pollMembershipUntil getMyUser failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

/**
 * The wallet check behind an explicit "Check again" tap, as opposed to the
 * automatic one that runs itself the moment a purchase completes.
 *
 * ── WHY THIS IS NOT JUST pollWalletUntil ──────────────────────────────────
 * Every read in that poll is GET /users/me/wallet, and the only thing on that
 * endpoint that can repair a webhook which never arrived is `maybeReconcile`
 * (sw-be-2/src/services/revenuecatReconciliation.service.ts). That is throttled
 * to one pass per user per ten minutes, and it stamps its window BEFORE doing
 * the work.
 *
 * Ordinary screens spend that window constantly: the wallet chip, the
 * call-credit gate, Settings, and the exhaustion sheet as it opens. So by the
 * time somebody has paid, watched the unlock not arrive, and reached for the one
 * button we gave them, the window is reliably already burnt. Their tap then
 * re-reads the very ledger we already know the grant is missing from, twenty
 * times over thirty seconds, and tells them to check again in a moment. Tapping
 * it a hundred times asks the store nothing. The purchase is real, the money is
 * gone, and the only thing that could reunite the two is the one thing the
 * button cannot trigger.
 *
 * Stamping first makes it worse than merely useless: a background read that
 * reached RevenueCat and got a 429 or a 500 burns the full ten minutes having
 * repaired nothing. So the user cannot get a real check even in principle until
 * a window they never knew about expires.
 *
 * POST /users/me/wallet/reconcile is the door with no throttle behind it. It
 * calls `reconcileUser` directly and returns the wallet that pass produced, so
 * one round trip both asks the store and answers the question.
 *
 * ── WHY THE STORE IS ASKED ONCE, NOT ONCE PER POLL ────────────────────────
 * The forced pass reaches an external API on our behalf. Twenty of them in
 * thirty seconds is how we would earn a real rate limit from RevenueCat, and
 * the backend's own five second minimum interval would refuse most of them
 * anyway. One ask, then the cheap poll as a fallback, because two things can
 * still change our answer after the store has spoken: the webhook can land a
 * second later, and RevenueCat's REST view is eventually consistent, so a
 * purchase made moments ago may genuinely not be in it yet. Neither is a dead
 * end, because the next tap forces again.
 */
export async function recheckWalletUntil(
  predicate: (wallet: Wallet) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<Wallet | null> {
  try {
    const forced = await forceReconcile();
    // A 429 (`ok: false`) is not a fault and not a reason to stop. It means a
    // forced pass ran for this user seconds ago, so the store HAS been asked on
    // their behalf, and the poll below reads the result of that pass. The wait
    // it quotes is for Restore, which has a sentence to say about it; this
    // button has nothing to gain from telling somebody they tapped too fast.
    if (forced.ok && predicate(forced.wallet)) return forced.wallet;
  } catch (error) {
    // forceReconcile already absorbs the two answers that are not failures: a
    // 429, and the 404/501 of a backend deployed before the force route existed.
    // What is left is a genuine one, an RC outage, a 500, no network. None of
    // them may end the recheck here, because the grant may have arrived by
    // webhook in the meantime and the poll below finds that without the store's
    // help. Falling through costs a few seconds; throwing would turn a
    // recoverable purchase into an error sheet.
    console.error(
      "[purchases] recheckWalletUntil: forced reconcile failed, falling back to the poll:",
      error,
    );
  }
  return pollWalletUntil(predicate, options);
}

/**
 * Opens the native subscription management surface (StoreKit sheet on iOS,
 * or direct browser fallback to App Store / Google Play account subscriptions).
 *
 * App Store Guideline 3.1.2 expects auto-renewing subscriptions to provide
 * a functional way to manage or cancel subscriptions.
 */
export async function manageSubscriptions(): Promise<void> {
  try {
    if (Platform.OS === "ios" && purchasesAvailable()) {
      await Purchases.showManageSubscriptions();
      return;
    }
  } catch (err) {
    console.warn("[purchases] showManageSubscriptions failed, falling back to URL:", err);
  }
  await openStoreSubscriptions(
    Platform.OS === "ios"
      ? STORE_SUBSCRIPTIONS_URL.app_store
      : STORE_SUBSCRIPTIONS_URL.play_store,
  );
}

/**
 * Opens one store's subscription page in the browser or store app. For a plan
 * bought on the OTHER store (an iPhone user with a Google Play plan), where the
 * native sheet on this device cannot show it.
 */
export async function openStoreSubscriptions(url: string): Promise<void> {
  await Linking.openURL(url).catch((e) =>
    console.error("[purchases] Could not open store subscriptions URL:", e),
  );
}

