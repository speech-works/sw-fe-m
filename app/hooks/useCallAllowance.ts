import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { getWallet } from "../api";
import type { Wallet } from "../api/users";
import {
  describeAllowance,
  type CallAllowance,
} from "../util/functions/callAllowance";

/**
 * WHAT A CALL COSTS, FOR THE CARD THAT SPENDS IT.
 *
 * Calls are the one activity with a real per-use cost — everything else in the
 * app is metered by stamina — so they are the one activity that can refuse.
 * Finding that out on the dialling screen, after choosing a scenario, is the
 * worst possible moment.
 *
 * A hook rather than a self-contained badge component, because the answer
 * lands in two places on the card: a corner pill when a call is waiting, and
 * the subtitle when it is not. A component could only ever own one of them.
 *
 * Every number is decided by the server (`freeCallAvailable`,
 * `nextFreeCallAt`) and never re-derived locally — the seven days roll from
 * the user's last call, and the gate that enforces it runs under a row lock.
 * A second implementation in the app would eventually disagree, and this card
 * disagreeing with the gate is exactly the failure it exists to prevent.
 *
 * Returns null until the wallet is known, and stays null if it cannot be
 * described — the card then shows its plain, unlimited-looking self, which is
 * the honest fallback.
 */
export function useCallAllowance(): CallAllowance | null {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // On focus, not on mount: React Navigation keeps this screen alive behind
  // the call flow, so a wallet fetched once would still say a free call is
  // waiting after the user came back from spending it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getWallet()
        .then((w) => {
          if (!cancelled) setWallet(w);
        })
        .catch((error) =>
          console.error("[useCallAllowance] Failed to fetch wallet:", error),
        );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return describeAllowance(wallet);
}
