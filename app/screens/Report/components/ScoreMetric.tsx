import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";

interface ScoreMetricProps {
  title: string;
  metric: string;
  value: string;
}

const ScoreMetric = ({ title, metric, value }: ScoreMetricProps) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.mainText}>{title}</Text>
      <Text style={styles.subText}>{`${metric}: ${value}`}</Text>
    </View>
  );
};

export default ScoreMetric;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1.25 4 0 rgba(0, 0, 0, 0.25)",
    flexGrow: 1,
  },
  mainText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral.black,
  },
  subText: {
    ...parseTextStyle(theme.typography.paragraphTiny.regular),
    color: theme.colors.neutral[3],
  },
});
