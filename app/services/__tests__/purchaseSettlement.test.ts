/**
 * ===========================================================================
 * NEVER LET SOMEBODY PAY TWICE FOR ONE PROGRAM OR ONE CHECKOUT
 * ---------------------------------------------------------------------------
 * Once the store's purchase call has run, the app cannot know whether money
 * moved, and the tier SKUs and the credit top-up are consumables the store
 * will sell twice. So every error from that call waits for the grant instead
 * of offering Buy again, except cancel, not-allowed and not-available.
 *
 * The backend also refuses a second checkout with a 409 (ALREADY_OWNED or
 * CHECKOUT_IN_PROGRESS). Neither may open the store sheet.
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
    addCustomerInfoUpdateListener: jest.fn(),
  },
  PRODUCT_CATEGORY: {
    NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    SUBSCRIPTION: "SUBSCRIPTION",
  },
  PURCHASES_ERROR_CODE: jest.requireActual(
    "@revenuecat/purchases-typescript-internal/dist/errors",
  ).PURCHASES_ERROR_CODE,
}));

jest.mock("../../constants/features", () => ({
  PAYMENTS_ENABLED: true,
  REVENUECAT_IOS_API_KEY: "test_ios_key",
  REVENUECAT_ANDROID_API_KEY: "test_android_key",
}));

const mockCreatePurchaseIntent = jest.fn();
jest.mock("../../api", () => ({
  createPurchaseIntent: (...args: unknown[]) => mockCreatePurchaseIntent(...args),
}));

jest.mock("../../stores/user", () => ({
  useUserStore: { getState: () => ({ user: { id: "user-1" } }) },
}));

import { PURCHASES_ERROR_CODE } from "react-native-purchases";
import { purchaseCatalogItem, purchaseProductById } from "../purchases";
import {
  CHECKOUT_IN_PROGRESS_LINE,
  CREDITS_SETTLING_LINE,
  PLAY_PENDING_PROGRAM_LINE,
  PROGRAM_SETTLING_LINE,
  SETTLE_TIMEOUT_LINE,
  __resetPendingForTests,
  classifyStoreError,
  clearCreditsPending,
  clearProgramPending,
  creditsLanded,
  creditsPending,
  intentConflictFrom,
  markCreditsPending,
  markProgramPending,
  notifyPurchasesMayHaveChanged,
  onPurchasesMayHaveChanged,
  pendingLine,
  programPending,
  offersPaused,
  purchasesPausedFrom,
  FOREIGN_PURCHASES_LINE,
  MEMBERSHIP_CONFIRMING_LINE,
  PURCHASES_PAUSED_LINE,
  UNCLEAR_PROGRAM_LINE,
  UNCLEAR_CREDITS_LINE,
} from "../purchaseSettlement";

const C = PURCHASES_ERROR_CODE;

const storeError = (code: string | undefined) =>
  Object.assign(new Error("sdk text"), { code });

const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

beforeEach(() => {
  __resetPendingForTests();
  mockGetProducts.mockReset().mockResolvedValue([
    { identifier: "sw.tier.999", priceString: "₹999", price: 999, currencyCode: "INR" },
  ]);
  mockPurchaseStoreProduct.mockReset().mockResolvedValue(undefined);
  mockGetAppUserID.mockReset().mockResolvedValue("user-1");
  mockCreatePurchaseIntent
    .mockReset()
    .mockResolvedValue({ tierProductId: "sw.tier.999" });
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("classifyStoreError", () => {
  it("treats cancelling as a cancellation in either phase", () => {
    expect(classifyStoreError(C.PURCHASE_CANCELLED_ERROR, "purchase")).toBe("cancelled");
    expect(classifyStoreError(C.PURCHASE_CANCELLED_ERROR, "lookup")).toBe("cancelled");
  });

  it("keeps the three before-charge codes retryable after the purchase call", () => {
    for (const code of [
      C.PURCHASE_NOT_ALLOWED_ERROR,
      C.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR,
      C.INELIGIBLE_ERROR,
    ]) {
      expect(classifyStoreError(code, "purchase")).toBe("retryable_before_charge");
    }
  });

  it("calls a Play pending payment pending", () => {
    expect(classifyStoreError(C.PAYMENT_PENDING_ERROR, "purchase")).toBe("store_pending");
  });

  // One assertion per code, so a code moving between groups names itself.
  it.each([
    ["UNEXPECTED_BACKEND_RESPONSE_ERROR", C.UNEXPECTED_BACKEND_RESPONSE_ERROR],
    ["UNKNOWN_BACKEND_ERROR", C.UNKNOWN_BACKEND_ERROR],
    ["INVALID_RECEIPT_ERROR", C.INVALID_RECEIPT_ERROR],
    ["MISSING_RECEIPT_FILE_ERROR", C.MISSING_RECEIPT_FILE_ERROR],
    ["PRODUCT_ALREADY_PURCHASED_ERROR", C.PRODUCT_ALREADY_PURCHASED_ERROR],
    ["CUSTOMER_INFO_ERROR", C.CUSTOMER_INFO_ERROR],
  ])("says payment received for %s, which only follows a real charge", (_name, code) => {
    expect(classifyStoreError(code, "purchase")).toBe("pending_after_charge");
  });

  it.each([
    ["NETWORK_ERROR", C.NETWORK_ERROR],
    ["OFFLINE_CONNECTION_ERROR", C.OFFLINE_CONNECTION_ERROR],
    ["OPERATION_ALREADY_IN_PROGRESS_ERROR", C.OPERATION_ALREADY_IN_PROGRESS_ERROR],
    ["RECEIPT_ALREADY_IN_USE_ERROR", C.RECEIPT_ALREADY_IN_USE_ERROR],
    [
      "RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR",
      C.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR,
    ],
  ])("waits without claiming a payment for %s", (_name, code) => {
    expect(classifyStoreError(code, "purchase")).toBe("unclear");
  });

  it("keeps Buy for a declined or refused payment: nothing was taken", () => {
    for (const code of [
      C.STORE_PROBLEM_ERROR,
      C.PURCHASE_INVALID_ERROR,
      C.PRODUCT_REQUEST_TIMED_OUT_ERROR,
      C.PURCHASE_NOT_ALLOWED_ERROR,
    ]) {
      expect(classifyStoreError(code, "purchase")).toBe("retryable_before_charge");
    }
  });

  it("waits without claiming a payment when the error is unknown", () => {
    for (const code of [C.UNKNOWN_ERROR, undefined, "999"]) {
      expect(classifyStoreError(code, "purchase")).toBe("unclear");
    }
  });

  it("keeps every lookup error retryable, because no sheet has opened", () => {
    expect(classifyStoreError(C.NETWORK_ERROR, "lookup")).toBe("retryable_before_charge");
    expect(classifyStoreError(undefined, "lookup")).toBe("retryable_before_charge");
  });
});

describe("the emergency stop", () => {
  it("says the founder's line", () => {
    expect(PURCHASES_PAUSED_LINE).toBe(
      "Purchases are paused for a short while. Programs you own keep working.",
    );
  });

  it("reads offers.purchasesPaused, and treats a missing flag as not paused", () => {
    expect(offersPaused({ purchasesPaused: true })).toBe(true);
    expect(offersPaused({ purchasesPaused: false })).toBe(false);
    expect(offersPaused({})).toBe(false);
    expect(offersPaused(null)).toBe(false);
    expect(offersPaused(undefined)).toBe(false);
  });

  it("reads a 503 PURCHASES_PAUSED from the checkout, under either key", () => {
    expect(
      purchasesPausedFrom(httpError(503, { error: "x", code: "PURCHASES_PAUSED" })),
    ).toBe(true);
    expect(
      purchasesPausedFrom(httpError(503, { error: "x", errorCode: "PURCHASES_PAUSED" })),
    ).toBe(true);
  });

  it("ignores other statuses, other codes and plain errors", () => {
    expect(purchasesPausedFrom(httpError(503, { code: "SOMETHING_ELSE" }))).toBe(false);
    expect(purchasesPausedFrom(httpError(503))).toBe(false);
    expect(purchasesPausedFrom(httpError(409, { code: "PURCHASES_PAUSED" }))).toBe(false);
    expect(purchasesPausedFrom(new Error("offline"))).toBe(false);
  });
});

describe("the new lines", () => {
  it("keep the founder's wording, with no em dash", () => {
    expect(FOREIGN_PURCHASES_LINE).toBe(
      "This purchase belongs to another Speechworks account. Sign in to that account to use it.",
    );
    for (const line of [
      FOREIGN_PURCHASES_LINE,
      MEMBERSHIP_CONFIRMING_LINE,
      PURCHASES_PAUSED_LINE,
      UNCLEAR_PROGRAM_LINE,
      UNCLEAR_CREDITS_LINE,
    ]) {
      expect(line).not.toMatch(/—/);
    }
  });

  it("never claims a payment while it is unclear", () => {
    expect(UNCLEAR_PROGRAM_LINE).toMatch(/^We are checking your payment/);
    expect(UNCLEAR_CREDITS_LINE).toMatch(/^We are checking your payment/);
    expect(UNCLEAR_PROGRAM_LINE).not.toMatch(/received/i);
  });
});

describe("intentConflictFrom", () => {
  it("reads the backend's `code`", () => {
    expect(intentConflictFrom(httpError(409, { error: "x", code: "ALREADY_OWNED" }))).toBe(
      "already_owned",
    );
    expect(
      intentConflictFrom(httpError(409, { error: "x", code: "CHECKOUT_IN_PROGRESS" })),
    ).toBe("checkout_in_progress");
  });

  it("also reads `errorCode`, the global handler's key", () => {
    expect(
      intentConflictFrom(httpError(409, { error: "x", errorCode: "ALREADY_OWNED" })),
    ).toBe("already_owned");
  });

  it("ignores other statuses and codes", () => {
    expect(intentConflictFrom(httpError(400, { code: "ALREADY_OWNED" }))).toBeNull();
    expect(intentConflictFrom(httpError(409, { code: "SOMETHING_ELSE" }))).toBeNull();
    expect(intentConflictFrom(new Error("offline"))).toBeNull();
  });
});

describe("pendingLine", () => {
  it("says the payment was received while we wait", () => {
    expect(pendingLine("after_charge", "program", false)).toBe(
      "Payment received. Unlocking your program…",
    );
    expect(pendingLine("after_charge", "credits", false)).toBe(
      "Payment received. Adding your call credits…",
    );
    expect(PROGRAM_SETTLING_LINE).toBe(pendingLine("after_charge", "program", false));
    expect(CREDITS_SETTLING_LINE).toBe(pendingLine("after_charge", "credits", false));
  });

  it("says it unlocks on its own once the wait runs out", () => {
    expect(pendingLine("after_charge", "program", true)).toBe(
      "Your payment is being confirmed. It will unlock on its own. You do not need to pay again.",
    );
    expect(pendingLine("after_charge", "credits", true)).toBe(SETTLE_TIMEOUT_LINE);
  });

  it("keeps Google Play's line for a pending payment, timed out or not", () => {
    expect(pendingLine("store_pending", "program", false)).toBe(
      "Your payment is pending with Google Play. The program unlocks when it goes through.",
    );
    expect(pendingLine("store_pending", "program", true)).toBe(PLAY_PENDING_PROGRAM_LINE);
  });

  it("names the App Store for the same code on an iPhone (Ask to Buy)", () => {
    expect(pendingLine("store_pending", "program", false, "ios")).toBe(
      "Your payment is pending with the App Store. The program unlocks when it goes through.",
    );
    expect(pendingLine("store_pending", "credits", false, "ios")).toBe(
      "Your payment is pending with the App Store. Your call credits arrive when it goes through.",
    );
  });

  it("names an earlier checkout", () => {
    expect(pendingLine("checkout_in_progress", "program", false)).toBe(
      "Your earlier payment is still being confirmed. It will unlock on its own.",
    );
    expect(pendingLine("checkout_in_progress", "program", true)).toBe(
      CHECKOUT_IN_PROGRESS_LINE,
    );
  });

  it("uses no em dashes", () => {
    for (const kind of ["after_charge", "store_pending", "checkout_in_progress"] as const) {
      for (const product of ["program", "credits"] as const) {
        for (const timedOut of [false, true]) {
          expect(pendingLine(kind, product, timedOut)).not.toMatch(/—/);
        }
      }
    }
  });
});

describe("the session's open payments", () => {
  it("remembers a pending program until it is cleared", () => {
    expect(programPending("calm-mind")).toBeNull();
    markProgramPending("calm-mind", "store_pending");
    expect(programPending("calm-mind")).toBe("store_pending");
    expect(programPending("other")).toBeNull();
    clearProgramPending("calm-mind");
    expect(programPending("calm-mind")).toBeNull();
  });

  it("remembers pending credits with their starting balance", () => {
    markCreditsPending({ kind: "after_charge", startingBalance: 0 });
    expect(creditsPending()).toEqual({ kind: "after_charge", startingBalance: 0 });
    clearCreditsPending();
    expect(creditsPending()).toBeNull();
  });

  it("counts credits as landed only when the balance rose", () => {
    expect(creditsLanded(0, 0)).toBe(false);
    expect(creditsLanded(0, 2)).toBe(true);
    expect(creditsLanded(null, 0)).toBe(true);
  });

  it("tells listeners to re-read, and stops after unsubscribe", () => {
    const listener = jest.fn();
    const off = onPurchasesMayHaveChanged(listener);
    notifyPurchasesMayHaveChanged();
    off();
    notifyPurchasesMayHaveChanged();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("purchaseCatalogItem", () => {
  it("waits instead of offering a retry when the purchase call fails after it ran", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.INVALID_RECEIPT_ERROR));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "pending",
      kind: "after_charge",
    });
  });

  it("waits with neutral words when the network drops during the purchase", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.NETWORK_ERROR));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "pending",
      kind: "unclear",
    });
  });

  it("reports a Play pending payment as pending", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PAYMENT_PENDING_ERROR));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "pending",
      kind: "store_pending",
    });
  });

  it("keeps the retry for the before-charge codes", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PURCHASE_NOT_ALLOWED_ERROR));
    const outcome = await purchaseCatalogItem("calm-mind");
    expect(outcome.status).toBe("error");
  });

  it("keeps a cancel quiet", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PURCHASE_CANCELLED_ERROR));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({ status: "cancelled" });
  });

  it("keeps a lookup failure retryable", async () => {
    mockGetProducts.mockRejectedValue(storeError(C.NETWORK_ERROR));
    const outcome = await purchaseCatalogItem("calm-mind");
    expect(outcome.status).toBe("error");
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("shows an owned program as owned and opens no store sheet", async () => {
    mockCreatePurchaseIntent.mockRejectedValue(
      httpError(409, { error: "owned", code: "ALREADY_OWNED" }),
    );
    expect(await purchaseCatalogItem("calm-mind")).toEqual({ status: "already_owned" });
    expect(mockGetProducts).not.toHaveBeenCalled();
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("opens no store sheet while an earlier checkout is open", async () => {
    mockCreatePurchaseIntent.mockRejectedValue(
      httpError(409, { error: "open", code: "CHECKOUT_IN_PROGRESS" }),
    );
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "checkout_in_progress",
    });
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("opens no store sheet while purchases are paused", async () => {
    mockCreatePurchaseIntent.mockRejectedValue(
      httpError(503, { error: "paused", code: "PURCHASES_PAUSED" }),
    );
    expect(await purchaseCatalogItem("calm-mind")).toEqual({ status: "paused" });
    expect(mockGetProducts).not.toHaveBeenCalled();
    expect(mockPurchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("still says try again for any other intent failure", async () => {
    mockCreatePurchaseIntent.mockRejectedValue(httpError(500));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "error",
      message: "Couldn't start the purchase. Please try again.",
    });
  });
});

describe("purchaseProductById", () => {
  it("waits for the credit top-up when the caller opts in", async () => {
    mockGetProducts.mockResolvedValue([
      { identifier: "sw.credits.2", priceString: "₹99", price: 99, currencyCode: "INR" },
    ]);
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.NETWORK_ERROR));
    expect(
      await purchaseProductById("sw.credits.2", { settleAfterCharge: true }),
    ).toEqual({ status: "pending", kind: "unclear" });
  });

  it("keeps the old error for a caller that did not opt in (memberships)", async () => {
    mockGetProducts.mockResolvedValue([
      {
        identifier: "sw.membership.monthly",
        priceString: "$2.99",
        price: 2.99,
        currencyCode: "USD",
      },
    ]);
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.UNKNOWN_ERROR));
    const outcome = await purchaseProductById("sw.membership.monthly");
    expect(outcome.status).toBe("error");
  });
});

describe("testStoreKey", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { testStoreKey } = require("../purchases");
  it("is used only in a development build", () => {
    expect(testStoreKey(true, "test_abc")).toBe("test_abc");
    expect(testStoreKey(false, "test_abc")).toBeNull();
  });
  it("ignores anything that is not a test key", () => {
    expect(testStoreKey(true, "appl_abc")).toBeNull();
    expect(testStoreKey(true, "")).toBeNull();
  });
});

describe("testStoreKey without the setting", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { testStoreKey } = require("../purchases");
  it("falls back to the store key when the setting is missing", () => {
    expect(testStoreKey(true, undefined)).toBeNull();
  });
});

describe("releasesCheckout", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { releasesCheckout } = require("../purchases");
  it("releases only when no money moved", () => {
    expect(releasesCheckout({ status: "cancelled" })).toBe(true);
    expect(releasesCheckout({ status: "error", message: "declined" })).toBe(true);
  });
  it("keeps the checkout while a payment may be settling", () => {
    expect(releasesCheckout({ status: "purchased" })).toBe(false);
    for (const kind of ["after_charge", "store_pending", "unclear"]) {
      expect(releasesCheckout({ status: "pending", kind })).toBe(false);
    }
  });
});
