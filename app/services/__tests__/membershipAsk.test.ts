import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ASK_INTERVAL_MS,
  canAskForMembership,
  recordMembershipAsk,
  resetMembershipAsks,
} from "../membershipAsk";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const store = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

/**
 * ===========================================================================
 * ONE ASK A WEEK, FROM ANYWHERE
 * ---------------------------------------------------------------------------
 * We are about to ask in more places than we do now: after a good session, on
 * day 28, beside a locked technique. Every one is a better moment than the
 * current one. But more places without a shared limit is nagging, and somebody
 * who has refused three times this week has stopped reading the sheet.
 * ===========================================================================
 */
describe("How often we may ask", () => {
  const AT = (iso: string) => new Date(iso);

  beforeEach(() => jest.resetAllMocks());

  it("always allows the very first ask", async () => {
    store.getItem.mockResolvedValue(null);
    await expect(canAskForMembership()).resolves.toBe(true);
  });

  it("refuses inside the week and allows once it has passed", async () => {
    const shown = AT("2026-09-01T10:00:00Z");
    store.getItem.mockResolvedValue(String(shown.getTime()));

    const oneSecondEarly = new Date(shown.getTime() + ASK_INTERVAL_MS - 1000);
    const bangOn = new Date(shown.getTime() + ASK_INTERVAL_MS);

    await expect(canAskForMembership(oneSecondEarly)).resolves.toBe(false);
    await expect(canAskForMembership(bangOn)).resolves.toBe(true);
  });

  it("records the moment it was shown", async () => {
    const now = AT("2026-09-01T10:00:00Z");
    await recordMembershipAsk(now);
    expect(store.setItem).toHaveBeenCalledWith(
      expect.any(String),
      String(now.getTime()),
    );
  });

  /**
   * The direction of these two failures is the whole point. A broken read that
   * returned TRUE would ask on every screen, which is exactly what the limit
   * exists to prevent. Quiet is the safe direction.
   */
  it("stays quiet when storage is broken, rather than asking every time", async () => {
    store.getItem.mockRejectedValue(new Error("disk gone"));
    await expect(canAskForMembership()).resolves.toBe(false);
  });

  it("treats a corrupt value as just-asked, not as never-asked", async () => {
    store.getItem.mockResolvedValue("not a number");
    await expect(canAskForMembership()).resolves.toBe(false);
  });

  /** A failed write must never break the screen that was rendering the offer. */
  it("never throws when it cannot record", async () => {
    store.setItem.mockRejectedValue(new Error("disk gone"));
    await expect(recordMembershipAsk()).resolves.toBeUndefined();
  });

  it("clears on request, for sign-out on a shared device", async () => {
    await resetMembershipAsks();
    expect(store.removeItem).toHaveBeenCalled();
  });

  it("is a week, not a day", () => {
    expect(ASK_INTERVAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
