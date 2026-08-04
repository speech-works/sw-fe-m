import { useState } from "react";
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
export function useRestorePurchases() {
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const wallet = await restorePurchasesAndReconcile();
      await useUserStore.getState().fetchUser();

      if (!wallet) {
        // purchasesAvailable() was false, or the store had nothing for this
        // account. Either way there is nothing to celebrate and nothing broke.
        showSuccessBottomSheet(
          "Nothing to restore",
          "No previous purchases on this account.",
        );
        return;
      }

      showSuccessBottomSheet(
        "Purchases restored",
        `You have ${wallet.balance} call credit${
          wallet.balance === 1 ? "" : "s"
        }.`,
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
