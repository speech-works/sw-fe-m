/**
 * M2 (founder, 9 Nov 2026): "Renews {date}" / "Ends {date}" show the STORE
 * plan's own period end, never free-month or gift days. `until` is the
 * furthest end of all access, so it may not be the date the store bills on.
 */
import { membershipEndsAt, planPeriodEnd } from "../membership";
import type { User } from "../../../api/users";

const user = (membership: Partial<NonNullable<User["membership"]>> | null) =>
  ({ membership: membership && { active: true, until: null, daysRemaining: null, ...membership } }) as User;

const PLAN_END = "2026-12-01T00:00:00.000Z";
const FREE_END = "2027-01-15T00:00:00.000Z";

describe("planPeriodEnd", () => {
  it("uses the store plan's own end when the server sends planUntil", () => {
    const u = user({ source: "purchase", until: FREE_END, planUntil: PLAN_END });
    expect(planPeriodEnd(u)?.toISOString()).toBe(PLAN_END);
    expect(membershipEndsAt(u)?.toISOString()).toBe(FREE_END); // access end is unchanged
  });

  it("shows no date when the server says the plan has no shown end", () => {
    expect(planPeriodEnd(user({ source: "purchase", until: FREE_END, planUntil: null }))).toBeNull();
    expect(planPeriodEnd(user({ source: "purchase", until: FREE_END, planUntil: "nope" }))).toBeNull();
  });

  it("a purchase with free days and no planUntil: no date rather than a wrong one", () => {
    expect(
      planPeriodEnd(user({ source: "purchase", until: FREE_END, freeUntil: FREE_END })),
    ).toBeNull();
  });

  it("a purchase with no free days falls back to until (today's server)", () => {
    expect(planPeriodEnd(user({ source: "purchase", until: PLAN_END }))?.toISOString()).toBe(PLAN_END);
  });

  it("free-month and gift access keep their own end date", () => {
    expect(
      planPeriodEnd(user({ source: "pack_bonus", until: FREE_END, freeUntil: FREE_END }))?.toISOString(),
    ).toBe(FREE_END);
  });

  it("no membership, no date", () => {
    expect(planPeriodEnd(null)).toBeNull();
    expect(planPeriodEnd(user(null))).toBeNull();
  });
});
