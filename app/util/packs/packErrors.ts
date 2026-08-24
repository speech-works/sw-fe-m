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
  /**
   * 409 PACK_COMPLETED — the program is finished and this module never was, so
   * only a restart can open it. Retrying cannot succeed, which is what made the
   * old handling so bad: see `classifyPackError`.
   */
  | "PACK_COMPLETED"
  /** Anything else: a genuine failure that must surface as one. */
  | "UNKNOWN";

/**
 * Classifies an axios-shaped error. Reads `errorCode` first and falls back to
 * the HTTP status, because the code is the contract — a status alone cannot
 * tell NO_CREDITS from PACK_NOT_OWNED, since the backend deliberately returns
 * 402 for both.
 *
 * ── WHY PACK_COMPLETED WAS WORTH MOVING IN HERE ────────────────────────────
 * PackModule used to test that refusal inline, and got all three parts of it
 * wrong at once: it looked for HTTP 400 (it is 409), in a body field called
 * `message` (BaseController.handleError names the field `error` in every
 * branch), for the text "already complete" (the sentence is "This program is
 * complete. Restart it to run through it again"). So the branch could not run.
 * The refusal fell through to the transient path, and a person on a perfect
 * connection was told to check their connection and try again, forever, with no
 * tap that could ever work.
 *
 * That is exactly the drift this module exists to stop, so the rule lives here
 * with the others now, where it is tested and where one screen cannot hold a
 * different idea of the shape than another.
 */
export function classifyPackError(error: unknown): PackErrorKind {
  const err = error as
    | {
        response?: {
          status?: number;
          data?: { errorCode?: string; error?: string };
        };
      }
    | undefined;
  const code = err?.response?.data?.errorCode;
  const status = err?.response?.status;

  if (code === "PACK_NOT_OWNED") return "NOT_OWNED";
  if (code === "PACK_DAY_LOCKED") return "DAY_LOCKED";
  if (code === "PACK_COMPLETED") return "PACK_COMPLETED";
  if (code === "INSUFFICIENT_STAMINA" || code === "NO_CREDITS") {
    return "RESOURCE_EXHAUSTED";
  }

  // The same refusal for a pack with NO arc is a plain Error server-side, so it
  // arrives with no errorCode and no reliable status. Its text is the only
  // handle it has: "This pack is already complete. Optional modules are not
  // accessible after pack completion." Read the field the backend actually
  // sends, which is `error`.
  const text = err?.response?.data?.error;
  if (typeof text === "string" && text.includes("already complete")) {
    return "PACK_COMPLETED";
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
    case "PACK_COMPLETED":
      return {
        title: "This program is finished",
        // No "try again". Nothing this person can tap will start this module:
        // the only thing that opens it is starting the program again, which
        // lives on the program page.
        //
        // "this" rather than "this day": a pack with no arc has sessions, not
        // days, and the non-arc pack is one of the cases that lands here.
        body: "You did not finish this the first time. Start the program again to open it.",
      };
    case "UNKNOWN":
    default:
      return {
        title: "Something went wrong",
        body: "We had trouble loading that activity. Please try again.",
      };
  }
}
