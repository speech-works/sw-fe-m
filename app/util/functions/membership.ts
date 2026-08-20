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
