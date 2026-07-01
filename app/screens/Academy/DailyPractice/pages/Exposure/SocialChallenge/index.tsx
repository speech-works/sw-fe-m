import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../../../components/PressableScale";
import {
  SCEDPStackNavigationProp,
  SCEDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/SocialChallengeStack/types";
import { useRoute } from "@react-navigation/native";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../../../../../design-system";

import { getExposurePracticeByType } from "../../../../../../api/dailyPractice";
import {
  ExposurePractice,
  ExposurePracticeType,
} from "../../../../../../api/dailyPractice/types";

/** Vivid accent role per scenario card — cycles so each row stays distinct while
 *  the whole list lives on the dark canvas (the PracticeGrid solid-accent recipe). */
type ExposureAccent = "info" | "success" | "warning" | "purple" | "danger";
const ACCENTS: ExposureAccent[] = [
  "info",
  "success",
  "purple",
  "warning",
  "danger",
];

const SocialChallenge = () => {
  const route = useRoute();
  const [socialChallengesList, setSocialChallengesList] = useState<
    ExposurePractice[]
  >([]);
  const { colors } = useTheme();

  useEffect(() => {
    const fetchSCDetails = async () => {
      const socialChallenges = await getExposurePracticeByType(
        ExposurePracticeType.SOCIAL_CHALLENGE_SIMULATION,
      );
      setSocialChallengesList(socialChallenges);

      // If an ID is passed from recommendations, auto-navigate to its briefing
      const recommendedId = (route.params as any)?.id;
      if (recommendedId) {
        const found = socialChallenges.find((sc) => sc.id === recommendedId);
        if (found) {
          navigation.navigate("SCBriefing", {
            sc: found,
          });
        }
      }
    };
    fetchSCDetails();
  }, [route.params]);

  const navigation =
    useNavigation<SCEDPStackNavigationProp<keyof SCEDPStackParamList>>();

  return (
    <Page
      title="Social Challenges"
      description="Navigate tricky social situations with poise."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {socialChallengesList.map((sc, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const on = colors.accentOn[accent];
          return (
            <PressableScale
              key={sc.id}
              onPress={() => {
                navigation.navigate("SCBriefing", {
                  sc,
                });
              }}
              scaleTo={0.97}
              style={styles.cardWrapper}
            >
              {/* Solid vivid accent fill + dark on-text — the PracticeGrid card recipe. */}
              <View
                style={[
                  styles.cardFill,
                  { backgroundColor: colors.accent[accent] },
                ]}
              >
                <View style={styles.copy}>
                  <Text variant="h3" color={on}>
                    {sc.name}
                  </Text>
                  <Text
                    variant="body"
                    color={on}
                    style={styles.subtitle}
                    numberOfLines={2}
                  >
                    {sc.description}
                  </Text>
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
    </Page>
  );
};

export default SocialChallenge;

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
    minHeight: 140,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  copy: {
    zIndex: 1,
  },
  subtitle: {
    marginTop: spacing.xxs,
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
