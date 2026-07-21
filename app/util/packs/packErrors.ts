/**
 * What an API refusal MEANS, separated from what a screen does about it.
 *
 * These three cases were previously decided inline in two different screens,
 * and both got it wrong in the same way: every error collapsed into "Something
 * went wrong. Please try again." Retrying a paywall never works, so the app was
 * telling people to do something that could not help — and in PackModule the
 * catch-all also triggered a fallback to an ungated endpoint, which rendered a
 * real pack title over an empty module with a "1 of 1" progress bar.
 *
 * Pulled into a pure function so the decision is testable without rendering a
 * React Native tree, and so the two screens cannot drift apart again.
 */

/** The backend's monetisation signals — see sw-be-2/src/util/errors.ts. */
export type PackErrorKind =
  /** 402 PACK_NOT_OWNED — they haven't bought it. Send them to buy it. */
  | "NOT_OWNED"
  /** 403 PACK_DAY_LOCKED — they HAVE paid; this day just hasn't opened. */
  | "DAY_LOCKED"
  /** 402 NO_CREDITS / INSUFFICIENT_STAMINA — handled by GlobalModal. */
  | "RESOURCE_EXHAUSTED"
  /** Anything else: a genuine failure that must surface as one. */
  | "UNKNOWN";

/**
 * Classifies an axios-shaped error. Reads `errorCode` first and falls back to
 * the HTTP status, because the code is the contract — a status alone cannot
 * tell NO_CREDITS from PACK_NOT_OWNED, since the backend deliberately returns
 * 402 for both.
 */
export function classifyPackError(error: unknown): PackErrorKind {
  const err = error as
    | { response?: { status?: number; data?: { errorCode?: string } } }
    | undefined;
  const code = err?.response?.data?.errorCode;
  const status = err?.response?.status;

  if (code === "PACK_NOT_OWNED") return "NOT_OWNED";
  if (code === "PACK_DAY_LOCKED") return "DAY_LOCKED";
  if (code === "INSUFFICIENT_STAMINA" || code === "NO_CREDITS") {
    return "RESOURCE_EXHAUSTED";
  }

  // No code (older backend, proxy error, malformed body) — fall back to status.
  // 403 is unambiguous; 402 without a code is treated as a purchase problem,
  // which is the only thing the backend uses a bare 402 for.
  if (status === 403) return "DAY_LOCKED";
  if (status === 402) return "NOT_OWNED";

  return "UNKNOWN";
}

export interface PackErrorMessage {
  title: string;
  body: string;
}

/**
 * The user-facing message for a refusal, or null when the screen must stay
 * silent (RESOURCE_EXHAUSTED is owned by GlobalModal — a second sheet on top
 * of it would stack two modals, which freezes touch handling on iOS).
 *
 * Never says "please try again" for a paywall: retrying cannot succeed, and
 * telling someone to retry is worse than telling them nothing.
 */
export function packErrorMessage(kind: PackErrorKind): PackErrorMessage | null {
  switch (kind) {
    case "RESOURCE_EXHAUSTED":
      return null;
    case "NOT_OWNED":
      return {
        title: "Part of a paid program",
        body: "This activity belongs to a program you haven't bought yet. You can see what's included from the Programs page.",
      };
    case "DAY_LOCKED":
      return {
        title: "Not yet",
        body: "This day of the programme opens later. Today's work is waiting on the pack page.",
      };
    case "UNKNOWN":
    default:
      return {
        title: "Something went wrong",
        body: "We had trouble loading that activity. Please try again.",
      };
  }
}
