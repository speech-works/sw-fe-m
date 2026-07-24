import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem, type Offers } from "../../api";
import { getActiveOnboardingFlow } from "../../api/onboarding";
import PriceTag from "../../components/PriceTag";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  space,
  withAlpha,
  Spinner,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useOnboardingStore } from "../../stores/onboarding";
import { ExploreStackNavigationProp } from "../../navigators/stacks/ExploreStack/types";

/**
 * THE SHOP — every program we sell, ranked for the person looking at it.
 *
 * Two rules govern this screen:
 *
 * 1. EVERY WORD ABOUT A PRODUCT COMES FROM THE SERVER. The screen used to
 *    hardcode one product's title, pitch and bullets, with a `?? items[0]`
 *    fallback that would render a DIFFERENT pack under that heading at that
 *    other pack's price. Nothing here is written in the app.
 *
 * 2. A "MATCHED TO YOU" BADGE MUST BE EARNED. The backend only sends `match`
 *    when a real onboarding signal justifies it, and `signalLevel: "none"`
 *    means it has nothing to go on. In that state this screen shows NO badges
 *    at all and asks them to finish onboarding instead — a fabricated match is
 *    worse than no match, and it is the one thing that would make this screen
 *    feel like an ad rather than a guide.
 *
 * Order is the server's ranking, not price. Cheapest-first taught nobody
 * anything; "closest to what you told us" is the whole point.
 */

/** Small factual chip per shelf — replaces the old cheap-first shelf sections. */
const SHELF_LABEL: Record<OfferItem["shelf"], string> = {
  small: "Focused",
  regular: "Full program",
  deep: "Deep work",
};

const ProgramsScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Programs">>();
  const { colors } = useTheme();
  const { emit } = useEventStore();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Refetched on focus so returning from a purchase shows the pack as owned
  // without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setFailed(false);
      getOffers()
        .then((data) => {
          if (cancelled) return;
          setOffers(data);
        })
        .catch((error) => {
          console.error("[Programs] Failed to load offers:", error);
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openDetail = (item: OfferItem) => {
    navigation.navigate("ProgramDetail", {
      catalogKey: item.key,
      packId: item.packId,
    });
  };

  const startOnboarding = async () => {
    try {
      const state = useOnboardingStore.getState();
      if (!state.flow) {
        const flow = await getActiveOnboardingFlow();
        state.startFresh(flow);
      }
      emit(EVENT_NAMES.START_ONBOARDING);
    } catch (err) {
      console.error("[Programs] Failed to open onboarding flow:", err);
    }
  };

  /** The "+ what you also get" line. Server data only, and the free month is
   *  gated on real eligibility — a repeat buyer never sees a gift we withhold. */
  const valueLine = (item: OfferItem): string | null => {
    const parts: string[] = [];
    if (item.creditGrantAmount > 0) {
      parts.push(`${item.creditGrantAmount} AI practice calls`);
    }
    if (item.bonusMembershipDays > 0 && offers?.bonusMembershipEligible) {
      parts.push("first month of membership free");
    }
    return parts.length ? `Includes ${parts.join(" · ")}` : null;
  };

  const renderHero = (item: OfferItem) => (
    <PressableScale
      key={item.key}
      scaleTo={0.98}
      onPress={() => openDetail(item)}
      style={[styles.hero, { backgroundColor: colors.action.primary }]}
    >
      <View style={styles.heroWatermark} pointerEvents="none">
        <Icon
          name={icons.roadmap}
          size={150}
          color={withAlpha(colors.action.onPrimary, 0.12)}
        />
      </View>

      <View style={styles.heroContent}>
        <Text variant="label" color={colors.action.onPrimary}>
          MATCHED TO YOU
        </Text>
        <Text variant="h2" color={colors.action.onPrimary}>
          {item.title}
        </Text>
        {item.match?.reason ? (
          <Text variant="body" color={colors.action.onPrimary}>
            {item.match.reason}
          </Text>
        ) : null}

        <View style={styles.heroMeta}>
          {item.arcDays ? (
            <Text variant="bodySm" color={colors.action.onPrimary}>
              {item.arcDays} days
            </Text>
          ) : null}
          {valueLine(item) ? (
            <Text variant="bodySm" color={colors.action.onPrimary}>
              {valueLine(item)}
            </Text>
          ) : null}
        </View>

        <View style={styles.heroFooter}>
          {item.owned ? (
            <Text variant="title" color={colors.action.onPrimary}>
              Open your program
            </Text>
          ) : (
            <PriceTag
              priceInr={item.priceInr}
              anchorInr={item.anchorPriceInr}
              compact
            />
          )}
          <Icon
            name={icons.chevronRight}
            size={18}
            color={colors.action.onPrimary}
          />
        </View>
      </View>
    </PressableScale>
  );

  const renderCard = (item: OfferItem) => {
    const value = valueLine(item);
    return (
      <PressableScale
        key={item.key}
        scaleTo={0.98}
        onPress={() => openDetail(item)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text variant="title" color="primary" style={styles.cardTitle}>
            {item.title}
          </Text>
          {item.owned ? (
            <View style={styles.ownedTag}>
              <Icon
                name={icons.success}
                size={14}
                color={colors.feedback.successText}
              />
              <Text variant="label" color={colors.feedback.successText}>
                Owned
              </Text>
            </View>
          ) : (
            <PriceTag
              priceInr={item.priceInr}
              anchorInr={item.anchorPriceInr}
              compact
            />
          )}
        </View>

        {item.blurb ? (
          <Text variant="bodySm" color="secondary" numberOfLines={2}>
            {item.blurb}
          </Text>
        ) : null}

        {/* Badge only when the server sent a reason it can stand behind. */}
        {item.match?.reason ? (
          <View
            style={[
              styles.matchRow,
              { backgroundColor: withAlpha(colors.action.primary, 0.12) },
            ]}
          >
            <Icon name={icons.success} size={12} color={colors.action.primary} />
            <Text variant="caption" color={colors.action.primary} style={styles.matchText}>
              {item.match.reason}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text variant="caption" color="tertiary">
            {SHELF_LABEL[item.shelf]}
            {item.arcDays ? ` · ${item.arcDays} days` : ""}
          </Text>
          {value ? (
            <Text variant="caption" color="tertiary" numberOfLines={1}>
              {value}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <Text variant="bodySm" color="tertiary">
            {item.owned ? "Open your program" : "See what's inside"}
          </Text>
          <Icon
            name={icons.chevronRight}
            size={16}
            color={colors.text.tertiary}
          />
        </View>
      </PressableScale>
    );
  };

  const items = offers?.items ?? [];
  // With no signal the backend sends no badges at all; the hero would be an
  // unearned recommendation, so the list stays flat and we ask for the one
  // thing that would let us actually help.
  const hasSignal = offers?.signalLevel !== "none";
  const heroItem = hasSignal
    ? items.find((i) => i.match?.level === "top" && !i.owned)
    : undefined;
  const restItems = heroItem ? items.filter((i) => i.key !== heroItem.key) : items;

  return (
    <Page
      title="Programs"
      description="Guided programs built around one situation at a time. Buy once, yours to keep."
      onBack={() => navigation.goBack()}
    >
      {loading ? (
        <View style={styles.centered}>
          <Spinner label="Loading programs…" />
        </View>
      ) : failed ? (
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            We couldn&apos;t load the programs just now. Pull back and try again
            in a moment.
          </Text>
        </View>
      ) : items.length === 0 ? (
        // Deliberately not an error: an empty catalog is a normal state before
        // anything is on sale, and it should read as "nothing yet", not "broken".
        <View style={styles.centered}>
          <Text variant="body" color="secondary" center>
            No programs are available right now. Check back soon.
          </Text>
        </View>
      ) : (
        <>
          {!hasSignal ? (
            <PressableScale
              scaleTo={0.99}
              onPress={startOnboarding}
              style={[
                styles.prompt,
                {
                  backgroundColor: colors.surface.default,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <Icon name={icons.roadmap} size={20} color={colors.action.primary} />
              <View style={styles.promptText}>
                <Text variant="title" color="primary">
                  Not sure where to start?
                </Text>
                <Text variant="bodySm" color="secondary">
                  Answer a few questions and we&apos;ll point you to the program
                  built for what you find hardest.
                </Text>
              </View>
              <Icon
                name={icons.chevronRight}
                size={16}
                color={colors.text.tertiary}
              />
            </PressableScale>
          ) : null}

          {heroItem ? renderHero(heroItem) : null}

          {heroItem ? (
            <Text variant="h3" color="primary" style={styles.sectionHeading}>
              More programs
            </Text>
          ) : null}

          {restItems.map(renderCard)}
        </>
      )}
    </Page>
  );
};

export default ProgramsScreen;

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing["3xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  promptText: {
    flex: 1,
    gap: spacing.xxs,
  },
  hero: {
    borderRadius: radius.card,
    overflow: "hidden",
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroWatermark: {
    position: "absolute",
    top: -24,
    right: -40,
    transform: [{ rotate: "-15deg" }],
  },
  heroContent: {
    gap: space.inlineGap,
    zIndex: 1,
  },
  heroMeta: {
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  sectionHeading: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    alignSelf: "flex-start",
  },
  matchText: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ownedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
