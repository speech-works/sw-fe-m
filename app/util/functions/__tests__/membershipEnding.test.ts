import {
  CONTINUATION_WINDOW_DAYS,
  FREE_DAYS_END_LINE,
  continueBody,
  membershipEndingSoon,
} from "../membership";
import type { User } from "../../../api/users";

/**
 * ===========================================================================
 * WHO GETS TOLD THEIR ACCESS IS ABOUT TO STOP
 * ---------------------------------------------------------------------------
 * Exactly one kind of person: a member whose access will NOT renew by itself
 * and whose last days are running out. In practice that is the first-time pack
 * buyer, thirty free days in.
 *
 * Both ways of getting this wrong are expensive. Warn a store subscriber and
 * the message reads as a cancellation notice, which causes the churn it was
 * meant to prevent. Stay silent for the pack buyer and the warmest audience
 * this app will ever have hears nothing before their access stops.
 * ===========================================================================
 */
const user = (membership: Partial<NonNullable<User["membership"]>> | null): User =>
  ({ id: "u1", ...(membership ? { membership } : {}) }) as User;

describe("Membership ending soon", () => {
  it("tells a pack buyer whose free month is nearly over", () => {
    expect(
      membershipEndingSoon(user({ active: true, willRenew: false, daysRemaining: 2, until: "x" })),
    ).toBe(true);
  });

  /**
   * The expensive false positive. Apple and Google renew this without anybody
   * doing anything, so there is nothing to warn about.
   */
  it("never warns a store subscriber", () => {
    expect(
      membershipEndingSoon(user({ active: true, willRenew: true, daysRemaining: 1, until: "x" })),
    ).toBe(false);
  });

  /**
   * An older server does not send `willRenew`. An unknown answer must mean
   * "it renews", so nobody is warned on a guess.
   */
  it("stays quiet when the server did not say", () => {
    expect(
      membershipEndingSoon(user({ active: true, daysRemaining: 1, until: "x" })),
    ).toBe(false);
  });

  it("says nothing to somebody who is not a member", () => {
    expect(
      membershipEndingSoon(user({ active: false, willRenew: false, daysRemaining: 0, until: null })),
    ).toBe(false);
    expect(membershipEndingSoon(user(null))).toBe(false);
    expect(membershipEndingSoon(null)).toBe(false);
  });

  it("waits until the last days, rather than warning all month", () => {
    const at = (d: number) =>
      membershipEndingSoon(user({ active: true, willRenew: false, daysRemaining: d, until: "x" }));

    expect(at(CONTINUATION_WINDOW_DAYS + 1)).toBe(false);
    expect(at(CONTINUATION_WINDOW_DAYS)).toBe(true);
    // Ends today, and they are still a member today.
    expect(at(0)).toBe(true);
  });

  it("stays quiet when there is no end date to count to", () => {
    expect(
      membershipEndingSoon(user({ active: true, willRenew: false, daysRemaining: null, until: null })),
    ).toBe(false);
  });
});

/**
 * ===========================================================================
 * THE NEWER MEMBERSHIP FIELDS
 * ---------------------------------------------------------------------------
 * The server now says where access comes from, which store bills it, when free
 * days end and what the paywall may offer. None of that changes who is warned:
 * the warning is still for access that stops by itself.
 * ===========================================================================
 */
describe("Membership ending soon, with the newer fields", () => {
  it("still warns somebody on a pack's free days near the end", () => {
    expect(
      membershipEndingSoon(
        user({
          active: true,
          willRenew: false,
          daysRemaining: 1,
          until: "x",
          source: "pack_bonus",
          freeUntil: "x",
          actions: { pick: ["monthly", "annual"], primary: "buy" },
        }),
      ),
    ).toBe(true);
  });

  it("does not warn a store plan with a billing issue that still renews", () => {
    expect(
      membershipEndingSoon(
        user({
          active: true,
          willRenew: true,
          daysRemaining: 1,
          until: "x",
          plan: "monthly",
          source: "purchase",
          store: "play_store",
          billingIssue: true,
        }),
      ),
    ).toBe(false);
  });

  it("warns a store plan that was cancelled and ends soon", () => {
    expect(
      membershipEndingSoon(
        user({
          active: true,
          willRenew: false,
          daysRemaining: 2,
          until: "x",
          plan: "annual",
          source: "purchase",
          store: "app_store",
        }),
      ),
    ).toBe(true);
  });
});

describe("The day-28 sheet's words", () => {
  it("offers both plans when the prices are known", () => {
    expect(
      continueBody({ priceKnown: true, monthlyLabel: "$2.99", annualLabel: "$34.99" }),
    ).toBe(
      "Membership is the longer calls and the whole technique library. Keep it for $2.99 a month, or $34.99 a year.",
    );
  });

  it("names no price at all rather than a dash", () => {
    expect(
      continueBody({ priceKnown: false, monthlyLabel: "—", annualLabel: "—" }),
    ).toBe("Membership is the longer calls and the whole technique library.");
  });

  it("says a plan bought now starts today (free days keep running)", () => {
    expect(FREE_DAYS_END_LINE).toBe("If you buy now, your plan starts today.");
  });
});
