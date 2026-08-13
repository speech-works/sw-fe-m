import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, getWallet, type Offers } from "../api";
import {
  purchaseProductById,
  pollWalletUntil,
} from "../services/purchases";
import { size, Text, Button, Icon, Sheet, space, spacing, useTheme } from "../design-system";
import { useStorePrices } from "../hooks/useStorePrices";
import { resolvePriceDisplay } from "../services/priceDisplay";
// This sheet sells `sw.membership.*`, an AUTO-RENEWING subscription, so it is a
// purchase surface in Apple's sense and owes the same disclosures the main
// paywall carries: the renewal terms, a Terms of Use link, a Privacy Policy
// link, and Restore Purchases (Guideline 3.1.2). It had none of them. A
// reviewer reaches this sheet just by running out of call credits.
// Same hook and same constants as `screens/Payments`, deliberately, so there is
// one restore path and one pair of URLs rather than a second copy to drift.
import { useRestorePurchases } from "../hooks/useRestorePurchases";
import { handleLinkPress } from "../util/functions/externalLinks";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "../screens/Auth/constants";

interface ExhaustionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called once a purchase actually landed (credits or membership) so the caller can retry starting the call. */
  onResolved: () => void;
  /** Fires after the sheet has FULLY animated out. Anything that presents its
   *  own native modal — a toast, a prompt — must wait for this, or it stacks on
   *  a sheet that is still on screen and freezes touches app-wide. */
  onDismissed?: () => void;
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
  onDismissed,
}) => {
  const { colors } = useTheme();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState<"credits" | "membership" | null>(null);
  const { restoring, restore } = useRestorePurchases();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Local-currency prices for the two fixed SKUs. Empty ⇒ INR fallback.
  const { prices: storePrices } = useStorePrices([
    offers?.topup?.productId,
    offers?.membership?.productId,
  ]);
  const topupPrice = offers?.topup
    ? resolvePriceDisplay({
        store: storePrices[offers.topup.productId],
        inr: offers.topup.priceInr,
        usd: offers.topup.priceUsd,
      }).price
    : null;
  const membershipPrice = offers?.membership
    ? resolvePriceDisplay({
        store: storePrices[offers.membership.productId],
        inr: offers.membership.priceInr,
        usd: offers.membership.priceUsd,
      }).price
    : null;

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
    /* NO `title` PROP. The Sheet's title floats ABOVE the card on the backdrop,
       which left "Out of calls" hanging in the dark with its own explanation
       sealed in a box below it. A heading belongs with the thing it heads. */
    /* `exclusive`: this is fired by an EVENT (a 402 mid-call), not by a tap, so
       it can arrive while the consent modal or a prompt is already up. Two
       native Modals presented at once freeze touches across the whole app on
       iOS, so it waits for the registry to clear instead of stacking. */
    <Sheet visible={visible} onClose={onClose} onDismissed={onDismissed} exclusive>
      <View style={styles.content}>
        {/* Title and body are one block, tight together — they are a single
            thought. The actions get the wider gap below. */}
        <View style={styles.copyBlock}>
          <Text variant="h2" color="primary">
            Out of calls
          </Text>
          {/* LEADS WITH THE FREE OPTION. Someone who has just been stopped from
              doing the thing they came to do should hear what they already have
              before they hear a price — and the free weekly call is the more
              reassuring fact anyway.

              "one free call a week" is a standing fact rather than a date. The
              reset is seven days from their LAST call, so "comes back next
              week" is right for some people and wrong for others; naming the
              shape is true for everyone. */}
          <Text variant="body" color="secondary">
            You get one free call a week. Top up if you&apos;d rather not wait
            for the next one.
          </Text>
        </View>

        <View style={styles.actions}>
          {/*
            Product ids AND prices come from GET /users/me/offers — never from a
            literal here. A hardcoded "₹99" is a price that goes stale silently
            the day we change it, and the user gets charged something other than
            what the button promised. Until offers load we show the button
            disabled with no price rather than guessing one.

            NO leftIcon. The DS Button locks its label to one line and shrinks
            the type to fit; an icon takes width from that same row, so a phone
            glyph here bought nothing and made "Get 2 calls · ₹99" the first
            thing to go small. The price is the point — it should be full size.
          */}
          <Button
            label={
              offers?.topup
                ? `Get ${offers.topup.credits} calls · ${topupPrice}`
                : "Get more calls"
            }
            loading={purchasing === "credits"}
            disabled={purchasing !== null || !offers?.topup}
            onPress={handleBuyCredits}
          />

          {offers?.showMembershipOffer && offers.membership ? (
            <Button
              label={`Membership · ${membershipPrice}/month`}
              variant="secondary"
              loading={purchasing === "membership"}
              disabled={purchasing !== null}
              onPress={handleBuyMembership}
            />
          ) : null}
        </View>

        {/* Renewal terms, only when the auto-renewing product is on screen. The
            credit top-up is a consumable and renews nothing, so saying so there
            would be false. */}
        {offers?.showMembershipOffer && offers.membership ? (
          <Text variant="caption" color="tertiary" center style={styles.renewal}>
            {membershipPrice} per month. Renews automatically unless cancelled 24
            hours before the period ends.
          </Text>
        ) : null}

        {/* Restore, Terms and Privacy stay on the sheet whichever offer shows.
            Apple looks for Restore on the purchase surface itself, and a buyer
            who already paid on another device needs it here, not three taps
            away in Settings. */}
        <View style={styles.legalRow}>
          <Text
            variant="caption"
            color="tertiary"
            style={styles.legalLink}
            onPress={restoring || purchasing !== null ? undefined : restore}
          >
            {restoring ? "Restoring…" : "Restore Purchases"}
          </Text>
          <Text variant="caption" color="tertiary">·</Text>
          <Text
            variant="caption"
            color="tertiary"
            style={styles.legalLink}
            onPress={() => handleLinkPress(TERMS_OF_USE_URL)}
          >
            Terms of Use
          </Text>
          <Text variant="caption" color="tertiary">·</Text>
          <Text
            variant="caption"
            color="tertiary"
            style={styles.legalLink}
            onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
          >
            Privacy Policy
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorRow}>
            <Icon
              name="alert-circle"
              size={size.iconInline}
              color={colors.feedback.dangerText}
            />
            <Text
              variant="caption"
              color={colors.feedback.dangerText}
              style={styles.errorText}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* A TEXT LINK, NOT A GHOST BUTTON. As a full-width ghost this rendered
            in the brand orange at button scale — a second thing the same colour
            and nearly the same weight as the actual call to action, which is
            how a sheet ends up with two primary-looking choices. Declining is
            the exception here, so it should look like one. */}
        <Text
          variant="bodySm"
          color="secondary"
          center
          style={styles.dismiss}
          onPress={purchasing === null ? onClose : undefined}
        >
          Not now
        </Text>
      </View>
    </Sheet>
  );
};

export default ExhaustionSheet;

const styles = StyleSheet.create({
  // No paddingBottom: the dismiss row carries its own, and doubling them was
  // most of the dead space under the buttons.
  content: {
    gap: space.sectionGap,
  },
  // Heading and explanation are one thought, so they sit close.
  copyBlock: {
    gap: space.titleSub,
  },
  // The two offers are alternatives to each other, so they group tighter than
  // they do to the copy above.
  actions: {
    gap: spacing.sm,
  },
  // Sits directly under the buttons: the terms belong to the offer, not to the
  // sheet, so the gap to the buttons is smaller than the gap to anything else.
  renewal: {
    marginTop: -spacing.xs,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  dismiss: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
