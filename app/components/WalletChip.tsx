import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getWallet } from "../api";
import { PAYMENTS_ENABLED } from "../constants/features";
import { Text, Icon, icons, useTheme, spacing, radius } from "../design-system";

interface WalletChipProps {
  /** Bump this (e.g. a counter) to force a re-fetch — same pattern as Home's `refreshKey`. */
  refreshKey?: number | string;
}

/**
 * Small pill showing the user's remaining call-credit balance
 * (SPEECHWORKS-STRATEGY.md §6.2). Renders nothing while payments are off or
 * before the first fetch resolves — this is a "nice to know", never a
 * loading spinner blocking the screen.
 */
const WalletChip: React.FC<WalletChipProps> = ({ refreshKey }) => {
  const { colors } = useTheme();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(() => {
    if (!PAYMENTS_ENABLED) return;
    getWallet()
      .then((wallet) => setBalance(wallet.balance))
      .catch((error) => console.error("[WalletChip] Failed to fetch wallet:", error));
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshKey]);

  if (!PAYMENTS_ENABLED || balance === null) return null;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.surface.control, borderColor: colors.border.hairline },
      ]}
    >
      <Icon name={icons.call} size={12} color={colors.text.secondary} />
      <Text variant="caption" color="secondary">
        {balance}
      </Text>
    </View>
  );
};

export default WalletChip;

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
