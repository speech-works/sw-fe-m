import {
  CONTINUATION_WINDOW_DAYS,
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
