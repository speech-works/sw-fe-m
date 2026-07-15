import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, getWallet, type Offers } from "../api";
import {
  purchaseProductById,
  pollWalletUntil,
} from "../services/purchases";
import { Text, Button, Icon, icons, Sheet, useTheme, spacing } from "../design-system";

interface ExhaustionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called once a purchase actually landed (credits or membership) so the caller can retry starting the call. */
  onResolved: () => void;
}

/**
 * Shown when starting a phone-call activity 402s with NO_CREDITS
 * (SPEECHWORKS-STRATEGY.md §6.2, "Flow A"). Offers a small credit top-up, and
 * membership only if the backend says this user is a pack alumnus (the
 * "one door at a time" rule — GET /users/me/offers.showMembershipOffer).
 */
const ExhaustionSheet: React.FC<ExhaustionSheetProps> = ({
  visible,
  onClose,
  onResolved,
}) => {
  const { colors } = useTheme();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<"credits" | "membership" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setErrorMessage(null);
    Promise.all([getOffers(), getWallet()])
      .then(([offersRes, walletRes]) => {
        setOffers(offersRes);
        setStartingBalance(walletRes.balance);
      })
      .catch((error) => {
        console.error("[ExhaustionSheet] Failed to load offers/wallet:", error);
      });
  }, [visible]);

  const handleBuyCredits = async () => {
    if (!offers?.topup) return;
    setErrorMessage(null);
    setPurchasing("credits");
    try {
      const outcome = await purchaseProductById(offers.topup.productId);
      if (outcome.status === "purchased") {
        const wallet = await pollWalletUntil(
          (w) => startingBalance === null || w.balance > startingBalance,
        );
        if (wallet) {
          onResolved();
          return;
        }
        setErrorMessage(
          "Purchase went through, but it's taking longer than usual to show up. Try closing and reopening the call.",
        );
      } else if (outcome.status === "error") {
        setErrorMessage(outcome.message);
      }
      // "cancelled": user backed out of the store sheet — no message needed.
    } finally {
      setPurchasing(null);
    }
  };

  const handleBuyMembership = async () => {
    if (!offers?.membership) return;
    setErrorMessage(null);
    setPurchasing("membership");
    try {
      const outcome = await purchaseProductById(offers.membership.productId);
      if (outcome.status === "purchased") {
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes("membership"),
        );
        if (wallet) {
          onResolved();
          return;
        }
        setErrorMessage(
          "Purchase went through, but it's taking longer than usual to show up. Try closing and reopening the call.",
        );
      } else if (outcome.status === "error") {
        setErrorMessage(outcome.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Out of calls">
      <View style={styles.content}>
        <Text variant="body" color="secondary" center>
          You&apos;re out of AI call credits for now. Your free weekly call
          comes back next week — or top up to keep going today.
        </Text>

        {/*
          Product ids AND prices come from GET /users/me/offers — never from a
          literal here. A hardcoded "₹99" is a price that goes stale silently the
          day we change it, and the user gets charged something other than what
          the button promised. Until offers load we show the button disabled with
          no price rather than guessing one.
        */}
        <Button
          label={
            offers?.topup
              ? `Get ${offers.topup.credits} calls — ₹${offers.topup.priceInr}`
              : "Get more calls"
          }
          leftIcon={icons.call}
          loading={purchasing === "credits"}
          disabled={purchasing !== null || !offers?.topup}
          onPress={handleBuyCredits}
        />

        {offers?.showMembershipOffer && offers.membership ? (
          <Button
            label={`Membership — ₹${offers.membership.priceInr}/month`}
            variant="secondary"
            leftIcon={icons.energy}
            loading={purchasing === "membership"}
            disabled={purchasing !== null}
            onPress={handleBuyMembership}
          />
        ) : null}

        {errorMessage ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={14} color={colors.feedback.dangerText} />
            <Text variant="caption" color={colors.feedback.dangerText}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <Button
          label="Not now"
          variant="ghost"
          disabled={purchasing !== null}
          onPress={onClose}
        />
      </View>
    </Sheet>
  );
};

export default ExhaustionSheet;

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
  },
});
