import React, { useCallback, useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getOffers, Offers, OfferItem } from "../../api/users";
import { selectForYou } from "../../util/packs/forYou";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import OfferSlide, { SLIDE_MIN_HEIGHT } from "./OfferSlide";
import RecHeroCard from "./RecHeroCard";
import {
  Carousel,
  Skeleton,
  Text,
  TextLink,
  radius,
  space,
} from "../../design-system";

/**
 * The programs shelf on Home — three, not one.
 *
 * Home used to show a single pack, because it asked an endpoint that returns
 * exactly one. The shop endpoint has always returned all ten, already ranked,
 * each tagged `match: { level, reason }` — and the `"strong"` tier was read
 * NOWHERE in the app. We ranked ten and sold one.
 *
 * THIS COMPONENT IS THE ONLY THING ON HOME THAT SELLS. `SmartRecommendationCard`
 * keeps "what to do today" (your in-progress pack, or "today's work is done")
 * and no longer offers anything. One owner means no coordination to get wrong:
 * the alternative — keeping its top-pick card and starting this carousel at
 * `items[1]` — is exactly the positional shortcut `offers.ts` forbids after it
 * once shipped the wrong pack at the wrong price.
 */

export interface ForYouCarouselProps {
  style?: StyleProp<ViewStyle>;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const ForYouCarousel: React.FC<ForYouCarouselProps> = ({ style }) => {
  const navigation = useNavigation<any>();
  const [offers, setOffers] = useState<Offers | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  const load = useCallback(async () => {
    try {
      const data = await getOffers();
      setOffers(data);

      // ── Funnel: recommendation_shown ────────────────────────────────────
      // Fired here, once per settled fetch — NOT on render (this component
      // re-renders on every parent update) and NOT on carousel settle
      // (`onIndexChange` fires through runOnJS on every swipe and would spam
      // one event per flick). `mode` comes from the same call the render uses,
      // so the event can never claim a card that wasn't shown.
      const shown = selectForYou(data);
      if (shown.mode !== "hidden") {
        track(ANALYTICS_EVENTS.RECOMMENDATION_SHOWN, {
          surface: "home_for_you",
          variant: shown.mode === "carousel" ? "carousel" : "browse_fallback",
          state: null,
          signalLevel: data.signalLevel ?? null,
          count: shown.items.length,
          catalogKey: shown.items[0]?.key ?? null,
          packId: shown.items[0]?.packId ?? null,
          priceInr: shown.items[0]?.priceInr ?? null,
          hasMatchReason: shown.highlightFirst,
          remaining: shown.remaining,
        });
      }
    } catch (err) {
      // Deliberately does NOT clear `offers`. The sibling card learned this the
      // hard way: a refetch that set an error state on failure replaced a
      // perfectly good recommendation with an error card on one flaky request.
      // Keeping the last good data means a dropped connection changes nothing
      // on screen.
      console.error("[ForYou] Failed to load offers", err);
    } finally {
      setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Do NOT add `&& !loading` here. `load` is useCallback(..., []) and
      // therefore permanently stable, so this callback is built once and
      // captures `loading` at its initial `true` forever — the guard would
      // become dead code and every focus would refetch. (Documented at length
      // on SmartRecommendationCard, where it was a live bug.)
      if (Date.now() - lastFetchRef.current < STALE_THRESHOLD_MS) return;
      load();
    }, [load]),
  );

  const selection = selectForYou(offers);

  const openDetail = (item: OfferItem) => {
    track(ANALYTICS_EVENTS.PACK_CLICKED, {
      source: "home_for_you",
      catalogKey: item.key,
      packId: item.packId,
      priceInr: item.priceInr,
      hasMatchReason: !!item.match?.reason,
      position: selection.items.findIndex((i) => i.key === item.key),
    });
    navigation.navigate("ExploreStack", {
      screen: "ProgramDetail",
      params: { catalogKey: item.key, packId: item.packId },
    });
  };

  const goToPrograms = () =>
    navigation.navigate("ExploreStack", { screen: "Programs" });

  // First load. Deliberately no heading over the skeleton — a heading claims a
  // section that may never appear (a no-signal user gets the browse card, which
  // has none). Matching the slide height means no layout jump either way.
  if (loading && !offers) {
    return (
      <View style={style}>
        <Skeleton height={SLIDE_MIN_HEIGHT} radius={radius.card} />
      </View>
    );
  }

  // `selectForYou` already decided which of the three this is — deliberately,
  // so this cannot drift from the analytics above.
  if (selection.mode === "hidden") return null;

  if (selection.mode === "browse") {
    // No second error card even when the fetch failed: SmartRecommendationCard
    // already owns that, and two red cards on Home is worse than one honest
    // fallback. No eyebrow claim, no badge — we have nothing to back one.
    return (
      <RecHeroCard
        style={style}
        eyebrow="PROGRAMS"
        title="Find your next program"
        subtitle="Guided, day-by-day plans for the situations that feel hardest."
        ctaLabel="Browse programs"
        onPress={goToPrograms}
      />
    );
  }

  return (
    <View style={style}>
      <Text variant="h3" color="primary" style={styles.heading}>
        For you
      </Text>

      <Carousel
        data={selection.items}
        keyExtractor={(i) => i.key}
        renderItem={({ item, index }) => (
          <OfferSlide
            item={item}
            highlight={index === 0 && selection.highlightFirst}
            onPress={openDetail}
          />
        )}
      />

      {selection.remaining > 0 ? (
        <View style={styles.more}>
          <TextLink label="Show more programs" onPress={goToPrograms} />
        </View>
      ) : null}
    </View>
  );
};

export default ForYouCarousel;

const styles = StyleSheet.create({
  heading: {
    marginBottom: space.rowGap,
  },
  more: {
    marginTop: space.rowGap,
  },
});
