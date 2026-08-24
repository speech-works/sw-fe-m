/**
 * ===========================================================================
 * THE STORE MUST BE ASKED FOR THE RIGHT KIND OF PRODUCT
 * ---------------------------------------------------------------------------
 * `Purchases.getProducts(ids)` defaults its missing second argument to
 * SUBSCRIPTION. Apple ignores the argument entirely, so the one-argument call
 * we shipped looked healthy in every iOS test. Google maps it onto
 * BillingClient's SUBS/INAPP query with no fallback, so every tier SKU and the
 * credit top-up (all one-time, Consumable in the console) came back empty:
 * "That item isn't available for purchase right now" on the buy button, and a
 * paywall priced from the hardcoded INR fallback for the entire planet.
 *
 * These tests exist to hold the second argument in place. They assert what is
 * SENT to the store, not what comes back, because the wrong request is the
 * whole bug and it fails silently at every layer above it.
 * ===========================================================================
 */
import { PRODUCT_CATEGORY } from "react-native-purchases";

const mockGetProducts = jest.fn();
const mockPurchaseStoreProduct = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    purchaseStoreProduct: (...args: unknown[]) =>
      mockPurchaseStoreProduct(...args),
    // Identity is now a precondition of every charge, so these have to answer
    // or nothing here reaches the store at all. Returning the same id the user
    // store below reports is what makes this a signed-in, correctly linked
    // session. The refusal path itself is covered in purchasesMoneyPath.test.ts.
    getAppUserID: jest.fn().mockResolvedValue("user-1"),
    logIn: jest.fn().mockResolvedValue(undefined),
  },
  PRODUCT_CATEGORY: {
    NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    SUBSCRIPTION: "SUBSCRIPTION",
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1" },
}));

// Read through a dynamic import inside purchases.ts, to avoid a load-time cycle
// with this module. jest.mock intercepts that the same as a static import.
jest.mock("../../stores/user", () => ({
  useUserStore: { getState: () => ({ user: { id: "user-1" } }) },
}));

// Payments must be ON, or every function under test short-circuits before it
// ever reaches the store and the suite passes without asserting anything.
jest.mock("../../constants/features", () => ({
  PAYMENTS_ENABLED: true,
  REVENUECAT_IOS_API_KEY: "test_ios_key",
  REVENUECAT_ANDROID_API_KEY: "test_android_key",
}));

// The api barrel pulls in axios, secure store and the whole client stack. None
// of it is exercised here; purchaseProductById is reached directly.
jest.mock("../../api", () => ({
  getWallet: jest.fn(),
  createPurchaseIntent: jest.fn(),
}));

import { getStorePrices, productCategoryFor, purchaseProductById } from "../purchases";

const storeProduct = (identifier: string) => ({
  identifier,
  priceString: "₹999",
  price: 999,
  currencyCode: "INR",
});

/** The (ids, category) pair handed to the store, per call, in call order. */
const requests = (): [string[], string][] =>
  mockGetProducts.mock.calls.map((call) => [call[0], call[1]]);

beforeEach(() => {
  mockGetProducts.mockReset();
  mockPurchaseStoreProduct.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("productCategoryFor", () => {
  it("calls the two memberships subscriptions", () => {
    expect(productCategoryFor("sw.membership.monthly")).toBe(
      PRODUCT_CATEGORY.SUBSCRIPTION,
    );
    expect(productCategoryFor("sw.membership.annual")).toBe(
      PRODUCT_CATEGORY.SUBSCRIPTION,
    );
  });

  it("calls every tier SKU and the credit top-up non-subscriptions", () => {
    for (const id of [
      "sw.tier.199",
      "sw.tier.499",
      "sw.tier.999",
      "sw.tier.1999",
      "sw.credits.2",
    ]) {
      expect(productCategoryFor(id)).toBe(PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    }
  });

  /**
   * A Play subscription id can arrive fully qualified as
   * "<subscriptionId>:<basePlanId>" (selectStoreProduct's escape hatch). The
   * prefix still decides, and it must still say SUBSCRIPTION.
   */
  it("still recognises a fully-qualified Play subscription id", () => {
    expect(productCategoryFor("sw.membership.annual:annual")).toBe(
      PRODUCT_CATEGORY.SUBSCRIPTION,
    );
  });

  /** Anything unknown is one-time: that is what the catalog is made of. */
  it("treats an unknown id as one-time", () => {
    expect(productCategoryFor("sw.something.new")).toBe(
      PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
  });
});

describe("purchaseProductById asks for the right type", () => {
  it("requests a tier SKU as a NON_SUBSCRIPTION", async () => {
    mockGetProducts.mockResolvedValue([storeProduct("sw.tier.999")]);

    const outcome = await purchaseProductById("sw.tier.999");

    expect(requests()).toEqual([
      [["sw.tier.999"], PRODUCT_CATEGORY.NON_SUBSCRIPTION],
    ]);
    expect(outcome).toEqual({ status: "purchased" });
  });

  it("requests the credit top-up as a NON_SUBSCRIPTION", async () => {
    mockGetProducts.mockResolvedValue([storeProduct("sw.credits.2")]);

    await purchaseProductById("sw.credits.2");

    expect(requests()).toEqual([
      [["sw.credits.2"], PRODUCT_CATEGORY.NON_SUBSCRIPTION],
    ]);
  });

  it("requests a membership as a SUBSCRIPTION", async () => {
    mockGetProducts.mockResolvedValue([
      storeProduct("sw.membership.monthly:monthly"),
    ]);

    await purchaseProductById("sw.membership.monthly");

    expect(requests()).toEqual([
      [["sw.membership.monthly"], PRODUCT_CATEGORY.SUBSCRIPTION],
    ]);
  });

  // The category never reaches the buyer, but the product does: whatever the
  // store returned for the requested id is what gets charged.
  it("charges the product the store returned, not a guess", async () => {
    mockGetProducts.mockResolvedValue([
      storeProduct("sw.membership.annual:annual"),
    ]);

    await purchaseProductById("sw.membership.annual");

    expect(mockPurchaseStoreProduct).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "sw.membership.annual:annual" }),
    );
  });
});

describe("getStorePrices splits a mixed list by type", () => {
  it("issues one call per category and merges the answers", async () => {
    mockGetProducts.mockImplementation((ids: string[]) =>
      Promise.resolve(
        ids.map((id) =>
          id.startsWith("sw.membership.")
            ? storeProduct(`${id}:base`)
            : storeProduct(id),
        ),
      ),
    );

    const prices = await getStorePrices([
      "sw.tier.499",
      "sw.membership.monthly",
      "sw.tier.999",
      "sw.membership.annual",
      "sw.credits.2",
    ]);

    expect(requests()).toEqual([
      [
        ["sw.tier.499", "sw.tier.999", "sw.credits.2"],
        PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      ],
      [
        ["sw.membership.monthly", "sw.membership.annual"],
        PRODUCT_CATEGORY.SUBSCRIPTION,
      ],
    ]);
    expect(Object.keys(prices).sort()).toEqual([
      "sw.credits.2",
      "sw.membership.annual",
      "sw.membership.monthly",
      "sw.tier.499",
      "sw.tier.999",
    ]);
    expect(prices["sw.tier.999"]).toEqual({
      priceString: "₹999",
      price: 999,
      currencyCode: "INR",
    });
  });

  it("makes only the one call a single-category list needs", async () => {
    mockGetProducts.mockResolvedValue([storeProduct("sw.tier.199")]);

    await getStorePrices(["sw.tier.199", "sw.tier.199"]);

    expect(requests()).toEqual([
      [["sw.tier.199"], PRODUCT_CATEGORY.NON_SUBSCRIPTION],
    ]);
  });

  /**
   * The reason the batches are settled rather than raced: before this split
   * there was one call, so one failure losing everything cost nothing extra.
   * Now a store hiccup on the memberships must not un-price the packs.
   */
  it("keeps the prices from the category that answered", async () => {
    mockGetProducts.mockImplementation((ids: string[], category: string) =>
      category === PRODUCT_CATEGORY.SUBSCRIPTION
        ? Promise.reject(new Error("store unreachable"))
        : Promise.resolve(ids.map(storeProduct)),
    );

    const prices = await getStorePrices([
      "sw.tier.999",
      "sw.membership.monthly",
    ]);

    expect(Object.keys(prices)).toEqual(["sw.tier.999"]);
  });

  it("leaves out a product the store did not return", async () => {
    mockGetProducts.mockResolvedValue([storeProduct("sw.tier.999")]);

    const prices = await getStorePrices(["sw.tier.999", "sw.tier.1999"]);

    expect(prices["sw.tier.1999"]).toBeUndefined();
  });
});
