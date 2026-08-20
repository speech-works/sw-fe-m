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
