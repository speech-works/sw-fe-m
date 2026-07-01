import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../../../../components/PressableScale";
import {
  InterviewEDPStackNavigationProp,
  InterviewEDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/ExposureStack/InterviewSimulationStack/types";
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
  "purple",
  "danger",
  "info",
  "warning",
  "success",
];

const Interview = () => {
  const [interviewList, setInterviewList] = useState<ExposurePractice[]>([]);
  const { colors } = useTheme();

  useEffect(() => {
    const fetchInterviewDetails = async () => {
      const interviews = await getExposurePracticeByType(
        ExposurePracticeType.INTERVIEW_SIMULATION,
      );
      setInterviewList(interviews);
    };
    fetchInterviewDetails();
  }, []);

  const navigation =
    useNavigation<
      InterviewEDPStackNavigationProp<keyof InterviewEDPStackParamList>
    >();

  return (
    <Page
      title="Interviews"
      description="Ace the interview — confidence in every question."
      onBack={() => navigation.goBack()}
    >
      <View style={styles.cardsContainer}>
        {interviewList.map((interview, i) => {
          const accent = ACCENTS[i % ACCENTS.length];
          const on = colors.accentOn[accent];
          return (
            <PressableScale
              key={interview.id}
              onPress={() => {
                navigation.navigate("InterviewBriefing", {
                  interview,
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
                    {interview.name}
                  </Text>
                  <Text
                    variant="body"
                    color={on}
                    style={styles.subtitle}
                    numberOfLines={2}
                  >
                    {interview.description}
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

export default Interview;

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
