import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  PracticeIcon,
  haloAccentFor,
} from "../../../assets/practice-icons/PracticeIcon";
import { usePracticeCategorySummaryStore } from "../../../stores/practiceCategorySummary";
import { useUserStore } from "../../../stores/user";
import {
  useTheme,
  spacing,
  space,
  radius,
  Text,
} from "../../../design-system";
import PressableScale from "../../../components/PressableScale";

// We need to navigate deep into DailyPracticeStack
type RootStackParamList = {
  DailyPracticeStack: {
    screen:
      | "ReadingPracticeStack"
      | "FunPracticeStack"
      | "CognitivePracticeStack"
      | "ExposureStack";
  };
};

type Practice = {
  name: string;
  subtitle: string;
  weeklyCount: number;
  badge?: string;
  /** Practice-icon registry key (the face-free object system). */
  iconKey: "reading" | "fun" | "cognitive" | "exposure";
  route: string;
  /** Vivid energy accent — keys of `colors.accent`/`colors.accentOn` (Community-card pattern).
   *  Chosen distinct + to contrast each card's avatar plate. */
  accent: "info" | "warning" | "danger" | "purple";
};

const PracticeGrid = (_props: { isScrolling?: boolean }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, elevation } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("PracticeGrid summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const getCount = useCallback(
    (type: string) => {
      return (
        categories.find((category) => category.contentType === type)?.weekly
          .completedCount || 0
      );
    },
    [categories],
  );

  const practices = useMemo<Practice[]>(
    () => [
      {
        name: "Reading",
        subtitle: "Read Aloud",
        weeklyCount: getCount("READING_PRACTICE"),
        iconKey: "reading",
        route: "ReadingPracticeStack",
        accent: "info",
      },
      {
        name: "Fun",
        subtitle: "Expression",
        weeklyCount: getCount("FUN_PRACTICE"),
        iconKey: "fun",
        route: "FunPracticeStack",
        accent: "warning",
      },
      {
        name: "Cognitive",
        subtitle: "Focus",
        weeklyCount: getCount("COGNITIVE_PRACTICE"),
        // No category-level FREE badge: only Breathing + Meditation are free;
        // Reframe and Mirror Work cost stamina. Item-level badges stay accurate.
        iconKey: "cognitive",
        route: "CognitivePracticeStack",
        accent: "danger",
      },
      {
        name: "Exposure",
        subtitle: "Courage",
        weeklyCount: getCount("EXPOSURE_PRACTICE"),
        iconKey: "exposure",
        route: "ExposureStack",
        accent: "purple",
      },
    ],
    [getCount],
  );

  const handlePress = (route: string) => {
    // @ts-ignore - Simple navigation wrapper
    navigation.navigate("DailyPracticeStack", { screen: route });
  };

  return (
    <View style={styles.container}>
      <Text variant="h3">Jump In</Text>
      <View style={styles.grid}>
        {practices.map((p, i) => {
          const on = colors.accentOn[p.accent];
          return (
            <PressableScale
              key={i}
              onPress={() => handlePress(p.route)}
              scaleTo={0.97}
              style={styles.cardWrapper}
            >
              {/* Solid vivid accent fill + dark on-text — the Community card pattern. */}
              <View style={[styles.cardFill, { backgroundColor: colors.accent[p.accent] }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerRow}>
                    <Text variant="label" color={on} style={styles.subtitleCaps}>
                      {p.subtitle}
                    </Text>
                    {/* Count chip — a small dark surface chip (the in-app card-chip pattern). */}
                    <View style={[styles.countBadge, { backgroundColor: colors.surface.default }]}>
                      <Text variant="caption" color="primary">{p.weeklyCount}</Text>
                    </View>
                  </View>
                  <Text variant="h3" color={on}>{p.name}</Text>
                </View>
                <View style={styles.iconWrapper} pointerEvents="none">
                  {/* Halo contrasts the card fill so the icon never vanishes into it. */}
                  <PracticeIcon
                    name={p.iconKey}
                    size={64}
                    housing={colors.accent[haloAccentFor(p.accent)]}
                  />
                </View>
              </View>

              {p.badge ? (
                <View style={[styles.cornerBadge, { backgroundColor: colors.accent.success }, elevation.e2]}>
                  <Text variant="caption" color={colors.accentOn.success} style={styles.cornerBadgeText}>
                    {p.badge}
                  </Text>
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(PracticeGrid);

const styles = StyleSheet.create({
  container: {
    gap: space.groupGap,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Push to edges
    rowGap: space.groupGap, // Vertical gap
  },
  cardWrapper: {
    width: "48%", // Force 2 columns
    aspectRatio: 0.9, // Keep consistent shape (slightly taller than square)
    borderRadius: radius.card,
  },
  cardFill: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  cardHeader: {
    zIndex: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtitleCaps: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  iconWrapper: {
    alignSelf: "flex-end",
    marginTop: "auto",
    // Make icon pop out slightly
    transform: [{ scale: 1.1 }, { translateY: 5 }, { translateX: 5 }],
  },
  countBadge: {
    minWidth: spacing["2xl"],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cornerBadge: {
    position: "absolute",
    top: -spacing.sm,
    right: -spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
  cornerBadgeText: {
    textTransform: "uppercase",
  },
});
