/**
 * What a person can actually DO about not being listed.
 *
 * The server hands back a sentence, not a code, so any screen wanting to offer
 * the fix has to read that sentence. Two screens already needed to
 * (Discoverability, and now the Discover blocked card), and the first one did
 * it with an inline `includes("finish setting up")` — a string test that only
 * one of them knew about. This is that test, in one place, so a reworded
 * message breaks one function rather than silently dropping the button off a
 * screen nobody re-checked.
 *
 * NOT every reason has a fix. A pause (holiday mode, already paired) is a state
 * the person chose and can undo where they set it; naming a route from here
 * would be guessing. And `null` is the correct answer for anything unrecognised
 * — a button labelled from a reason we did not parse would lead somewhere
 * arbitrary, which is worse than the sentence alone.
 */
export type ListingFix = "onboarding" | "name" | null;

export function listingFix(reason?: string | null): ListingFix {
  if (!reason) return null;
  const r = reason.toLowerCase();
  // Mirrors `listingBlockedReason` in sw-be-2. Keep in step with it: these two
  // strings are the contract, and the server owns them.
  if (r.includes("finish setting up")) return "onboarding";
  if (r.includes("add your name")) return "name";
  return null;
}

/**
 * The verb for the fix, so both screens offer the same words.
 *
 * SHORT ON PURPOSE. These sit in the status bar next to two lines of text, and
 * a button is measured before the text is: "Finish setting up" is seventeen
 * characters that left the sentence beside it with room for eleven, so both the
 * title and the reason came back ellipsised. The card these live on says what
 * the fix is; the button only has to name the verb.
 */
export function listingFixLabel(fix: ListingFix): string | null {
  if (fix === "onboarding") return "Set up";
  if (fix === "name") return "Add name";
  return null;
}
