import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import ProgressBar from "../../../../../components/ProgressBar";

const Achievements = () => {
  // dummy XP numbers
  const currentXp = 720;
  const xpToNextLevel = 1000;

  return (
    <View style={styles.card}>
      <Text style={styles.titleText}>Achievements</Text>
      {/* Dummy progress bar: 720/1000 XP */}
      <ProgressBar
        currentStep={currentXp}
        totalSteps={xpToNextLevel}
        showPercentage={true}
        showStepIndicator={false}
        style={{ marginTop: 8 }}
      />
      <View style={styles.levelContainer}>
        <View style={styles.levelBox}>
          <Text style={styles.levelText}>12</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Level 12: Confident Speaker</Text>
          <Text style={styles.infoDesc}>{`${
            xpToNextLevel - currentXp
          } XP to Level 13`}</Text>
        </View>
      </View>
    </View>
  );
};

export default Achievements;

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
    backgroundColor: theme.colors.background.light,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  levelContainer: {
    marginTop: 20,
    flexDirection: "row",
    gap: 16,
  },
  levelBox: {
    height: 56,
    width: 56,
    borderRadius: 28, // numeric instead of "%"
    backgroundColor: theme.colors.library.orange[800],
    justifyContent: "center",
    alignItems: "center",
  },
  levelText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.onDark,
  },
  infoBox: {
    justifyContent: "center",
  },
  infoTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  infoDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
