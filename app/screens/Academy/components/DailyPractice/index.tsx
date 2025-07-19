import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import Button from "../../../../components/Button";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";

import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";
import { useSessionStore } from "../../../../stores/session";
import { isSameDay, isValid } from "date-fns";
import { getUserPreferences } from "../../../../api/settings/userPreference";
import { getAllPracticeActivitiesBySessionId } from "../../../../api";

interface DailyPracticeProps {
  onClickStart: () => void;
}
const DailyPractice = ({ onClickStart }: DailyPracticeProps) => {
  const { practiceSession } = useSessionStore();
  const [targetMinutes, setTargetMinutes] = useState(15);
  const [achievedMinutes, setAchievedMinutes] = useState(0);
  let isSessionFresh = false;

  if (practiceSession?.startedAt) {
    const sessionDate = practiceSession.startedAt;
    const currentDate = new Date();
    if (isValid(sessionDate)) {
      isSessionFresh = isSameDay(sessionDate, currentDate);
    } else {
      console.warn(
        "DailyPractice: practiceSession.startedAt is NOT a valid Date object."
      );
    }
  }

  const navigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();

  const moveToDailyPractice = () => {
    !isSessionFresh && onClickStart();
    navigation.navigate("DailyPracticeStack");
  };

  useEffect(() => {
    if (!practiceSession?.user) return;
    getUserPreferences(practiceSession.user.id)
      .then((preferences) => {
        setTargetMinutes(preferences?.dailyPracticeLimitMinutes || 15);
      })
      .catch(() => {
        setTargetMinutes(15);
      });
  }, []);

  useEffect(() => {
    if (!practiceSession) return;
    getAllPracticeActivitiesBySessionId({ sessionId: practiceSession.id })
      .then((activities) => {
        let totalAchievedMinutes = 0;
        const completedActivities = activities.filter(
          (activity) => activity.status === "COMPLETED"
        );

        completedActivities.forEach((activity) => {
          if (
            activity.completedAt &&
            isValid(activity.startedAt) &&
            isValid(activity.completedAt)
          ) {
            const durationMs =
              activity.completedAt.getTime() - activity.startedAt.getTime();
            const durationMinutes = durationMs / (1000 * 60);
            totalAchievedMinutes += durationMinutes;
          }
        });
        setAchievedMinutes(Math.round(totalAchievedMinutes));
      })
      .catch((error) => {
        console.error("DailyPractice - Error fetching activities:", error);
      });
  }, [practiceSession]);

  const getDynamicMessage = () => {
    const percentage = (achievedMinutes / targetMinutes) * 100;
    if (percentage === 0) return "Let’s begin your speaking journey!";
    if (percentage < 25) return "Just getting started — keep it up!";
    if (percentage < 50) return "You're warming up — stay focused!";
    if (percentage < 75) return "You're halfway there — keep going strong!";
    if (percentage < 100) return "Almost done — finish strong!";
    return "You've completed your goal — well done!";
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.gap16]}>
        <View style={styles.iconCircle}>
          <Icon
            name="microphone"
            size={24}
            color={theme.colors.actionPrimary.default}
          />
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.textGroup}>
            <Text style={styles.titleText}>Daily Practice</Text>
            <Text style={styles.messageText}>{getDynamicMessage()}</Text>
          </View>
          <Text style={styles.progressText}>
            {achievedMinutes}/{targetMinutes} min
          </Text>
        </View>
      </View>

      <Button
        text={`${isSessionFresh ? "Resume" : "Start"} Session`}
        onPress={moveToDailyPractice}
      />
    </View>
  );
};

export default DailyPractice;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
    padding: 24,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 12,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  messageText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    maxWidth: 180,
  },
  gap16: {
    gap: 16,
  },
  detailsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "500",
    flexShrink: 0,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: theme.colors.actionPrimary.default,
    justifyContent: "center",
    alignItems: "center",
  },
});
