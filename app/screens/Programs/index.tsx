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
  borderWidth,
  withAlpha,
  Spinner,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import RecHeroCard, { CTA_ICON } from "../../components/Dashboard/RecHeroCard";
import TopMatchBadge, {
  BADGE_OVERHANG,
  BADGE_LANE,
} from "../../components/Dashboard/TopMatchBadge";
import { programEyebrow } from "../../util/packs/offers";
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

const ProgramsScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Programs">>();
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";
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

  /**
   * The matched hero — the most valuable card on the screen, and it was reading
   * like the least finished one: the loudest fill in the app ending in a naked
   * chevron, while the plain rows beneath it had a proper CTA island. It now
   * carries the same badge, eyebrow and island as everywhere else, so what makes
   * it special is the orange and the scale, not a different set of parts.
   */
  const renderHero = (item: OfferItem) => {
    const ink = colors.action.onPrimary;
    // A solid dark island on the bright fill — the one high-contrast shape a
    // bright surface allows, and the same pill the shop rows and the Home
    // carousel end with.
    const islandBg = isDark ? colors.action.secondary : colors.surface.inverse;
    const islandInk = isDark ? colors.action.onSecondary : colors.text.primary;

    return (
      // The badge is a SIBLING of the fill, not a child — the fill clips to its
      // own radius so the watermark stays inside it, and a child badge would be
      // cropped at exactly the corner it is meant to hang off.
      <PressableScale
        key={item.key}
        scaleTo={0.98}
        onPress={() => openDetail(item)}
        style={styles.heroWrap}
      >
        <View style={[styles.hero, { backgroundColor: colors.action.primary }]}>
          <View style={styles.heroWatermark} pointerEvents="none">
            <Icon name={icons.roadmap} size={150} color={withAlpha(ink, 0.12)} />
          </View>

          <View style={styles.heroContent}>
            {/* The factual line the rows below use, so the hero and the list
                describe a program the same way. The claim is the badge. */}
            <Text
              variant="label"
              color={ink}
              numberOfLines={1}
              style={styles.eyebrowClear}
            >
              {programEyebrow(item)}
            </Text>

            <Text variant="h2" color={ink}>
              {item.title}
            </Text>
            {item.match?.reason ? (
              <Text variant="body" color={ink}>
                {item.match.reason}
              </Text>
            ) : null}

            {/* The old "7 days" line here said the same thing as the eyebrow now
                does, one line apart. Only the value line is left. */}
            {valueLine(item) ? (
              <Text variant="bodySm" color={ink} style={styles.heroMeta}>
                {valueLine(item)}
              </Text>
            ) : null}

            <View style={styles.heroFooter}>
              {/* `ink` is not optional here. Without it PriceTag falls back to
                  the canvas `text.primary`, which is near-white on the dark
                  scheme — about 2:1 on this orange fill. Every other on-fill
                  price in the app passes the fill's own dark ink; this one was
                  missed. */}
              {item.owned ? null : (
                <PriceTag
                  priceInr={item.priceInr}
                  anchorInr={item.anchorPriceInr}
                  compact
                  ink={ink}
                />
              )}
              {/* No edge: `styles.cta`'s hairline exists to make a neutral
                  control visible on paper. A solid dark island on a bright fill
                  already has all the edge it needs. */}
              <View
                style={[styles.cta, { backgroundColor: islandBg, borderWidth: 0 }]}
              >
                <Icon name={icons.journey} size={CTA_ICON} color={islandInk} />
                <Text variant="title" color={islandInk} numberOfLines={1}>
                  {item.owned ? "Open your program" : "See inside"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TopMatchBadge />
      </PressableScale>
    );
  };

  /**
   * A shop row, in the same language as the Home carousel slide it links from:
   * eyebrow → title → why → footer with the price beside a real CTA island. A
   * product should not change shape between the two screens that sell it.
   *
   * WHAT THIS REPLACED, so it doesn't come back. The card was five equal-weight
   * rows — every one a full-width `space-between` line at the same 8px pitch —
   * so nothing led and the eye had no entry point. Three of them were also
   * broken:
   *   · title and price shared the header row, so a two-line title floated the
   *     price to its vertical middle and no two cards agreed on where the price
   *     sat;
   *   · the meta row put two texts in a `space-between` with no `flexShrink`,
   *     so the longer one ran off the right edge of the card ("…membership fr");
   *   · the reason was orange text on a 12% orange tint — about 1.5:1, the exact
   *     pairing the conventions call out, and `action.primary` as a text colour
   *     also trips the design-system's own dev warning on every render.
   * Shelf and length moved up into the eyebrow, which frees the header for the
   * title, kills the overflowing row outright, and gives the price the footer.
   */
  const renderCard = (item: OfferItem) => {
    const value = valueLine(item);
    const reason = item.match?.reason ?? null;

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
        <View style={styles.cardBody}>
          <Text variant="label" color="tertiary">
            {programEyebrow(item)}
          </Text>
          <Text variant="h3" color="primary">
            {item.title}
          </Text>
          {item.blurb ? (
            <Text variant="bodySm" color="secondary" numberOfLines={2}>
              {item.blurb}
            </Text>
          ) : null}
        </View>

        {/* Only when the server sent a reason it can stand behind. Bare accent
            copy, not a chip: `accent` is the per-scheme foreground cut, and the
            colour shift from the `secondary` blurb directly above it is what
            marks this line as being about YOU. */}
        {reason ? (
          <Text variant="bodySm" color="accent" numberOfLines={2}>
            {reason}
          </Text>
        ) : null}

        {value ? (
          <Text variant="caption" color="tertiary">
            {value}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          {item.owned ? (
            <View style={styles.ownedTag}>
              <Icon
                name={icons.success}
                size={16}
                color={colors.feedback.successText}
              />
              <Text variant="title" color={colors.feedback.successText}>
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

          {/* The same island the carousel slide ends with, down to the leading
              glyph. An interactive `surface.control` container is ~1.1:1 on
              paper, so the affordance needs a defined edge — a bare chevron
              simply vanished there. */}
          <View
            style={[
              styles.cta,
              {
                backgroundColor: colors.surface.control,
                borderColor: colors.border.strong,
              },
            ]}
          >
            <Icon
              name={icons.journey}
              size={CTA_ICON}
              color={colors.text.primary}
            />
            <Text variant="title" color="primary" numberOfLines={1}>
              {item.owned ? "Open" : "See inside"}
            </Text>
          </View>
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
          {/*
            THIS CARD STANDS IN THE HERO'S SLOT, and the two are mutually
            exclusive: the hero needs `hasSignal`, this renders only when we
            don't have it. So it is not a small aside above the shop — when it
            shows, it is the ONLY thing at the top of the screen, and the list
            below it is unranked because of the very thing it is asking for.
            A muted bordered row understated all of that.

            It gets the vivid banner treatment for that reason, in LIME rather
            than the default blue: it is not a product, and it must not read as
            one more thing to buy. Nothing else in the shop is lime, and the
            accent is unclaimed elsewhere in the app — the colour alone says
            "this one is different" before a word is read.
          */}
          {!hasSignal ? (
            <RecHeroCard
              accentKey="lime"
              eyebrow="PERSONALISE THIS LIST"
              title="Not sure where to start?"
              subtitle="Answer a few questions and we'll point you to the program built for what you find hardest."
              ctaLabel="Get matched"
              // Not the default pack glyph: this button doesn't open a program,
              // it starts the questions that decide which one to point at.
              ctaIcon={icons.roadmap}
              onPress={startOnboarding}
            />
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
  // Holds the badge's overhang. The fill below clips; this must not.
  heroWrap: {
    paddingTop: BADGE_OVERHANG,
  },
  hero: {
    borderRadius: radius.card,
    overflow: "hidden",
    padding: spacing.xl,
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
    marginTop: spacing.xs,
  },
  // The badge is absolutely positioned and takes no space, so the eyebrow keeps
  // this lane clear rather than running under it.
  eyebrowClear: {
    marginRight: BADGE_LANE,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  sectionHeading: {
    // A heading belongs to what's UNDER it. `Page`'s uniform gap sits it
    // equidistant from both neighbours, so this buys back the difference.
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
    // Blocks, not rows. The tight `titleSub` pitch inside `cardBody` binds the
    // eyebrow/title/blurb into ONE thing; this gap is what separates it from
    // the reason, the value line and the footer.
    gap: space.rowGap,
    // No marginBottom — `Page` already puts `space.groupGap` between children,
    // and the old margin stacked on top of it for a 28px trench between cards.
  },
  cardBody: {
    gap: space.titleSub,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
  },
  ownedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
