import { describeAllowance } from "../callAllowance";
import type { Wallet } from "../../../api/users";

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

  it("badges the card when a free call is waiting", () => {
    expect(
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
    ).toEqual({ badge: "FREE CALL", subtitle: null });
  });

  it("counts bought credits ahead of the weekly call", () => {
    // Somebody holding three credits must never be told to come back on
    // Thursday — the free call is the FLOOR, not the ceiling.
    expect(
      describeAllowance(
        wallet({ balance: 3, freeCallAvailable: false, nextFreeCallAt: inHours(72) }),
        NOW,
      ),
    ).toEqual({ badge: "3 CALLS", subtitle: null });
  });

  it("gets the singular right", () => {
    expect(describeAllowance(wallet({ balance: 1 }), NOW)).toEqual({ badge: "1 CALL", subtitle: null });
  });

  it("counts down in days once the call is spent", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(72) }),
        NOW,
      ),
    ).toEqual({ badge: null, subtitle: "Next free call in 3 days" });
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
    ).toEqual({ badge: null, subtitle: "Next free call in 4 days" });
  });

  it("says tomorrow rather than 'in 1 days'", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(5) }),
        NOW,
      ),
    ).toEqual({ badge: null, subtitle: "Next free call tomorrow" });
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(23) }),
        NOW,
      ),
    ).toEqual({ badge: null, subtitle: "Next free call tomorrow" });
  });

  it("treats a countdown that has already elapsed as ready", () => {
    // The wallet is a snapshot; a screen left open past the unlock instant
    // must not keep telling somebody to wait for a call they can now make.
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(-1) }),
        NOW,
      ),
    ).toEqual({ badge: "FREE CALL", subtitle: null });
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
      const days = Number(/in (\d+) days/.exec(label!.subtitle ?? "")?.[1] ?? 1);
      expect(days).toBeLessThanOrEqual(7);
      expect(days).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps every badge short enough for the corner pill", () => {
    // It is the corner pill the cognitive cards use for "FREE"; anything much
    // longer than "TOP MATCH" overhangs the card edge and wraps.
    const badges = [
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
      describeAllowance(wallet({ balance: 12 }), NOW),
    ];
    for (const b of badges) expect(b!.badge!.length).toBeLessThanOrEqual(12);
  });

  it("badges only good news, and never both at once", () => {
    // The pill is a POSITIVE claim — the same role "FREE" plays on the
    // cognitive cards. The spent state has no pill at all: a muted one
    // disappeared against the dark canvas it overhangs, and an invisible badge
    // is worse than an absent one. The two slots are mutually exclusive, so a
    // card can never show a green "available" pill over a waiting subtitle.
    const cases = [
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
      describeAllowance(wallet({ balance: 2 }), NOW),
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(50) }),
        NOW,
      ),
    ];
    for (const c of cases) {
      expect(Boolean(c!.badge) !== Boolean(c!.subtitle)).toBe(true);
    }
  });

  it("spells the wait out, because a bare countdown does not say what for", () => {
    // "IN 7 DAYS" in a corner pill could mean the activity takes a week, or
    // expires in one. The subtitle has room to name the thing being waited on.
    const spent = describeAllowance(
      wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(5 * 24) }),
      NOW,
    );
    expect(spent!.subtitle).toBe("Next free call in 5 days");
    expect(spent!.subtitle).toMatch(/free call/);
  });
});
