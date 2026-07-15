// app/services/purchases.ts
//
// Thin wrapper around the RevenueCat SDK (react-native-purchases). Our own
// backend — not RevenueCat — is the source of truth for entitlements/wallet
// balance (PAYMENTS-PLAN.md §2): every purchase here is followed by polling
// GET /users/me/wallet until the grant lands (delivered via RC webhook, with
// a lazy reconcile fallback baked into that endpoint). Nothing in this file
// ever reads `CustomerInfo` to decide what the user owns.
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
    const product = products[0];
    if (!product) {
      return {
        status: "error",
        message: "That item isn't available for purchase right now.",
      };
    }

    await Purchases.purchaseStoreProduct(product);
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
 * Restore previous purchases (Settings → Restore Purchases) and force our
 * backend to reconcile immediately, rather than waiting for the next lazy
 * reconcile window on GET /users/me/wallet.
 */
export async function restorePurchasesAndReconcile(): Promise<Wallet | null> {
  if (!purchasesAvailable()) return null;
  configurePurchases();

  await Purchases.restorePurchases();
  // getWallet() itself triggers RevenueCatReconciliationService.maybeReconcile
  // server-side, which is what actually turns the restored RC state into our
  // own entitlements/credits.
  return getWallet();
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
