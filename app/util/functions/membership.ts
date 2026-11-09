import type { User } from "../../api/users";

/**
 * ===========================================================================
 * IS THIS USER A MEMBER?
 * ---------------------------------------------------------------------------
 * One function, so the answer is the same on every screen. This used to be
 * `user?.isPaid` written out at eight call sites against a server flag that
 * went stale, and the drift between those sites is how a free user ended up
 * inside paid content.
 *
 * ── IT READS `active`, NEVER `until` ───────────────────────────────────────
 * `until` is a date, and comparing a date needs a clock. The device's clock is
 * not trustworthy for this: it can be wrong, and it can be changed on purpose
 * by someone who would like a free membership. `active` was computed on the
 * server, against the server's clock, and it is the only thing worth gating on.
 *
 * `until` is for showing a person when their access ends, and nothing else.
 * ===========================================================================
 */
export function isMember(user: User | null | undefined): boolean {
  return user?.membership?.active === true;
}

/**
 * When their membership ends, for DISPLAY.
 *
 * Null for a non-member, and also for a membership with no end date, because
 * there is nothing useful to show in either case.
 */
export function membershipEndsAt(user: User | null | undefined): Date | null {
  const until = user?.membership?.until;
  if (!until) return null;
  const date = new Date(until);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * ===========================================================================
 * THE STORE PLAN'S OWN PERIOD END: "Renews {date}" / "Ends {date}" (M2)
 * ---------------------------------------------------------------------------
 * `until` is when ACCESS ends: the furthest live row, which includes free-month
 * (pack_bonus) and gift days. A member who paid monthly and also has free days
 * was told "Renews" on a date the store will not bill on. The plan card and
 * the renewal disclosure must show the store plan's own end instead.
 *
 * The server does not send that yet (buildMembershipStatus in sw-be-2 sends
 * `until`, and `freeUntil` only when NO purchase is live). So:
 *   - `planUntil` when the server sends it (the proposed field);
 *   - a purchase with `freeUntil` set: no date, rather than a wrong one;
 *   - otherwise `until`, as before. For a purchase that is right whenever the
 *     member has no free days running past the plan's own end.
 * Null for no date. Not for gating (see isMember).
 * ===========================================================================
 */
export function planPeriodEnd(user: User | null | undefined): Date | null {
  const m = user?.membership;
  if (!m) return null;
  if (m.source === "purchase") {
    if (m.planUntil !== undefined) {
      if (!m.planUntil) return null;
      const d = new Date(m.planUntil);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (m.freeUntil) return null;
  }
  return membershipEndsAt(user);
}

/**
 * Whole days left, already counted in the user's own calendar by the server.
 *
 * Deliberately not computed here. The same instant is a different DATE
 * depending on where you are, so counting it on the device would disagree with
 * everything else we say, and a phone with a wrong clock would get it wrong
 * twice over.
 */
export function membershipDaysRemaining(
  user: User | null | undefined,
): number | null {
  return user?.membership?.daysRemaining ?? null;
}

/**
 * ===========================================================================
 * IS THIS MEMBERSHIP ABOUT TO END WITHOUT WARNING?
 * ---------------------------------------------------------------------------
 * True only for somebody who is a member NOW, whose access will NOT renew by
 * itself, and whose last days are running out.
 *
 * The case it exists for is the first-time pack buyer. Buying a pack grants
 * thirty free days of full membership. On day thirty one it stops, nobody is
 * told, and the app says nothing at any point. That person has used the whole
 * product for a month, by choice, and is the warmest audience this app will
 * ever have.
 *
 * ── WHY EVERY PART OF THE CONDITION IS NEEDED ──────────────────────────────
 *   active            saying "your access ends soon" to somebody who is not a
 *                     member is nonsense
 *   willRenew false   a store subscriber renews on their own. Warning them
 *                     about an expiry that is not coming would read as a
 *                     cancellation notice and cause the churn it meant to stop
 *   daysRemaining     the count is server-computed in the user's own calendar,
 *                     so "two days" means two of their days, not two of ours
 *
 * `willRenew` is optional in the payload: an older server does not send it, and
 * `=== false` rather than `!willRenew` means an unknown answer is treated as
 * "it renews", so nobody is warned on a guess.
 * ===========================================================================
 */
export const CONTINUATION_WINDOW_DAYS = 2;

export function membershipEndingSoon(user: User | null | undefined): boolean {
  const m = user?.membership;
  if (!m?.active) return false;
  if (m.willRenew !== false) return false;
  if (m.daysRemaining == null) return false;
  return m.daysRemaining <= CONTINUATION_WINDOW_DAYS;
}

/**
 * Said on the day-28 sheet while free days are running (founder-approved,
 * 9 Nov 2026), and the second sentence of the paywall's free-days line. A plan
 * bought now starts now; the server keeps the free days running alongside it.
 */
export const FREE_DAYS_END_LINE = "If you buy now, your plan starts today.";

/**
 * The day-28 sheet's body: what membership is, and BOTH plans' prices when
 * they are known. It used to name only the yearly price, which read as the
 * only way to keep going. No price at all rather than a dash.
 */
export function continueBody(price: {
  priceKnown: boolean;
  monthlyLabel: string;
  annualLabel: string;
  /** Whole-number yearly saving shown on the plan screen; 0 or absent hides it. */
  annualSavingsPct?: number;
}): string {
  const what = "Membership is the longer calls and the whole technique library.";
  const save =
    price.annualSavingsPct && price.annualSavingsPct > 0
      ? ` and save ${price.annualSavingsPct}%`
      : "";
  return price.priceKnown
    ? `${what} Keep it for ${price.monthlyLabel} a month, or ${price.annualLabel} a year${save}.`
    : what;
}
