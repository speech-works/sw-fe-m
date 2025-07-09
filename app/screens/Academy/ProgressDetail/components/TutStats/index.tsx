import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import ProgressBar from "../../../../../components/ProgressBar";

const TutStats = () => {
  // dummy XP numbers
  const currentXp = 720;
  const xpToNextLevel = 1000;

  return (
    <View style={styles.card}>
      <Text style={styles.titleText}>Library Coverage</Text>

      <View style={styles.levelContainer}>
        <View style={styles.tutorialCategory}>
          <View style={styles.levelBox}>
            <Text style={styles.levelText}>72</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Stuttering Modification</Text>
            <ProgressBar
              currentStep={currentXp}
              totalSteps={xpToNextLevel}
              showPercentage={false}
              showStepIndicator={false}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
        <View style={styles.tutorialCategory}>
          <View style={styles.levelBox}>
            <Text style={styles.levelText}>72</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Fluency Shaping</Text>
            <ProgressBar
              currentStep={currentXp}
              totalSteps={xpToNextLevel}
              showPercentage={false}
              showStepIndicator={false}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
        <View style={styles.tutorialCategory}>
          <View style={styles.levelBox}>
            <Text style={styles.levelText}>72</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Voice Control</Text>
            <ProgressBar
              currentStep={currentXp}
              totalSteps={xpToNextLevel}
              showPercentage={false}
              showStepIndicator={false}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default TutStats;

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
  tutorialCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  levelContainer: {
    marginTop: 20,
    gap: 24,
  },
  levelBox: {
    height: 48,
    width: 48,
    borderRadius: "50%",
    backgroundColor: theme.colors.library.orange[800],
    justifyContent: "center",
    alignItems: "center",
  },
  levelText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.onDark,
  },
  infoBox: {
    justifyContent: "center",
    flexGrow: 1,
  },
  infoTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
});
