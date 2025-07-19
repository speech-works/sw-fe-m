import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import ProgressBar from "../../../../../components/ProgressBar";
import { useUserStore } from "../../../../../stores/user";
import {
  getProgressToNextLevel,
  getUnlockedLevelsFromXP,
  LevelData,
  LevelProgress,
} from "../../../../../util/functions/levels-xp";
import { set } from "date-fns";

const Achievements = () => {
  const { user } = useUserStore();
  const [unlockedLevels, setUnlockedLevels] = useState<
    { level: number; data: LevelData }[]
  >([]);

  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(
    null
  );

  useEffect(() => {
    if (!user?.totalXp) return;
    const levelsUnlocked = getUnlockedLevelsFromXP(user.totalXp);
    const progress = getProgressToNextLevel(user.totalXp);
    setUnlockedLevels(levelsUnlocked);
    setLevelProgress(progress);
  }, [user?.totalXp]);

  return (
    <View style={styles.card}>
      <Text style={styles.titleText}>Achievements</Text>

      <ProgressBar
        currentStep={levelProgress?.xpIntoLevel || 0}
        totalSteps={levelProgress?.xpForNextLevel || 100}
        showPercentage={true}
        showStepIndicator={false}
        style={{ marginTop: 8 }}
      />

      <View style={styles.allLevelsContainer}>
        {unlockedLevels.map(({ level, data }) => (
          <View key={level} style={styles.levelContainer}>
            <View style={styles.levelBox}>{data.icon(32)}</View>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                Level {level}: {data.levelTitle}
              </Text>
              <Text style={styles.infoDesc}>{data.levelDescription}</Text>
            </View>
          </View>
        ))}
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
  allLevelsContainer: {
    flexDirection: "column-reverse",
    gap: 8,
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
    flexShrink: 1,
    flexWrap: "wrap",
    maxWidth: "90%",
  },
});
