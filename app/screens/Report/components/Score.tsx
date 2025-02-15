import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";

const Score = () => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.scoreNumber}>84</Text>
      <Text style={styles.scoreText}>Your overall score</Text>
    </View>
  );
};

export default Score;

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1.25 4 0 rgba(0, 0, 0, 0.25)",
  },
  scoreNumber: {
    ...parseTextStyle(theme.typography.displayLarge.heavy_0),
    color: theme.colors.actionSecondary.default,
  },
  scoreText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.neutral[3],
  },
});
