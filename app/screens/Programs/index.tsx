import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem } from "../../api";
import { purchaseCatalogItem, pollWalletUntil } from "../../services/purchases";
import {
  Page,
  Text,
  Button,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../design-system";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";

const VALUE_STACK: { icon: keyof typeof icons; label: string }[] = [
  { icon: "call", label: "10 AI phone-call practice sessions, spread across 14 days" },
  { icon: "energy", label: "A 14-day guided arc — reading, cognitive, and exposure drills building up to interview day" },
  { icon: "win", label: "2 buddy mock-interview modules (or 2 bonus AI calls if you're practicing solo)" },
  { icon: "locked", label: "Yours to keep forever — no expiry, restart anytime" },
];

/**
 * The Interview Ready pack purchase screen (Phase E — purchase mechanics
 * only; the day-by-day content/gating itself is Phase F). Price and
 * founder-cohort gating come from GET /users/me/offers; ownership state
 * comes from GET /users/me/wallet's entitlements list — never from the
 * RevenueCat SDK directly (PAYMENTS-PLAN.md §2, backend is the source of truth).
 */
const ProgramsScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  // Flagship pack for this screen. The catalog can hold many; Phase E ships
  // the Interview Ready detail page. `item` carries its resolved tier + price.
  const [item, setItem] = useState<OfferItem | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOffers()
      .then((offers) => {
        if (cancelled) return;
        const hero =
          offers.items.find((i) => i.key === "interview_ready") ??
          offers.items[0] ??
          null;
        setItem(hero);
        setIsFounder(offers.isFounderCohort);
        setOwned(hero?.owned ?? false);
      })
      .catch((error) => {
        console.error("[Programs] Failed to load offers:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBuy = async () => {
    if (!item) return;
    setPurchasing(true);
    try {
      const outcome = await purchaseCatalogItem(item.key);
      if (outcome.status === "purchased") {
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes(`pack:${item.key}`),
        );
        if (wallet) {
          setOwned(true);
        } else {
          showErrorBottomSheet(
            "Almost there",
            "Your purchase went through, but it's taking longer than usual to unlock. Pull to refresh in a moment.",
          );
        }
      } else if (outcome.status === "error") {
        showErrorBottomSheet("Purchase failed", outcome.message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Page
      title="Interview Ready"
      description="A focused 14-day program for your next interview, presentation, or phone-heavy job."
      onBack={() => navigation.goBack()}
    >
      <View style={[styles.card, { backgroundColor: colors.surface.default, borderColor: colors.border.default }]}>
        {VALUE_STACK.map((item) => (
          <View key={item.label} style={styles.row}>
            <Icon name={icons[item.icon]} size={18} color={colors.action.primary} />
            <Text variant="bodySm" color="secondary" style={styles.rowText}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {owned ? (
        <View style={styles.ownedRow}>
          <Icon name="check-circle" size={18} color={colors.feedback.successText} />
          <Text variant="title" color={colors.feedback.successText}>
            You own this — Interview Ready is unlocked.
          </Text>
        </View>
      ) : (
        <>
          {isFounder && item ? (
            <View style={styles.priceRow}>
              <Text variant="bodySm" color="tertiary" style={styles.strikethrough}>
                ₹999
              </Text>
              <Text variant="h2" color="primary">
                ₹{item.priceInr}
              </Text>
            </View>
          ) : item ? (
            <Text variant="h2" color="primary" center style={styles.price}>
              ₹{item.priceInr}
            </Text>
          ) : null}

          <Button
            label={loading ? "Loading…" : `Get Interview Ready`}
            loading={purchasing}
            disabled={loading || !item}
            onPress={handleBuy}
          />
        </>
      )}
    </Page>
  );
};

export default ProgramsScreen;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  price: {
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
});
