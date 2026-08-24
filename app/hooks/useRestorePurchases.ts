import { useState } from "react";
import type { Wallet } from "../api";
import { restorePurchasesAndReconcile } from "../services/purchases";
import { useUserStore } from "../stores/user";
import {
  showSuccessBottomSheet,
  showErrorBottomSheet,
} from "../util/functions/bottomSheet";

/**
 * Restore Purchases, shared by every surface that has to offer it.
 *
 * App Store Guideline 3.1.1 requires a restore mechanism, and Apple looks for
 * it on the PURCHASE surface — not only buried in Settings, which is where it
 * lived alone until now. Rather than copy the handler onto the paywall, both
 * call this.
 *
 * EVERY OUTCOME GETS ITS OWN SENTENCE. That is the whole point of the hook:
 *
 *  - A restore that finds nothing is not an error. Someone who never bought
 *    anything, or who is signed into a different store account, should be told
 *    plainly instead of watching a spinner end in silence.
 *  - A restore that finds something but cannot confirm it is not a success, and
 *    neither is one that confirms while the store still holds something active
 *    we are not honouring. Both used to be reported as successes, which is a
 *    claim the app had not earned.
 *  - A confirmed restore that leaves the wallet empty is not a failure either.
 *    The store remembers a purchase forever, so an empty wallet is simply what a
 *    lapsed membership or a spent top-up looks like. It gets said plainly, not
 *    dressed up as our fault and not dressed up as a win.
 *  - A second tap inside the backend's cooldown is neither.
 *  - A failure is surfaced. The Settings copy of this only ever did
 *    `console.error`, so a reviewer tapping Restore on a bad network saw
 *    nothing happen at all, which reads as a broken button.
 */

/**
 * What the user actually got back, in their words, or null when the wallet holds
 * nothing worth naming.
 *
 * Never says "0 call credits": announcing an empty balance under a green tick is
 * how the old copy managed to celebrate nothing.
 *
 * NULL IS NOT AN EMPTY SUMMARY, IT IS A DIFFERENT OUTCOME, but on its own it is
 * NOT evidence that anything went wrong. Getting here means the store account has
 * bought from us at some point, and that stays true forever, so null is the
 * ordinary state of a lapsed member, a refunded buyer or a spent top-up. Only the
 * caller's `activeInStore` separates those from the one case where null really is
 * our bug. Either way the caller must not dress it as a restore: the old fallback
 * sentence was "Your purchases are back.", which is the one thing we can be sure
 * is untrue in this state.
 */
const summarizeRestore = (wallet: Wallet): string | null => {
  const parts: string[] = [];
  if (wallet.entitlements.includes("membership")) {
    parts.push("Your membership is active.");
  }
  const packs = wallet.entitlements.filter((key) =>
    key.startsWith("pack:"),
  ).length;
  if (packs > 0) {
    parts.push(`${packs} pack${packs === 1 ? "" : "s"} unlocked.`);
  }
  if (wallet.balance > 0) {
    parts.push(
      `You have ${wallet.balance} call credit${wallet.balance === 1 ? "" : "s"}.`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
};

const seconds = (n: number): string => `${n} second${n === 1 ? "" : "s"}`;

export function useRestorePurchases() {
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchasesAndReconcile();

      // Payments are off in this build, so the store was never asked. Kept
      // apart from "nothing found" on purpose: that sentence reports a check we
      // did not run. All three surfaces hide the button when payments are off,
      // so this is a guard, not a path users meet.
      if (!result) {
        showErrorBottomSheet(
          "Not available",
          "Purchases are not available in this version.",
        );
        return;
      }

      if (result.status === "nothing_found") {
        // The sign-in sheet was dismissed, or the store simply had nothing for
        // this account. Nothing to celebrate and nothing broke. Name the store
        // account, because signing in with a different one is the usual reason a
        // real purchase "vanished".
        showSuccessBottomSheet(
          "Nothing to restore",
          "We found no purchases on your store account. If you paid with a different one, sign in to it and try again.",
        );
        return;
      }

      if (result.status === "throttled") {
        // A second tap a moment after the first. Not a failure, so it gets the
        // success sheet: an error buzz for a double tap is the app telling
        // someone off for being keen.
        showSuccessBottomSheet(
          "Just a moment",
          `We checked a second ago. Please wait ${seconds(result.retryAfterSeconds)} and tap Restore again.`,
        );
        return;
      }

      // Something may have changed on our side, so refresh the user. Skipped
      // above, where nothing did.
      await useUserStore.getState().fetchUser();

      const summary = summarizeRestore(result.wallet);

      // TWO EMPTY WALLETS THAT MEAN OPPOSITE THINGS.
      //
      // `unverified` is the backend saying the check against the store did not
      // run. An empty wallet while the store still shows something ACTIVE is the
      // check having run and come back disagreeing with the store. Different
      // causes, same standing from where the user is: the store has it, their
      // account does not show it, look again shortly. Both are ours to fix, so
      // both keep the sentence that admits it, and sharing the sentence is what
      // stops the two from drifting apart later.
      //
      // An empty wallet with nothing active in the store is NOT that. The store
      // remembers every purchase forever, so this is what a lapsed membership, a
      // refund or a spent top-up looks like: the restore worked and there was
      // nothing left to hand back. Sending that person the sentence above put
      // them in a loop no retry could break, because there was nothing to fix.
      //
      // No "Try again" button on the failure, on purpose. The backend has just
      // stamped its cooldown, so a button pressed now would only earn the
      // throttle message above.
      if (result.status === "unverified" || (!summary && result.activeInStore)) {
        showErrorBottomSheet(
          "Couldn't confirm your purchases",
          "Your store account has them, but we couldn't add them to your account just now. Please try again in a moment.",
        );
        return;
      }

      if (!summary) {
        // Nothing broke, so no error buzz. Kept apart from "nothing_found"
        // above, which points at signing into another store account: this
        // account IS the right one, so that advice would send them off chasing a
        // purchase that is not missing.
        showSuccessBottomSheet(
          "Nothing to restore",
          "We checked and there's nothing active to restore right now. Anything you buy will show up here straight away.",
        );
        return;
      }

      showSuccessBottomSheet("Purchases restored", summary);
    } catch (error) {
      console.error("Error restoring purchases:", error);
      showErrorBottomSheet(
        "Couldn't restore",
        "Check your connection and try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  return { restoring, restore };
}
