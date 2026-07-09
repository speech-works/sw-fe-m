import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import GuidedBreathingFace from "../../../../../assets/sw-faces/GuidedBreathingFace";
import MeditationFace from "../../../../../assets/sw-faces/MeditationFace";
import RewiringFace from "../../../../../assets/sw-faces/RewiringFace";
import SparkleMirrorFace from "../../../../../assets/sw-faces/SparkleMirrorFace";
import PressableScale from "../../../../../components/PressableScale";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
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

/** Vivid accent role per sub-category — keeps each card distinct while the whole
 *  list lives on the dark canvas (the PracticeGrid solid-accent recipe). */
type CognitiveAccent = "info" | "success" | "warning" | "purple" | "danger";

const CognitivePractice = () => {
  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("CognitivePractice summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const cognitivePracticeData: Array<{
    title: string;
    subtitle: string;
    onPress: () => void;
    icon: React.ReactNode;
    accent: CognitiveAccent;
    badge?: string;
  }> = [
    {
      title: "Guided Breathing",
      subtitle: "Breathing exercise",
      onPress: () => navigation.navigate("BreathingPractice"),
      icon: <GuidedBreathingFace size={80} shouldAnimate={false} />,
      accent: "danger", // pink/rose
      badge: "FREE",
    },
    {
      title: "Guided Meditation",
      subtitle: "Mindfulness",
      onPress: () => navigation.navigate("MeditationPractice"),
      icon: <MeditationFace size={80} />,
      accent: "purple", // violet
      badge: "FREE",
    },
    {
      title: "Reframe Thoughts",
      subtitle: "Transform negative to positive",
      onPress: () => navigation.navigate("ReframePractice"),
      icon: <RewiringFace size={80} />,
      accent: "info", // indigo → blue
    },
    {
      title: "Mirror Work",
      subtitle: "Secondary behavior & Feedback",
      onPress: () => navigation.navigate("MirrorWorkPrep", { practiceData: {} }),
      icon: <SparkleMirrorFace size={80} />,
      accent: "success", // blue → next-closest distinct role
      badge: "NEW",
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "COGNITIVE_PRACTICE",
  );

  return (
    <Page
      title="Cognitive Therapy"
      description="Strengthen your mind and focus with daily exercises."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {cognitivePracticeData.map((item, index) => {
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
                    <View style={styles.iconWrapper}>{item.icon}</View>
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

              {item.badge && (
                <View
                  style={[
                    styles.cornerBadge,
                    { backgroundColor: colors.accent.success },
                  ]}
                >
                  <Text variant="label" color={colors.accentOn.success}>
                    {item.badge}
                  </Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>

      <PracticeCategoryProgressCard
        summary={summary ?? null}
        title="Your Focus Loop"
        subtitle="This week leads the story. Lifetime work stays visible below."
        badgeLabel="Cognitive"
        accent="purple"
      />
    </Page>
  );
};

export default CognitivePractice;

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
  cornerBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
    zIndex: 10,
  },
});
