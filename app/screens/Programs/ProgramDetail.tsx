import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem } from "../../api";
import { getPackBrochure } from "../../api/packs";
import { selectOffer } from "../../util/packs/offers";
import { PackBrochure } from "../../api/packs/types";
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
  Spinner,
} from "../../design-system";
import PriceTag from "../../components/PriceTag";
import { showErrorBottomSheet } from "../../util/functions/bottomSheet";
import {
  ExploreStackNavigationProp,
  ExploreStackRouteProp,
} from "../../navigators/stacks/ExploreStack/types";

/**
 * One program's detail page — every word of it from the server.
 *
 * The pitch, the day count and the curriculum come from
 * GET /packs/{id}/brochure; the price comes from GET /users/me/offers and
 * NOWHERE else. Two sources for a price is how someone is shown one number and
 * charged another, so this screen never computes or hardcodes one.
 *
 * The brochure is safe to fetch before purchase: it carries titles and day
 * numbers, never blocks. See sw-be-2/src/types/packBrochure.types.ts.
 */
const ProgramDetailScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"ProgramDetail">>();
  const route = useRoute<ExploreStackRouteProp<"ProgramDetail">>();
  const { catalogKey, packId } = route.params;
  const { colors } = useTheme();

  const [offer, setOffer] = useState<OfferItem | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [brochure, setBrochure] = useState<PackBrochure | null>(null);
  const [owned, setOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const offers = await getOffers();
        if (cancelled) return;
        // Matched by key with NO fallback. The old screen fell through to
        // `?? items[0]`, which would render a different product under this
        // one's heading and price. Missing means missing.
        const match = selectOffer(offers.items, catalogKey);
        setOffer(match);
        setIsFounder(offers.isFounderCohort);
        setOwned(match?.owned ?? false);
      } catch (error) {
        console.error("[ProgramDetail] Failed to load offer:", error);
      }

      // The curriculum is a nice-to-have: a missing brochure costs the outline,
      // not the ability to buy, so it is fetched separately and failure here
      // does not block the page.
      if (packId) {
        try {
          const b = await getPackBrochure(packId);
          if (!cancelled) setBrochure(b);
        } catch (error) {
          console.error("[ProgramDetail] Failed to load brochure:", error);
        }
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [catalogKey, packId]);

  const handleBuy = async () => {
    if (!offer) return;
    setPurchasing(true);
    try {
      const outcome = await purchaseCatalogItem(offer.key);
      if (outcome.status === "purchased") {
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes(`pack:${offer.key}`),
        );
        if (wallet) {
          setOwned(true);
        } else {
          showErrorBottomSheet(
            "Almost there",
            "Your purchase went through but is still being confirmed. It should appear shortly.",
          );
        }
      }
    } catch (error) {
      console.error("[ProgramDetail] Purchase failed:", error);
      showErrorBottomSheet(
        "Purchase didn't complete",
        "Nothing has been charged. Please try again in a moment.",
      );
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Page title="" onBack={() => navigation.goBack()}>
        <View style={styles.centered}>
          <Spinner label="Loading…" />
        </View>
      </Page>
    );
  }

  // No offer for this key means it is not on sale — retired, or a catalog entry
  // that never shipped. Say so plainly instead of showing a buy button that
  // cannot work.
  if (!offer) {
    return (
      <Page
        title={brochure?.title ?? "Program"}
        onBack={() => navigation.goBack()}
      >
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            This program isn&apos;t available right now.
          </Text>
        </View>
      </Page>
    );
  }

  const dayCount = brochure?.arcDays ?? null;
  const moduleCount = brochure?.moduleCount ?? 0;

  return (
    <Page
      title={brochure?.title ?? offer.title}
      description={brochure?.description}
      onBack={() => navigation.goBack()}
    >
      {(dayCount || moduleCount > 0) && (
        <View style={styles.metaRow}>
          {dayCount ? (
            <View style={styles.metaChip}>
              <Icon name={icons.timeline} size={14} color={colors.text.secondary} />
              <Text variant="label" color="secondary">
                {dayCount} days
              </Text>
            </View>
          ) : null}
          {moduleCount > 0 ? (
            <View style={styles.metaChip}>
              <Icon name={icons.checklist} size={14} color={colors.text.secondary} />
              <Text variant="label" color="secondary">
                {moduleCount} sessions
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {brochure && brochure.modules.length > 0 && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface.default,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Text variant="title" color="primary">
            What&apos;s inside
          </Text>
          {brochure.modules.map((m) => (
            <View key={m.id} style={styles.moduleRow}>
              <Text variant="label" color="tertiary" style={styles.dayLabel}>
                {m.dayIndex ? `Day ${m.dayIndex}` : `${m.orderIndex}`}
              </Text>
              <Text variant="bodySm" color="secondary" style={styles.moduleTitle}>
                {m.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {owned ? (
        <View style={styles.ownedRow}>
          <Icon
            name={icons.success}
            size={18}
            color={colors.feedback.successText}
          />
          <Text variant="title" color={colors.feedback.successText}>
            You own this — it&apos;s unlocked.
          </Text>
        </View>
      ) : (
        <>
          {/* One anchor-driven rule covers BOTH founder and launch-offer
              discounts: PriceTag strikes anchorPriceInr whenever it exceeds the
              charged price. All numbers come from the server, so the struck
              "was" is always a real standing price, never a hardcoded literal. */}
          <View style={styles.priceRow}>
            <PriceTag
              priceInr={offer.priceInr}
              anchorInr={offer.anchorPriceInr}
              center
              note={
                offer.anchorPriceInr > offer.priceInr
                  ? isFounder
                    ? "Founder price"
                    : "Launch offer"
                  : undefined
              }
            />
          </View>

          <Button
            label={`Get ${offer.title}`}
            loading={purchasing}
            onPress={handleBuy}
          />
        </>
      )}
    </Page>
  );
};

export default ProgramDetailScreen;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  dayLabel: {
    minWidth: 52,
  },
  moduleTitle: {
    flex: 1,
  },
  priceRow: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
});
