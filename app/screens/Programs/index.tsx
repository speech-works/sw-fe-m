import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getOffers, type OfferItem } from "../../api";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
  Spinner,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";
import { groupByShelf } from "../../util/packs/offers";
import { ExploreStackNavigationProp } from "../../navigators/stacks/ExploreStack/types";

/**
 * THE SHOP — every program we sell, not one hardcoded product.
 *
 * This screen used to be the Interview Ready detail page with its title,
 * description, four bullet points and button label typed into the file, and a
 * single line that made it dangerous the day a second product shipped:
 *
 *   offers.items.find(i => i.key === "interview_ready") ?? offers.items[0]
 *
 * Mark Interview Ready unavailable for a day and that `??` silently falls
 * through to whatever happens to be first in the catalog — rendering a
 * DIFFERENT pack under Interview Ready's heading, its bullet points and, worst
 * of all, whatever price that other pack carries. Not a rare race: it needed
 * only a second product to exist.
 *
 * Now: the list is whatever the server says is for sale, and every word about a
 * product comes from the server too. There is no hero, so there is nothing to
 * fall back to.
 */

const SHELF_SECTIONS: {
  shelf: OfferItem["shelf"];
  title: string;
  blurb: string;
}[] = [
  {
    shelf: "small",
    title: "Focused",
    blurb: "One situation, solved. About a week.",
  },
  {
    shelf: "regular",
    title: "Full programs",
    blurb: "A complete arc for something real coming up.",
  },
  {
    shelf: "deep",
    title: "Deep work",
    blurb: "Longer programs with the most support.",
  },
];

const ProgramsScreen = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Programs">>();
  const { colors } = useTheme();
  const [items, setItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Refetched on focus so returning from a purchase shows the pack as owned
  // without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setFailed(false);
      getOffers()
        .then((offers) => {
          if (cancelled) return;
          setItems(offers.items);
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

  const renderCard = (item: OfferItem) => (
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
          <Text variant="title" color="primary">
            ₹{item.priceInr}
          </Text>
        )}
      </View>
      <View style={styles.cardFooter}>
        <Text variant="bodySm" color="tertiary">
          {item.owned ? "Open your program" : "See what's inside"}
        </Text>
        <Icon name={icons.chevronRight} size={16} color={colors.text.tertiary} />
      </View>
    </PressableScale>
  );

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
        // Grouping lives in util/packs/offers so it is testable: empty shelves
        // are dropped (no heading above a gap) and an unrecognised shelf is
        // dropped rather than silently filed under a default that would
        // misdescribe the product.
        groupByShelf(items).map((group) => {
          const section = SHELF_SECTIONS.find((s) => s.shelf === group.shelf);
          if (!section) return null;
          return (
            <View key={group.shelf} style={styles.section}>
              <Text variant="h3" color="primary">
                {section.title}
              </Text>
              <Text variant="bodySm" color="tertiary" style={styles.blurb}>
                {section.blurb}
              </Text>
              {group.items.map(renderCard)}
            </View>
          );
        })
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
  section: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  blurb: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
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
