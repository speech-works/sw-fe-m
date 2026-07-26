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
  const [failed, setFailed] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const load = useCallback(async () => {
    try {
      const data = await getOffers();
      setOffers(data);
      setFailed(false);
    } catch (err) {
      console.error("[ForYou] Failed to load offers", err);
      // Only surface a failure when there is nothing already on screen. The
      // sibling card learned this the hard way: a refetch that set an error
      // state replaced a perfectly good recommendation with an error card on
      // one flaky request.
      setOffers((prev) => {
        if (!prev) setFailed(true);
        return prev;
      });
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

  // Nothing to suggest — owns everything, empty catalogue, or no signal at all.
  // Silence would leave a hole where a recommendation was, which is the exact
  // regression the "never render nothing" note on the sibling card warns about,
  // so this fills the slot the deleted browse-fallback branch used to fill.
  if (selection.items.length === 0) {
    if (failed || !offers) {
      // No second error card: SmartRecommendationCard already owns that, and
      // two red cards on Home is worse than one honest fallback.
      return (
        <RecHeroCard
          style={style}
          eyebrow="PROGRAMS"
          title="Find your next program"
          ctaLabel="Browse programs"
          onPress={goToPrograms}
        />
      );
    }
    return null;
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
