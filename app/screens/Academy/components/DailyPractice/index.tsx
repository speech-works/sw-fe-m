import { StyleSheet, Text, View } from "react-native";
import React from "react";
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

interface DailyPracticeProps {
  onClickStart: () => void;
}
const DailyPractice = ({ onClickStart }: DailyPracticeProps) => {
  const { practiceSession } = useSessionStore();
  let isSessionFresh = false;

  if (practiceSession?.startedAt) {
    const sessionDate = practiceSession.startedAt; // <-- No manual parsing needed here!

    console.log(
      "DailyPractice - sessionDate (SHOULD BE A DATE OBJECT NOW):",
      sessionDate
    );
    const currentDate = new Date(); // Current date in client's local timezone
    console.log("DailyPractice - currentDate:", currentDate);

    // Check if sessionDate is a valid Date object before comparison
    if (isValid(sessionDate)) {
      isSessionFresh = isSameDay(sessionDate, currentDate);
      console.log("DailyPractice:", {
        isSessionFresh,
        sessionDate,
        currentDate,
      });
    } else {
      // This else block will catch if, for some reason, sessionDate is still not a Date object
      // or if it's an "Invalid Date" object.
      console.warn(
        "DailyPractice: practiceSession.startedAt is NOT a valid Date object. It might still be a string or invalid after rehydration/fetch."
      );
      // You might want to force a re-fetch or clear the session here if this happens frequently.
    }
  }

  console.log("DailyPractice - isSessionFresh final result:", {
    isSessionFresh,
    practiceSession, // This object should now contain Date objects for practiceSession's dates as well
    // For debugging the isSameDay check directly in the log (ensure it's safe to call isSameDay):
    isSameDayCheckInLog:
      practiceSession?.startedAt && isValid(practiceSession.startedAt)
        ? isSameDay(practiceSession.startedAt, new Date())
        : "N/A (sessionDate not valid for comparison)",
  });
  const navigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();

  const moveToDailyPractice = () => {
    !isSessionFresh && onClickStart();
    navigation.navigate("DailyPracticeStack");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.gap16]}>
        <View style={styles.iconCircle}>
          <Icon
            name="microphone"
            // Adjusted icon size to fit within the 56x56 circle, leaving some padding
            size={24}
            color={theme.colors.actionPrimary.default}
          />
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Daily Practice</Text>
            <View style={[styles.row, styles.gap12]}>
              <View style={[styles.row, styles.gap4]}>
                <Icon
                  name="clock"
                  size={12}
                  color={theme.colors.text.default}
                />
                <Text>12 m</Text>
              </View>
              <View style={[styles.row, styles.gap4]}>
                <Icon
                  solid
                  name="star"
                  size={12}
                  color={theme.colors.library.yellow[500]}
                />
                <Text>Beginner</Text>
              </View>
            </View>
          </View>
          <Text style={styles.progressText}>3/12 min</Text>
        </View>
      </View>

      <Button
        text={`${isSessionFresh ? "Resume" : "Start"} Session`}
        onPress={() => {
          console.log("Start Practice");
          moveToDailyPractice();
        }}
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
  gap16: {
    gap: 16,
  },
  gap4: {
    gap: 4,
  },
  gap12: {
    gap: 12,
  },
  detailsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "500",
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
