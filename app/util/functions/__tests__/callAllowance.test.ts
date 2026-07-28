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
    expect(describeAllowance(wallet({ freeCallAvailable: true }), NOW)).toEqual(
      { badge: "FREE CALL", subtitle: null, countdown: null },
    );
  });

  it("counts bought credits ahead of the weekly call", () => {
    // Somebody holding three credits must never be told to come back on
    // Thursday — the free call is the FLOOR, not the ceiling.
    expect(
      describeAllowance(
        wallet({
          balance: 3,
          freeCallAvailable: false,
          nextFreeCallAt: inHours(72),
        }),
        NOW,
      ),
    ).toEqual({ badge: "3 CALLS", subtitle: null, countdown: null });
  });

  it("gets the singular right", () => {
    expect(describeAllowance(wallet({ balance: 1 }), NOW)).toEqual({
      badge: "1 CALL",
      subtitle: null,
      countdown: null,
    });
  });

  it("counts down in days once the call is spent", () => {
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(72) }),
        NOW,
      ),
    ).toEqual({
      badge: null,
      subtitle: "Next free call in 3 days",
      countdown: { before: "Next free call in ", days: 3, after: " days" },
    });
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
    ).toEqual({
      badge: null,
      subtitle: "Next free call in 4 days",
      countdown: { before: "Next free call in ", days: 4, after: " days" },
    });
  });

  it("counts the last day as a NUMBER, never as the word tomorrow", () => {
    // A worded countdown has no digit, so the block would vanish for the final
    // day of the wait — precisely the day somebody is most likely to open the
    // app to check. Every wait keeps its number, and therefore its block.
    for (const hours of [1, 5, 23]) {
      const a = describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(hours) }),
        NOW,
      )!;
      expect(a.subtitle).toBe("Next free call in 1 day");
      expect(a.countdown).toEqual({
        before: "Next free call in ",
        days: 1,
        after: " day",
      });
    }
  });

  it("says day for one and days for the rest", () => {
    const after = (hours: number) =>
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(hours) }),
        NOW,
      )!.countdown!.after;

    expect(after(10)).toBe(" day"); // 1
    expect(after(30)).toBe(" days"); // 2
    expect(after(7 * 24)).toBe(" days"); // 7
  });

  it("never counts down to zero", () => {
    // `days` is rounded UP, so the smallest wait it can express is one. A zero
    // would print "in 0 days" and put a number on the block that means ready.
    for (let m = 1; m <= 7 * 24 * 60; m += 37) {
      const a = describeAllowance(
        wallet({
          freeCallAvailable: false,
          nextFreeCallAt: new Date(NOW.getTime() + m * 60_000).toISOString(),
        }),
        NOW,
      )!;
      expect(a.countdown!.days).toBeGreaterThanOrEqual(1);
    }
  });

  it("treats a countdown that has already elapsed as ready", () => {
    // The wallet is a snapshot; a screen left open past the unlock instant
    // must not keep telling somebody to wait for a call they can now make.
    expect(
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(-1) }),
        NOW,
      ),
    ).toEqual({ badge: "FREE CALL", subtitle: null, countdown: null });
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
      const days = Number(
        /in (\d+) days/.exec(label!.subtitle ?? "")?.[1] ?? 1,
      );
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

  it("keeps the flip digit and the plain sentence saying the same thing", () => {
    // The card renders the countdown as three pieces so the number can sit on
    // an animated tile, and falls back to `subtitle` for the screen reader and
    // for reduced motion. If those two ever drifted, a user would SEE one
    // number and HEAR another — so the sentence is joined from the parts
    // rather than written out beside them, and this holds that.
    for (let h = 25; h <= 7 * 24; h++) {
      const a = describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(h) }),
        NOW,
      )!;
      if (!a.countdown) continue;
      expect(
        `${a.countdown.before}${a.countdown.days}${a.countdown.after}`,
      ).toBe(a.subtitle);
    }
  });

  it("shows the block exactly when there is a number, and never otherwise", () => {
    // THE INVARIANT. The block is an object that carries a digit; with no digit
    // there is nothing for it to be. Stated over every state the wallet can be
    // in, so a future branch cannot quietly add a fifth that renders an empty
    // one — or a wait that renders none.
    const withBlock = [
      inHours(1),
      inHours(23),
      inHours(50),
      inHours(7 * 24),
    ].map((at) =>
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: at }),
        NOW,
      ),
    );
    for (const a of withBlock) {
      expect(a!.countdown).not.toBeNull();
      expect(a!.subtitle).toMatch(/\d/);
    }

    const withoutBlock = [
      describeAllowance(wallet({ freeCallAvailable: true }), NOW),
      describeAllowance(wallet({ balance: 3 }), NOW),
      describeAllowance(
        wallet({ freeCallAvailable: false, nextFreeCallAt: inHours(-1) }),
        NOW,
      ),
    ];
    for (const a of withoutBlock) {
      expect(a!.countdown).toBeNull();
      expect(a!.subtitle).toBeNull();
    }

    // ...and the two states that describe nothing at all.
    expect(describeAllowance(null, NOW)).toBeNull();
    expect(describeAllowance(wallet({}), NOW)).toBeNull();
  });
});
