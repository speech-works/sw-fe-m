import type { BlockedUser } from "../../../api/moderation";

/**
 * Optimistic list ops for the Blocked people screen, kept out of the component
 * so they can be tested as plain functions (the house convention — almost every
 * test in this repo is pure logic, not a rendered tree).
 */

/** Drop one person from the list. Unknown ids are a no-op, not an error. */
export function removeBlocked(
  rows: BlockedUser[],
  userId: string,
): BlockedUser[] {
  return rows.filter((r) => r.userId !== userId);
}

/**
 * Format the "Blocked <when>" subtitle. Deliberately coarse — the exact minute
 * someone blocked another person is not information this screen needs to
 * re-surface, and a relative "2 days ago" invites re-reading the incident.
 */
export function blockedOnLabel(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "Blocked";
  return `Blocked ${d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })}`;
}
