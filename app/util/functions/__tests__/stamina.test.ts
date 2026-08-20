import { User } from "../../../api/users";
import {
  estimateStaminaRecharge,
  formatRechargeShort,
  staminaCapFor,
} from "../stamina";

/**
 * Membership comes from the server as a computed answer, never as a date the
 * device compares itself. `active` is the only thing anything may gate on: a
 * phone with a wrong clock, or one set forward deliberately, must not be able
 * to grant itself a membership.
 */
const MEMBER = { active: true, until: "2027-01-01T00:00:00.000Z", daysRemaining: 120 };
const NOT_A_MEMBER = { active: false, until: null, daysRemaining: null };

/**
 * The cap fallback is only used in one window: after /auth/callback returns the
 * bare user row and before GET /users/me answers with the server-computed
 * cap. That window is exactly a new user's first Home render — so getting it
 * wrong is most visible to the people least able to interpret it. Assuming the
 * paid pool (80) for everyone drew a brand-new free user's FULL 35/35 bar as
 * 44%, which reads as "you already spent half your energy" on a fresh account.
 */

const user = (over: Partial<User>): User => ({ ...over }) as User;

describe("staminaCapFor", () => {
  it("prefers the server-computed cap whenever it is present", () => {
    expect(staminaCapFor(user({ maxStaminaCap: 110, membership: MEMBER }))).toBe(110);
    expect(staminaCapFor(user({ maxStaminaCap: 35, membership: NOT_A_MEMBER }))).toBe(35);
  });

  it("falls back to the FREE bar for a free user, not the paid pool", () => {
    expect(staminaCapFor(user({ membership: NOT_A_MEMBER }))).toBe(35);
  });

  it("falls back to the paid pool for a member", () => {
    expect(staminaCapFor(user({ membership: MEMBER }))).toBe(80);
  });

  it("treats an unknown tier as free — never overstate the bar we cannot verify", () => {
    expect(staminaCapFor(user({}))).toBe(35);
    expect(staminaCapFor(null)).toBe(35);
    expect(staminaCapFor(undefined)).toBe(35);
  });

  it("shows a freshly-seeded free user as FULL, not 44%", () => {
    // Exactly the post-signup payload: currentStamina present, cap absent.
    const fresh = user({ currentStamina: 35, membership: NOT_A_MEMBER });
    const pct = Math.round((fresh.currentStamina! / staminaCapFor(fresh)) * 100);
    expect(pct).toBe(100);
  });
});

describe("estimateStaminaRecharge regen fallback", () => {
  it("uses the free cadence (41 min/pt) when the server rate is absent", () => {
    const { estimatedStamina } = estimateStaminaRecharge(
      user({
        currentStamina: 0,
        membership: NOT_A_MEMBER,
        lastStaminaUpdate: new Date(Date.now() - 82 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(2);
  });

  it("uses the paid cadence (18 min/pt) for a member", () => {
    const { estimatedStamina } = estimateStaminaRecharge(
      user({
        currentStamina: 0,
        membership: MEMBER,
        lastStaminaUpdate: new Date(Date.now() - 36 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(2);
  });

  it("caps a free user's estimate at the free bar", () => {
    const { estimatedStamina, isFull } = estimateStaminaRecharge(
      user({
        currentStamina: 30,
        membership: NOT_A_MEMBER,
        lastStaminaUpdate: new Date(Date.now() - 100 * 60 * 60 * 1000),
      }),
      Date.now(),
    );
    expect(estimatedStamina).toBe(35);
    expect(isFull).toBe(true);
  });
});

/**
 * The Home meter's label is the one string on the identity card that changes on
 * a timer, so its exact output is behaviour, not formatting trivia. It replaced
 * "42m 46s", which was the longest string on the card and the only one that
 * moved every second.
 */
describe("formatRechargeShort", () => {
  const MIN = 60_000;
  const HOUR = 60 * MIN;

  it("uses minutes below an hour, to one decimal", () => {
    expect(formatRechargeShort(42.8 * MIN)).toBe("42.8m");
  });

  it("uses hours at an hour and above, to one decimal", () => {
    expect(formatRechargeShort(1.32 * HOUR)).toBe("1.3h");
    expect(formatRechargeShort(59.9 * MIN)).toBe("59.9m");
    expect(formatRechargeShort(60 * MIN)).toBe("1h");
  });

  it("drops a trailing .0 rather than rendering 1.0h", () => {
    expect(formatRechargeShort(2 * HOUR)).toBe("2h");
    expect(formatRechargeShort(30 * MIN)).toBe("30m");
  });

  it("says it in words below the resolution it reports", () => {
    // "0.1m" reads as a broken number rather than a small one.
    expect(formatRechargeShort(20_000)).toBe("under a minute");
    expect(formatRechargeShort(0)).toBe("under a minute");
    expect(formatRechargeShort(-5000)).toBe("under a minute");
  });

  it("never returns a string long enough to crowd the energy readout", () => {
    for (const ms of [0, 30_000, 5 * MIN, 42.8 * MIN, 59.9 * MIN, HOUR, 3.7 * HOUR, 40 * HOUR]) {
      const out = formatRechargeShort(ms);
      expect(out === "under a minute" || out.length <= 6).toBe(true);
    }
  });
});
