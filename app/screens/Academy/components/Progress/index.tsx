import { StyleSheet, Text, View } from "react-native";
import React from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import PracticeChart from "./Chart";

const Progress = () => {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Weekly Progress</Text>
        <View style={styles.titleBadge}>
          <Icon
            name="fire-alt"
            size={12}
            color={theme.colors.library.green[500]}
          />
          <Text style={styles.badgeText}>5 days</Text>
        </View>
      </View>
      <PracticeChart />
      {/* <View style={styles.progressGraphContainer}>
        <View style={styles.graphMeta}>
          <View style={styles.practiceMinutes}>
            <Text style={styles.practiceMinutesText}>Practice Minutes</Text>
            <Text style={styles.practiceMinutesValue}>82</Text>
            <Text style={styles.practiceMinutesUnit}>mins</Text>
          </View>
          <View style={styles.progressMeta}>
            <Icon
              name="arrow-up"
              size={12}
              color={theme.colors.library.green[500]}
            />
            <Text style={styles.progressValue}>8%</Text>
            <Text style={styles.vsLastWeek}>vs last week</Text>
          </View>
        </View>
        <PracticeChart />
      </View> */}
    </View>
  );
};

export default Progress;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  titleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  titleBadge: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: theme.colors.library.green[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.green[500],
  },
  progressGraphContainer: {
    padding: 12,
    borderRadius: 12,
    //backgroundColor: theme.colors.surface.default,
    // ...parseShadowStyle(theme.shadow.elevation1),
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  graphMeta: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  practiceMinutes: {},
  practiceMinutesText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  practiceMinutesValue: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    fontWeight: "700",
  },
  practiceMinutesUnit: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[600],
    fontWeight: "700",
  },
  progressMeta: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressValue: {
    ...parseShadowStyle(theme.shadow.elevation1),
    color: theme.colors.library.green[500],
  },
  vsLastWeek: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
