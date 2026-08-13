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
import { Platform } from "react-native";
import Purchases, {
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesStoreProduct,
} from "react-native-purchases";
import {
  PAYMENTS_ENABLED,
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_IOS_API_KEY,
} from "../constants/features";
import { getWallet, createPurchaseIntent, type Wallet } from "../api";
import { selectStoreProduct } from "./selectStoreProduct";
import type { StorePrice } from "./priceDisplay";

const getPlatformApiKey = (): string =>
  Platform.OS === "ios" ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;

/** True only when payments are on AND we actually have a key for this platform. */
export const purchasesAvailable = (): boolean =>
  PAYMENTS_ENABLED && !!getPlatformApiKey();

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
}

/**
 * Link the current app session to our own userId, so RevenueCat webhooks
 * carry it as `app_user_id` (RevenueCatService keys off that field). Called
 * from stores/user's fetchUser() once the user object is known.
 */
export async function loginPurchasesUser(userId: string): Promise<void> {
  if (!purchasesAvailable()) return;
  configurePurchases();
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error("[purchases] logIn failed:", error);
  }
}

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
  | { status: "error"; message: string };

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

  let tierProductId: string;
  try {
    const intent = await createPurchaseIntent(catalogItemKey);
    tierProductId = intent.tierProductId;
  } catch (error) {
    console.error("[purchases] createPurchaseIntent failed:", error);
    return {
      status: "error",
      message: "Couldn't start the purchase. Please try again.",
    };
  }

  return purchaseProductById(tierProductId);
}

/**
 * Buy a single product by its exact store product id. Used directly for the
 * FIXED SKUs that need no intent (the credit top-up `sw.credits.2` and the
 * membership subscriptions) — and internally by purchaseCatalogItem once the
 * pack's tier is resolved. Looks the product up fresh each time rather than
 * relying on a cached RevenueCat "offering".
 */
export async function purchaseProductById(
  productId: string,
): Promise<PurchaseOutcome> {
  if (!purchasesAvailable()) {
    return { status: "error", message: "Purchases are not available yet." };
  }
  configurePurchases();

  try {
    const products: PurchasesStoreProduct[] = await Purchases.getProducts([
      productId,
    ]);

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
          `[purchases] product "${productId}" not found in the store. ` +
            `Check it exists, is ACTIVE, and that the id matches ProductCatalog.ts exactly.`,
        );
      }
      return {
        status: "error",
        message: "That item isn't available for purchase right now.",
      };
    }

    await Purchases.purchaseStoreProduct(selection.product);
    return { status: "purchased" };
  } catch (error) {
    const purchasesError = error as PurchasesError;
    if (purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { status: "cancelled" };
    }
    console.error("[purchases] purchase failed:", error);
    return {
      status: "error",
      message: purchasesError?.message || "Purchase failed. Please try again.",
    };
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
    const products: PurchasesStoreProduct[] =
      await Purchases.getProducts(unique);

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

export interface RestoreResult {
  /** True only when the store actually had something for this store account. */
  foundInStore: boolean;
  /** Our own wallet AFTER reconciliation. Null when there was nothing to reconcile. */
  wallet: Wallet | null;
}

/**
 * Restore previous purchases (Settings → Restore Purchases) and force our
 * backend to reconcile immediately, rather than waiting for the next lazy
 * reconcile window on GET /users/me/wallet.
 *
 * `foundInStore` exists because a restore that finds NOTHING does not fail. On
 * iOS, dismissing the App Store sign-in sheet resolves `restorePurchases()`
 * with the cached (empty) CustomerInfo instead of throwing, and this function
 * used to return `getWallet()` unconditionally. A Wallet object is always
 * returned for a signed-in user, so the caller's "nothing restored" branch was
 * unreachable and cancelling produced a "Purchases restored" celebration.
 * CustomerInfo is the only thing here that knows whether the store gave us
 * anything, so the answer has to be read from it, not from our own wallet.
 */
export async function restorePurchasesAndReconcile(): Promise<RestoreResult | null> {
  if (!purchasesAvailable()) return null;
  configurePurchases();

  const customerInfo = await Purchases.restorePurchases();
  const foundInStore =
    Object.keys(customerInfo.entitlements.active).length > 0 ||
    customerInfo.allPurchasedProductIdentifiers.length > 0;

  if (!foundInStore) return { foundInStore: false, wallet: null };

  // getWallet() itself triggers RevenueCatReconciliationService.maybeReconcile
  // server-side, which is what actually turns the restored RC state into our
  // own entitlements/credits.
  return { foundInStore: true, wallet: await getWallet() };
}

/**
 * Poll GET /users/me/wallet until `predicate` passes or we time out. Used
 * right after a purchase completes, since the grant lands via an async
 * RevenueCat webhook, not the purchase call itself.
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
