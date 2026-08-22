import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem } from "../../api";
import { getPackBrochure, getPackProgress, restartPack } from "../../api/packs";
import { selectOffer } from "../../util/packs/offers";
import { PackBrochure, PackProgress } from "../../api/packs/types";
import { purchaseCatalogItem, pollWalletUntil } from "../../services/purchases";
import {
  size,
  Button,
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  Spinner,
} from "../../design-system";
import ProgramSalesFlow from "./ProgramSalesFlow";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../util/functions/bottomSheet";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
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
  /**
   * Whether the first-purchase bonus month would ACTUALLY be granted to this
   * user. The backend gives it to first-time pack buyers only, so this gates
   * every mention of it — advertising a gift a repeat buyer won't receive is
   * the same shown≠charged harm as a wrong price.
   */
  const [bonusEligible, setBonusEligible] = useState(false);
  const [brochure, setBrochure] = useState<PackBrochure | null>(null);
  const [owned, setOwned] = useState(false);
  /**
   * ── OWNING A PROGRAM USED TO BE A DEAD END ────────────────────────────────
   * This screen said "You own this. It's unlocked." and offered no way in. The
   * list card that got you here goes to this screen for owned packs too, so the
   * only route back into something you had paid for was Home's For-you shelf,
   * which shows the ACTIVE program and nothing else.
   *
   * PackModule cannot work this out for itself: handed a `packId` with no
   * `moduleId` it logs "No module ID provided" and renders nothing. So the
   * screen that offers the button has to know which day the button opens.
   */
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Funnel: the recommendation→click→DETAIL step. Fires once per opened
  // program, independent of how the user got here (Home rec, shop, deep link).
  useEffect(() => {
    track(ANALYTICS_EVENTS.PROGRAM_DETAIL_VIEWED, { catalogKey, packId });
  }, [catalogKey, packId]);

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
        setBonusEligible(offers.bonusMembershipEligible);
        setOwned(match?.owned ?? false);
        // Only for owners: for everybody else the endpoint is a 403 and the
        // sales flow needs nothing from it.
        if (match?.owned && match.packId) {
          getPackProgress(match.packId)
            .then(setProgress)
            .catch(() => {
              /* The button falls back to "Open", which PackModule can still
                 resolve from day one. Never worth blocking the screen. */
            });
        }
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
    // Funnel: bottom of the recommendation → purchase chain. `planId` is the
    // tier SKU key; `catalogKey` ties it back to the recommended pack.
    const payProps = {
      planId: offer.key,
      catalogKey,
      amountInr: offer.priceInr,
    };
    track(ANALYTICS_EVENTS.PAYMENT_STARTED, payProps);
    try {
      const outcome = await purchaseCatalogItem(offer.key);
      if (outcome.status !== "purchased") {
        // Not completed: a user cancel or a store error. `reason` separates the
        // two so an abandonment isn't read as a genuine payment failure.
        track(ANALYTICS_EVENTS.PAYMENT_FAILED, {
          ...payProps,
          reason: outcome.status === "error" ? outcome.message : outcome.status,
        });
      }
      if (outcome.status === "purchased") {
        track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, payProps);
        const wallet = await pollWalletUntil((w) =>
          w.entitlements.includes(`pack:${offer.key}`),
        );
        if (wallet) {
          setOwned(true);
          // CLAIM THE GIFT — but only once the wallet proves it landed.
          // The bonus membership month is granted silently by the webhook and
          // was never mentioned anywhere in the app, which wasted the single
          // most generous thing we do. Read it back from the wallet rather
          // than assuming from pre-purchase eligibility: a race, a refund or a
          // changed rule must never produce a congratulation for a gift the
          // user did not actually get.
          if (wallet.entitlements.includes("membership")) {
            setBonusEligible(false); // spent — never advertise it twice
            showSuccessBottomSheet(
              "You're in. The first month is on us",
              "Your program is unlocked, plus a free month of membership: 4 AI practice calls to use whenever you want them.",
            );
          }
        } else {
          showErrorBottomSheet(
            "Almost there",
            "Your purchase went through but is still being confirmed. It should appear shortly.",
          );
        }
      }
    } catch (error) {
      console.error("[ProgramDetail] Purchase failed:", error);
      track(ANALYTICS_EVENTS.PAYMENT_FAILED, { ...payProps, reason: "exception" });
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

  /**
   * What the owned screen can honestly offer, in three states.
   *
   * The middle one is the one worth having: today's work is DONE and tomorrow
   * has not opened, so there is nothing to press. A button there would either
   * lie or dump them on a locked day, and this feature has spent a lot of
   * effort not doing that to people.
   */
  const ownedState = (() => {
    if (!progress) {
      return {
        line: "You own this. It's unlocked.",
        cta: "Open",
        canOpen: true,
        finished: false,
        moduleId: undefined as string | undefined,
      };
    }
    const finished = progress.packStatus === "COMPLETED";
    if (finished) {
      return {
        line: "You finished this one.",
        cta: "Start again from day one",
        canOpen: true,
        finished: true,
        moduleId: undefined,
      };
    }
    const open = progress.modules.find(
      (m) =>
        m.dayIndex != null &&
        m.dayIndex === progress.nextIncompleteDay &&
        m.status !== "COMPLETED" &&
        m.unlocked !== false,
    );
    if (open) {
      const started = progress.modules.some((m) => m.status === "COMPLETED");
      return {
        line: "You own this. It's unlocked.",
        cta: started ? "Continue" : "Start day one",
        canOpen: true,
        finished: false,
        moduleId: open.moduleId,
      };
    }
    return {
      line: "That's today done. The next day opens tomorrow.",
      cta: "",
      canOpen: false,
      finished: false,
      moduleId: undefined,
    };
  })();

  const openOwned = async () => {
    if (!offer.packId || opening) return;
    setOpening(true);
    try {
      // Awaited, not raced: PackModule reads progress on open, so a restart
      // fired alongside the navigation would land them on a day that has not
      // been cleared yet.
      if (ownedState.finished) await restartPack(offer.packId);
      navigation.navigate("PackModule", {
        packId: offer.packId,
        moduleId: ownedState.moduleId,
      });
    } catch (err) {
      console.error("Could not open the program", err);
    } finally {
      setOpening(false);
    }
  };

  // OWNED — a calm confirmation with the curriculum recap, no buy affordance.
  // Kept on the standard Page (the sales funnel is only for the buyable state).
  if (owned) {
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
                <Icon name={icons.timeline} size={size.iconInline} color={colors.text.secondary} />
                <Text variant="label" color="secondary">
                  {dayCount} days
                </Text>
              </View>
            ) : null}
            {moduleCount > 0 ? (
              <View style={styles.metaChip}>
                <Icon name={icons.checklist} size={size.iconInline} color={colors.text.secondary} />
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

        <View style={styles.ownedRow}>
          <Icon name={icons.success} size={size.iconSm} color={colors.feedback.successText} />
          <Text variant="title" color={colors.feedback.successText}>
            {ownedState.line}
          </Text>
        </View>

        {/* THE WAY IN. Without this the screen was a receipt. */}
        {ownedState.canOpen ? (
          <Button
            label={ownedState.cta}
            leftIcon={ownedState.finished ? icons.refresh : icons.play}
            loading={opening}
            onPress={openOwned}
          />
        ) : null}
      </Page>
    );
  }

  // NOT OWNED — the immersive, conversion-focused sales flow. Every honesty rule
  // above still holds: the flow only PRESENTS the offer/brochure it's handed and
  // buys through this screen's `handleBuy`; it computes no price and invents no
  // proof. The bonus-month gate is threaded through as `bonusEligible`.
  return (
    <ProgramSalesFlow
      brochure={brochure}
      offer={offer}
      isFounder={isFounder}
      bonusEligible={bonusEligible}
      purchasing={purchasing}
      onBuy={handleBuy}
      onBack={() => navigation.goBack()}
    />
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
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
});
