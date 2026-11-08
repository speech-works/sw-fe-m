/**
 * ===========================================================================
 * "CHECK AGAIN" HAS TO ACTUALLY CHECK
 * ---------------------------------------------------------------------------
 * When a purchase succeeds and the RevenueCat webhook does not arrive, the
 * money is gone and the pack, membership or credits are not there. The app's
 * whole answer to that is one button: "Check again", on the ProgramDetail
 * pending screen and in the exhaustion sheet.
 *
 * It could not work. Both buttons ran `pollWalletUntil`, which reads GET
 * /users/me/wallet, and the only thing on that endpoint that can repair a
 * missed webhook is `maybeReconcile`: throttled to one pass per user per ten
 * minutes, and it stamps its window BEFORE doing the work
 * (sw-be-2/src/services/revenuecatReconciliation.service.ts:89-98). Every
 * ordinary wallet read spends that window, including the one the exhaustion
 * sheet itself makes as it opens, seconds before the purchase. So the tap
 * re-read the ledger we already knew the grant was missing from, twenty times,
 * and said "still confirming". Tapping it all day asked the store nothing.
 *
 * POST /users/me/wallet/reconcile is the door with no throttle behind it. These
 * tests are about one promise: an explicit tap goes through that door, and
 * nothing short of the app being uninstalled stops it from trying.
 * ===========================================================================
 */
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getProducts: jest.fn(),
    purchaseStoreProduct: jest.fn(),
    getAppUserID: jest.fn(),
    logIn: jest.fn(),
    restorePurchases: jest.fn(),
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

const mockGetWallet = jest.fn();
const mockReconcileWallet = jest.fn();
const mockCreatePurchaseIntent = jest.fn();
const mockGetMyUser = jest.fn();

jest.mock("../../api", () => ({
  getWallet: (...args: unknown[]) => mockGetWallet(...args),
  reconcileWallet: (...args: unknown[]) => mockReconcileWallet(...args),
  createPurchaseIntent: (...args: unknown[]) => mockCreatePurchaseIntent(...args),
  getMyUser: (...args: unknown[]) => mockGetMyUser(...args),
}));

jest.mock("../../stores/user", () => ({
  useUserStore: {
    getState: () => ({ user: { id: "user-1" } }),
  },
}));

import { readFileSync } from "fs";
import { join } from "path";
import {
  confirmMembershipGrant,
  confirmWalletGrant,
  pollMembershipUntil,
  pollWalletUntil,
  recheckMembershipUntil,
  recheckWalletUntil,
} from "../purchases";
import { purchaseConfirmed } from "../../util/functions/paywallView";
import {
  __resetPendingForTests,
  productAttemptKey,
  programAttemptKey,
  rememberAttempt,
} from "../purchaseSettlement";

/** An axios-shaped rejection, which is what the api layer re-throws. */
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

const OWNED = { balance: 2, entitlements: ["pack:calm-mind"] };
const NOT_OWNED = { balance: 0, entitlements: [] };

/** The question both buttons ask: did the thing they paid for arrive? */
const arrived = (w: { entitlements: string[] }) =>
  w.entitlements.includes("pack:calm-mind");

/**
 * A 30ms budget with a 1ms gap, on FAKE time. These used to run on real
 * timers, and a busy CI machine could spend the whole 30ms on the first read,
 * so "keeps waiting through free days" failed now and then with fewer than
 * three reads. On fake timers the clock only moves when `settled` moves it, so
 * every test makes the same reads in the same order on every run.
 */
const FAST = { timeoutMs: 30, intervalMs: 1 };

/**
 * Run a poll to its end on fake time. `runAllTimersAsync` lets the awaited
 * reads resolve between ticks and stops once the poll sets no new timer,
 * which is when it returned or its deadline passed.
 */
const settled = async <T,>(poll: Promise<T>): Promise<T> => {
  await jest.runAllTimersAsync();
  return poll;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockGetWallet.mockReset();
  mockReconcileWallet.mockReset();
  mockGetMyUser.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

describe("an explicit recheck asks the store", () => {
  it("goes through the forced route, not the throttled wallet read", async () => {
    mockReconcileWallet.mockResolvedValue({ ...OWNED, reconciled: true });

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual({
      ...OWNED,
      reconciled: true,
    });
    // The entire bug in one pair of assertions. GET /users/me/wallet cannot
    // repair anything once the ten-minute window is spent, and it always is by
    // the time somebody is standing on the pending screen.
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  /**
   * The forced route reaches RevenueCat's REST API on our behalf. Twenty calls
   * in thirty seconds is how a real rate limit gets earned, and the backend's
   * own five second minimum interval would refuse most of them anyway. One ask
   * per tap, then the cheap poll.
   */
  it("asks the store once, not once per poll", async () => {
    mockReconcileWallet.mockResolvedValue({ ...NOT_OWNED, reconciled: true });
    mockGetWallet.mockResolvedValue(NOT_OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toBeNull();

    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
    expect(mockGetWallet.mock.calls.length).toBeGreaterThan(1);
  });

  /**
   * A grant that lands by webhook a second after the store was asked still has
   * to be found. RevenueCat's REST view is eventually consistent too, so a
   * purchase made moments ago can be genuinely absent from the forced pass and
   * present in our ledger shortly after.
   */
  it("keeps looking after the store's answer comes back empty", async () => {
    mockReconcileWallet.mockResolvedValue({ ...NOT_OWNED, reconciled: true });
    mockGetWallet
      .mockResolvedValueOnce(NOT_OWNED)
      .mockResolvedValue(OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual(OWNED);
  });
});

describe("nothing short of uninstalling stops the recheck trying", () => {
  /**
   * Two taps a few seconds apart is what a worried person does, and the backend
   * answers the second one 429 (RECONCILE_MIN_INTERVAL_MS, five seconds). That
   * is not a failure: a forced pass ran seconds ago, so the store HAS been asked
   * and the poll below reads what it produced. The button has nothing to gain
   * from telling somebody they tapped too fast.
   */
  it("reads the result anyway when the force route is cooling down", async () => {
    mockReconcileWallet.mockRejectedValue(
      httpError(429, { retryAfterSeconds: 4 }),
    );
    mockGetWallet.mockResolvedValue(OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual(OWNED);
  });

  it("does not turn a RevenueCat outage into a dead button", async () => {
    mockReconcileWallet.mockRejectedValue(httpError(500));
    mockGetWallet.mockResolvedValue(OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual(OWNED);
  });

  /**
   * No `response` at all: offline, DNS, a timeout. `httpStatus` answers
   * undefined, `forceReconcile` re-throws, and the throw must be absorbed here
   * rather than reaching the screen as an error sheet over a purchase that is
   * fine.
   */
  it("survives a request that never reached a server", async () => {
    mockReconcileWallet.mockRejectedValue(new Error("Network Error"));
    mockGetWallet.mockResolvedValue(OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual(OWNED);
  });

  /**
   * The app ships to the stores independently of the backend deploy, so a build
   * with this code can reach a backend that predates the force route. It has to
   * degrade to exactly the behaviour it had before, not report a failure.
   */
  it("falls back to the lazy route on a backend that has no forced one", async () => {
    mockReconcileWallet.mockRejectedValue(httpError(404));
    mockGetWallet.mockResolvedValue(OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toEqual(OWNED);
    // Answered by forceReconcile's own fallback, so the predicate passed before
    // the poll was ever entered.
    expect(mockGetWallet).toHaveBeenCalledTimes(1);
  });

  it("says null rather than claiming a grant that never landed", async () => {
    mockReconcileWallet.mockRejectedValue(httpError(500));
    mockGetWallet.mockResolvedValue(NOT_OWNED);

    expect(await settled(recheckWalletUntil(arrived, FAST))).toBeNull();
  });
});

/**
 * The split is deliberate and worth pinning: the automatic check that runs the
 * instant a purchase completes stays on the cheap door. The webhook is what it
 * is waiting for, it usually arrives inside the poll, and every screen mount
 * forcing a RevenueCat call is the thing the ten-minute throttle exists to
 * prevent. Only a human asking earns the forced pass.
 */
describe("the automatic post-purchase check stays cheap", () => {
  it("never posts to the forced route", async () => {
    mockGetWallet.mockResolvedValue(OWNED);

    expect(await settled(pollWalletUntil(arrived, FAST))).toEqual(OWNED);
    expect(mockReconcileWallet).not.toHaveBeenCalled();
  });
});

/**
 * ---------------------------------------------------------------------------
 * A MEMBERSHIP PURCHASE WAITS FOR THE PLAN, NOT THE ENTITLEMENT
 *
 * Somebody on a pack's free days already holds the wallet's "membership"
 * entitlement. The paywall used to wait for that entitlement after a purchase,
 * so the wait passed on its first read and said "You're in" before the server
 * had seen the purchase at all.
 * ---------------------------------------------------------------------------
 */
describe("after a membership purchase, the wait reads the user's plan", () => {
  const onFreeDays = {
    id: "user-1",
    membership: { active: true, until: "x", daysRemaining: 9, plan: null, source: "pack_bonus" },
  };
  const onAnnual = {
    id: "user-1",
    membership: { active: true, until: "y", daysRemaining: 365, plan: "annual", source: "purchase" },
  };

  it("keeps waiting through free days, and ends on the plan", async () => {
    mockGetMyUser
      .mockResolvedValueOnce(onFreeDays)
      .mockResolvedValueOnce(onFreeDays)
      .mockResolvedValue(onAnnual);

    const user = await settled(pollMembershipUntil((m) => purchaseConfirmed(m, "annual"), FAST));
    expect(user).toEqual(onAnnual);
    expect(mockGetMyUser).toHaveBeenCalledTimes(3);
    // Never the wallet: that is the read that ended the wait too early.
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  it("returns null when the plan never arrives", async () => {
    mockGetMyUser.mockResolvedValue(onFreeDays);
    expect(
      await settled(pollMembershipUntil((m) => purchaseConfirmed(m, "monthly"), FAST)),
    ).toBeNull();
  });

  it("a failed read is not the end of the wait", async () => {
    mockGetMyUser.mockRejectedValueOnce(httpError(500)).mockResolvedValue(onAnnual);
    expect(
      await settled(pollMembershipUntil((m) => purchaseConfirmed(m, "annual"), FAST)),
    ).toEqual(onAnnual);
  });

  it("an explicit membership recheck asks the store once, then reads the plan", async () => {
    mockReconcileWallet.mockResolvedValue({ ...NOT_OWNED, reconciled: true });
    mockGetMyUser.mockResolvedValueOnce(onFreeDays).mockResolvedValue(onAnnual);
    const user = await settled(
      recheckMembershipUntil((m) => purchaseConfirmed(m, "annual"), FAST),
    );
    expect(user).toEqual(onAnnual);
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
  });

  it("a failed forced pass does not stop the membership recheck", async () => {
    mockReconcileWallet.mockRejectedValue(httpError(500));
    mockGetMyUser.mockResolvedValue(onAnnual);
    expect(
      await settled(recheckMembershipUntil((m) => purchaseConfirmed(m, "annual"), FAST)),
    ).toEqual(onAnnual);
  });

  it("the exhaustion sheet confirms membership on the plan, not the entitlement", () => {
    const src = prose("app/components/ExhaustionSheet.tsx");
    expect(src).not.toContain('entitlements.includes("membership")');
    expect(src).toContain("confirmMembershipGrant");
    expect(src).toContain('purchaseConfirmed(m, "monthly")');
  });

  it("the paywall no longer waits on the wallet's membership entitlement", () => {
    const src = prose("app/screens/Payments/index.tsx");
    expect(src).not.toContain('entitlements.includes("membership")');
    expect(src).toContain("pollMembershipUntil");
  });
});

/**
 * ---------------------------------------------------------------------------
 * THE TWO BUTTONS THEMSELVES
 *
 * `confirmPurchase` is shared by the automatic check and the tap in both files,
 * so the tap is only forced while it passes the flag. Dropping the flag would
 * silently restore the original bug: same button, same spinner, same sentence,
 * and the store never asked again. Nothing else in either file would fail, so
 * it is asserted from the source.
 * ---------------------------------------------------------------------------
 */
const RECHECK_SURFACES = [
  "app/screens/Programs/ProgramDetail.tsx",
  "app/components/ExhaustionSheet.tsx",
];

const repoRoot = join(__dirname, "..", "..", "..");

/** Source with comments stripped, so a note ABOUT the flag is not a hit. */
const prose = (file: string): string =>
  readFileSync(join(repoRoot, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The confirm call the "Check again" handler actually makes. */
const rechecksWith = (file: string): string => {
  const src = prose(file);
  const handler = src.indexOf("const recheckPurchase");
  expect(handler).toBeGreaterThan(-1);
  const call = src.indexOf("confirmPurchase(", handler);
  expect(call).toBeGreaterThan(-1);
  return src.slice(call, call + 120);
};

describe("both 'Check again' buttons force the pass", () => {
  it.each(RECHECK_SURFACES)("%s tells the store it is a user asking", (file) => {
    expect(rechecksWith(file)).toContain("userInitiated: true");
  });

  // Both surfaces go through confirmWalletGrant, which sends a tap with
  // `userInitiated` to recheckWalletUntil (pinned in the tests above and below).
  it.each(RECHECK_SURFACES)("%s can reach the forced route at all", (file) => {
    expect(prose(file)).toMatch(/confirmWalletGrant\(landed, \{\s*userInitiated,/);
  });
});

/**
 * ---------------------------------------------------------------------------
 * PAID ON THE OTHER ACCOUNT
 *
 * The forced reconcile lists `foreignPurchaseItems`: store purchases another
 * Speechworks account paid for. A pending purchase ends as "other_account"
 * only when an item is of THIS attempt's product and bought since it started.
 * ---------------------------------------------------------------------------
 */
const TIER = "sw.tier.999";
const ATTEMPT_KEY = programAttemptKey("calm-mind");
const recentItem = () => ({
  productId: TIER,
  purchasedAt: new Date(Date.now()).toISOString(),
});
const reconciled = (items?: unknown, wallet: object = NOT_OWNED) => ({
  ...wallet,
  reconciled: true,
  foreignPurchases: items !== undefined,
  ...(items !== undefined ? { foreignPurchaseItems: items } : {}),
});

describe("a pending purchase meets the server's foreign items", () => {
  beforeEach(() => {
    __resetPendingForTests();
    rememberAttempt(ATTEMPT_KEY, { productId: TIER, startedAt: Date.now() });
  });

  it("same product, bought just now: the tap ends as the other account's", async () => {
    mockReconcileWallet.mockResolvedValue(reconciled([recentItem()]));
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBe("other_account");
  });

  it("same product, bought long ago: still a wait", async () => {
    mockReconcileWallet.mockResolvedValue(
      reconciled([{ productId: TIER, purchasedAt: "2026-01-01T00:00:00.000Z" }]),
    );
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBeNull();
  });

  it("a different product: still a wait", async () => {
    mockReconcileWallet.mockResolvedValue(
      reconciled([{ productId: "sw.credits.2", purchasedAt: new Date().toISOString() }]),
    );
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBeNull();
  });

  it("an older server (foreignPurchases true, no items): still a wait", async () => {
    mockReconcileWallet.mockResolvedValue({
      ...NOT_OWNED,
      reconciled: true,
      foreignPurchases: true,
    });
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBeNull();
  });

  it("no attempt key: never the notice", async () => {
    mockReconcileWallet.mockResolvedValue(reconciled([recentItem()]));
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(await settled(recheckWalletUntil(arrived, FAST))).toBeNull();
  });

  it("a grant that lands wins over a matching foreign item", async () => {
    mockReconcileWallet.mockResolvedValue(reconciled([recentItem()]));
    mockGetWallet.mockResolvedValueOnce(NOT_OWNED).mockResolvedValue(OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toEqual(OWNED);
  });

  it("a failed forced pass never claims the other account", async () => {
    mockReconcileWallet.mockRejectedValue(httpError(500));
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    expect(
      await settled(recheckWalletUntil(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBeNull();
  });

  it("the membership recheck matches its own product", async () => {
    const key = productAttemptKey("sw.membership.annual");
    rememberAttempt(key, { productId: "sw.membership.annual", startedAt: Date.now() });
    mockReconcileWallet.mockResolvedValue(
      reconciled([
        { productId: "sw.membership.annual", purchasedAt: new Date().toISOString() },
      ]),
    );
    mockGetMyUser.mockResolvedValue({ id: "user-1", membership: null });
    expect(
      await settled(
        recheckMembershipUntil((m) => purchaseConfirmed(m, "annual"), {
          ...FAST,
          attemptKey: key,
        }),
      ),
    ).toBe("other_account");
  });
});

describe("confirmWalletGrant: the one check every surface runs", () => {
  beforeEach(() => {
    __resetPendingForTests();
    rememberAttempt(ATTEMPT_KEY, { productId: TIER, startedAt: Date.now() });
  });

  it("a tap goes straight to the forced route", async () => {
    mockReconcileWallet.mockResolvedValue({ ...OWNED, reconciled: true });
    expect(
      await settled(confirmWalletGrant(arrived, { userInitiated: true, ...FAST })),
    ).toEqual({ ...OWNED, reconciled: true });
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  it("the automatic wait stays cheap when the grant lands", async () => {
    mockGetWallet.mockResolvedValue(OWNED);
    expect(await settled(confirmWalletGrant(arrived, FAST))).toEqual(OWNED);
    expect(mockReconcileWallet).not.toHaveBeenCalled();
  });

  it("asks the store once when the automatic wait runs out, and matches the attempt", async () => {
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    mockReconcileWallet.mockResolvedValue(reconciled([recentItem()]));
    expect(
      await settled(confirmWalletGrant(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBe("other_account");
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
  });

  it("without a match the timed-out wait is still a wait", async () => {
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    mockReconcileWallet.mockResolvedValue({ ...NOT_OWNED, reconciled: true });
    expect(
      await settled(confirmWalletGrant(arrived, { ...FAST, attemptKey: ATTEMPT_KEY })),
    ).toBeNull();
    expect(mockReconcileWallet).toHaveBeenCalledTimes(1);
  });

  it("the one forced ask can still find a repaired grant", async () => {
    mockGetWallet.mockResolvedValue(NOT_OWNED);
    mockReconcileWallet.mockResolvedValue(reconciled([recentItem()], OWNED));
    const result = await settled(
      confirmWalletGrant(arrived, { ...FAST, attemptKey: ATTEMPT_KEY }),
    );
    expect(result).toMatchObject(OWNED);
  });
});

describe("confirmMembershipGrant", () => {
  const key = productAttemptKey("sw.membership.annual");
  const onAnnual = {
    id: "user-1",
    membership: { active: true, until: "y", daysRemaining: 365, plan: "annual", source: "purchase" },
  };
  const annualNow = () =>
    reconciled([{ productId: "sw.membership.annual", purchasedAt: new Date().toISOString() }]);

  beforeEach(() => {
    __resetPendingForTests();
    rememberAttempt(key, { productId: "sw.membership.annual", startedAt: Date.now() });
  });

  it("reads the plan once more after the forced ask, so a repaired plan is found", async () => {
    mockGetMyUser.mockResolvedValue({ id: "user-1", membership: null });
    mockReconcileWallet.mockImplementation(async () => {
      mockGetMyUser.mockResolvedValue(onAnnual);
      return annualNow();
    });
    expect(
      await settled(
        confirmMembershipGrant((m) => purchaseConfirmed(m, "annual"), { ...FAST, attemptKey: key }),
      ),
    ).toEqual(onAnnual);
  });

  it("ends as the other account's when the plan never came", async () => {
    mockGetMyUser.mockResolvedValue({ id: "user-1", membership: null });
    mockReconcileWallet.mockResolvedValue(annualNow());
    expect(
      await settled(
        confirmMembershipGrant((m) => purchaseConfirmed(m, "annual"), { ...FAST, attemptKey: key }),
      ),
    ).toBe("other_account");
  });
});
