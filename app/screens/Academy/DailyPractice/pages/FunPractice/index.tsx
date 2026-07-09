import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import HappyScreamFace from "../../../../../assets/sw-faces/HappyScreamFace";
import MaskedFace from "../../../../../assets/sw-faces/MaskedFace";
import TongueTwisterFace from "../../../../../assets/sw-faces/TongueTwisterFace";
import PressableScale from "../../../../../components/PressableScale";
import PracticeCategoryProgressCard from "../../components/PracticeCategoryProgressCard";
import {
  FDPStackNavigationProp,
  FDPStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/types";
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
type FunAccent = "info" | "success" | "warning" | "purple" | "danger";

const FunPractice = () => {
  const navigation =
    useNavigation<FDPStackNavigationProp<keyof FDPStackParamList>>();
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { categories, fetchSummary } = usePracticeCategorySummaryStore();

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) {
        return;
      }

      fetchSummary(user.id).catch((error) => {
        console.error("FunPractice summary error:", error);
      });
    }, [fetchSummary, user?.id]),
  );

  const funPracticeData: Array<{
    title: string;
    subtitle: string;
    onPress: () => void;
    icon: React.ReactNode;
    accent: FunAccent;
  }> = [
    {
      title: "Tongue Twisters",
      subtitle: "Fun speech challenges",
      onPress: () => navigation.navigate("TwisterPracticeStack"),
      icon: <TongueTwisterFace size={80} />,
      accent: "success", // emerald/green
    },
    {
      title: "Role Play",
      subtitle: "Practice situational speech",
      onPress: () => navigation.navigate("RoleplayPracticeStack"),
      icon: <MaskedFace size={80} />,
      accent: "info", // blue
    },
    {
      title: "Character Voice",
      subtitle: "Fun voice effects",
      onPress: () => navigation.navigate("CharacterVoicePracticeStack"),
      icon: <HappyScreamFace size={80} />,
      accent: "purple", // teal → next-closest distinct cool role
    },
  ];

  const summary = categories.find(
    (category) => category.contentType === "FUN_PRACTICE",
  );

  return (
    <Page
      title="Fun Practice"
      description="Express yourself with fun and engaging exercises."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {funPracticeData.map((item, index) => {
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
            </PressableScale>
          );
        })}
      </View>

      <PracticeCategoryProgressCard
        summary={summary ?? null}
        title="Your Expression Pulse"
        subtitle="Weekly practice leads. Lifetime expression stays visible below."
        badgeLabel="Fun"
        accent="success"
      />
    </Page>
  );
};

export default FunPractice;

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
