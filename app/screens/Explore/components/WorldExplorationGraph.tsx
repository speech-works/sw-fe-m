import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
// Import from original location to reuse logic
import PracticeChart from "../../Academy/components/Progress/Chart";
import { WeeklyStat } from "../../../api/stats/types";
import { useUserStore } from "../../../stores/user";
import { getDailyActivityStatsForTheWeek } from "../../../api";
import { LinearGradient } from "expo-linear-gradient";

const WorldExplorationGraph = () => {
  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] = useState<WeeklyStat[]>([]);

  const [percentChange, setPercentChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getDailyActivityStatsForTheWeek(user.id)
      .then((data) => {
        setWeeklyData(data.days);
        setPercentChange(data.percentChange);
        setError(null);
      })
      .catch((err) => {
        console.error("Discovery stats error:", err);
        setError("Could not load exploration data");
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Repurpose logic: active days = "Regions Explored" or similar concept
  const activeDays = weeklyData.filter((w) => w.totalTime > 0).length || 0;

  // Calculate a "World Explored" percentage based on activity
  // This is a visual repurposing. For now, we use activeDays as a proxy for progress.
  const worldPercentage = Math.min(100, Math.round((activeDays / 7) * 100));

  // Determine colors based on loading/error state vs content
  // We'll stick to a nice Blue/Indigo gradient for "World".

  return (
    <View style={styles.shadowContainer} shouldRasterizeIOS={true}>
      <LinearGradient
        colors={["#22d3ee", "#60a5fa", "#818cf8"]} // Cyan-400 -> Blue-400 -> Indigo-400
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* 1. Top Right Watermark Icon */}
        <View style={styles.watermarkContainer}>
          <Icon
            name="globe-americas"
            size={120}
            color="rgba(255,255,255,0.15)"
          />
        </View>

        {/* 2. Header Content (Chip -> Title -> Desc) */}
        <View style={styles.headerContent}>
          {/* Chip */}
          <View style={styles.chip}>
            <Icon name="compass" size={10} color="#FFF" />
            <Text style={styles.chipText}>{worldPercentage}% Discovered</Text>
          </View>

          {/* Title */}
          <Text style={styles.titleText}>World Explored</Text>

          {/* Description */}
          <Text style={styles.descriptionText}>
            Discover new ways to improve your speech
          </Text>
        </View>

        {/* 3. Main Content (Chart) */}
        <View style={styles.chartContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#F8FAFC" />
          ) : error ? (
            <Text style={{ color: "#EF4444" }}>{error}</Text>
          ) : (
            <PracticeChart
              data={weeklyData}
              percentChange={percentChange}
              title="Discovery Map"
              emptyTitle="Start Exploring"
              emptySubtitle="Jump in to discover the world"
              showTitle={false}
              backgroundColor="transparent"
              contentColor="#FFF"
              barColor="#FFF"
            />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default React.memo(WorldExplorationGraph);

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8, // Reduced from 16
    elevation: 8,
    backgroundColor: "#22d3ee", // Needed for shadow logic on some androids
  },
  gradient: {
    borderRadius: 24,
    padding: 24, // Increased padding
    overflow: "hidden",
    position: "relative",
    minHeight: 280, // Ensure enough height
  },
  watermarkContainer: {
    position: "absolute",
    top: -20,
    right: -20,
    opacity: 1,
    transform: [{ rotate: "15deg" }], // Dynamic tilt
    zIndex: 0,
  },
  headerContent: {
    zIndex: 1,
    marginBottom: 24, // Space before chart
    alignItems: "flex-start", // Left align
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100, // Pill shape
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 12, // Space below chip
  },
  chipText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFF",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 24, // Size up
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  descriptionText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    maxWidth: "80%", // Prevent overlapping if icon was lower
  },
  chartContainer: {
    zIndex: 1,
    flex: 1,
  },
});
