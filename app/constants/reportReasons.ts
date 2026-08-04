import type { ReportReason } from "../api/moderation";

/**
 * The fixed reason vocabulary for reporting, mirroring REPORT_REASONS in
 * sw-be-2's moderation.service (which validates it — this list is the UI, not
 * the guard).
 *
 * WHY A FIXED LIST RATHER THAN A TEXT BOX: the reason IS the confirmation. You
 * cannot mis-tap into filing a report without also saying why, which is what
 * lets the sheet submit on a single tap. It also means the queue can be triaged
 * without reading every row.
 *
 * `self_harm` is handled differently at the call site: reporting a friend's
 * distress as "content" and getting "Thanks, we'll review it" would be the
 * wrong response, so that one routes to the crisis resources instead.
 */
export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech or slurs" },
  { id: "sexual", label: "Sexual or explicit content" },
  { id: "self_harm", label: "Self-harm or dangerous content" },
  { id: "spam", label: "Spam or a scam" },
  { id: "other", label: "Something else" },
];

/** Routes to crisis resources rather than a "thanks, we'll review it" toast. */
export const CRISIS_REPORT_REASON: ReportReason = "self_harm";
