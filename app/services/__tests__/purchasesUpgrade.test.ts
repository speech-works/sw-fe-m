/**
 * ===========================================================================
 * MONTHLY TO ANNUAL ON GOOGLE PLAY REPLACES THE PLAN, IT DOES NOT ADD ONE
 * ---------------------------------------------------------------------------
 * On Play, `sw.membership.monthly` and `sw.membership.annual` are separate
 * subscription products. "Upgrade to Annual" bought the annual one with no
 * change info, so Play started a second subscription and both billed. Apple
 * keeps both in one subscription group and swaps them itself, so iOS was fine
 * and must stay exactly as it was.
 * ===========================================================================
 */
const mockGetProducts = jest.fn();
const mockPurchaseStoreProduct = jest.fn();
const mockGetAppUserID = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    purchaseStoreProduct: (...args: unknown[]) =>
      mockPurchaseStoreProduct(...args),
    getAppUserID: (...args: unknown[]) => mockGetAppUserID(...args),
    logIn: jest.fn(),
  },
  PRODUCT_CATEGORY: {
    NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    SUBSCRIPTION: "SUBSCRIPTION",
  },
  // The real enums, so a renamed or renumbered member fails here.
  STORE_REPLACEMENT_MODE: jest.requireActual(
    "@revenuecat/purchases-typescript-internal/dist/offerings",
  ).STORE_REPLACEMENT_MODE,
  PURCHASES_ERROR_CODE: jest.requireActual(
    "@revenuecat/purchases-typescript-internal/dist/errors",
  ).PURCHASES_ERROR_CODE,
}));

jest.mock("../../constants/features", () => ({
  PAYMENTS_ENABLED: true,
  REVENUECAT_IOS_API_KEY: "test_ios_key",
  REVENUECAT_ANDROID_API_KEY: "test_android_key",
}));

jest.mock("../../api", () => ({}));

jest.mock("../../stores/user", () => ({
  useUserStore: { getState: () => ({ user: { id: "user-1" } }) },
}));

import { Platform } from "react-native";
import { STORE_REPLACEMENT_MODE } from "react-native-purchases";
import type { User } from "../../api/users";
import { playUpgradeChangeInfo, purchaseProductById } from "../purchases";

type M = NonNullable<User["membership"]>;

const MONTHLY = "sw.membership.monthly";
const ANNUAL = "sw.membership.annual";

const monthlyOn = (store: M["store"]): M => ({
  active: true,
  until: "2026-12-07T00:00:00Z",
  daysRemaining: 30,
  plan: "monthly",
  source: "purchase",
  store,
});

const REPLACE_MONTHLY = {
  oldProductIdentifier: MONTHLY,
  replacementMode: STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION,
};

const setOS = (os: "ios" | "android") =>
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });

const originalOS = Platform.OS;

beforeEach(() => {
  mockGetProducts.mockReset();
  mockPurchaseStoreProduct.mockReset();
  mockGetAppUserID.mockReset().mockResolvedValue("user-1");
  mockPurchaseStoreProduct.mockResolvedValue({});
});

afterAll(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => originalOS });
});

describe("playUpgradeChangeInfo", () => {
  const info = (platformOS: string, membership: M | null, monthlyProductId = MONTHLY) =>
    playUpgradeChangeInfo({ platformOS, membership, monthlyProductId });

  it("time proration is the replacement mode RevenueCat documents", () => {
    expect(STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION).toBe("WITH_TIME_PRORATION");
  });

  it("on Android, replaces a monthly Play plan with time proration", () => {
    expect(info("android", monthlyOn("play_store"))).toEqual(REPLACE_MONTHLY);
  });

  it.each([null, undefined, "unknown"] as const)(
    "on Android, a monthly plan whose store is %s still names the monthly plan",
    (store) => {
      expect(info("android", monthlyOn(store))).toEqual(REPLACE_MONTHLY);
    },
  );

  it("names the subscription, never a base plan", () => {
    expect(info("android", monthlyOn("play_store"), `${MONTHLY}:monthly`)).toEqual(
      REPLACE_MONTHLY,
    );
  });

  it("iOS gets nothing: the subscription group swaps the plans", () => {
    expect(info("ios", monthlyOn("app_store"))).toBeNull();
    expect(info("ios", monthlyOn("play_store"))).toBeNull();
  });

  it.each(["app_store", "stripe"] as const)(
    "on Android, a plan on %s is not a Play plan to replace",
    (store) => {
      expect(info("android", monthlyOn(store))).toBeNull();
    },
  );

  it("nothing to replace without an active monthly plan", () => {
    expect(info("android", null)).toBeNull();
    expect(info("android", { ...monthlyOn("play_store"), plan: "annual" })).toBeNull();
    expect(info("android", { ...monthlyOn("play_store"), plan: null })).toBeNull();
    expect(info("android", { ...monthlyOn("play_store"), active: false })).toBeNull();
  });

  it("nothing without a monthly product id to name", () => {
    expect(
      playUpgradeChangeInfo({
        platformOS: "android",
        membership: monthlyOn("play_store"),
        monthlyProductId: null,
      }),
    ).toBeNull();
  });
});

describe("the upgrade purchase hands the change info to the store", () => {
  const annualProduct = { identifier: `${ANNUAL}:annual`, price: 34.99 };

  it("on Android, purchaseStoreProduct gets the product AND the change info", async () => {
    setOS("android");
    mockGetProducts.mockResolvedValue([annualProduct]);

    const outcome = await purchaseProductById(ANNUAL, {
      googleProductChangeInfo: REPLACE_MONTHLY,
    });

    expect(outcome).toEqual({ status: "purchased" });
    expect(mockPurchaseStoreProduct).toHaveBeenCalledTimes(1);
    expect(mockPurchaseStoreProduct).toHaveBeenCalledWith(annualProduct, REPLACE_MONTHLY);
  });

  it("on iOS, the purchase call is exactly what it was", async () => {
    setOS("ios");
    mockGetProducts.mockResolvedValue([{ identifier: ANNUAL }]);

    await purchaseProductById(ANNUAL, { googleProductChangeInfo: REPLACE_MONTHLY });

    expect(mockPurchaseStoreProduct.mock.calls).toEqual([[{ identifier: ANNUAL }]]);
  });

  it("a plain buy on Android sends no change info", async () => {
    setOS("android");
    mockGetProducts.mockResolvedValue([annualProduct]);

    await purchaseProductById(ANNUAL);

    expect(mockPurchaseStoreProduct.mock.calls).toEqual([[annualProduct]]);
  });
});
