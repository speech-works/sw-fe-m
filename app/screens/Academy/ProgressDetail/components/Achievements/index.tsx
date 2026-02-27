import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import {
    getProgressToNextLevel,
    getUnlockedLevelsFromXP,
    LevelData,
    LevelProgress,
} from "../../../../../util/functions/levels-xp";
import {
    parseTextStyle
} from "../../../../../util/functions/parseStyles";

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
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#10B981", "#059669"]} // Green gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Watermark Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* Trophy Icon Watermark */}
        <View style={styles.iconWatermark}>
          <Icon name="trophy" size={140} color="rgba(255,255,255,0.08)" />
        </View>

        {/* Content Layer */}
        <View style={styles.contentLayer}>
          {/* Header with XP */}
          <View style={styles.headerSection}>
            <View style={styles.headerRow}>
              <Text style={styles.headerLabel}>ACHIEVEMENTS</Text>
              <Icon name="award" size={20} color="rgba(255,255,255,0.9)" />
            </View>

            {/* XP Badge */}
            <View style={styles.xpBadge}>
              <Icon name="star" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.xpText}>{user?.totalXp || 0} XP</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${
                          ((levelProgress?.xpIntoLevel || 0) /
                            (levelProgress?.xpForNextLevel || 100)) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(
                    ((levelProgress?.xpIntoLevel || 0) /
                      (levelProgress?.xpForNextLevel || 100)) *
                      100
                  )}
                  % to next level
                </Text>
              </View>
            </View>
          </View>

          {/* Levels List */}
          <View style={styles.levelsContainer}>
            {unlockedLevels.map(({ level, data }) => (
              <View key={level} style={styles.levelRow}>
                <View style={styles.levelBadge}>{data.icon(32)}</View>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelTitle}>
                    Level {level}: {data.levelTitle}
                  </Text>
                  <Text style={styles.levelDesc}>{data.levelDescription}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default Achievements;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: "#A7F3D0",
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    minHeight: 280,
    position: "relative",
  },
  // Watermark Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  iconWatermark: {
    position: "absolute",
    right: -40,
    bottom: -30,
    opacity: 0.6,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
    gap: 20,
  },
  headerSection: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  xpText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarWrapper: {
    gap: 8,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 6,
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  levelsContainer: {
    gap: 12,
  },
  levelRow: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  levelInfo: {
    flex: 1,
    gap: 4,
  },
  levelTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  levelDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
