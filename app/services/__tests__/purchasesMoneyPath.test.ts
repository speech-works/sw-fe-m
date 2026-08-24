/**
 * ===========================================================================
 * THE MONEY PATH: WHO WE CHARGE, WHAT WE SAY WHEN IT FAILS, WHAT RESTORE MEANS
 * ---------------------------------------------------------------------------
 * Three separate defects live here, all of them silent:
 *
 *  1. IDENTITY (item 14). The identity precondition was only on
 *     purchaseCatalogItem, so both memberships and the credit top-up — bought
 *     straight through purchaseProductById — could be charged to a session the
 *     SDK still held as anonymous. The charge succeeds, the webhook carries an
 *     `app_user_id` our backend cannot resolve to a uuid, and the grant never
 *     lands. For a subscription that repeats every month.
 *
 *  2. WHAT THE USER IS TOLD (item 12). The catch handed the SDK's own
 *     `message` to the error sheet. That string names the SDK and the store's
 *     API; a person who just tried to buy a pack can act on none of it.
 *
 *  3. RESTORE (item 11). It called getWallet(), whose server-side reconcile is
 *     throttled to once per ten minutes AND already spent by the screen that
 *     hosts the button. So Restore reliably reconciled nothing, then said
 *     "Purchases restored".
 *
 * Everything here asserts on what is SENT and what is RETURNED, because each of
 * these fails without an error anywhere.
 * ===========================================================================
 */
const mockGetProducts = jest.fn();
const mockPurchaseStoreProduct = jest.fn();
const mockGetAppUserID = jest.fn();
const mockLogIn = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    purchaseStoreProduct: (...args: unknown[]) =>
      mockPurchaseStoreProduct(...args),
    getAppUserID: (...args: unknown[]) => mockGetAppUserID(...args),
    logIn: (...args: unknown[]) => mockLogIn(...args),
    restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
  },
  PRODUCT_CATEGORY: {
    NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    SUBSCRIPTION: "SUBSCRIPTION",
  },
  /**
   * THE REAL ENUM, not a hand-copied subset.
   *
   * It used to be fifteen members typed out by hand, and a missing member is
   * not a harmless gap: `storeErrorMessage` is a switch over these values, so
   * an omitted member compiles to `case undefined:`. That case then captures
   * every error whose code really is undefined, which is exactly how the
   * DEFAULT branch is reached. So one missing member silently redirects the
   * unknown-code test onto whichever case was omitted, and the default branch
   * becomes untestable. That is what happened when
   * OPERATION_ALREADY_IN_PROGRESS_ERROR was added to the source.
   *
   * `react-native-purchases` re-exports this straight from
   * `@revenuecat/purchases-typescript-internal/dist/errors`, so requiring it
   * gives the same object production compares against, and the values stay
   * correct on an SDK upgrade instead of drifting. It is plain generated TS
   * with no native module behind it, so it is safe to load under jest.
   */
  PURCHASES_ERROR_CODE: jest.requireActual(
    "@revenuecat/purchases-typescript-internal/dist/errors",
  ).PURCHASES_ERROR_CODE,
}));

jest.mock("../../constants/features", () => ({
  PAYMENTS_ENABLED: true,
  REVENUECAT_IOS_API_KEY: "test_ios_key",
  REVENUECAT_ANDROID_API_KEY: "test_android_key",
}));

const mockGetWallet = jest.fn();
const mockReconcileWallet = jest.fn();
const mockCreatePurchaseIntent = jest.fn();

jest.mock("../../api", () => ({
  getWallet: (...args: unknown[]) => mockGetWallet(...args),
  reconcileWallet: (...args: unknown[]) => mockReconcileWallet(...args),
  createPurchaseIntent: (...args: unknown[]) => mockCreatePurchaseIntent(...args),
}));

let mockSignedInUserId: string | null = "user-1";
jest.mock("../../stores/user", () => ({
  useUserStore: {
    getState: () => ({ user: mockSignedInUserId ? { id: mockSignedInUserId } : null }),
  },
}));

import {
  purchaseCatalogItem,
  purchaseProductById,
  restorePurchasesAndReconcile,
  storeErrorMessage,
} from "../purchases";

const OUR_ID = "user-1";
const ANON_ID = "$RCAnonymousID:8f3c1d";

/** The one sentence a refusal to charge is allowed to produce. */
const REFUSAL =
  "We couldn't confirm your account, so we didn't charge you. Please sign out, sign back in, and try again.";

const storeProduct = (identifier: string) => ({
  identifier,
  priceString: "₹999",
  price: 999,
  currencyCode: "INR",
});

/** A rejection shaped like the SDK's, which is an object with a string `code`. */
const storeError = (code: string | undefined, message: string) =>
  Object.assign(new Error(message), { code, message });

/** An axios-shaped rejection, which is what the api layer re-throws. */
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const wallet = (over: Record<string, unknown> = {}) => ({
  balance: 2,
  entitlements: ["pack:calm-mind"],
  ...over,
});

beforeEach(() => {
  mockSignedInUserId = OUR_ID;
  mockGetProducts.mockReset().mockResolvedValue([storeProduct("sw.tier.999")]);
  mockPurchaseStoreProduct.mockReset().mockResolvedValue(undefined);
  mockGetAppUserID.mockReset().mockResolvedValue(OUR_ID);
  mockLogIn.mockReset().mockResolvedValue(undefined);
  mockRestorePurchases.mockReset();
  mockGetWallet.mockReset();
  mockReconcileWallet.mockReset();
  mockCreatePurchaseIntent
    .mockReset()
    .mockResolvedValue({ tierProductId: "sw.tier.999" });
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("identity is a precondition of charging", () => {
  it("refuses to charge a membership when nobody is signed in", async () => {
    mockSignedInUserId = null;

    const outcome = await purchaseProductById("sw.membership.annual");

    expect(outcome).toEqual({ status: "error", message: REFUSAL });
    // The point of the guard: the store is never reached, so there is no charge
    // to refund.
    expect(mockGetProducts).not.toHaveBeenCalled();
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("refuses to charge the credit top-up when the SDK insists it is someone else", async () => {
    // Still the previous account after a logIn that would not take.
    mockGetAppUserID.mockResolvedValue("user-2");

    const outcome = await purchaseProductById("sw.credits.2");

    expect(outcome).toEqual({ status: "error", message: REFUSAL });
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("repairs an anonymous session and then charges", async () => {
    // Boot-time logIn never ran or failed, so the SDK is still anonymous. This
    // is the last moment it can be fixed, so one retry happens here.
    mockGetAppUserID
      .mockResolvedValueOnce(ANON_ID) // the precondition's own look
      .mockResolvedValue(OUR_ID); // after the repairing logIn

    const outcome = await purchaseProductById("sw.tier.999");

    expect(mockLogIn).toHaveBeenCalledWith(OUR_ID);
    expect(outcome).toEqual({ status: "purchased" });
    expect(mockPurchaseStoreProduct).toHaveBeenCalledTimes(1);
  });

  /**
   * logIn resolving is not proof the SDK is now us: it can resolve against a
   * cached identity. So the id is read back, and a lie is caught.
   */
  it("does not trust a logIn that resolves without changing the id", async () => {
    mockGetAppUserID.mockResolvedValue(ANON_ID);

    const outcome = await purchaseProductById("sw.tier.999");

    expect(mockLogIn).toHaveBeenCalledWith(OUR_ID);
    expect(outcome).toEqual({ status: "error", message: REFUSAL });
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("refuses a pack BEFORE recording an intent", async () => {
    mockSignedInUserId = null;

    const outcome = await purchaseCatalogItem("calm-mind");

    expect(outcome).toEqual({ status: "error", message: REFUSAL });
    // An intent recorded for a session we cannot bill is a row the webhook can
    // never resolve, so the check has to come first.
    expect(mockCreatePurchaseIntent).not.toHaveBeenCalled();
  });

  /**
   * The check must run ONCE per purchase, not once per layer. purchaseCatalogItem
   * checks, then hands off to the charge; if the charge re-checked, every pack
   * sale would make a second round of bridge calls for an answer it already has.
   */
  it("checks exactly once for a pack purchase", async () => {
    const outcome = await purchaseCatalogItem("calm-mind");

    expect(outcome).toEqual({ status: "purchased" });
    expect(mockGetAppUserID).toHaveBeenCalledTimes(1);
    expect(mockGetProducts).toHaveBeenCalledTimes(1);
  });
});

describe("what the user is told when a purchase fails", () => {
  it("treats cancelling as a cancellation, not an error", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(
      storeError("1", "Purchase was cancelled."),
    );

    // No message at all: the user chose this and knows they did it. A sheet
    // here is the app arguing with them.
    expect(await purchaseProductById("sw.tier.999")).toEqual({
      status: "cancelled",
    });
  });

  it("never leaks the SDK's own message to the user", async () => {
    const sdkText =
      "There was a problem with the App Store. Error code 4 (RCPurchaseInvalidError)";
    mockPurchaseStoreProduct.mockRejectedValue(storeError("4", sdkText));

    const outcome = await purchaseProductById("sw.tier.999");

    expect(outcome).toEqual({
      status: "error",
      message:
        "Your payment didn't go through. Check your payment method and try again.",
    });
    // The developer detail still exists, just in the console rather than in
    // front of the buyer.
    expect(console.error).toHaveBeenCalled();
  });

  it("uses the same mapping for a failure during the store lookup", async () => {
    // Not only purchaseStoreProduct: getProducts throws on a dead network too,
    // and that used to fall through to the same leaked-message branch.
    mockGetProducts.mockRejectedValue(storeError("10", "Network unreachable"));

    expect(await purchaseProductById("sw.tier.999")).toEqual({
      status: "error",
      message:
        "We couldn't reach the store. Check your connection and try again.",
    });
  });

  it("falls back to one plain sentence for a code it does not know", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(
      storeError(undefined, "SKPaymentQueue internal inconsistency"),
    );

    const outcome = await purchaseProductById("sw.tier.999");

    expect(outcome).toEqual({
      status: "error",
      message:
        "Something went wrong. If you were charged, tap Restore Purchases before you try again.",
    });
  });

  /**
   * THE CATCH-ALL MUST NOT PROMISE A REFUNDED CARD.
   *
   * These five codes only occur once the store already has the money: they are
   * receipt and backend failures, which need a payment to exist before they can
   * fail. The old sentence told those buyers "you were not charged. Please try
   * again", which is a claim the app cannot make and advice that buys a
   * consumable twice.
   */
  it("never claims the buyer was not charged on a code that happens AFTER payment", () => {
    // 0 unknown, 8 invalid receipt, 9 missing receipt file,
    // 12 unexpected backend response, 16 unknown backend error.
    for (const code of ["0", "8", "9", "12", "16"]) {
      const message = storeErrorMessage(code);
      expect(message).not.toMatch(/not charged/i);
      // And it points at the one action that recovers a payment that did land.
      expect(message).toContain("Restore Purchases");
    }
  });

  it("does not tell someone to retry while a charge is still in flight", () => {
    // OPERATION_ALREADY_IN_PROGRESS_ERROR. A second tap here is the double
    // charge, so "try again" is the one thing this branch must not say.
    const message = storeErrorMessage("15");
    expect(message).toBe("A purchase is already going through. Give it a moment.");
    expect(message).not.toMatch(/try again/i);
  });

  /**
   * A pending payment is a slow payment method (bank transfer, a parent's
   * approval), not a failure, so it must not read like one.
   */
  it("does not call a pending payment a failure", () => {
    expect(storeErrorMessage("20")).toBe(
      "Your payment is still being confirmed. We'll unlock this as soon as it clears.",
    );
  });

  it("points an already-owned product at Restore", () => {
    for (const code of ["6", "7", "13"]) {
      expect(storeErrorMessage(code)).toBe(
        "You already own this. Use Restore Purchases to get it back.",
      );
    }
  });

  it("says something different when the device forbids purchases at all", () => {
    // Retrying will not help until a setting changes, so the same sentence as a
    // declined card would send the person to the wrong place.
    expect(storeErrorMessage("3")).toBe(
      "This device isn't allowed to make purchases. Check your device settings and try again.",
    );
  });
});

describe("restore reports what actually happened", () => {
  const storeHas = () =>
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: { membership: {} } },
      allPurchasedProductIdentifiers: ["sw.membership.annual"],
    });

  const storeEmpty = () =>
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: {} },
      allPurchasedProductIdentifiers: [],
    });

  /**
   * A membership that lapsed, a refund, a top-up whose credits are spent. The
   * store keeps the sku forever and reports nothing active, which is the state
   * that used to be indistinguishable from a live purchase we had failed to
   * grant.
   */
  const storeBoughtOnceNothingActive = () =>
    mockRestorePurchases.mockResolvedValue({
      entitlements: { active: {} },
      allPurchasedProductIdentifiers: ["sw.membership.monthly", "sw.credits.10"],
    });

  it("says nothing was found without touching our backend", async () => {
    // Dismissing the iOS sign-in sheet RESOLVES with the cached, empty
    // CustomerInfo rather than throwing. This is the case that used to produce a
    // "Purchases restored" celebration.
    storeEmpty();

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "nothing_found",
    });
    expect(mockReconcileWallet).not.toHaveBeenCalled();
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  it("forces the reconcile instead of relying on the lazy one", async () => {
    storeHas();
    mockReconcileWallet.mockResolvedValue(wallet({ reconciled: true }));

    const result = await restorePurchasesAndReconcile();

    expect(result).toEqual({
      status: "restored",
      wallet: wallet({ reconciled: true }),
      activeInStore: true,
    });
    // The whole bug: getWallet's reconcile is throttled and already spent by the
    // screen hosting the button, so the forced route has to be the one used.
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  /**
   * `allPurchasedProductIdentifiers` is "active and inactive", so reading it as
   * ownership told a lapsed member the store had something we had failed to add
   * to their account, forever. Their restore has to come back saying the store
   * holds nothing active, which is what lets the caller answer plainly.
   */
  it("does not call an old purchase an active one", async () => {
    storeBoughtOnceNothingActive();
    mockReconcileWallet.mockResolvedValue(
      wallet({ balance: 0, entitlements: [], reconciled: true }),
    );

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "restored",
      wallet: wallet({ balance: 0, entitlements: [], reconciled: true }),
      activeInStore: false,
    });
    // Still worth asking our backend: this store account has bought from us, so
    // there may be packs or credits on our side that are simply not showing.
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
  });

  it("treats an absent `reconciled` flag as true", async () => {
    // Only a backend new enough to send the flag can send false, so a plain
    // truthiness test would report every older backend as a failed check.
    storeHas();
    mockReconcileWallet.mockResolvedValue(wallet());

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "restored",
      wallet: wallet(),
      activeInStore: true,
    });
  });

  it("refuses to claim a restore it could not confirm", async () => {
    // RevenueCat was unreachable server-side. The wallet is still readable and
    // still right as far as we know it, but we did not check.
    storeHas();
    mockReconcileWallet.mockResolvedValue(wallet({ reconciled: false }));

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "unverified",
      wallet: wallet({ reconciled: false }),
      activeInStore: true,
    });
  });

  it("reports the backend's own wait when Restore is tapped twice", async () => {
    storeHas();
    mockReconcileWallet.mockRejectedValue(
      httpError(429, {
        error: "Please wait a moment before restoring again.",
        retryAfterSeconds: 4,
      }),
    );

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "throttled",
      retryAfterSeconds: 4,
    });
  });

  it("quotes a sane wait when the 429 carries no number", async () => {
    storeHas();
    mockReconcileWallet.mockRejectedValue(httpError(429, {}));

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "throttled",
      retryAfterSeconds: 5,
    });
  });

  it("still restores against a backend that has no force route", async () => {
    // The app ships to stores independently of the backend deploy, so a build
    // with this code can reach a backend one deploy behind. Those users must not
    // be told their purchases could not be restored.
    storeHas();
    mockReconcileWallet.mockRejectedValue(httpError(404));
    mockGetWallet.mockResolvedValue(wallet());

    expect(await restorePurchasesAndReconcile()).toEqual({
      status: "restored",
      wallet: wallet(),
      activeInStore: true,
    });
    expect(mockGetWallet).toHaveBeenCalledTimes(1);
  });

  it("lets a real failure through to the caller", async () => {
    // A 500 or a dead network is not a restore outcome, it is a failure, and the
    // hook's catch is what turns it into "Couldn't restore".
    storeHas();
    mockReconcileWallet.mockRejectedValue(httpError(500));

    await expect(restorePurchasesAndReconcile()).rejects.toThrow();
  });
});
