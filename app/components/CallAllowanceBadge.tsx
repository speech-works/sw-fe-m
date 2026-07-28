import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getWallet } from "../api";
import type { Wallet } from "../api/users";
import { Text, useTheme, spacing, radius } from "../design-system";
import { describeAllowance } from "../util/functions/callAllowance";

/**
 * WHAT A CALL COSTS, ON THE CARD THAT SPENDS IT.
 *
 * Calls are the one activity with a real per-use cost, so they are the one
 * activity that can refuse. Finding that out on the dialling screen, after
 * choosing a scenario, is the worst possible moment.
 *
 * It is the SAME corner pill the cognitive cards wear for "FREE" — geometry
 * copied from `cornerBadge` there rather than rebuilt from tokens, so the two
 * screens cannot drift. Renders as a sibling of the card fill (not inside it):
 * the fill clips its overflow, and this deliberately hangs off the corner.
 *
 * It shows readiness rather than a bare count on purpose. With payments off
 * the count is only ever 1 or 0, and "0 LEFT" is a wall — it tells somebody
 * the thing they came for is gone and gives them nothing to do about it.
 * "IN 4 DAYS" is the same fact with a way forward, which is the rule this
 * product holds everywhere else: never a dead end.
 *
 * Every number is decided by the server (`freeCallAvailable`,
 * `nextFreeCallAt`) and never re-derived locally — the seven days roll from
 * the user's last call, and the gate that enforces it runs under a row lock.
 * A second implementation in the app would eventually disagree, and this badge
 * disagreeing with the gate is exactly the failure it exists to prevent.
 */
const CallAllowanceBadge: React.FC = () => {
  const { colors } = useTheme();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // On focus, not on mount: React Navigation keeps this screen alive behind
  // the call flow, so a badge fetched once would still read "READY" after the
  // user came back from spending it.
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

  const allowance = describeAllowance(wallet);
  // Nothing to say beats guessing. A server that doesn't send the free-call
  // fields yet, a failed fetch, or a state we can't describe all land here —
  // and a card with no badge is honest, where a wrong badge is not.
  if (!allowance) return null;

  // Green is the app's "go" — the cognitive cards' FREE badge. A countdown has
  // to look like the neutral fact it is, or every card claims to be available.
  const background = allowance.ready
    ? colors.accent.success
    : colors.surface.default;
  const foreground = allowance.ready
    ? colors.accentOn.success
    : colors.text.secondary;

  return (
    <View style={[styles.cornerBadge, { backgroundColor: background }]}>
      <Text variant="label" color={foreground}>
        {allowance.label}
      </Text>
    </View>
  );
};

export default CallAllowanceBadge;

const styles = StyleSheet.create({
  // Copied verbatim from CognitivePractice's `cornerBadge` — same pill, same
  // overhang, same stacking. Do not re-derive these from tokens.
  cornerBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
});
