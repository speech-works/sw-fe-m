import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import InterviewFace from "../../../../../assets/sw-faces/InterviewFace";
import RoboticPhoneFace from "../../../../../assets/sw-faces/RoboticPhoneFace";
import WiseFace from "../../../../../assets/sw-faces/WiseFace";
import PressableScale from "../../../../../components/PressableScale";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import {
  EDPStackNavigationProp,
  EDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/types";
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
type ExposureAccent = "info" | "success" | "warning" | "purple" | "danger";

const Exposure = () => {
  const navigation =
    useNavigation<EDPStackNavigationProp<keyof EDPStackParamList>>();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("Exposure summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const exposureData: Array<{
    title: string;
    subtitle: string;
    onPress: () => void;
    icon: React.ReactNode;
    accent: ExposureAccent;
    disabled: boolean;
  }> = [
    {
      title: "Social Challenges",
      subtitle: "Practice uneasy conversations",
      onPress: () => navigation.navigate("SocialChallengeStack"),
      icon: <WiseFace size={80} />,
      accent: "warning", // amber
      disabled: false,
    },
    {
      title: "Interview Simulation",
      subtitle: "AI-powered practice",
      onPress: () => navigation.navigate("InterviewSimulationStack"),
      icon: <InterviewFace size={80} />,
      accent: "danger", // rose/red
      disabled: false,
    },
    {
      title: "AI Phone Calls",
      subtitle: "Speak freely, without hesitation",
      onPress: () => navigation.navigate("PhoneCallStack"),
      icon: <RoboticPhoneFace size={80} />,
      accent: "purple", // pink → next-closest distinct role
      disabled: false,
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "EXPOSURE_PRACTICE",
  );

  return (
    <Page
      title="Exposure"
      description="Face your fears and build confidence with real-world scenarios."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {exposureData.map((item, index) => {
          const on = colors.accentOn[item.accent];
          return (
            <PressableScale
              key={index}
              onPress={item.onPress}
              disabled={item.disabled}
              scaleTo={0.97}
              style={[styles.cardWrapper, item.disabled && { opacity: 0.8 }]}
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

                {!item.disabled ? (
                  /* Start affordance — a small surface chip (the in-app card-chip pattern). */
                  <View
                    style={[
                      styles.startChip,
                      { backgroundColor: colors.surface.default },
                    ]}
                  >
                    <Icon
                      name={icons.play}
                      size={12}
                      color={colors.text.primary}
                    />
                    <Text variant="label" color="primary">
                      Start
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.startChip,
                      { backgroundColor: colors.surface.control },
                    ]}
                  >
                    <Icon
                      name={icons.locked}
                      size={12}
                      color={colors.text.secondary}
                    />
                    <Text variant="label" color="secondary">
                      Locked
                    </Text>
                  </View>
                )}
              </View>
            </PressableScale>
          );
        })}
      </View>

      <PracticeCategoryProgressCard
        summary={summary ?? null}
        title="Your Courage Track"
        subtitle="Weekly exposure stays front and center. Lifetime courage stays visible too."
        badgeLabel="Exposure"
        accent="danger"
      />
    </Page>
  );
};

export default Exposure;

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
