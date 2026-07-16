import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import PressableScale from "../../../components/PressableScale";
import {
  DPStackNavigationProp,
  DPStackParamList,
} from "../../../navigators/stacks/ExploreStack/DailyPracticeStack/types";
import {
  Page,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../../design-system";

import ReaderFace from "../../../assets/mood-check/ReaderFace";
import BreathingFace from "../../../assets/sw-faces/BreathingFace";
import ExposureFace from "../../../assets/sw-faces/ExposureFace";
import MovieFace from "../../../assets/sw-faces/MovieFace";
import { useEventStore } from "../../../stores/events";
import { EVENT_NAMES } from "../../../stores/events/constants";
import { useUserStore } from "../../../stores/user";

/** Vivid accent role per hub entry — keeps each card distinct while the whole
 *  list lives on the dark canvas (the PracticeGrid solid-accent recipe). */
type HubAccent = "info" | "success" | "warning" | "purple" | "danger";

const DailyPractice = () => {
  const navigation =
    useNavigation<DPStackNavigationProp<keyof DPStackParamList>>();
  const { emit } = useEventStore();
  const { colors } = useTheme();

  const moveToReadingPractice = () => {
    navigation.navigate("ReadingPracticeStack");
  };

  const moveToFunPractice = () => {
    navigation.navigate("FunPracticeStack");
  };
  const moveToCognitiveTherapy = () => {
    navigation.navigate("CognitivePracticeStack");
  };
  const moveToExposure = () => {
    navigation.navigate("ExposureStack");
  };

  const { user } = useUserStore();
  const hasCompletedOnboarding = user?.hasCompletedOnboarding ?? false;

  const dailyPracticeData: Array<{
    title: string;
    description: string;
    onPress: () => void;
    icon: React.ReactNode;
    accent: HubAccent;
  }> = [
    // Show the structured daily assessment only after onboarding is complete
    ...(hasCompletedOnboarding
      ? [
          {
            title: "Daily Check-in",
            description: "Complete your 7-Day Pulse",
            onPress: () => navigation.navigate("ImpactAssessmentIntro"),
            icon: (
              <FAIcon
                name="calendar-check"
                size={52}
                color={colors.accentOn.info}
              />
            ),
            accent: "info" as HubAccent,
          },
        ]
      : [
          // Otherwise show "Complete Profile" to nudge them to finish onboarding
          {
            title: "Complete Profile",
            description: "Finish your clinical intake",
            onPress: () => emit(EVENT_NAMES.START_ONBOARDING), // Trigger onboarding via event store
            icon: (
              <FAIcon
                name="user-clock"
                size={52}
                color={colors.accentOn.info}
              />
            ),
            accent: "info" as HubAccent,
          },
        ]),
    {
      title: "Fun Activities",
      description: "Playful speech practice",
      onPress: moveToFunPractice,
      icon: <MovieFace size={52} />,
      accent: "success",
    },
    {
      title: "Reading Practice",
      description: "Guided reading exercises",
      onPress: moveToReadingPractice,
      icon: <ReaderFace size={52} />,
      accent: "warning",
    },
    {
      title: "Cognitive Therapy",
      description: "Mental exercises & techniques",
      onPress: moveToCognitiveTherapy,
      icon: <BreathingFace size={52} />,
      accent: "purple",
    },
    {
      title: "Exposure",
      description: "Real-world speaking scenarios",
      onPress: moveToExposure,
      icon: <ExposureFace size={52} />,
      accent: "danger",
    },
  ];

  return (
    <Page title="Daily Practice" onBack={() => navigation.goBack()}>
      <View style={styles.listContainer}>
        {dailyPracticeData.map((item, index) => {
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
                  <View style={styles.iconWrapper}>{item.icon}</View>
                  <View style={styles.copy}>
                    <Text variant="h3" color={on}>
                      {item.title}
                    </Text>
                    <Text
                      variant="bodySm"
                      color={on}
                      style={styles.description}
                    >
                      {item.description}
                    </Text>
                  </View>
                </View>

                {/* Navigate affordance — a small surface chip (the in-app card-chip pattern). */}
                <View
                  style={[
                    styles.chevronChip,
                    { backgroundColor: colors.surface.default },
                  ]}
                >
                  <Icon
                    name={icons.chevronRight}
                    size={16}
                    color={colors.text.primary}
                  />
                </View>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </Page>
  );
};

export default DailyPractice;

const styles = StyleSheet.create({
  listContainer: {
    gap: spacing.lg,
  },
  cardWrapper: {
    borderRadius: radius.card,
  },
  cardFill: {
    borderRadius: radius.card,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    flex: 1,
    zIndex: 1,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  copy: {
    flexShrink: 1,
  },
  description: {
    marginTop: spacing.xxs,
  },
  chevronChip: {
    width: 32,
    height: 32,
    borderRadius: radius.chip,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
