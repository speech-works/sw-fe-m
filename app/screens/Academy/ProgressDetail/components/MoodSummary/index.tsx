import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Angry1 from "../../../../../assets/mood-check/Angry1";
import Calm1 from "../../../../../assets/mood-check/Calm1";
import Happy1 from "../../../../../assets/mood-check/Happy1";
import Sad1 from "../../../../../assets/mood-check/Sad1";
import { getWeeklyMoodReport } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { getMoodRemark } from "./helper";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";

const MoodSummary = () => {
  const { user } = useUserStore();
  const [moodStats, setMoodStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchMoodStats = async () => {
      const moods = await getWeeklyMoodReport(user.id);
      setMoodStats(moods);
    };
    fetchMoodStats();
  }, [user]);

  const icons = {
    ANGRY: Angry1,
    CALM: Calm1,
    HAPPY: Happy1,
    SAD: Sad1,
  };

  const nonZeroMoods = Object.entries(moodStats).filter(
    ([, percentage]) => percentage > 0
  );

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#14B8A6", "#06B6D4"]} // Teal gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Watermark Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* Heart Icon Watermark */}
        <View style={styles.iconWatermark}>
          <Icon name="heart" size={140} color="rgba(255,255,255,0.08)" />
        </View>

        {/* Content Layer */}
        <View style={styles.contentLayer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>MOOD SUMMARY</Text>
            <Icon name="smile" size={20} color="rgba(255,255,255,0.9)" />
          </View>

          {/* Mood Grid */}
          <View style={styles.moodGrid}>
            {nonZeroMoods.map(([mood, percentage]) => {
              const Icon = icons[mood as keyof typeof icons];
              if (!Icon) return null;

              return (
                <View key={mood} style={styles.moodCard}>
                  <View style={styles.moodIconContainer}>
                    <Icon width={48} height={48} />
                  </View>
                  <Text style={styles.moodName}>
                    {mood.charAt(0) + mood.slice(1).toLowerCase()}
                  </Text>
                  <Text style={styles.moodPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Remark Pill */}
          <View style={styles.remarkPill}>
            <Icon name="lightbulb" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.remarkText}>{getMoodRemark(moodStats)}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default MoodSummary;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#14B8A6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: "#99F6E4",
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    minHeight: 240,
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
    left: -40,
    top: -20,
    opacity: 0.6,
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
    gap: 20,
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
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  moodCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    minWidth: 100,
    flex: 1,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  moodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  moodName: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  moodPercentage: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  remarkPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  remarkText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
});
