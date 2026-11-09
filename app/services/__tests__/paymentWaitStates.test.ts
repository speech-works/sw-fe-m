/**
 * ===========================================================================
 * WAITS THAT ARE NOT A PAYMENT OF THIS ATTEMPT (Android, build 43, 8 Nov 2026)
 * ---------------------------------------------------------------------------
 * F1  Every ₹999 program shares `sw.tier.999`. An earlier purchase left
 *     unconsumed made Google refuse the next one ("You already own this
 *     item"), and the app said "Payment received" for a program nobody paid
 *     for. Now: release the checkout, finish the earlier purchase, then Buy
 *     with a one-time note.
 * F3  An open checkout (app killed mid-purchase, or the backend's 409) shows
 *     "Checking your payment…" until the grant lands or it is CERTAIN nothing
 *     was paid.
 * ===========================================================================
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockGetProducts = jest.fn();
const mockPurchaseStoreProduct = jest.fn();
const mockGetAppUserID = jest.fn();
const mockRestore = jest.fn();
const mockSyncForResult = jest.fn();
const mockGetCustomerInfo = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getProducts: (...args: unknown[]) => mockGetProducts(...args),
    purchaseStoreProduct: (...args: unknown[]) => mockPurchaseStoreProduct(...args),
    getAppUserID: (...args: unknown[]) => mockGetAppUserID(...args),
    logIn: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    restorePurchases: (...args: unknown[]) => mockRestore(...args),
    syncPurchasesForResult: (...args: unknown[]) => mockSyncForResult(...args),
    getCustomerInfo: (...args: unknown[]) => mockGetCustomerInfo(...args),
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
const mockCancelPurchaseIntent = jest.fn();
jest.mock("../../api", () => ({
  createPurchaseIntent: (...args: unknown[]) => mockCreatePurchaseIntent(...args),
  cancelPurchaseIntent: (...args: unknown[]) => mockCancelPurchaseIntent(...args),
}));

jest.mock("../../stores/user", () => ({
  useUserStore: { getState: () => ({ user: { id: "user-1" } }) },
}));

import { Platform } from "react-native";
import { PURCHASES_ERROR_CODE } from "react-native-purchases";
import {
  finishEarlierPurchase,
  purchaseCatalogItem,
  purchaseProductById,
  releaseCheckout,
  storeCheckForCheckout,
} from "../purchases";
import {
  BUY_READY,
  CHECKOUT_HOLD_MS,
  STORE_CLOCK_SLACK_MS,
  __resetPendingForTests,
  buyGateView,
  EARLIER_PURCHASE_BOUND_MS,
  certainNoPayment,
  checkoutFromConflict,
  decideAfterEarlierFinished,
  earlierPurchaseSuspectSince,
  f3RoundVerdict,
  newlyOwnedOthers,
  suspectExplained,
  checkoutStartedNow,
  finishRetryDelayMs,
  gateAfterBuyTap,
  pendingLine,
  splitWaitMessage,
  gateUsesMessageSlot,
  waitMessageCandidates,
  NOTHING_CHARGED_UNTIL_CONFIRM,
  storeHasPurchaseSince,
  type BuyGate,
  type OpenCheckout,
} from "../purchaseSettlement";
import {
  loadAllOpenCheckouts,
  loadOpenCheckout,
  parseOpenCheckouts,
  saveOpenCheckout,
} from "../openCheckout";

const C = PURCHASES_ERROR_CODE;
const storeError = (code: string) => Object.assign(new Error("sdk text"), { code });
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
const flush = () => new Promise((r) => setTimeout(r, 0));
const customerInfo = (txs: unknown[]) => ({ nonSubscriptionTransactions: txs });

beforeEach(async () => {
  __resetPendingForTests();
  await AsyncStorage.clear();
  mockGetProducts.mockReset().mockResolvedValue([
    { identifier: "sw.tier.999", priceString: "₹999", price: 999, currencyCode: "INR" },
  ]);
  mockPurchaseStoreProduct.mockReset().mockResolvedValue(undefined);
  mockGetAppUserID.mockReset().mockResolvedValue("user-1");
  mockCreatePurchaseIntent
    .mockReset()
    .mockResolvedValue({ intentId: "intent-1", tierProductId: "sw.tier.999" });
  mockCancelPurchaseIntent.mockReset().mockResolvedValue(undefined);
  mockRestore.mockReset().mockResolvedValue(customerInfo([]));
  mockSyncForResult.mockReset().mockResolvedValue({ customerInfo: customerInfo([]) });
  mockGetCustomerInfo.mockReset().mockResolvedValue(customerInfo([]));
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Run the rest of a test as if on this platform (restored after each test). */
const onPlatform = (os: "ios" | "android") => jest.replaceProperty(Platform, "OS", os);

describe("the approved words", () => {
  it("F1 waiting: a line under the title and a disabled Please wait…", () => {
    expect(buyGateView({ state: "finishing_earlier" }, "program")).toEqual({
      line: "Your last purchase is still finishing. Please wait a moment.",
      busyLabel: "Please wait…",
      note: null,
    });
  });

  it("F1 finished: the one-time note, per product", () => {
    const gate: BuyGate = { state: "ready", note: "earlier_finished" };
    expect(buyGateView(gate, "program")).toEqual({
      line: null,
      busyLabel: null,
      note: "Your last purchase has finished. Nothing was charged for this program. You can buy it now.",
    });
    expect(buyGateView(gate, "credits").note).toBe(
      "Your last purchase has finished. Nothing was charged for these call credits. You can buy them now.",
    );
  });

  it("F3 checking: a disabled Checking your payment… and no line", () => {
    expect(buyGateView({ state: "checking_payment" }, "program")).toEqual({
      line: null,
      busyLabel: "Checking your payment…",
      note: null,
    });
  });

  it("F3 certain: the one-time note", () => {
    expect(buyGateView({ state: "ready", note: "no_payment" }, "program").note).toBe(
      "No payment went through. Nothing was charged. You can buy it now.",
    );
  });

  it("plain Buy has nothing extra", () => {
    expect(buyGateView(BUY_READY, "program")).toEqual({
      line: null,
      busyLabel: null,
      note: null,
    });
  });

  it("never claims a payment, and keeps house style", () => {
    const gates: BuyGate[] = [
      { state: "finishing_earlier" },
      { state: "checking_payment" },
      { state: "ready", note: "earlier_finished" },
      { state: "ready", note: "no_payment" },
    ];
    for (const gate of gates) {
      for (const product of ["program", "credits"] as const) {
        const v = buyGateView(gate, product);
        for (const text of [v.line, v.busyLabel, v.note]) {
          if (!text) continue;
          expect(text).not.toMatch(/Payment received|Almost there|do not need to pay again/i);
          expect(text).not.toMatch(/—/);
          expect(text).not.toMatch(/\.\.\./);
        }
      }
    }
  });

  it("no pending line claims an earlier payment for an open checkout any more", () => {
    for (const kind of ["after_charge", "store_pending", "unclear"] as const) {
      expect(pendingLine(kind, "program", true)).not.toMatch(/earlier payment/);
    }
  });
});

describe("the message under Buy: bright first sentence, grey rest (founder, 9 Nov 2026)", () => {
  const split = (gate: BuyGate, product: "program" | "credits") => {
    const v = buyGateView(gate, product);
    return splitWaitMessage((v.line ?? v.note) as string);
  };

  it("splits the F1 waiting line", () => {
    expect(split({ state: "finishing_earlier" }, "program")).toEqual({
      lead: "Your last purchase is still finishing.",
      rest: "Please wait a moment.",
    });
  });

  it("splits the F1 note, per product", () => {
    expect(split({ state: "ready", note: "earlier_finished" }, "program")).toEqual({
      lead: "Your last purchase has finished.",
      rest: "Nothing was charged for this program. You can buy it now.",
    });
    expect(split({ state: "ready", note: "earlier_finished" }, "credits")).toEqual({
      lead: "Your last purchase has finished.",
      rest: "Nothing was charged for these call credits. You can buy them now.",
    });
  });

  it("splits the F3 note", () => {
    expect(split({ state: "ready", note: "no_payment" }, "program")).toEqual({
      lead: "No payment went through.",
      rest: "Nothing was charged. You can buy it now.",
    });
  });

  it("F3 checking has no message at all", () => {
    const v = buyGateView({ state: "checking_payment" }, "program");
    expect(v.line ?? v.note).toBeNull();
  });

  it("a one-sentence message has no grey rest", () => {
    expect(splitWaitMessage("Please wait a moment.")).toEqual({
      lead: "Please wait a moment.",
      rest: null,
    });
  });
});

describe("no layout shift: one slot, sized to every message it can show", () => {
  const all: BuyGate[] = [
    { state: "finishing_earlier" },
    { state: "checking_payment" },
    { state: "ready", note: "earlier_finished" },
    { state: "ready", note: "no_payment" },
  ];

  it("lists every message each surface can show", () => {
    for (const product of ["program", "credits"] as const) {
      const candidates = waitMessageCandidates(product);
      const gates = product === "program" ? all : all.filter((g) => !("note" in g && g.note === "no_payment"));
      for (const gate of gates) {
        const v = buyGateView(gate, product);
        const text = v.line ?? v.note;
        if (text) expect(candidates).toContain(text);
      }
    }
    expect(waitMessageCandidates("program")).toHaveLength(3);
    expect(waitMessageCandidates("credits")).toHaveLength(2);
  });

  it("fills the slot with the checkout sheet's own caption in the normal state (L3)", () => {
    expect(NOTHING_CHARGED_UNTIL_CONFIRM).toBe("Nothing is charged until you confirm.");
  });

  it("every wait and note state uses the slot, including F3 checking with no text", () => {
    for (const gate of all) expect(gateUsesMessageSlot(gate)).toBe(true);
    expect(gateUsesMessageSlot(BUY_READY)).toBe(false);
  });
});

describe("the one-time note", () => {
  it("is spent by a tap on Buy", () => {
    expect(gateAfterBuyTap({ state: "ready", note: "earlier_finished" })).toEqual(BUY_READY);
    expect(gateAfterBuyTap({ state: "ready", note: "no_payment" })).toEqual(BUY_READY);
  });

  it("leaves a busy gate and plain Buy alone", () => {
    const busy: BuyGate = { state: "checking_payment" };
    expect(gateAfterBuyTap(busy)).toBe(busy);
    expect(gateAfterBuyTap(BUY_READY)).toBe(BUY_READY);
  });
});

describe("finishRetryDelayMs", () => {
  it("starts at 2 s, doubles, and stops at 30 s", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(finishRetryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
    expect(finishRetryDelayMs(-1)).toBe(2000);
  });
});

describe("F3: certainNoPayment", () => {
  const now = Date.parse("2026-11-08T10:00:00.000Z");
  const started = checkoutStartedNow(
    { userId: "user-1", catalogKey: "calm-mind", intentId: "intent-1", productId: "sw.tier.999" },
    now,
  );
  const base = {
    checkout: started,
    now: started.holdEndsAt,
    owned: false,
    intentReleased: false,
    storeSynced: true,
    storeHasPurchase: false,
  };

  it("is certain once the hold is over and the synced store shows nothing", () => {
    expect(certainNoPayment(base)).toBe(true);
  });

  it("is certain at once when this phone released the checkout", () => {
    expect(certainNoPayment({ ...base, now, intentReleased: true })).toBe(true);
  });

  it("is never certain while the hold may still be on", () => {
    expect(certainNoPayment({ ...base, now: started.holdEndsAt - 1 })).toBe(false);
  });

  it("is never certain without a store sync that answered", () => {
    expect(certainNoPayment({ ...base, storeSynced: false })).toBe(false);
  });

  it("is never certain when the store lists a purchase", () => {
    expect(certainNoPayment({ ...base, storeHasPurchase: true })).toBe(false);
  });

  it("is never certain for an owned program or a known charge", () => {
    expect(certainNoPayment({ ...base, owned: true })).toBe(false);
    expect(
      certainNoPayment({ ...base, checkout: { ...started, charge: "unclear" } }),
    ).toBe(false);
  });

  it("holds a bare 409 for a full hold from now, and looks back a full hold", () => {
    const c = checkoutFromConflict(
      { userId: "user-1", catalogKey: "calm-mind", productId: "sw.tier.999" },
      now,
    );
    expect(c.intentId).toBeNull();
    expect(c.holdEndsAt).toBe(now + CHECKOUT_HOLD_MS + STORE_CLOCK_SLACK_MS);
    expect(c.startedAt).toBe(now - CHECKOUT_HOLD_MS - STORE_CLOCK_SLACK_MS);
    expect(CHECKOUT_HOLD_MS).toBe(15 * 60 * 1000);
  });
});

describe("F3: storeHasPurchaseSince", () => {
  const since = Date.parse("2026-11-08T10:00:00.000Z");
  const tx = (productIdentifier: unknown, purchaseDate: unknown) => ({
    productIdentifier,
    purchaseDate,
  });

  it("finds a purchase of this product since the start (with clock slack)", () => {
    expect(storeHasPurchaseSince([tx("sw.tier.999", "2026-11-08T10:00:30.000Z")], "sw.tier.999", since)).toBe(true);
    expect(storeHasPurchaseSince([tx("sw.tier.999", "2026-11-08T09:59:00.000Z")], "sw.tier.999", since)).toBe(true);
  });

  it("ignores older purchases and other products", () => {
    expect(
      storeHasPurchaseSince(
        [tx("sw.tier.999", "2026-11-08T09:00:00.000Z"), tx("sw.tier.499", "2026-11-08T10:05:00.000Z")],
        "sw.tier.999",
        since,
      ),
    ).toBe(false);
    expect(storeHasPurchaseSince([], "sw.tier.999", since)).toBe(false);
  });

  it("reads anything unreadable as 'maybe', which keeps the wait", () => {
    expect(storeHasPurchaseSince(undefined, "sw.tier.999", since)).toBe(true);
    expect(storeHasPurchaseSince([null], "sw.tier.999", since)).toBe(true);
    expect(storeHasPurchaseSince([tx("sw.tier.999", null)], "sw.tier.999", since)).toBe(true);
    expect(storeHasPurchaseSince([tx(42, "2026-11-08T10:00:00.000Z")], "sw.tier.999", since)).toBe(true);
  });
});

describe("F1 on the money path", () => {
  it("a program checkout refused as already owned is not a payment", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
    expect(await purchaseCatalogItem("calm-mind")).toEqual({
      status: "earlier_purchase_open",
    });
  });

  it("releases this attempt's checkout, so the 15-minute hold does not block Buy", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
    await purchaseCatalogItem("calm-mind");
    await flush();
    expect(mockCancelPurchaseIntent).toHaveBeenCalledWith("intent-1");
    await flush();
    expect(await loadOpenCheckout("user-1", "calm-mind")).toBeNull();
  });

  it("keeps the record, marked no charge, when the release fails", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
    mockCancelPurchaseIntent.mockRejectedValue(new Error("offline"));
    await purchaseCatalogItem("calm-mind");
    for (let i = 0; i < 5; i++) await flush();
    const record = await loadOpenCheckout("user-1", "calm-mind");
    expect(record?.noCharge).toBe(true);
    expect(record?.intentId).toBe("intent-1");
  });

  it("does the same for the credit top-up, also a consumable", async () => {
    mockGetProducts.mockResolvedValue([
      { identifier: "sw.credits.2", priceString: "₹99", price: 99, currencyCode: "INR" },
    ]);
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
    expect(await purchaseProductById("sw.credits.2", { settleAfterCharge: true })).toEqual({
      status: "earlier_purchase_open",
    });
  });

  it("keeps a membership's own answer: it really is owned", async () => {
    mockGetProducts.mockResolvedValue([
      { identifier: "sw.membership.monthly", priceString: "$2.99", price: 2.99, currencyCode: "USD" },
    ]);
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
    expect(await purchaseProductById("sw.membership.monthly")).toEqual({
      status: "error",
      message: "You already own this. Use Restore Purchases to get it back.",
    });
  });

  describe("on Android: restore (it consumes, and never prompts there)", () => {
    beforeEach(() => onPlatform("android"));

    it("finishes the earlier purchase, retrying with a backoff while the screen is open", async () => {
      const fail = new Error("offline");
      mockRestore.mockRejectedValueOnce(fail).mockRejectedValueOnce(fail);
      const waits: number[] = [];
      const done = await finishEarlierPurchase(
        () => true,
        async (ms) => {
          waits.push(ms);
        },
      );
      expect(done).toEqual({ before: [], after: [] });
      expect(waits).toEqual([2000, 4000]);
      expect(mockRestore).toHaveBeenCalledTimes(3);
      expect(mockSyncForResult).not.toHaveBeenCalled();
    });

    it("stops asking once the screen is gone", async () => {
      mockRestore.mockRejectedValue(new Error("offline"));
      let live = true;
      const done = await finishEarlierPurchase(
        () => live,
        async () => {
          live = false;
        },
      );
      expect(done).toBeNull();
    });

    it("reports the store's list from before the finish step and after it", async () => {
      const old = { transactionIdentifier: "t0", productIdentifier: "sw.tier.999", purchaseDate: "2026-11-01T00:00:00.000Z" };
      const fresh = { transactionIdentifier: "t1", productIdentifier: "sw.tier.999", purchaseDate: "2026-11-08T09:00:00.000Z" };
      mockGetCustomerInfo.mockResolvedValueOnce(customerInfo([old]));
      mockRestore.mockResolvedValueOnce(customerInfo([old, fresh]));
      expect(await finishEarlierPurchase(() => true, async () => {})).toEqual({
        before: [old],
        after: [old, fresh],
      });
    });

    it("still finishes when the list before cannot be read", async () => {
      mockGetCustomerInfo.mockRejectedValueOnce(new Error("offline"));
      expect(await finishEarlierPurchase(() => true, async () => {})).toEqual({
        before: null,
        after: [],
      });
    });
  });

  /**
   * iOS: `syncPurchasesForResult` raised Apple's "Sign in to Apple Account"
   * dialog mid-wait (simulator, 9 Nov 2026). Nothing outside the Restore
   * Purchases button may sync or restore on iOS.
   */
  describe("on iOS: no store sync or restore, so no sign-in prompt", () => {
    beforeEach(() => onPlatform("ios"));

    it("finishes at once by reading customer info only", async () => {
      const txs = [{ transactionIdentifier: "t0", productIdentifier: "sw.tier.999", purchaseDate: "2026-11-08T09:00:00.000Z" }];
      mockGetCustomerInfo.mockResolvedValue(customerInfo(txs));
      const waits: number[] = [];
      expect(
        await finishEarlierPurchase(
          () => true,
          async (ms) => {
            waits.push(ms);
          },
        ),
      ).toEqual({ before: txs, after: txs });
      expect(waits).toEqual([]);
      expect(mockSyncForResult).not.toHaveBeenCalled();
      expect(mockRestore).not.toHaveBeenCalled();
    });

    it("finds nothing newly posted, so the decision rests on records and owned programs", async () => {
      const txs = [{ transactionIdentifier: "t0", productIdentifier: "sw.tier.999", purchaseDate: "2026-11-08T09:59:00.000Z" }];
      mockGetCustomerInfo.mockResolvedValue(customerInfo(txs));
      const done = await finishEarlierPurchase(() => true, async () => {});
      expect(
        earlierPurchaseSuspectSince({
          before: done!.before,
          after: done!.after,
          productId: "sw.tier.999",
          attemptStartedAt: Date.parse("2026-11-08T10:00:00.000Z"),
        }),
      ).toBeNull();
    });

    it("the F3 store check reads customer info and never syncs or restores", async () => {
      const startedAt = Date.parse("2026-11-08T10:00:00.000Z");
      mockGetCustomerInfo.mockResolvedValueOnce(
        customerInfo([{ productIdentifier: "sw.tier.999", purchaseDate: "2026-11-08T10:00:05.000Z" }]),
      );
      expect(await storeCheckForCheckout({ productId: "sw.tier.999", startedAt })).toEqual({
        synced: true,
        hasPurchase: true,
      });
      mockGetCustomerInfo.mockRejectedValueOnce(new Error("offline"));
      expect(await storeCheckForCheckout({ productId: "sw.tier.999", startedAt })).toEqual({
        synced: false,
        hasPurchase: true,
      });
      expect(mockSyncForResult).not.toHaveBeenCalled();
      expect(mockRestore).not.toHaveBeenCalled();
    });
  });
});

/**
 * ZERO RISK OF A DOUBLE CHARGE (founder rule). After the finish step Google
 * sells the SKU again. If the earlier open purchase paid for THIS program and
 * its grant is still on the way, note + Buy would charge twice for one program.
 */
describe("F1: the earlier purchase may have been this program", () => {
  const now = Date.parse("2026-11-08T10:00:00.000Z");
  const tx = (id: string, date: string, product = "sw.tier.999") => ({
    transactionIdentifier: id,
    productIdentifier: product,
    purchaseDate: date,
  });
  const ids = { userId: "user-1", catalogKey: "calm-mind", productId: "sw.tier.999", now };
  const priorFor = (overrides: Partial<OpenCheckout> = {}): OpenCheckout => ({
    ...checkoutStartedNow(
      { userId: "user-1", catalogKey: "calm-mind", intentId: "intent-0", productId: "sw.tier.999" },
      now - 5 * 60 * 1000,
    ),
    ...overrides,
  });

  describe("with a record of an earlier checkout of this program", () => {
    it("keeps the earlier record when Google refuses the new attempt", async () => {
      const prior = priorFor();
      await saveOpenCheckout(prior);
      mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
      expect(await purchaseCatalogItem("calm-mind")).toEqual({ status: "earlier_purchase_open" });
      for (let i = 0; i < 5; i++) await flush();
      // This attempt's own checkout is still released.
      expect(mockCancelPurchaseIntent).toHaveBeenCalledWith("intent-1");
      expect(await loadOpenCheckout("user-1", "calm-mind")).toEqual(prior);
    });

    it("drops an earlier record that is known to be no charge", async () => {
      await saveOpenCheckout(priorFor({ noCharge: true }));
      mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PRODUCT_ALREADY_PURCHASED_ERROR));
      await purchaseCatalogItem("calm-mind");
      for (let i = 0; i < 5; i++) await flush();
      expect(await loadOpenCheckout("user-1", "calm-mind")).toBeNull();
    });

    const decide = (over: Partial<Parameters<typeof decideAfterEarlierFinished>[0]>) =>
      decideAfterEarlierFinished({
        ...ids,
        prior: null,
        suspectSince: null,
        otherRecords: [],
        newlyOwnedOthers: [],
        othersOwnedBefore: [],
        ...over,
      });

    it("waits in F3, never the note straight away, even when the store shows nothing new", () => {
      const d = decide({ prior: priorFor() });
      expect(d.kind).toBe("wait");
      if (d.kind !== "wait") return;
      expect(d.checkout.startedAt).toBe(priorFor().startedAt);
      expect(d.checkout.explainableByOthers).toBe(false);
    });

    it("bounds the wait: never longer than 17 minutes, never shorter than the slack", () => {
      // A prior record 5 minutes old: the bound is 17 minutes from its start.
      const d = decide({ prior: priorFor() });
      if (d.kind !== "wait") throw new Error("expected a wait");
      expect(d.checkout.releaseAfter).toBe(priorFor().startedAt + EARLIER_PURCHASE_BOUND_MS);
      expect(d.checkout.releaseAfter! - now).toBeLessThanOrEqual(EARLIER_PURCHASE_BOUND_MS);
      // An hours-old purchase was posted just now: still give its webhook the slack.
      const old = decide({ prior: priorFor(), suspectSince: now - 3 * 60 * 60 * 1000 });
      if (old.kind !== "wait") throw new Error("expected a wait");
      expect(old.checkout.releaseAfter).toBe(now + STORE_CLOCK_SLACK_MS);
      expect(EARLIER_PURCHASE_BOUND_MS).toBe(CHECKOUT_HOLD_MS + STORE_CLOCK_SLACK_MS);
    });

    it("a record of THIS program is not overruled by another program's record", () => {
      const other = priorFor({ catalogKey: "dating" });
      const d = decide({ prior: priorFor(), suspectSince: now - 60_000, otherRecords: [other] });
      expect(d.kind).toBe("wait");
    });

    it("ignores a record known to be no charge, or for another program", () => {
      expect(decide({ prior: priorFor({ noCharge: true }) })).toEqual({ kind: "note" });
      expect(decide({ prior: priorFor({ catalogKey: "other" }) })).toEqual({ kind: "note" });
    });
  });

  describe("with no record at all (fresh install, crash)", () => {
    it("suspects a purchase the finish step just posted, however old", () => {
      const at = "2026-11-07T08:00:00.000Z";
      expect(
        earlierPurchaseSuspectSince({
          before: [tx("t0", "2026-11-01T00:00:00.000Z")],
          after: [tx("t0", "2026-11-01T00:00:00.000Z"), tx("t1", at)],
          productId: "sw.tier.999",
          attemptStartedAt: now,
        }),
      ).toBe(Date.parse(at));
    });

    it("does not suspect purchases that were already posted, or other products", () => {
      expect(
        earlierPurchaseSuspectSince({
          before: [tx("t0", "2026-11-08T09:59:00.000Z")],
          after: [tx("t0", "2026-11-08T09:59:00.000Z"), tx("t2", "2026-11-08T09:59:30.000Z", "sw.tier.499")],
          productId: "sw.tier.999",
          attemptStartedAt: now,
        }),
      ).toBeNull();
    });

    it("without the list from before, suspects this product since the start minus a hold and slack", () => {
      const windowStart = now - CHECKOUT_HOLD_MS - STORE_CLOCK_SLACK_MS;
      const recent = "2026-11-08T09:50:00.000Z";
      expect(
        earlierPurchaseSuspectSince({
          before: null,
          after: [tx("t0", "2026-11-08T08:00:00.000Z"), tx("t1", recent)],
          productId: "sw.tier.999",
          attemptStartedAt: now,
        }),
      ).toBe(Date.parse(recent));
      expect(
        earlierPurchaseSuspectSince({
          before: null,
          after: [tx("t0", "2026-11-08T08:00:00.000Z")],
          productId: "sw.tier.999",
          attemptStartedAt: now,
        }),
      ).toBeNull();
      // Unreadable answers a suspect, never "nothing".
      expect(
        earlierPurchaseSuspectSince({ before: null, after: undefined, productId: "sw.tier.999", attemptStartedAt: now }),
      ).toBe(windowStart);
      expect(
        earlierPurchaseSuspectSince({ before: [], after: [null], productId: "sw.tier.999", attemptStartedAt: now }),
      ).toBe(windowStart);
    });

    it("no record and no suspect: the note is safe", () => {
      expect(
        decideAfterEarlierFinished({
          ...ids,
          prior: null,
          suspectSince: null,
          otherRecords: [],
          newlyOwnedOthers: [],
          othersOwnedBefore: [],
        }),
      ).toEqual({ kind: "note" });
    });
  });
});

describe("F3 on the money path", () => {
  it("writes the open checkout to disk before the store sheet opens", async () => {
    let seenDuringPurchase: OpenCheckout | null = null;
    mockPurchaseStoreProduct.mockImplementation(async () => {
      seenDuringPurchase = await loadOpenCheckout("user-1", "calm-mind");
      throw storeError(C.NETWORK_ERROR);
    });
    await purchaseCatalogItem("calm-mind");
    expect(seenDuringPurchase).toMatchObject({
      intentId: "intent-1",
      productId: "sw.tier.999",
      charge: null,
    });
    // The purchase call came back unclear: the record now says so.
    expect((await loadOpenCheckout("user-1", "calm-mind"))?.charge).toBe("unclear");
  });

  it("clears the record when the sheet was cancelled and the release worked", async () => {
    mockPurchaseStoreProduct.mockRejectedValue(storeError(C.PURCHASE_CANCELLED_ERROR));
    await purchaseCatalogItem("calm-mind");
    for (let i = 0; i < 5; i++) await flush();
    expect(await loadOpenCheckout("user-1", "calm-mind")).toBeNull();
  });

  it("never carries a record over to another account", async () => {
    await saveOpenCheckout(
      checkoutStartedNow(
        { userId: "user-1", catalogKey: "calm-mind", intentId: "i", productId: "sw.tier.999" },
        Date.now(),
      ),
    );
    expect(await loadOpenCheckout("user-2", "calm-mind")).toBeNull();
    expect(await loadOpenCheckout(null, "calm-mind")).toBeNull();
  });

  it("drops unreadable and week-old records", () => {
    const now = Date.now();
    const ok = checkoutStartedNow(
      { userId: "u", catalogKey: "a", intentId: null, productId: "sw.tier.999" },
      now,
    );
    const old = { ...ok, catalogKey: "b", startedAt: now - 8 * 24 * 60 * 60 * 1000 };
    const raw = JSON.stringify({ a: ok, b: old, c: { nope: true } });
    expect(Object.keys(parseOpenCheckouts(raw, now))).toEqual(["a"]);
    expect(parseOpenCheckouts("not json", now)).toEqual({});
    expect(parseOpenCheckouts(null, now)).toEqual({});
  });

  it("reads the release answer: cancelled, gone, paid, or no answer", async () => {
    expect(await releaseCheckout("i")).toBe("released");
    mockCancelPurchaseIntent.mockRejectedValueOnce(httpError(404, { code: "NOT_FOUND" }));
    expect(await releaseCheckout("i")).toBe("released");
    mockCancelPurchaseIntent.mockRejectedValueOnce(httpError(409, { code: "ALREADY_FULFILLED" }));
    expect(await releaseCheckout("i")).toBe("paid");
    mockCancelPurchaseIntent.mockRejectedValueOnce(new Error("offline"));
    expect(await releaseCheckout("i")).toBe("failed");
  });

  it("asks the store (Android), and reads its purchases of this product since the start", async () => {
    onPlatform("android");
    const startedAt = Date.parse("2026-11-08T10:00:00.000Z");
    const paid = customerInfo([
      { productIdentifier: "sw.tier.999", purchaseDate: "2026-11-08T10:00:05.000Z" },
    ]);
    mockRestore.mockResolvedValueOnce(paid);
    expect(await storeCheckForCheckout({ productId: "sw.tier.999", startedAt })).toEqual({
      synced: true,
      hasPurchase: true,
    });
    expect(await storeCheckForCheckout({ productId: "sw.tier.999", startedAt })).toEqual({
      synced: true,
      hasPurchase: false,
    });
    mockRestore.mockRejectedValueOnce(new Error("offline"));
    expect(await storeCheckForCheckout({ productId: "sw.tier.999", startedAt })).toEqual({
      synced: false,
      hasPurchase: true,
    });
  });
});

/**
 * The 7-day lock is not acceptable (real phone, 8 Nov 2026): Dating paid at
 * 22:09 and stayed open, then Understanding Your Voice was tried at 22:14 and
 * Google said "already owned". UYV's page must not lock for that.
 */
describe("F1: explained, bounded, never a long lock", () => {
  const at = (hhmm: string) => Date.parse(`2026-11-08T${hhmm}:00.000Z`);
  const tx = (id: string, date: number) => ({
    transactionIdentifier: id,
    productIdentifier: "sw.tier.999",
    purchaseDate: new Date(date).toISOString(),
  });
  const record = (catalogKey: string, startedAt: number, extra: Partial<OpenCheckout> = {}) => ({
    ...checkoutStartedNow(
      { userId: "user-1", catalogKey, intentId: `intent-${catalogKey}`, productId: "sw.tier.999" },
      startedAt,
    ),
    ...extra,
  });
  const uyv = {
    userId: "user-1",
    catalogKey: "understanding-your-voice",
    productId: "sw.tier.999",
  };
  const round = (checkout: OpenCheckout, over: Partial<Parameters<typeof f3RoundVerdict>[0]> = {}) =>
    f3RoundVerdict({
      checkout,
      now: at("22:15"),
      owned: false,
      intentReleased: false,
      storeSynced: true,
      storeHasPurchase: true,
      newlyOwnedOthers: [],
      ...over,
    });

  it("today's case: Dating's record explains the purchase, so UYV gets the note at once", async () => {
    // Dating's checkout record, written before its store sheet, survives on disk.
    const dating = record("dating", at("22:09"), { charge: "unclear" });
    await saveOpenCheckout(dating);
    const records = await loadAllOpenCheckouts("user-1");
    // The finish step at 22:14 posts the 22:09 purchase, new to the store list.
    const suspectSince = earlierPurchaseSuspectSince({
      before: [],
      after: [tx("gpa.dating", at("22:09") + 20_000)],
      productId: "sw.tier.999",
      attemptStartedAt: at("22:14"),
    });
    expect(suspectSince).toBe(at("22:09") + 20_000);
    expect(
      decideAfterEarlierFinished({
        ...uyv,
        prior: null,
        suspectSince,
        otherRecords: records,
        newlyOwnedOthers: [],
        othersOwnedBefore: [],
        now: at("22:14"),
      }),
    ).toEqual({ kind: "note" });
  });

  it("another program's record explains only a purchase made after it started", () => {
    const dating = record("dating", at("22:09"));
    expect(
      suspectExplained({ suspectSince: at("22:06"), otherRecords: [dating], newlyOwnedOthers: [] }),
    ).toBe(false);
    expect(
      suspectExplained({ suspectSince: at("22:07") + 30_000, otherRecords: [dating], newlyOwnedOthers: [] }),
    ).toBe(true); // within the 2-minute clock slack
    expect(
      suspectExplained({
        suspectSince: at("22:10"),
        otherRecords: [{ ...dating, noCharge: true }],
        newlyOwnedOthers: [],
      }),
    ).toBe(false);
  });

  it("another program newly owned after the finish step explains it: the note", () => {
    const newly = newlyOwnedOthers(["calm-mind"], ["calm-mind", "dating"], uyv.catalogKey);
    expect(newly).toEqual(["dating"]);
    expect(
      decideAfterEarlierFinished({
        ...uyv,
        prior: null,
        suspectSince: at("22:09"),
        otherRecords: [],
        newlyOwnedOthers: newly,
        othersOwnedBefore: ["calm-mind"],
        now: at("22:14"),
      }),
    ).toEqual({ kind: "note" });
  });

  it("newlyOwnedOthers never counts this program, and knows nothing without both lists", () => {
    expect(newlyOwnedOthers([], [uyv.catalogKey], uyv.catalogKey)).toEqual([]);
    expect(newlyOwnedOthers(null, ["dating"], uyv.catalogKey)).toEqual([]);
    expect(newlyOwnedOthers([], null, uyv.catalogKey)).toEqual([]);
  });

  describe("unexplained (fresh install, no records)", () => {
    const suspect = at("22:09");
    const decision = decideAfterEarlierFinished({
      ...uyv,
      prior: null,
      suspectSince: suspect,
      otherRecords: [],
      newlyOwnedOthers: [],
      othersOwnedBefore: ["calm-mind"],
      now: at("22:14"),
    });
    const wait = decision.kind === "wait" ? decision.checkout : (null as never);

    it("waits in F3 first, bounded at 17 minutes from the purchase", () => {
      expect(decision.kind).toBe("wait");
      expect(wait.releaseAfter).toBe(suspect + EARLIER_PURCHASE_BOUND_MS);
      expect(wait.explainableByOthers).toBe(true);
      expect(wait.othersOwnedBefore).toEqual(["calm-mind"]);
    });

    it("keeps checking before the bound", () => {
      expect(round(wait, { now: wait.releaseAfter! - 1 })).toBe("keep_checking");
    });

    it("gives the note once the bound passed with this program not owned", () => {
      expect(round(wait, { now: wait.releaseAfter! })).toBe("note_earlier_finished");
    });

    it("needs a store sync that succeeded to end at the bound (nothing left open)", () => {
      expect(round(wait, { now: wait.releaseAfter!, storeSynced: false })).toBe("keep_checking");
    });

    it("ends early with the note when another program becomes owned meanwhile", () => {
      expect(round(wait, { now: at("22:16"), newlyOwnedOthers: ["dating"] })).toBe(
        "note_earlier_finished",
      );
    });

    it("the grant of THIS program wins at any point: You're in", () => {
      expect(round(wait, { owned: true, now: at("22:16") })).toBe("owned");
      expect(round(wait, { owned: true, now: wait.releaseAfter! + 1 })).toBe("owned");
    });
  });

  describe("the restored record of THIS program", () => {
    const prior = record(uyv.catalogKey, at("22:05"));
    const decision = decideAfterEarlierFinished({
      ...uyv,
      prior,
      suspectSince: at("22:05") + 30_000,
      otherRecords: [record("dating", at("22:00"))],
      newlyOwnedOthers: ["dating"],
      othersOwnedBefore: [],
      now: at("22:14"),
    });
    const wait = decision.kind === "wait" ? decision.checkout : (null as never);

    it("waits, even if another program could explain it", () => {
      expect(decision.kind).toBe("wait");
      expect(wait.explainableByOthers).toBe(false);
    });

    it("another program becoming owned does not end this wait", () => {
      expect(round(wait, { now: at("22:16"), newlyOwnedOthers: ["dating"] })).toBe("keep_checking");
    });

    it("the same program's grant arriving is You're in", () => {
      expect(round(wait, { owned: true })).toBe("owned");
    });

    it("past the bound, with the purchase posted and no grant, the note", () => {
      expect(wait.releaseAfter).toBe(at("22:05") + 30_000 + EARLIER_PURCHASE_BOUND_MS);
      expect(round(wait, { now: wait.releaseAfter! })).toBe("note_earlier_finished");
      expect(round(wait, { now: wait.releaseAfter!, storeSynced: false })).toBe("keep_checking");
    });
  });

  describe("this program's record known to be PAID (founder, 9 Nov 2026)", () => {
    const decideWith = (charge: OpenCheckout["charge"]) =>
      decideAfterEarlierFinished({
        ...uyv,
        prior: record(uyv.catalogKey, at("22:05"), { charge }),
        suspectSince: at("22:05") + 30_000,
        otherRecords: [record("dating", at("22:00"))],
        newlyOwnedOthers: ["dating"],
        othersOwnedBefore: [],
        now: at("22:14"),
      });

    it("goes to the Payment received pending screen, never the note or a bounded wait", () => {
      expect(decideWith("after_charge")).toEqual({ kind: "paid", pendingKind: "after_charge" });
      expect(decideWith("store_pending")).toEqual({ kind: "paid", pendingKind: "store_pending" });
    });

    it("never releases to Buy, even long past the bound", () => {
      const paid = {
        ...record(uyv.catalogKey, at("22:05"), { charge: "after_charge" as const }),
        releaseAfter: at("22:22"),
        explainableByOthers: true,
      };
      for (const now of [at("22:22"), at("23:59")]) {
        expect(round(paid, { now })).toBe("keep_checking");
        expect(round(paid, { now, newlyOwnedOthers: ["dating"] })).toBe("keep_checking");
      }
      expect(round(paid, { owned: true })).toBe("owned");
    });

    it("an unclear record is not known paid: it stays bounded", () => {
      const d = decideWith("unclear");
      expect(d.kind).toBe("wait");
      if (d.kind !== "wait") return;
      expect(round(d.checkout, { now: d.checkout.releaseAfter! })).toBe("note_earlier_finished");
    });
  });

  it("an ordinary F3 checkout still ends only by certainNoPayment", () => {
    const c = record(uyv.catalogKey, at("22:00"));
    expect(round(c, { now: c.holdEndsAt, storeHasPurchase: false })).toBe("note_no_payment");
    expect(round(c, { now: c.holdEndsAt + 60 * 60 * 1000, storeHasPurchase: true })).toBe(
      "keep_checking",
    );
    expect(round(c, { newlyOwnedOthers: ["dating"] })).toBe("keep_checking");
  });
});
