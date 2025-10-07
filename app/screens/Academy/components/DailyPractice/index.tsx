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

        {/* FIX: Removed flex: 1 from detailsContainer and made it a regular view 
           so it respects the inner flow of textGroup and progressText. 
           We now rely on the 'row' style being the primary flex container for the section. 
           I've also moved the progressText into the textGroup for vertical alignment 
           and updated the styles to put it on the right. 
           
           --- Reverting structural change to minimize risk, fixing with flex properties ---
        */}
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
    // NOTE: Keep this for debugging: backgroundColor: "red",
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
    flex: 1, // Takes up the remaining horizontal space in the 'row' container
    flexDirection: "row",
    justifyContent: "space-between", // Pushes textGroup and progressText apart
    alignItems: "flex-start",
    // FIX 1: Set a low max width for the progress text's sibling to guarantee space
    // A better fix is below in textGroup.
  },
  textGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    // FIX 2: Crucial change. Allow textGroup to shrink and use the available space.
    flexShrink: 1,
    flexGrow: 1,
    // FIX 3: Prevent it from taking more space than necessary but allow it to wrap.
    marginRight: 8, // Add a small margin to separate from progressText
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "500",
    // FIX 4: Explicitly stop progressText from shrinking so it maintains its full width.
    flexShrink: 0,
    // Align the text itself to the right
    textAlign: "right",
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
