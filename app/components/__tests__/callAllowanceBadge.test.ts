import { describeAllowance } from "../../util/functions/callAllowance";
import type { Wallet } from "../../api/users";

/**
 * ============================================================================
 * THE BADGE MUST NEVER SEND SOMEBODY TO A LOCKED DOOR
 * ----------------------------------------------------------------------------
 * This is the one string on the Exposure screen that makes a promise the next
 * screen has to keep. "Free call ready" over a screen that refuses to dial, or
 * "Ready tomorrow" when it is actually two days, is worse than showing nothing
 * at all — which is why the fall-through here is always `null`.
 * ============================================================================
 */

const NOW = new Date("2026-07-20T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const inHours = (h: number) => new Date(NOW.getTime() + h * HOUR).toISOString();

const wallet = (w: Partial<Wallet>): Wallet => ({
  balance: 0,
  entitlements: [],
  founderCohort: false,
  ...w,
});

describe("what the call badge says", () => {
  it("says nothing at all before the wallet has loaded", () => {
    // A card with no badge is honest. A card that flashes "0 left" while the
    // request is in flight is not.
    expect(describeAllowance(null, NOW)).toBeNull();
  });

  it("says nothing when the server has not sent the free-call fields", () => {
    // An older backend, or a failed field. Guessing "no calls" here would tell
    // somebody with a free call waiting that they have none.
    expect(describeAllowance(wallet({}), NOW)).toBeNull();
  });

  it("announces a free call when one is waiting", () => {
    expect(
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
    ).toBe("Free call ready");
  });

  it("counts bought credits ahead of the weekly call", () => {
    // Somebody holding three credits must never be told to come back on
    // Thursday — the free call is the FLOOR, not the ceiling.
    expect(
      describeAllowance(
        wallet({ balance: 3, freeCallAvailable: false, nextFreeCallAt: inHours(72) }),
        NOW,
      ),
    ).toBe("3 calls left");
  });

  it("gets the singular right", () => {
    expect(describeAllowance(wallet({ balance: 1 }), NOW)).toBe("1 call left");
  });

  it("counts down in days once the call is spent", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(72) }),
        NOW,
      ),
    ).toBe("Ready in 3 days");
  });

  it("ROUNDS UP, so it never promises the call early", () => {
    // 3.2 days out. Rounding down would say "3 days", and somebody would open
    // the app on day three to a locked door — the exact dead end this replaces.
    // Rounding up is safe in the only direction that matters: they arrive and
    // it is already waiting.
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(77) }),
        NOW,
      ),
    ).toBe("Ready in 4 days");
  });

  it("says tomorrow rather than 'in 1 days'", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(5) }),
        NOW,
      ),
    ).toBe("Ready tomorrow");
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(23) }),
        NOW,
      ),
    ).toBe("Ready tomorrow");
  });

  it("treats a countdown that has already elapsed as ready", () => {
    // The wallet is a snapshot; a screen left open past the unlock instant
    // must not keep telling somebody to wait for a call they can now make.
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(-1) }),
        NOW,
      ),
    ).toBe("Free call ready");
  });

  it("says nothing rather than NaN when the date is unparseable", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: "not-a-date" }),
        NOW,
      ),
    ).toBeNull();
  });

  it("never counts past the seven-day window", () => {
    // Sweeps the whole range the server can produce. Anything that renders
    // "Ready in 9 days" is either a bad timestamp or bad arithmetic, and both
    // reach the user as a lie about when they can practise again.
    for (let h = 1; h <= 7 * 24; h++) {
      const label = describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(h) }),
        NOW,
      );
      expect(label).not.toBeNull();
      const days = Number(/Ready in (\d+) days/.exec(label!)?.[1] ?? 1);
      expect(days).toBeLessThanOrEqual(7);
      expect(days).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps every label short enough for the card footer", () => {
    // It sits opposite the Start chip on a fixed-height card; a long string
    // wraps under it and breaks the row.
    const labels = [
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
      describeAllowance(wallet({ balance: 12 }), NOW),
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(7 * 24) }),
        NOW,
      ),
    ];
    for (const l of labels) expect(l!.length).toBeLessThanOrEqual(16);
  });
});
