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
 * Two behaviours worth keeping:
 *
 *  - A restore that finds nothing is not an error. Someone who never bought
 *    anything, or who is signed into a different store account, should be told
 *    plainly instead of watching a spinner end in silence.
 *  - A failure is surfaced. The Settings copy of this only ever did
 *    `console.error`, so a reviewer tapping Restore on a bad network saw
 *    nothing happen at all — which reads as a broken button.
 */

/**
 * What the user actually got back, in their words. Never says "0 call credits":
 * announcing an empty balance under a green tick is how the old copy managed to
 * celebrate nothing. When the store had something but our side has no visible
 * grant yet, stay vague rather than claim a specific amount.
 */
const summarizeRestore = (wallet: Wallet | null): string => {
  if (!wallet) return "Your purchases are back.";

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

  return parts.length > 0 ? parts.join(" ") : "Your purchases are back.";
};

export function useRestorePurchases() {
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchasesAndReconcile();
      await useUserStore.getState().fetchUser();

      if (!result?.foundInStore) {
        // purchasesAvailable() was false, the sign-in sheet was dismissed, or
        // the store simply had nothing for this account. Nothing to celebrate
        // and nothing broke. Name the store account, because signing in with a
        // different one is the usual reason a real purchase "vanished".
        showSuccessBottomSheet(
          "Nothing to restore",
          "We found no purchases on your store account. If you paid with a different one, sign in to it and try again.",
        );
        return;
      }

      showSuccessBottomSheet(
        "Purchases restored",
        summarizeRestore(result.wallet),
      );
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
