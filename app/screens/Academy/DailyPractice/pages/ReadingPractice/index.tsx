import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  PracticeIcon,
  haloAccentFor,
} from "../../../../../assets/practice-icons/PracticeIcon";
import PressableScale from "../../../../../components/PressableScale";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ReadingPracticeStack/types";
import { usePracticeCategorySummaryStore } from "../../../../../stores/practiceCategorySummary";
import { useUserStore } from "../../../../../stores/user";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../../../../design-system";
import { ReadingAccent, readingPracticeAccents } from "./data";

const ReadingPractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("ReadingPractice summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const readingPracticeData: Array<{
    title: string;
    subtitle: string;
    onPress: () => void;
    iconName: string;
    accent: ReadingAccent;
  }> = [
    {
      title: "Words",
      subtitle: "Focus on single words",
      onPress: () => navigation.navigate("WordPractice"),
      iconName: "reading-words",
      accent: readingPracticeAccents.word,
    },
    {
      title: "Phrases",
      subtitle: "Glide effortlessly on the airflow",
      onPress: () => navigation.navigate("PhrasePractice"),
      iconName: "reading-phrases",
      accent: readingPracticeAccents.phrase,
    },
    {
      title: "Quotes",
      subtitle: "Inspirational quotes",
      onPress: () => navigation.navigate("QuotePractice"),
      iconName: "reading-quotes",
      accent: readingPracticeAccents.quote,
    },
    {
      title: "Poems",
      subtitle: "Verses & rhymes",
      onPress: () => navigation.navigate("PoemPractice"),
      iconName: "reading-poems",
      accent: readingPracticeAccents.poem,
    },
    {
      title: "Stories",
      subtitle: "Short stories & tales",
      onPress: () => navigation.navigate("StoryPractice"),
      iconName: "reading-stories",
      accent: readingPracticeAccents.story,
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "READING_PRACTICE",
  );

  return (
    <Page
      title="Reading Practice"
      description="Choose your favorite way to read and practice speech."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {readingPracticeData.map((item, index) => {
          const on = colors.accentOn[item.accent];
          return (
            <PressableScale
              key={index}
              onPress={item.onPress}
              scaleTo={0.97}
              style={styles.cardWrapper}
            >
              {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
              <View
                style={[
                  styles.cardFill,
                  { backgroundColor: colors.accent[item.accent] },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.copy}>
                    <Text variant="h3" color={on}>
                      {item.title}
                    </Text>
                    <Text variant="body" color={on} style={styles.subtitle}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={styles.iconContainer} pointerEvents="none">
                    <View style={styles.iconWrapper}>
                      {/* Halo contrasts the card fill so the icon stays visible. */}
                      <PracticeIcon
                        name={item.iconName}
                        size={80}
                        housing={colors.accent[haloAccentFor(item.accent)]}
                      />
                    </View>
                  </View>
                </View>

                {/* Start affordance — a small surface chip (the in-app card-chip pattern). */}
                <View
                  style={[
                    styles.startChip,
                    { backgroundColor: colors.surface.default },
                  ]}
                >
                  <Icon name={icons.play} size={12} color={colors.text.primary} />
                  <Text variant="label" color="primary">
                    Start
                  </Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <PracticeCategoryProgressCard
        summary={summary ?? null}
        title="Your Reading Rhythm"
        subtitle="Weekly practice stays up front. Lifetime progress stays in view."
        badgeLabel="Reading"
        accent="info"
      />
    </Page>
  );
};

export default ReadingPractice;

const styles = StyleSheet.create({
  cardsContainer: {
    gap: spacing.lg,
  },
  cardWrapper: {
    borderRadius: radius.card,
  },
  cardFill: {
    borderRadius: radius.card,
    padding: spacing.xl,
    height: 140,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 1,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xxs,
  },
  iconContainer: {
    position: "absolute",
    right: -20,
    bottom: -50,
    zIndex: 0,
  },
  iconWrapper: {
    transform: [{ scale: 1.2 }, { rotate: "-10deg" }],
    opacity: 0.9,
  },
  startChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    alignSelf: "flex-start",
    zIndex: 2,
  },
});
