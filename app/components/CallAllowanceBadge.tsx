import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getWallet } from "../api";
import type { Wallet } from "../api/users";
import { Text, Icon, icons, spacing } from "../design-system";
import { describeAllowance } from "../util/functions/callAllowance";

interface CallAllowanceBadgeProps {
  /**
   * Foreground colour. These cards are a solid vivid fill, so the badge has to
   * be handed the card's own on-colour — the theme's text roles are picked for
   * the dark canvas and would fail contrast here.
   */
  color: string;
}

/**
 * WHAT THE USER HAS LEFT, ON THE CARD THAT SPENDS IT.
 *
 * Calls are the one activity with a real per-use cost, so they are the one
 * activity that can refuse. Finding that out on the dialling screen, after
 * choosing a scenario, is the worst possible moment.
 *
 * It shows readiness rather than a bare count on purpose. With payments off
 * the count is only ever 1 or 0, and "0 left" is a wall — it tells somebody
 * the thing they came for is gone and gives them nothing to do about it.
 * "Ready in 4 days" is the same fact with a way forward, which is the rule
 * this product holds everywhere else: never a dead end.
 *
 * Every number here is decided by the server (`freeCallAvailable`,
 * `nextFreeCallAt`) and never re-derived locally — the seven days roll from
 * the user's last call, and the gate that enforces it runs under a row lock.
 * A second implementation in the app would eventually disagree, and this badge
 * disagreeing with the gate is exactly the failure it exists to prevent.
 */
const CallAllowanceBadge: React.FC<CallAllowanceBadgeProps> = ({ color }) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // On focus, not on mount: React Navigation keeps this screen alive behind
  // the call flow, so a badge fetched once would still read "Free call ready"
  // after the user came back from spending it.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getWallet()
        .then((w) => {
          if (!cancelled) setWallet(w);
        })
        .catch((error) =>
          console.error("[CallAllowanceBadge] Failed to fetch wallet:", error),
        );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const label = describeAllowance(wallet);
  // Nothing to say beats guessing. A server that doesn't send the free-call
  // fields yet, a failed fetch, or a state we can't describe all land here —
  // and a card with no badge is honest, where a wrong badge is not.
  if (!label) return null;

  return (
    <View style={styles.badge}>
      <Icon name={icons.call} size={12} color={color} />
      <Text variant="bodySm" style={{ color }}>
        {label}
      </Text>
    </View>
  );
};

export default CallAllowanceBadge;

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    zIndex: 2,
  },
});
