import type { BuddyRequest } from "../../api/buddies";

/**
 * The two decisions the held-decline batch actually makes.
 *
 * They live here rather than inline in the screen because both have already
 * been got wrong once. The batch replaced a single held request, and the bug it
 * replaced was bookkeeping: a second decline flushed the first, so Undo only
 * ever covered the last person and the promised grace window silently did not
 * apply while clearing a queue. Bookkeeping is the part worth pinning in tests.
 */

/**
 * What Undo may still take back.
 *
 * The bar disappears a tick after the timer fires, so a tap landing in that gap
 * must not restore a row the server has already declined. Anything in
 * `committed` is gone for good.
 */
export function undoableDeclines(
  batch: readonly BuddyRequest[],
  committed: ReadonlySet<string>,
): BuddyRequest[] {
  return batch.filter((r) => !committed.has(r.id));
}

/**
 * What the bar says.
 *
 * A NAME while there is one, a COUNT once there are more. "Elena declined"
 * beats "1 declined", and there is no honest way to name three people in a bar
 * this size, so it switches rather than compromising on either. Both forms
 * answer the same question: what will Undo take back.
 */
export function declineBarMessage(batch: readonly BuddyRequest[]): string | null {
  if (batch.length === 0) return null;
  if (batch.length === 1) {
    const first = batch[0].profile.name?.split(" ")[0];
    // Falls back rather than printing "undefined declined" — a request with no
    // publishable name is a real state, not a bug to crash on.
    return `${first || "Request"} declined`;
  }
  return `${batch.length} declined`;
}
